import User from "../database/models/user";
import CourseTopicContent from "../database/models/course-topic-content";
import CourseWWTopicQuestion from "../database/models/course-ww-topic-question";
import StudentGrade from "../database/models/student-grade";
import logger from "./logger";
import StudentWorkbook from "../database/models/student-workbook";
import StudentGradeInstance from "../database/models/student-grade-instance";
import ProblemAttachment from "../database/models/problem-attachment";
import rendererHelper from "./renderer-helper";
import Role from "../features/permissions/roles";
import configurations from "../configurations";


type EXPORT_ONE_TOPIC_ONE_STUDENT = {
    firstName: string;
    lastName: string;
    topicTitle: string;
}

type EXPECTED_FORMAT = EXPORT_ONE_TOPIC_ONE_STUDENT;

class ExportPDFHelper {
    start = async ({topicId, userId}: {topicId: number; userId: number}): Promise<any> => {

        // Fine the specified topic
        const mainData = await CourseTopicContent.findOne({
            attributes: ['id', 'name'],
            where: {
                id: topicId,
                active: true,
            },
            include: [
                {
                    // Include all questions in the topic
                    model: CourseWWTopicQuestion,
                    as: 'questions',
                    attributes: ['id', 'problemNumber'],
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
                            attributes: ['id', 'lastInfluencingCreditedAttemptId', 'lastInfluencingAttemptId'],
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
        const data: any = mainData?.get({plain: true});

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
                            sourceFilePath: data.questions[i].grades[j].webworkQuestionPath,
                            problemSeed: gradeInstanceAttachments?.randomSeed ?? gradeInstanceAttachments?.studentGradeInstance?.randomSeed,
                            formData: gradeInstanceAttachments?.submitted.form_data,
                            showCorrectAnswers: true,
                            answersSubmitted: 1,
                            outputformat: rendererHelper.getOutputFormatForRole(Role.PROFESSOR),
                            permissionLevel: rendererHelper.getPermissionForRole(Role.PROFESSOR),
                            showSolutions: true,
                        };

                        data.questions[i].grades[j].rendererData = await rendererHelper.getProblem(obj);
                        console.log('Got renderer Data');
                } catch (e) {
                    console.error(e);
                }
            })
        );


        const baseUrl = configurations.attachments.baseUrl;
        return {topic: data, baseUrl};
    };
}