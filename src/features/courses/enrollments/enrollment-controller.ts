import * as _ from 'lodash';
import { BaseError, Op } from 'sequelize';
import { Constants } from '../../../constants';
import StudentEnrollment from '../../../database/models/student-enrollment';
import PendingEnrollment from '../../../database/models/pending-enrollment';
import Users from '../../../database/models/user';
import AlreadyExistsError from '../../../exceptions/already-exists-error';
import NotFoundError from '../../../exceptions/not-found-error';
import WrappedError from '../../../exceptions/wrapped-error';
import { useDatabaseTransaction } from '../../../utilities/database-helper';
import { BulkEnrollUsersOptions, BulkEnrollUsersResults, CreateGradesForUserEnrollmentsOptions, GetQuestionsThatRequireGradesForUsersOptions, GetQuestionsThatRequireGradesForUsersResult } from './enrollment-types';
import CourseTopicContent from '../../../database/models/course-topic-content';
import CourseUnitContent from '../../../database/models/course-unit-content';
import CourseWWTopicQuestion from '../../../database/models/course-ww-topic-question';
import StudentGrade from '../../../database/models/student-grade';
import courseController from '../course-controller';
import { UpdateResult } from '../../../generic-interfaces/sequelize-generic-interfaces';

class EnrollmentController {
    private async checkStudentEnrollmentError(e: Error): Promise<void> {
        if (e instanceof BaseError === false) {
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }

        const databaseError = e as BaseError;
        switch (databaseError.originalAsSequelizeError?.constraint) {
            case StudentEnrollment.constraints.uniqueUserPerCourse:
                throw new AlreadyExistsError('This user is already enrolled in this course');
            case StudentEnrollment.constraints.foreignKeyCourse:
                throw new NotFoundError('The given course could not be found thus we could not enroll the student');
            case StudentEnrollment.constraints.foreignKeyUser:
                throw new NotFoundError('The given user could not be found thus we could not enroll in the class');
            default:
                throw new WrappedError(Constants.ErrorMessage.UNKNOWN_DATABASE_ERROR_MESSAGE, e);
        }
    };

