import User from '../database/models/user';
import CourseTopicContent from '../database/models/course-topic-content';
import CourseWWTopicQuestion from '../database/models/course-ww-topic-question';
import StudentGrade from '../database/models/student-grade';
import logger from './logger';
import StudentWorkbook from '../database/models/student-workbook';
import StudentGradeInstance from '../database/models/student-grade-instance';
import ProblemAttachment from '../database/models/problem-attachment';
import rendererHelper from './renderer-helper';
import Role from '../features/permissions/roles';
import configurations from '../configurations';
import _ = require('lodash');
import axios, { AxiosResponse } from 'axios';
import NotFoundError from '../exceptions/not-found-error';
import moment = require('moment');
import { asyncForOwn } from '../extensions/object-extension';

interface BulkPdfExport {
    firstName: string;
    lastName: string;
    topic: {
        name: string;
        id: number;
    }
    professorUUID: string;
    problems: {
        number: number;
        srcdoc: string;
    }[];
}

// topic from db
type FROM_DB = {
    id: number;
    name: string;
    questions: {
        id: number;
        problemNumber: number;
        webworkQuestionPath: string;
        grades: {
            id: number;
            lastInfluencingCreditedAttemptId: number;
            lastInfluencingAttemptId: number;
            user: User;
            influencingWorkbook: any;
            rendererData: any;
            webworkQuestionPath?: string;
            problemAttachments: any;
            randomSeed: number;
        }[];
    }[];
}

export default class ExportPDFHelper {
    bulkExportAxios = axios.create({
        baseURL: configurations.bulkPdfExport.baseUrl,
        timeout: 120000
    });

    shouldStartNewExport = (topic: CourseTopicContent): boolean => {
        // If the time is within 5 minutes, do not allow a new export
        if (!_.isNil(topic.lastExported) && moment().isBefore(moment(topic.lastExported).add(5, 'minutes'))) {
            return false;
        }

        return true;
    }
    
