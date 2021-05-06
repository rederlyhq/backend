/**
 * Search for `// Required for stress playground, given timing holding off on small refactor` to fix the code base for this playground
 * Right now this refactor would cause other problems but in the future we probably want to fix this completely
 */
import '../extensions';
import StudentWorkbook from '../database/models/student-workbook';
import User from '../database/models/user';
import { TopicTypeLookup } from '../database/models/topic-type';
import courseController from '../features/courses/course-controller';
import logger from '../utilities/logger';
import CourseTopicContent from '../database/models/course-topic-content';
import StudentGrade from '../database/models/student-grade';
import CourseUnitContent from '../database/models/course-unit-content';

interface EnrollOptions {
    courseId: number;
    userCount: number;
}
export const enroll = async ({ courseId, userCount }: EnrollOptions): Promise<number[]> => {
    logger.info('Enrolling');
    logger.info('Getting users');
    const users = await User.findAll({
        limit: userCount,
        attributes: ['id']
    });

    logger.info('Enrolling users');
    await users.sequentialAsyncForEach(async (user) => {
        await courseController.enroll({
            courseId: courseId,
            userId: user.id,
        });
    });

    return users.map(user => user.id);
};

interface CreateTopicWithProblemsOptions {
    courseId: number;
    questionCount: number;
    userIds: number[];
}

interface CreateTopicWithProblemsResult {
    grades: StudentGrade[];
    topic: CourseTopicContent;
    unit: CourseUnitContent;
}
export const createUnitAndTopicWithProblems = async ({ courseId, questionCount, userIds }: CreateTopicWithProblemsOptions): Promise<CreateTopicWithProblemsResult> => {
    logger.info('Creating content');
    logger.info('Creating unit');
    const unit = await courseController.createUnit({
        courseId: courseId,
        name: `${new Date().getTime()}`,
    });
    
    logger.info('Creating topic');
    const topic = await courseController.createTopic({
        // id
        // curriculumTopicContentId
        courseUnitContentId: unit.id,
        topicTypeId: TopicTypeLookup.HOMEWORK,
        name: `${new Date().getTime()}`,
        // active
        // contentOrder
        startDate: new Date('1/1/2021'),
        endDate: new Date('1/1/2022'),
        deadDate: new Date('1/1/2025'),
        // partialExtend
        // createdAt
        // updatedAt
        // originatingTopicContentId
    });

    logger.info('Creating questions');
    const result: StudentGrade[] = [];
    for (let i = 0; i < questionCount; i++) {
        const { grades } = await courseController.addQuestion({
            question: {
                courseTopicContentId: topic.id,
                webworkQuestionPath: 'private/templates/barebones.pg',
                weight: 1,
                maxAttempts: 99999,
                optional: false,
                hidden: false,
            },
            userIds: userIds
        });
        result.push(...grades);
    }
    logger.info('Creating content finished');
    return {
        grades: result,
        topic: topic,
        unit: unit
    };
};

interface CreateSubmissionsOptions {
    submissionsPerQuestion: number;
    grades: StudentGrade[];
    topicId: number;
};
export const createSubmissions = async ({ grades, submissionsPerQuestion, topicId }: CreateSubmissionsOptions): Promise<void> => {
    logger.info('Creating submissions');
    const totalSubmissions = grades.length * submissionsPerQuestion;
    await grades.sequentialAsyncForEach(async (grade, index) => {
        for(let i = 0; i < submissionsPerQuestion; i++) {
            // logger.info(`${i} - ${index}`);
            // const submissionNumber = (index * (i + 1)) + i + 1;
            const submissionNumber = (index * submissionsPerQuestion) + i + 1;
            if (submissionNumber % 100 === 0) {
                logger.info(`Creating submission ${submissionNumber} / ${totalSubmissions}`);
            }
            // const workbook =
            await StudentWorkbook.create({
                studentGradeId: grade.id,
                userId: grade.userId,
                courseWWTopicQuestionId: topicId,
                randomSeed: grade.randomSeed,
                problemPath: 'private/templates/barebones.pg',
                submitted: {},
                result: 1,
                time: new Date(),
                wasLate: false,
                wasExpired: false,
                wasAfterAttemptLimit: false,
                wasLocked: false,
                wasAutoSubmitted: false,
            });
            // logger.info(workbook.id);
        }
    });
};

interface RunOptions {
    courseId: number;
    userCount: number;
    questionCount: number;
    submissionsPerQuestion: number;
}

export const run = async ({
    courseId,
    userCount,
    questionCount,
    submissionsPerQuestion,
}: RunOptions): Promise<void> => {
    const userIds = await enroll({
        courseId: courseId,
        userCount: userCount
    });

    const {
        grades,
        topic
    } = await createUnitAndTopicWithProblems({
        questionCount: questionCount,
        courseId: courseId,
        userIds: userIds
    });

    await createSubmissions({
        grades: grades,
        submissionsPerQuestion: submissionsPerQuestion,
        topicId: topic.id
    });
};

export const trial1 = async (): Promise<void> => {
            // await stressTopicPlay.run({
        //     courseId: 302,
        //     questionCount: 30,
        //     submissionsPerQuestion: 10,
        //     userCount: 30
        // });
        // await courseController.reGradeTopic({
        //     topic: await courseController.getTopicById({
        //         id: 12392
        //     })
        // });
        // It's for timing in a playground
        // eslint-disable-next-line no-console
        console.time('TOMTOM');

        const endDate = new Date(new Date('2021-05-01 03:11:50.971+00').getTime() + 9999999);
        const startDate = new Date(new Date('2021-05-01 03:11:50.971+00').getTime() - 9999999);
        const deadDate = new Date(new Date('2021-05-01 03:11:50.971+00').getTime() + 99999999);

        const topic = await CourseTopicContent.findOne({
            where: {
                id: 12392
            }
        });

        if(!topic) throw new Error('topic not found');

        topic.endDate = endDate;
        topic.startDate = startDate;
        topic.deadDate = deadDate;
        await topic.save();

        const result = await courseController.getGradesThatNeedRegradeForTopicChange({
            topicId: 12392,
            dates: {
                endDate: {
                    // oldValue: new Date(0),
                    oldValue: new Date(0),
                    newValue: endDate
                },
                startDate: {
                    // oldValue: new Date(0),
                    oldValue: new Date(0),
                    newValue: startDate
                },
                deadDate: {
                    // oldValue: new Date(0),
                    oldValue: new Date(0),
                    newValue: deadDate
                }
            }
        });

        topic.gradeIdsThatNeedRetro = result.map(grade => grade.id);
        await topic.save();

        await courseController.regradeNeededGradesOnTopic({
            topicId: 12392
        });

        // It's for timing in a playground
        // eslint-disable-next-line no-console
        console.timeEnd('TOMTOM');
        logger.info(result.length);
        logger.info(result.first?.workbooks?.length);
};
