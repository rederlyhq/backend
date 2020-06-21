import * as _ from "lodash";
import Bluebird = require('bluebird');
import Course from '../../database/models/course';
import StudentEnrollment from '../../database/models/student-enrollment';
import { ForeignKeyConstraintError } from 'sequelize';
import NotFoundError from '../../exceptions/not-found-error';
import CourseUnitContent from '../../database/models/course-unit-content';
import CourseTopicContent from '../../database/models/course-topic-content';
import CourseWWTopicQuestion from '../../database/models/course-ww-topic-question';
import rendererHelper from '../../utilities/renderer-helper';
import StudentWorkbook from '../../database/models/student-workbook';
import StudentGrade from '../../database/models/student-grade';
import User from '../../database/models/user';
import logger from '../../utilities/logger';
// When changing to import it creates the following compiling error (on instantiation): This expression is not constructable.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Sequelize = require('sequelize');

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

interface UpdateTopicOptions {
    where: {
        id: number;
    };
    updates: {
        startDate: Date;
        endDate: Date;
    };
}

interface GetGradesOptions {
    where: {
        courseId?: number;
        unitId?: number;
        topicId?: number;
        questionId?: number;
    };
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

    async updateTopic(options: UpdateTopicOptions): Promise<number> {
        const updates = await CourseTopicContent.update(options.updates, {
            where: options.where
        });
        // updates count
        return updates[0];
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

        if (studentGrade === null) {
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

        const rendererData = await rendererHelper.getProblem({
            sourceFilePath: courseQuestion.webworkQuestionPath,
            problemSeed: studentGrade.randomSeed,
            formURL: question.formURL,
        });
        return {
            // courseQuestion,
            rendererData
        }
    }

    async submitAnswer(options: any): Promise<any> {
        const studentGrade = await StudentGrade.findOne({
            where: {
                userId: options.userId,
                courseWWTopicQuestionId: options.questionId
            }
        });

        const bestScore = Math.max(studentGrade.bestScore, options.score);

        studentGrade.bestScore = bestScore;
        studentGrade.numAttempts++;
        if (studentGrade.numAttempts === 1) {
            studentGrade.firstAttempts = options.score;
        }
        studentGrade.latestAttempts = options.score;
        await studentGrade.save();

        return StudentWorkbook.create({
            studentGradeId: studentGrade.id,
            userId: options.userId,
            courseWWTopicQuestionId: studentGrade.courseWWTopicQuestionId,
            randomSeed: studentGrade.randomSeed,
            submitted: options.submitted,
            result: options.score,
            time: new Date()
        })
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

    async findMissingGrades(): Promise<any[]> {
        const result = await User.findAll({
            include: [{
                model: StudentEnrollment,
                as: 'courseEnrollments',
                include: [{
                    model: Course,
                    as: 'course',
                    include: [{
                        model: CourseUnitContent,
                        as: 'units',
                        include: [{
                            model: CourseTopicContent,
                            as: 'topics',
                            include: [{
                                model: CourseWWTopicQuestion,
                                as: 'questions',
                                include: [{
                                    model: StudentGrade,
                                    as: 'grades',
                                    required: false
                                }]
                            }]
                        }]
                    }]
                }]
            }],
            where: {
                '$courseEnrollments.course.units.topics.questions.grades.id$': {
                    [Sequelize.Op.eq]: null
                }
            }
        });

        const results: any[] = [];
        result.forEach((student: any) => {
            student.courseEnrollments.forEach((studentEnrollment: any) => {
                studentEnrollment.course.units.forEach((unit: any) => {
                    unit.topics.forEach((topic: any) => {
                        topic.questions.forEach((question: any) => {
                            results.push({
                                student,
                                question,
                            });
                        });
                    });
                });
            })
        })
        return results;
    }

    async syncMissingGrades(): Promise<void> {
        const missingGrades = await this.findMissingGrades();
        logger.info(`Found ${missingGrades.length} missing grades`)
        await missingGrades.asyncForEach(async (missingGrade: any) => {
            await StudentGrade.create({
                userId: missingGrade.student.id,
                courseWWTopicQuestionId: missingGrade.question.id,
                randomSeed: Math.floor(Math.random() * 999999),
                bestScore: 0,
                numAttempts: 0,
                firstAttempts: 0,
                latestAttempts: 0,
            });
        });
    }

    async getGrades(options: GetGradesOptions): Promise<StudentGrade[]> {
        const {
            courseId,
            questionId,
            topicId,
            unitId
        } = options.where;

        const setFilterCount = [
            courseId,
            questionId,
            topicId,
            unitId
        ].reduce((accumulator, val) => accumulator + (!_.isNil(val) && 1 || 0), 0);

        if (setFilterCount !== 1) {
            throw new Error(`One filter must be set by found ${setFilterCount}`);
        }

        const where = _({
            '$question.topic.unit.course.id$': courseId,
            '$question.topic.unit.id$': unitId,
            '$question.topic.id$': topicId,
            '$question.id$': questionId,
        }).omitBy(_.isUndefined).value();

        return StudentGrade.findAll({
            include: [{
                model: User,
                as: 'user',
            }, {
                model: CourseWWTopicQuestion,
                as: 'question',
                include: [{
                    model: CourseTopicContent,
                    as: 'topic',
                    include: [{
                        model: CourseUnitContent,
                        as: 'unit',
                        include: [{
                            model: Course,
                            as: 'course',
                        }],
                    }],
                }],
            }],
            where
        });
    }
}

export const courseController = new CourseController();
export default courseController;