    start = async ({topic, professorUUID}: {topic: CourseTopicContent; professorUUID: string}): Promise<void> => {
        topic.lastExported = new Date();
        topic.exportUrl = null;
        await topic.save();

        // Fine the specified topic
        const mainData = await CourseTopicContent.findOne({
            attributes: ['id', 'name'],
            where: {
                id: topic.id,
                active: true,
            },
            include: [
                {
                    // Include all questions in the topic
                    model: CourseWWTopicQuestion,
                    as: 'questions',
                    attributes: ['id', 'problemNumber', 'webworkQuestionPath'],
                    required: true,
                    where: {
                        active: true,
                    },
                    include: [
                        {
                            // Include all StudentGrades that are linked to each problem.
                            // Should be one Student Grade per Student for each Problem
                            model: StudentGrade,
                            as: 'grades',
                            attributes: ['id', 'userId', 'lastInfluencingCreditedAttemptId', 'lastInfluencingAttemptId', 'effectiveScore', 'legalScore'],
                            required: true,
                            where: {
                                active: true,
                            },
                        }
                    ]
                }
            ],
        });

        // TODO: Clean up typing when unpacking the ProblemAttachments
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: FROM_DB = mainData?.get({plain: true}) as FROM_DB;
        const studentGradeLookup: {
            [userId: number]: {
                number: number;
                srcdoc: string;
                attachments: {url: string; name: string}[] | undefined;
                effectiveScore: number;
                legalScore: number;
            }[];
        } = {};

        await mainData?.questions?.sequentialAsyncForEach(async (question, i) =>
            await question.grades?.sequentialAsyncForEach(async (grade, j) => {
                const influencingWorkbook = grade.lastInfluencingCreditedAttemptId ?? grade.lastInfluencingAttemptId;

                if (_.isNil(influencingWorkbook)) {
                    // If we can't find a workbook, we can't display anything for the student attempt.
                    // Should we display the empty problem? Should we check for autosaved work?
                    if (_.isNil(studentGradeLookup[grade.userId])) {
                        studentGradeLookup[grade.userId] = [];
                    }

                    studentGradeLookup[grade.userId].push({
                        number: question.problemNumber,
                        attachments: [],
                        srcdoc: 'There is no record of this student attempting this problem.',
                        effectiveScore: grade.effectiveScore,
                        legalScore: grade.legalScore,
                    });

                    return;
                }

                const gradeInstanceAttachments = await StudentWorkbook.findOne({
                    where: {
                        id: influencingWorkbook,
                        active: true,
                    },
                    attributes: ['id', 'submitted', 'randomSeed'],
                    include: [
                        {
                            model: StudentGradeInstance,
                            as: 'studentGradeInstance',
                            attributes: ['id', 'webworkQuestionPath', 'randomSeed'],
                            required: false,
                            where: {
                                active: true,
                            },
                            include: [
                                {
                                    model: ProblemAttachment,
                                    as: 'problemAttachments',
                                    attributes: ['id', 'cloudFilename', 'userLocalFilename', 'updatedAt'],
                                    where: {
                                        active: true,
                                    }
                                }
                            ]
                        },
                    ]
                });

                try {
                        const obj = {
                            sourceFilePath: gradeInstanceAttachments?.studentGradeInstance?.webworkQuestionPath ?? question.webworkQuestionPath,
                            problemSeed: gradeInstanceAttachments?.randomSeed ?? gradeInstanceAttachments?.studentGradeInstance?.randomSeed ?? data.questions[i].grades[j].randomSeed,
                            formData: gradeInstanceAttachments?.submitted.form_data,
                            showCorrectAnswers: true,
                            answersSubmitted: 1,
                            outputformat: rendererHelper.getOutputFormatForRole(Role.PROFESSOR),
                            permissionLevel: rendererHelper.getPermissionForRole(Role.PROFESSOR),
                            showSolutions: true,
                        };

                        if (_.isNil(studentGradeLookup[grade.userId])) {
                            studentGradeLookup[grade.userId] = [];
                        }

                        let src: any = null;
                        try {
                            src = await rendererHelper.getProblem(obj);
                        } catch (e) {
                            logger.error(`Failed to load problem ${question.problemNumber} for ${grade.userId} with obj:`);
                            console.log(obj);
                            console.error(e.message);
                        }

                        studentGradeLookup[grade.userId].push({
                            number: question.problemNumber,
                            attachments: gradeInstanceAttachments?.studentGradeInstance?.problemAttachments?.map(x => ({
                                url: `https://app.rederly.com/work/${x.cloudFilename}`,
                                name: x.userLocalFilename,
                                time: x.updatedAt,
                            })),
                            effectiveScore: grade.effectiveScore,
                            legalScore: grade.legalScore,
                            srcdoc: src?.renderedHTML ?? 'Could not render this problem.'
                        });
                } catch (e) {
                    console.error(`Got an error message for problem ${question.problemNumber} for ${grade.userId}`, e.message);
                    // console.log({
                    //     sourceFilePath: data.questions[i].grades[j].webworkQuestionPath ?? data.questions[i].webworkQuestionPath,
                    //     problemSeed: gradeInstanceAttachments?.randomSeed ?? gradeInstanceAttachments?.studentGradeInstance?.randomSeed ?? data.questions[i].grades[j].randomSeed,
                    // });
                }
            })
        );

        await asyncForOwn(studentGradeLookup, async (studentGrades, userId) => {
            const user = await User.findOne({
                attributes: ['id', 'firstName', 'lastName'],
                where: {
                    id: userId,
                    active: true,
                }
            });
            
            if (_.isNil(user)) {
                logger.warn(`Could not find User ${userId}, probably deleted.`);
                return;
            }

            console.log(userId, studentGrades.map(x => x.number));

            const postObject: BulkPdfExport = {
                topic: {
                    id: data.id,
                    name: data.name,
                },
                firstName: user.firstName,
                lastName: user.lastName,
                problems: studentGrades,
                professorUUID: professorUUID
            };
            const result = await this.bulkExportAxios.post('export/', postObject);
            console.log('Got result from post', result.data);
            return result;
        });
        
        // Request zip
        try {
            const res = await this.bulkExportAxios.get(`export/?profUUID=${professorUUID}&topicId=${topic.id}`);
            console.log('Got res', res.data);
        } catch (e) {
            console.error(e);
            topic.lastExported = null;
            await topic.save();
        }
        // return zippedURL;
        return;
    };
}