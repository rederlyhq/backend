import Bluebird = require('bluebird');
import Course from '../../database/models/course';
import StudentEnrollment from '../../database/models/student-enrollment';
import { ForeignKeyConstraintError } from 'sequelize';
import NotFoundError from '../../exceptions/not-found-error';
import CourseUnitContent from '../../database/models/course-unit-content';
import CourseTopicContent from '../../database/models/course-topic-content';
import CourseWWTopicQuestion from '../../database/models/course-ww-topic-question';
import rendererHelper from '../../utilities/renderer-helper';
import StudentGrade from '../../database/models/student-grade';

interface EnrollByCodeOptions {
    code: string;
    userId: number;
}

interface CourseListOptions {
    filter: {
        instructorId: number;
        enrolledUserId: number;
    };
}

interface GetQuestionOptions {
    userId: number;
    questionId: number;
}

class CourseController {
    getCourseById(id: number): Promise<Course> {
        return Course.findOne({
            where: {
                id,
            },
            include: [{
                model: CourseUnitContent,
                as: 'units',
                include: [{
                    model: CourseTopicContent,
                    as: 'topics',
                    include: [{
                        model: CourseWWTopicQuestion,
                        as: 'questions',
                    }]    
                }]
            }]
        })
    }

    getCourses(options: CourseListOptions): Bluebird<Course[]> {
        // Where is a dynamic sequelize object
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};
        const include = [];
        if (options.filter.instructorId !== null && options.filter.instructorId !== undefined) {
            where.instructorId = options.filter.instructorId;
        }

        if (options.filter.enrolledUserId !== null && options.filter.enrolledUserId !== undefined) {
            include.push({
                model: StudentEnrollment,
                attributes: [],
                as: 'enrolledStudents',
            });
            // TODO it doesn't like userId here and requires user_id, but it let's use use the sequelize field elseware
            where['$enrolledStudents.user_id$'] = options.filter.enrolledUserId;
        }

        return Course.findAll({
            where,
            include,
        });
    }

    createCourse(courseObject: Course): Bluebird<Course> {
        return Course.create(courseObject);
    }

    createUnit(courseUnitContent: CourseUnitContent): Promise<CourseUnitContent> {
        return CourseUnitContent.create(courseUnitContent);
    }

    createTopic(courseTopicContent: CourseTopicContent): Promise<CourseTopicContent> {
        return CourseTopicContent.create(courseTopicContent);
    }

    createQuestion(question: CourseWWTopicQuestion): Promise<CourseWWTopicQuestion> {
        return CourseWWTopicQuestion.create(question);
    }

    async getQuestion(question: any): Promise<any> {
        const courseQuestion = await CourseWWTopicQuestion.findOne({
            where: {
                id: question.questionId
            }
        });

        let studentGrade: StudentGrade;
        studentGrade = await StudentGrade.findOne({
            where: {
                userId: question.userId,
                courseWWTopicQuestionId: question.questionId
            }
        });

        if(studentGrade === null) {
            studentGrade = await StudentGrade.create({
                userId: question.userId,
                courseWWTopicQuestionId: question.questionId,
                randomSeed: Math.floor(Math.random() * 999999),
                bestScore: 0,
                numAttempts: 0,
                firstAttempts: 0,
                latestAttempts: 0,
            });
        }

        const rendererQuestion = await rendererHelper.getProblem({
            sourceFilePath: courseQuestion.webworkQuestionPath,
            problemSeed: studentGrade.randomSeed,
            formURL: question.formURL,
        });
        return {
            // courseQuestion,
            rendererQuestion
        }
    }
    getCourseByCode(code: string): Promise<Course> {
        return Course.findOne({
            where: {
                code
            }
        })
    }

    async enroll(enrollment: StudentEnrollment): Promise<StudentEnrollment> {
        try {
            return await StudentEnrollment.create(enrollment);
        } catch (e) {
            if (e instanceof ForeignKeyConstraintError) {
                throw new NotFoundError('User or course was not found');
            }
            throw e;
        }
    }

    async enrollByCode(enrollment: EnrollByCodeOptions): Promise<StudentEnrollment> {
        try {
            const course = await this.getCourseByCode(enrollment.code);
            if (course === null) {
                throw new NotFoundError('Could not find course with the given code');
            }
            return this.enroll({
                courseId: course.id,
                userId: enrollment.userId,
                enrollDate: new Date(),
                dropDate: new Date()
            } as StudentEnrollment);
        } catch (e) {
            if (e instanceof ForeignKeyConstraintError) {
                throw new NotFoundError('User or course was not found');
            }
            throw e;
        }
    }
}

export const courseController = new CourseController();
export default courseController;