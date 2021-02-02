import User from '../database/models/user';
import CourseTopicContent from '../database/models/course-topic-content';
import CourseWWTopicQuestion from '../database/models/course-ww-topic-question';
import StudentGrade from '../database/models/student-grade';
import logger from './logger';
import StudentWorkbook from '../database/models/student-workbook';
import StudentGradeInstance from '../database/models/student-grade-instance';
import ProblemAttachment from '../database/models/problem-attachment';
import rendererHelper, { GetProblemParameters, OutputFormat } from './renderer-helper';
import Role from '../features/permissions/roles';
import configurations from '../configurations';
import _ = require('lodash');
import axios from 'axios';
import NotFoundError from '../exceptions/not-found-error';
import moment = require('moment');
import { asyncForOwn } from '../extensions/object-extension';
import urljoin = require('url-join');

interface BulkPdfExport {
    firstName: string;
    lastName: string;
    topic: {
        name: string;
        id: number;
    };
    professorUUID: string;
    problems: {
        number: number;
        srcdoc: string;
    }[];
}

export default class ExportPDFHelper {
    bulkExportAxios = axios.create({
        baseURL: configurations.bulkPdfExport.baseUrl,
    });
    
    start = async ({topic, professorUUID, showSolutions}: {topic: CourseTopicContent; professorUUID: string, showSolutions: boolean}): Promise<void> => {
        topic.lastExported = new Date();
        topic.exportUrl = null;
        await topic.save();

        // Find the specified topic
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

        if (_.isNil(mainData)) {
            throw new NotFoundError(`Could not find topic ${topic.id} to export.`);
        }

        const studentGradeLookup: {
            [userId: number]: {
                number: number;
                srcdoc: string;
                attachments: {url: string; name: string}[] | undefined;
                effectiveScore: number;
                legalScore: number;
            }[];
        } = {};

        await mainData.questions?.sequentialAsyncForEach(async (question) =>
            await question.grades?.sequentialAsyncForEach(async (grade) => {
                if (_.isNil(studentGradeLookup[grade.userId])) {
                    studentGradeLookup[grade.userId] = [];
                }

                const influencingWorkbook = grade.lastInfluencingCreditedAttemptId ?? grade.lastInfluencingAttemptId;

                if (_.isNil(influencingWorkbook)) {
                    // If we can't find a workbook, we can't display anything for the student attempt.
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

                const obj: GetProblemParameters = {
                    sourceFilePath: gradeInstanceAttachments?.studentGradeInstance?.webworkQuestionPath ?? question.webworkQuestionPath,
                    problemSeed: gradeInstanceAttachments?.randomSeed ?? gradeInstanceAttachments?.studentGradeInstance?.randomSeed ?? grade.randomSeed,
                    formData: gradeInstanceAttachments?.submitted.form_data,
                    showCorrectAnswers: showSolutions,
                    showSolutions: showSolutions,
                    answersSubmitted: 1,
                    outputformat: OutputFormat.ASSESS,
                    permissionLevel: rendererHelper.getPermissionForRole(Role.PROFESSOR),
                };

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let src: any = null;
                try {
                    src = await rendererHelper.getProblem(obj);
                } catch (e) {
                    logger.error(`Failed to load problem ${question.problemNumber} for ${grade.userId}.`);
                }

                studentGradeLookup[grade.userId].push({
                    number: question.problemNumber,
                    attachments: gradeInstanceAttachments?.studentGradeInstance?.problemAttachments?.map(attachment => ({
                        url: urljoin(configurations.attachments.baseUrl, attachment.cloudFilename),
                        name: attachment.userLocalFilename,
                        time: attachment.updatedAt,
                    })),
                    effectiveScore: grade.effectiveScore,
                    legalScore: grade.legalScore,
                    srcdoc: src?.renderedHTML ?? 'Could not render this problem.'
                });
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

            const postObject: BulkPdfExport = {
                topic: {
                    id: mainData.id,
                    name: mainData.name,
                },
                firstName: user.firstName,
                lastName: user.lastName,
                problems: studentGrades,
                professorUUID: professorUUID
            };
            return await this.bulkExportAxios.post('export/', postObject);
        });
        
        // Request zip
        try {
            return await this.bulkExportAxios.get('export/', {
                params: {
                    profUUID: professorUUID, 
                    topicId: topic.id,
                    showSolutions
                }
            });
        } catch (e) {
            console.error(e);
            topic.lastExported = null;
            await topic.save();
        }
    };
}
