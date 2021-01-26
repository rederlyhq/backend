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
                            attributes: ['id', 'userId', 'lastInfluencingCreditedAttemptId', 'lastInfluencingAttemptId'],
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
                attachments: string[] | undefined;
            }[];
        } = {};

        await mainData?.questions?.asyncForEach(async (question, i) =>
            await question.grades?.asyncForEach(async (grade, j) => {
                const influencingWorkbook = grade.lastInfluencingCreditedAttemptId ?? grade.lastInfluencingAttemptId;
                if (_.isNil(influencingWorkbook)) {
                    logger.error(`Cannot find the best version for Grade ${grade.id} with lastInfluencingCreditedAttemptId or lastInfluencingAttemptId.`);
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

                data.questions[i].grades[j].webworkQuestionPath = gradeInstanceAttachments?.studentGradeInstance?.webworkQuestionPath;
                data.questions[i].grades[j].problemAttachments = gradeInstanceAttachments?.studentGradeInstance?.problemAttachments;
                data.questions[i].grades[j].influencingWorkbook = gradeInstanceAttachments;
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

                        studentGradeLookup[grade.userId].push({
                            number: question.problemNumber,
                            attachments: gradeInstanceAttachments?.studentGradeInstance?.problemAttachments?.map(x => `https://staging.rederly.com/${x.cloudFilename}`),
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            srcdoc: (await rendererHelper.getProblem(obj) as any)?.renderedHTML ?? 'Could not render this problem.'
                        });

                        console.log('Got renderer Data');
                } catch (e) {
                    // console.error(e);
                    // console.log({
                    //     sourceFilePath: data.questions[i].grades[j].webworkQuestionPath ?? data.questions[i].webworkQuestionPath,
                    //     problemSeed: gradeInstanceAttachments?.randomSeed ?? gradeInstanceAttachments?.studentGradeInstance?.randomSeed ?? data.questions[i].grades[j].randomSeed,
                    // });
                }
            })
        );

        const uploadPromises: Promise<AxiosResponse<unknown>>[] = [];
        _.forOwn(studentGradeLookup, async (studentGrades, userId) => {
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
            uploadPromises.push(this.bulkExportAxios.post('export/', postObject));
        });
        
        try {
            // @ts-ignore
            await Promise.allSettled(uploadPromises);
            const zippedURL = await this.zip(professorUUID, topic.id);

            topic.exportUrl = zippedURL;
            await topic.save();
        } catch (e) {
            console.error(e);
        }
        // return zippedURL;
        return;
    };

    zip = async (professorUUID: string, topicId: number): Promise<string> => {
        const progress = await this.bulkExportAxios.get(`export/?profUUID=${professorUUID}&topicId=${topicId}`);
        return progress.data.data.zippedURL;
    }
}