import * as _ from 'lodash';
import WrappedError from '../../exceptions/wrapped-error';
import { Constants } from '../../constants';
import { UpdateQuestionOptions, UpdateQuestionsOptions, GetQuestionRepositoryOptions, UpdateCourseUnitsOptions, GetCourseUnitRepositoryOptions, UpdateTopicOptions, UpdateCourseTopicsOptions, GetCourseTopicRepositoryOptions, UpdateCourseOptions, UpdateGradeOptions, ExtendTopicForUserOptions, ExtendTopicQuestionForUserOptions } from './course-types';
import CourseWWTopicQuestion from '../../database/models/course-ww-topic-question';
import NotFoundError from '../../exceptions/not-found-error';
import AlreadyExistsError from '../../exceptions/already-exists-error';
import { BaseError } from 'sequelize';
import { UpdateResult, UpsertResult } from '../../generic-interfaces/sequelize-generic-interfaces';
import CourseUnitContent from '../../database/models/course-unit-content';
import { UpdateUnitOptions } from '../curriculum/curriculum-types';
import CourseTopicContent from '../../database/models/course-topic-content';
import Course from '../../database/models/course';
import logger from '../../utilities/logger';
import StudentWorkbook from '../../database/models/student-workbook';
import StudentGrade from '../../database/models/student-grade';
import StudentTopicOverride from '../../database/models/student-topic-override';
import StudentTopicQuestionOverride from '../../database/models/student-topic-question-override';
// When changing to import it creates the following compiling error (on instantiation): This expression is not constructable.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Sequelize = require('sequelize');

