import configurations from './configurations';
import './extensions';
// TODO change logger to just use console in this case
import logger from './utilities/logger';
import './global-error-handlers';
import * as _ from 'lodash';

const enabledMarker = new Array(20).join('*');
const disabledMarker = new Array(20).join('#');
if (configurations.email.enabled) {
    logger.info(`${enabledMarker} EMAIL ENABLED ${enabledMarker}`);
} else {
    logger.info(`${disabledMarker} EMAIL DISABLED ${disabledMarker}`);
}

import { sync } from './database';
import courseController from './features/courses/course-controller';
import StudentWorkbook from './database/models/student-workbook';
import rendererHelper, {VALID_PG_PATH_REGEX} from './utilities/renderer-helper';
import { useDatabaseTransaction } from './utilities/database-helper';
import CourseTopicContent from './database/models/course-topic-content';
import CourseWWTopicQuestion from './database/models/course-ww-topic-question';
import CourseQuestionAssessmentInfo from './database/models/course-question-assessment-info';

const syncMissingGrades = async (): Promise<void> => {
    logger.info('Performing missing grade sync');
    await courseController.syncMissingGrades();
    logger.info('done');
};

const cleanupWorkbooks = async (): Promise<void> => {
    await useDatabaseTransaction(async () => {
        const workbooks = await StudentWorkbook.findAll();
        logger.info(`Workbook count: ${workbooks.length}`);
        await workbooks.asyncForEach(async (workbook: StudentWorkbook) => {
            let submitted = workbook.submitted;
            if (typeof (submitted) === 'string') {
                submitted = JSON.parse(submitted);
            }

            submitted = rendererHelper.cleanRendererResponseForTheDatabase(submitted);

            // Form data can be anything, furthermore this is temporary since it is just for cleanup purposes, cleaning up some null bytes from an old version of the renderer
            const formData = (submitted.form_data as { [key: string]: unknown });
            if (_.isNil(formData)) {
                throw new Error('Missing form data!');
            }
            if (typeof(formData.submitAnswers) === 'string') {
                formData.submitAnswers = formData.submitAnswers.substring(0, formData.submitAnswers.indexOf('\0'));
            }
            if (typeof(formData.format) === 'string') {
                formData.format = formData.format.substring(0, formData.format.indexOf('\0'));
            }

            workbook.submitted = submitted;
            await workbook.save();
        });
    });
};

const noop = (): void => {
    logger.info('noop performed');
};



const syncBadPathCounts = async (): Promise<void> => {
    await useDatabaseTransaction(async () => {
        const topics = await CourseTopicContent.findAll(
            {
                where: {
                    active: true,
                },
                include: [
                    {
                        model: CourseWWTopicQuestion,
                        as: 'questions',
                        include: [
                            {
                                model: CourseQuestionAssessmentInfo,
                                as: 'courseQuestionAssessmentInfo'
                            }
                        ]
                    }
                ]
            }
        );

        logger.info(`Checking ${topics.length} topics`);

        await topics.asyncForEach(async (topic) => {
            // For each question in the topic, sum the existence of a path problem.
            let count = 0;
            await topic.questions?.asyncForEach(async (question)=>{
                const {webworkQuestionPath, errors, courseQuestionAssessmentInfo} = question;
                const additionalProblemPaths = courseQuestionAssessmentInfo?.additionalProblemPaths;
                const additionalErrors = courseQuestionAssessmentInfo?.errors;

                const isDefinitelyBad = VALID_PG_PATH_REGEX.test(webworkQuestionPath) === false;

                // If this is definitely bad and not already in the error object, add it.
                if (isDefinitelyBad && (_.isNil(errors) || _.isEmpty(errors) || !(webworkQuestionPath in errors))){
                    logger.debug(`Updating ${question.id} from topic ${topic.id} with a path error.`);
                    question.errors = {
                        [webworkQuestionPath]: [`${webworkQuestionPath} cannot be found.`]
                    };
                    question.save();
                }

                if (topic.topicTypeId === 2) {
                    if (_.isNil(courseQuestionAssessmentInfo)) {
                        logger.error(`Topic ${topic.id} is an exam but this question has no assessment info.`);
                        if (isDefinitelyBad) count += 1;
                        return;
                    }
                    let atLeastOneIsBad = false;
                    await additionalProblemPaths?.asyncForEach(async (path) => {
                        const isDefinitelyBad = VALID_PG_PATH_REGEX.test(path) === false;
                        if (isDefinitelyBad) atLeastOneIsBad = true;
                        
                        if (isDefinitelyBad && (_.isNil(additionalErrors) || _.isEmpty(additionalErrors) || !(path in additionalErrors))) {
                            if (_.isNil(courseQuestionAssessmentInfo.errors)) {
                                courseQuestionAssessmentInfo.errors = {};
                            }
                            logger.debug(`Updating ${courseQuestionAssessmentInfo.id} from topic ${topic.id} with an additional path error.`);
                            courseQuestionAssessmentInfo.errors[path] = [`${path} cannot be found`];
                        }
                    });
                    courseQuestionAssessmentInfo.save();
                    if (isDefinitelyBad || atLeastOneIsBad) count += 1;
                } else {
                    if (isDefinitelyBad) count += 1;
                }
            });

            // Count can be equal to or less than because it doesn't include full renderer checks.
            // Questions will still be annotated correctly with updated error paths.
            if (count > topic.errors) {
                logger.debug(`Updating topic ${topic.id} error count from ${topic.errors} to ${count}`);
                topic.errors = count;
                topic.save();
            }
        });
    });
};

const commandLookup: {[key: string]: () => unknown} = {
    ['sync-missing-grades']: syncMissingGrades,
    ['cleanup-workbooks']: cleanupWorkbooks,
    ['noop']: noop,
    ['sync-bad-path-counts']: syncBadPathCounts,
};

(async (): Promise<void> => {
    try {
        // This cannot be below sync otherwise an unhandled rejection is logged and the error is empty
        await configurations.loadPromise;

        if (configurations.db.sync) {
            await sync();
        }

        logger.info('Running CLI');
        const command = process.argv[2]?.toLowerCase();
        logger.info(`Running command: ${command}`);
        const commandFunction = commandLookup[command];
        if (_.isNil(commandFunction)) {
            logger.error(`"${command}" is not a valid command, it must be one of: ${JSON.stringify(Object.keys(commandLookup))}`);
        } else {
            await commandFunction();
        }
        logger.info('Finished running CLI');
    } catch (e) {
        logger.error('Could not start up', e);
        // Used a larger number so that we could determine by the error code that this was an application error
        process.exit(87);
    }
})();
