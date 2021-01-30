import configurations from '../configurations';
import '../extensions';
// TODO change logger to just use console in this case
import logger from '../utilities/logger';
import '../global-error-handlers';
import courseController from '../features/courses/course-controller';

// import * as pugPlay from './playground-pug';
// import * as rendererPlay from './playground-renderer-functions';
// import * as schedulerPlay from './playground-scheduler-functions';
// import * as paidUsers from './playground-paid-users';
// import * as defFile from './playground-def-file';
// import * as importRegexPlay from './playground-import-regex';

const enabledMarker = new Array(20).join('*');
const disabledMarker = new Array(20).join('#');
if (configurations.email.enabled) {
    logger.info(`${enabledMarker} EMAIL ENABLED ${enabledMarker}`);
} else {
    logger.info(`${disabledMarker} EMAIL DISABLED ${disabledMarker}`);
}

import { sync } from '../database';
import User from '../database/models/user';
import CourseTopicContent from '../database/models/course-topic-content';
import CourseWWTopicQuestion from '../database/models/course-ww-topic-question';
import StudentGrade from '../database/models/student-grade';
import * as _ from 'lodash';
import StudentWorkbook from '../database/models/student-workbook';
import StudentGradeInstance from '../database/models/student-grade-instance';
import ProblemAttachment from '../database/models/problem-attachment';
import rendererHelper from '../utilities/renderer-helper';
import Role from '../features/permissions/roles';
import * as pug from 'pug';
import * as fs from 'fs';
import * as html5topdf from 'html5-to-pdf';

const sleep = (millis: number): Promise<void> => new Promise(resolve => setTimeout(resolve, millis));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getAllContentForVersion = async ({topicId, userId}: {topicId: number; userId: number}): Promise<any> => {

        // To display which user that submitted this exam version.
        const user = await User.findOne({
            attributes: ['id', 'firstName', 'lastName'],
            where: {
                id: userId,
            },
        });

        /**
         * Start with a GradeInstanceId. This represents a version.
         * Find all questions associated with the Topic associated with this GradeInstanceId.
         *      These are all the questions for that version. Should be the same for GradeInstanceIds with the same parent GradeId.
         */
        const mainData = await CourseTopicContent.findOne({
            attributes: ['id', 'name'],
            where: {
                id: topicId,
                active: true,
            },
            include: [
                {
                    model: CourseWWTopicQuestion,
                    as: 'questions',
                    attributes: ['id', 'problemNumber'],
                    required: true,
                    where: {
                        active: true,
                    },
                    include: [
                        {
                            model: StudentGrade,
                            as: 'grades',
                            attributes: ['id', 'lastInfluencingCreditedAttemptId', 'lastInfluencingAttemptId'],
                            required: true,
                            where: {
                                userId: userId,
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
                    // console.error(e);
                }
            })
        );


        const baseUrl = configurations.attachments.baseUrl;
        return {user: user, topic: data, baseUrl};
    };



(async (): Promise<void> => {
    try {
        await sync();
        logger.info('Playground start');
        const res = await getAllContentForVersion({
            topicId: 2609,
            userId: 216,
        });

        const user = res.user;
        // console.log(user);
        const topic = res.topic;
        // console.log(topic);
        const questions = topic.questions;
        // console.log(questions);
        for (let i = 0; i < questions.length; ++i) {
            const oneGrade = questions?.[3].grades?.[0];
            // console.log(oneGrade);
            const workbook = oneGrade.influencingWorkbook;
            // console.log(oneGrade.rendererData);
            if (!oneGrade.rendererData) continue;
            break;
        }

        const pugFriendlyArray = questions.map((prob: any) => {
            return {
                number: prob.problemNumber,
                srcdoc: prob.grades?.[0]?.rendererData?.renderedHTML,
            };
        });

        console.log(JSON.stringify(pugFriendlyArray));

        const f = pug.compileFile('assets/pdf.pug');
        fs.writeFileSync('pdftest.html', f({
            problems: pugFriendlyArray
        }), 'utf8');

        const pdf = new html5topdf({
            inputPath: 'pdftest.html',
            outputPath: 'pdftest.pdf',
            rendererDelay: 10000
        });

        await pdf.start();
        await pdf.build();
        await pdf.close();

        logger.info('Playground done');
    } catch (e) {
        logger.error('Could not start up', e);
        // Used a larger number so that we could determine by the error code that this was an application error
        process.exit(87);
    }
})();