    async createStudentEnrollments(enrollments: Partial<StudentEnrollment>[]): Promise<StudentEnrollment[]> {
        try {
            return await StudentEnrollment.bulkCreate(enrollments);
        } catch (e) {
            this.checkStudentEnrollmentError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }
    /**
     * Get's a list of questions that are missing a grade
     * We can then go and create a course
     */
    async getQuestionsThatRequireGradesForUsers(options: GetQuestionsThatRequireGradesForUsersOptions): Promise<GetQuestionsThatRequireGradesForUsersResult> {
        const { courseId, userIds } = options;
        try {
            const questions = await CourseWWTopicQuestion.findAll({
                include: [{
                    model: CourseTopicContent,
                    as: 'topic',
                    required: true,
                    attributes: [],
                    where: {
                        active: true,
                    },
                    include: [{
                        model: CourseUnitContent,
                        as: 'unit',
                        required: true,
                        attributes: [],
                        // This where is fine here
                        // We just don't want further results to propogate
                        // Also we don't need course in the join, we need to add a relationship to go through course
                        where: {
                            courseId,
                            active: true,
                        },
                    }]
                }, {
                    model: StudentGrade,
                    as: 'grades',
                    required: false,
                    attributes: ['userId'],
                    where: {
                        active: true
                    }
                }],
                attributes: [
                    'id'
                ],
                where: {
                    active: true
                }
            });

            return _.flatten(questions.map(question => 
                (question.grades ?? []).filter(grade => userIds.includes(grade.userId)).map(grade => ({
                    userId: grade.userId,
                    courseTopicQuestionId: question.id
                }))
            ));

        } catch (e) {
            throw new WrappedError('Could not getQuestionsThatRequireGradesForUser', e);
        }
    }
    async createGradesForUserEnrollment(options: CreateGradesForUserEnrollmentsOptions): Promise<number> {
        return useDatabaseTransaction(async (): Promise<number> => {
            const { courseId, userIds } = options;
            const results = await this.getQuestionsThatRequireGradesForUsers({
                courseId,
                userIds
            });

            await this.createNewStudentGrades(results);
            return results.length;
        });
    }

    async createNewStudentGrades(gradeQuestionObjects: GetQuestionsThatRequireGradesForUsersResult): Promise<StudentGrade[]> {
        try {
            return await StudentGrade.bulkCreate(gradeQuestionObjects.map(gradeQuestionObject => courseController.generateStudentGrade(gradeQuestionObject)));
        } catch (e) {
            throw new WrappedError('Could not create new student grade', e);
        }
    }

    async bulkEnroll(options: BulkEnrollUsersOptions): Promise<BulkEnrollUsersResults> {
        const emails = options.userEmails.map(userEmail => userEmail.toLowerCase().trim());
        const users = await Users.findAll({
            attributes: ['id', 'email'],
            where: {
                active: true,
                email: {
                    [Op.in]: emails
                },
            },
            limit: emails.length
        });
        const userIds = users.map(user => user.id);
        const userEmails = users.map(user => user.email);

        let unregisteredEmails = _.difference(emails, userEmails);

        let fetchedEnrollments = await StudentEnrollment.findAll({
            where: {
                courseId: options.courseId,
                userId: {
                    [Op.in]: userIds
                },
            },
            limit: userIds.length
        });
        const missingEnrollmentUserIds = _.differenceBy(userIds, fetchedEnrollments.map(fetchedEnrollment => fetchedEnrollment.userId));
        let newEnrollments: StudentEnrollment[] = [];
        return await useDatabaseTransaction(async (): Promise<BulkEnrollUsersResults> => {
            if (missingEnrollmentUserIds.length > 0) {
                newEnrollments = await this.createStudentEnrollments(missingEnrollmentUserIds.map(userId => ({
                    userId: userId,
                    courseId: options.courseId,
                    enrollDate: new Date()
                })));
                await this.createGradesForUserEnrollment({
                    courseId: options.courseId,
                    userIds: missingEnrollmentUserIds
                });
            }

            if (fetchedEnrollments.length > 0) {
                fetchedEnrollments = (await StudentEnrollment.update({
                    dropDate: null
                }, {
                    where: {
                        id: {
                            [Op.in]: fetchedEnrollments.map(fetchedEnrollment => fetchedEnrollment.id)
                        }
                    },
                    returning: true
                }))[1]; // this is a tuple, so the first item is guarenteed
            }

            const existingPendingEnrollments = (await PendingEnrollment.update({
                active: true,
            }, {
                where: {
                    email: {
                        [Op.in]: unregisteredEmails
                    },
                    courseId: options.courseId
                },
                returning: true
            }))[1];
            
            const existingPendingEnrollmentEmails = existingPendingEnrollments.map(pendingEnrollment => pendingEnrollment.email);

            unregisteredEmails = _.difference(unregisteredEmails, existingPendingEnrollmentEmails);

            const pendingEnrollments = await PendingEnrollment.bulkCreate(unregisteredEmails.map(email => ({
                email: email,
                courseId: options.courseId
            })));

            const newlyEnrolledUsers = await Users.findAll({
                where: {
                    id: {
                        [Op.in]: userIds
                    },
                    active: true
                },
                limit: userIds.length
            });
            return {
                enrollments: [...fetchedEnrollments, ...newEnrollments],
                pendingEnrollments: [...existingPendingEnrollments, ...pendingEnrollments],
                newlyEnrolledUsers: newlyEnrolledUsers
            };
        });
    };

    getPendingEnrollments = (courseId: number): Promise<PendingEnrollment[]> => PendingEnrollment.findAll({
        where: {
            active: true,
            courseId: courseId
        }
    })

    deletePendingEnrollments = async (id: number): Promise<UpdateResult<PendingEnrollment>> => {
        const result = await PendingEnrollment.update({
            active: false
        }, {
            where: {
                id: id
            },
            returning: true
        });

        return {
            updatedRecords: result[1],
            updatedCount: result[0]
        };
    }
}
export const enrollmentController = new EnrollmentController();
export default enrollmentController;