class CourseRepository {
    /* ************************* ************************* */
    /* ********************* Courses ********************* */
    /* ************************* ************************* */
    private checkCourseError(e: Error): void {
        if (e instanceof BaseError === false) {
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
        const databaseError = e as BaseError;
        switch (databaseError.originalAsSequelizeError?.constraint) {
            case Course.constraints.foreignKeyCurriculum:
                throw new NotFoundError('Could not create the course since the given curriculum does not exist');
            case Course.constraints.uniqueCourseCode:
                throw new AlreadyExistsError('A course already exists with this course code');
            default:
                throw new WrappedError(Constants.ErrorMessage.UNKNOWN_DATABASE_ERROR_MESSAGE, e);
        }
    }

    async createCourse(courseObject: Partial<Course>): Promise<Course> {
        try {
            return await Course.create(courseObject);
        } catch (e) {
            this.checkCourseError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    async updateCourse(options: UpdateCourseOptions): Promise<UpdateResult<Course>> {
        try {
            const updates = await Course.update(options.updates, {
                where: {
                    ...options.where,
                    // active: true
                },
                returning: true
            });
            return {
                updatedCount: updates[0],
                updatedRecords: updates[1],
            };
        } catch (e) {
            this.checkCourseError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    /* ************************* ************************* */
    /* ********************** Units ********************** */
    /* ************************* ************************* */
    async getCourseUnit(options: GetCourseUnitRepositoryOptions): Promise<CourseUnitContent> {
        const result = await CourseUnitContent.findOne({
            where: {
                id: options.id,
                active: true
            },
        });
        if (_.isNil(result)) {
            throw new NotFoundError('The requested course does not exist');
        }
        return result;
    }

    private checkCourseUnitError(e: Error): void {
        if (e instanceof BaseError === false) {
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
        const databaseError = e as BaseError;
        switch (databaseError.originalAsSequelizeError?.constraint) {
            // case CourseUnitContent.constraints.uniqueNamePerCourse:
            case CourseUnitContent.constraints.uniqueNamePerCourse:
                throw new AlreadyExistsError('A unit with that name already exists within this course');
            case CourseUnitContent.constraints.unqiueOrderPerCourse:
                throw new AlreadyExistsError('A unit already exists with this order');
            case CourseUnitContent.constraints.foreignKeyCourse:
                throw new NotFoundError('The given course was not found to create the unit');
            default:
                throw new WrappedError(Constants.ErrorMessage.UNKNOWN_DATABASE_ERROR_MESSAGE, e);
        }
    }
    
    async updateCourseUnit(options: UpdateUnitOptions): Promise<UpdateResult<CourseUnitContent>> {
        try {
            // makeUnitOrderAvailable
            const updates = await CourseUnitContent.update(options.updates, {
                where: {
                    ...options.where,
                    active: true
                },
                returning: true
            });
            return {
                updatedCount: updates[0],
                updatedRecords: updates[1],
            };
        } catch (e) {
            this.checkCourseUnitError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    async updateUnits(options: UpdateCourseUnitsOptions): Promise<UpdateResult<CourseUnitContent>> {
        try {
            const updates = await CourseUnitContent.update(options.updates, {
                where: {
                    ...options.where,
                    active: true
                },
                returning: true,
            });
            return {
                updatedCount: updates[0],
                updatedRecords: updates[1],
            };
        } catch (e) {
            this.checkCourseUnitError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    async createUnit(courseUnitContent: Partial<CourseUnitContent>): Promise<CourseUnitContent> {
        if (!_.isNil(courseUnitContent.active)) {
            logger.warn(new Error('Create unit should not be defining it\'s `active` status').stack);
        }

        try {
            return await CourseUnitContent.create({
                ...courseUnitContent,
                active: true // as of right now we don't support creating 
            });
        } catch (e) {
            this.checkCourseUnitError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    async getLatestDeletedContentOrderForCourse(courseId: number): Promise<number> {
        return CourseUnitContent.max('contentOrder', {
            where: {
                courseId: courseId,
                active: false,
                contentOrder: {
                    [Sequelize.Op.lt]: 0
                }
            }
        });
    }

    async getNextDeletedContentOrderForCourse(courseId: number): Promise<number> {
        let result = await this.getLatestDeletedContentOrderForCourse(courseId);
        if (_.isNaN(result)) {
            result = Constants.Database.MIN_INTEGER_VALUE;
        }
        return result + 1;
    }

    async getLatestContentOrderForCourse(courseId: number): Promise<number> {
        return CourseUnitContent.max('contentOrder', {
            where: {
                courseId: courseId,
                active: true,
            }
        });
    }

    async getNextContentOrderForCourse(courseId: number): Promise<number> {
        let result = await this.getLatestContentOrderForCourse(courseId);
        if (_.isNaN(result)) {
            result = 0;
        }
        return result + 1;
    }

    /* ************************* ************************* */
    /* ********************* Topics  ********************* */
    /* ************************* ************************* */
    async getCourseTopic(options: GetCourseTopicRepositoryOptions): Promise<CourseTopicContent> {
        const result = await CourseTopicContent.findOne({
            where: {
                id: options.id,
                active: true
            },
        });
        if (_.isNil(result)) {
            throw new NotFoundError('The requested topic does not exist');
        }
        return result;
    }

    private checkCourseTopicError(e: Error): void {
        if (e instanceof BaseError === false) {
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
        const databaseError = e as BaseError;
        switch (databaseError.originalAsSequelizeError?.constraint) {
            case CourseTopicContent.constraints.uniqueNamePerUnit:
                throw new AlreadyExistsError('A topic with that name already exists within this unit');
            case CourseTopicContent.constraints.uniqueOrderPerUnit:
                throw new AlreadyExistsError('A topic already exists with this unit order');
            case CourseTopicContent.constraints.foreignKeyUnit:
                throw new NotFoundError('A unit with the given unit id was not found');
            case CourseTopicContent.constraints.foreignKeyTopicType:
                throw new NotFoundError('Invalid topic type provided');
            default:
                throw new WrappedError(Constants.ErrorMessage.UNKNOWN_DATABASE_ERROR_MESSAGE, e);
        }
    }

    async createCourseTopic(courseTopicContent: Partial<CourseTopicContent>): Promise<CourseTopicContent> {
        if (!_.isNil(courseTopicContent.active)) {
            logger.warn(new Error('Create topic should not be defining it\'s `active` status').stack);
        }

        try {
            return await CourseTopicContent.create({
                ...courseTopicContent,
                active: true // as of right now we don't support creating deleted objects
            });
        } catch (e) {
            this.checkCourseTopicError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    async updateCourseTopic(options: UpdateTopicOptions): Promise<UpdateResult<CourseTopicContent>> {
        try {
            const updates = await CourseTopicContent.update(options.updates, {
                where: {
                    ...options.where,
                    active: true,
                },
                returning: true,
            });
            return {
                updatedCount: updates[0],
                updatedRecords: updates[1],
            };
        } catch (e) {
            this.checkCourseTopicError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    async extendTopicByUser(options: ExtendTopicForUserOptions): Promise<UpsertResult<StudentTopicOverride>> {
        try {
            const found = await StudentTopicOverride.findOne({where: {...options.where, active: true}});
            if (!found) {
                const newExtension = await StudentTopicOverride.create({...options.where, ...options.updates}, {validate: true});

                return {
                    createdNewEntry: true,
                    updatedCount: 1,
                    updatedRecords: [newExtension],
                };
            }
            const updates = await StudentTopicOverride.update(options.updates, {
                where: {
                    ...options.where,
                    active: true
                },
                returning: true,
            });
            return {
                createdNewEntry: false,
                updatedCount: updates[0],
                updatedRecords: updates[1],
            };
        } catch (e) {
            this.checkCourseTopicError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    async updateTopics(options: UpdateCourseTopicsOptions): Promise<UpdateResult<CourseTopicContent>> {
        try {
            const updates = await CourseTopicContent.update(options.updates, {
                where: {
                    ...options.where,
                    active: true
                },
                returning: true,
            });
            return {
                updatedCount: updates[0],
                updatedRecords: updates[1],
            };
        } catch (e) {
            this.checkCourseTopicError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    async getLatestDeletedContentOrderForUnit(courseUnitContentId: number): Promise<number> {
        return CourseTopicContent.max('contentOrder', {
            where: {
                courseUnitContentId: courseUnitContentId,
                active: false,
                contentOrder: {
                    [Sequelize.Op.lt]: 0
                }
            }
        });
    }

    async getNextDeletedContentOrderForUnit(courseUnitContentId: number): Promise<number> {
        let result = await this.getLatestDeletedContentOrderForUnit(courseUnitContentId);
        if (_.isNaN(result)) {
            result = Constants.Database.MIN_INTEGER_VALUE;
        }
        return result + 1;
    }

    async getLatestContentOrderForUnit(courseUnitContentId: number): Promise<number> {
        return CourseTopicContent.max('contentOrder', {
            where: {
                courseUnitContentId: courseUnitContentId,
                active: true,
            }
        });
    }

    async getNextContentOrderForUnit(courseUnitContentId: number): Promise<number> {
        let result = await this.getLatestContentOrderForUnit(courseUnitContentId);
        if (_.isNaN(result)) {
            result = 0;
        }
        return result + 1;
    }

    /* ************************* ************************* */
    /* ******************** Questions ******************** */
    /* ************************* ************************* */
    async getQuestion(options: GetQuestionRepositoryOptions): Promise<CourseWWTopicQuestion> {
        const include = [];
        if (options.userId) {
            include.push({
                model: StudentTopicQuestionOverride,
                as: 'studentTopicQuestionOverride',
                attributes: ['userId', 'maxAttempts'],
                required: false,
                where: {
                    active: true,
                    userId: options.userId
                }
            });
        }

        const result = await CourseWWTopicQuestion.findOne({
            where: {
                id: options.id,
                active: true
            },
            include
        });

        if (_.isNil(result)) {
            throw new NotFoundError('The requested question does not exist');
        }
        return result;
    }

    private checkQuestionError(e: Error): void {
        if (e instanceof BaseError === false) {
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
        const databaseError = e as BaseError;
        switch (databaseError.originalAsSequelizeError?.constraint) {
            case CourseWWTopicQuestion.constraints.uniqueOrderPerTopic:
                throw new AlreadyExistsError('A question with this topic order already exists');
            case CourseWWTopicQuestion.constraints.foreignKeyTopic:
                throw new NotFoundError('Could not create the question because the given topic does not exist');
            default:
                throw new WrappedError(Constants.ErrorMessage.UNKNOWN_DATABASE_ERROR_MESSAGE, e);
        }
    }
    
    async updateQuestions(options: UpdateQuestionsOptions): Promise<UpdateResult<CourseWWTopicQuestion>> {
        try {
            const updates = await CourseWWTopicQuestion.update(options.updates, {
                where: {
                    ...options.where,
                    active: true
                },
                returning: true,
            });
            return {
                updatedCount: updates[0],
                updatedRecords: updates[1],
            };
        } catch (e) {
            this.checkQuestionError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    async updateQuestion(options: UpdateQuestionOptions): Promise<UpdateResult<CourseWWTopicQuestion>> {
        try {
            const updates = await CourseWWTopicQuestion.update(options.updates, {
                where: {
                    ...options.where,
                    active: true
                },
                returning: true,
            });
            return {
                updatedCount: updates[0],
                updatedRecords: updates[1],
            };
        } catch (e) {
            this.checkQuestionError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    async createQuestion(question: Partial<CourseWWTopicQuestion>): Promise<CourseWWTopicQuestion> {
        if (!_.isNil(question.active)) {
            logger.warn(new Error('Create question should not be defining it\'s `active` status').stack);
        }

        try {
            return await CourseWWTopicQuestion.create({
                ...question,
                active: true // as of right now we don't support creating deleted questions
            });
        } catch (e) {
            this.checkQuestionError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    async getLatestProblemNumberForTopic(courseTopicId: number): Promise<number> {
        return CourseWWTopicQuestion.max('problemNumber', {
            where: {
                courseTopicContentId: courseTopicId,
                active: true
            }
        });
    }

    async getNextProblemNumberForTopic(courseTopicId: number): Promise<number> {
        let result = await this.getLatestProblemNumberForTopic(courseTopicId);
        if (_.isNaN(result)) {
            result = 0;
        }
        return result + 1;
    }

    async getLatestDeletedProblemNumberForTopic(courseTopicId: number): Promise<number> {
        return CourseWWTopicQuestion.max('problemNumber', {
            where: {
                courseTopicContentId: courseTopicId,
                active: false,
                problemNumber: {
                    [Sequelize.Op.lt]: 0
                }
            }
        });
    }

    async getNextDeletedProblemNumberForTopic(courseTopicId: number): Promise<number> {
        let result = await this.getLatestDeletedProblemNumberForTopic(courseTopicId);
        if (_.isNaN(result)) {
            result = Constants.Database.MIN_INTEGER_VALUE;
        }
        return result + 1;
    }

    async getWorkbookById(id: number): Promise<StudentWorkbook | null> {
        return StudentWorkbook.findOne({
            where: {
                id
            }
        });
    }

    async updateGrade(options: UpdateGradeOptions): Promise<UpdateResult<StudentGrade>> {
        try {
            const updates = await StudentGrade.update(options.updates, {
                where: {
                    ...options.where,
                    active: true
                },
                returning: true,
            });
            return {
                updatedCount: updates[0],
                updatedRecords: updates[1],
            };
        } catch (e) {
            // this.checkGradeError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    async createStudentTopicOverride(obj: Partial<StudentTopicOverride>): Promise<StudentTopicOverride> {
        try {
            return await StudentTopicOverride.create(obj);
        } catch (e) {
            throw new WrappedError('Could not create StudentTopicOverride', e);
        }
    }

    async createStudentTopicQuestionOverride(obj: Partial<StudentTopicQuestionOverride>): Promise<StudentTopicQuestionOverride> {
        try {
            return await StudentTopicQuestionOverride.create(obj);
        } catch (e) {
            throw new WrappedError('Could not create StudentTopicQuestionOverride', e);
        }
    }

    async extendTopicQuestionByUser(options: ExtendTopicQuestionForUserOptions): Promise<UpsertResult<StudentTopicQuestionOverride>> {
        try {
            console.log(options);
            const found = await StudentTopicQuestionOverride.findOne({where: {...options.where, active: true}});
            if (!found) {
                const newExtension = await StudentTopicQuestionOverride.create({...options.where, ...options.updates}, {validate: true});

                return {
                    createdNewEntry: true,
                    updatedCount: 1,
                    updatedRecords: [newExtension],
                };
            }
            const updates = await StudentTopicQuestionOverride.update(options.updates, {
                where: {
                    ...options.where,
                    active: true
                },
                returning: true,
            });
            return {
                createdNewEntry: false,
                updatedCount: updates[0],
                updatedRecords: updates[1],
            };
        } catch (e) {
            this.checkCourseTopicError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

}

const courseRepository = new CourseRepository();
export default courseRepository;
