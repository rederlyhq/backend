import * as _ from 'lodash';
import WrappedError from '../../exceptions/wrapped-error';
import { Constants } from '../../constants';
import { UpdateQuestionOptions, UpdateQuestionsOptions, GetQuestionRepositoryOptions, UpdateCourseUnitsOptions, GetCourseUnitRepositoryOptions, UpdateTopicOptions, UpdateCourseTopicsOptions, GetCourseTopicRepositoryOptions, UpdateCourseOptions, UpdateGradeOptions, UpdateGradeInstanceOptions, ExtendTopicForUserOptions, ExtendTopicQuestionForUserOptions, GetQuestionVersionDetailsOptions, GetStudentGradeInstanceOptions, GetCourseOptions, GetStudentGradeOptions, GetStudentTopicOverrideOptions } from './course-types';
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
import StudentGradeOverride from '../../database/models/student-grade-override';
import StudentGradeLockAction from '../../database/models/student-grade-lock-action';
import StudentGradeInstance from '../../database/models/student-grade-instance';
import * as moment from 'moment';
import IllegalArgumentException from '../../exceptions/illegal-argument-exception';
import StudentTopicAssessmentInfo from '../../database/models/student-topic-assessment-info';
import TopicAssessmentInfo from '../../database/models/topic-assessment-info';
import StudentTopicAssessmentOverride from '../../database/models/student-topic-assessment-override';
import CourseQuestionAssessmentInfo from '../../database/models/course-question-assessment-info';
import ProblemAttachment from '../../database/models/problem-attachment';
import StudentGradeProblemAttachment from '../../database/models/student-grade-problem-attachment';
import StudentGradeInstanceProblemAttachment from '../../database/models/student-grade-instance-problem-attachment';
import StudentWorkbookProblemAttachment from '../../database/models/student-workbook-problem-attachment';

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

    async getCourse(options: GetCourseOptions): Promise<Course> {
        try {
            const course = await Course.findOne({
                where: {
                    id: options.id,
                    active: true,
                }
            });
            if (_.isNil(course)) throw new Error(`Could not retrieve course with id ${options.id}`);
            return course;
        } catch (e) {
            throw new WrappedError(`Could not retrieve course with id ${options.id}`);
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
            include: [
                {
                    model: TopicAssessmentInfo,
                    as: 'topicAssessmentInfo',
                    where: {
                        active: true
                    },
                    required: false
                }
            ]
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
        const {
            checkDates = true
        } = options;
        if (checkDates) {
            // The use of DeepPartial on the type causes toMoment to be nullable.
            const dueDates = _.compact([options.updates.endDate?.toMoment?.(), options.updates.deadDate?.toMoment?.()]);
            // moment.min([]) returns right now, so if there are no due dates we def don't want to throw an error
            // Otherwise you can't set due dates in the past
            if (dueDates.length > 0 && moment.min(...dueDates).isBefore(moment())) {
                throw new IllegalArgumentException('End date and due date cannot be in the past');
            }
        }
        
        try {
            // console.log(options);
            const updates = await CourseTopicContent.update(options.updates, {
                where: {
                    ...options.where,
                    active: true,
                },
                returning: true,
            });

            if (updates[0] === 1 && 
                !_.isUndefined(options.updates.topicAssessmentInfo) && 
                !_.isEmpty(options.updates.topicAssessmentInfo)) {

                const updatedObj: CourseTopicContent = updates[1][0];

                const assessmentUpdates = await TopicAssessmentInfo.update(
                    options.updates.topicAssessmentInfo,
                    {
                        where: {
                            courseTopicContentId: updatedObj.id
                        },
                        returning: true,
                    });

                if (assessmentUpdates[0] === 0) {
                    await TopicAssessmentInfo.create({
                        courseTopicContentId: updatedObj.id,
                        ...options.updates.topicAssessmentInfo
                    });
                }
            }

            // TODO: Update to return Assessment Info object
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
        const {
            checkDates = true
        } = options;
        if (checkDates) {
            const dueDates = _.compact([options.updates.extensions?.endDate?.toMoment(), options.updates.extensions?.deadDate?.toMoment()]);
            // moment.min([]) returns right now, so if there are no due dates we def don't want to throw an error
            // Otherwise you can't set due dates in the past
            if (dueDates.length > 0 && moment.min(...dueDates).isBefore(moment())) {
                throw new IllegalArgumentException('End date and due date cannot be in the past');
            }
        }

        try {
            const found = await StudentTopicOverride.findOne({where: {...options.where, active: true}});
            const original = found?.get({ plain: true });
            
            if (!found) {
                const newExtension = await StudentTopicOverride.create({...options.where, ...options.updates.extensions}, {validate: true});

                return {
                    createdNewEntry: true,
                    updatedCount: 1,
                    updatedRecords: [newExtension],
                };
            } else {
                // TODO we weren't checking before that there were actually changes to be made, we should however check first and duck out if there are no changes
                const updates = await StudentTopicOverride.update(options.updates.extensions ?? {}, {
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
                    original,
                };
            }
        } catch (e) {
            throw new WrappedError(`Could not extend topic for ${options.where}`, e);
        }
    }

    async extendTopicAssessmentByUser(options: ExtendTopicForUserOptions): Promise<UpsertResult<StudentTopicAssessmentOverride>> {
        const { studentTopicAssessmentOverride } = options.updates;
        if (_.isNil(studentTopicAssessmentOverride) || _.isEmpty(studentTopicAssessmentOverride)) {
            logger.debug('No student topic assessment override provided, skipping');
            return {
                createdNewEntry: false,
                updatedCount: 0,
                updatedRecords: [],
                original: undefined,
            };
        }

        if (
            _.isNil(options.assessmentWhere) ||
            _.isNil(options.assessmentWhere.topicAssessmentInfoId)
        ) {
            throw new IllegalArgumentException('Cannot extend an assessment topic without topicAssessmentInfoId');
        }
        
        try {
            const found = await StudentTopicAssessmentOverride.findOne({
                where: {
                    userId: options.where.userId,
                    active: true
                },
                include: [{
                    model: TopicAssessmentInfo,
                    as: 'topicAssessmentInfo',
                    attributes: [],
                    where: {
                        courseTopicContentId: options.where.courseTopicContentId
                    }
                }]
            });
            const original = found?.get({ plain: true });
            
            if (!found) {
                logger.debug('Assessment override not found... creating');
                const newExtension = await StudentTopicAssessmentOverride.create({
                    userId: options.where.userId, 
                    ...options.assessmentWhere,
                    ...options.updates.studentTopicAssessmentOverride
                }, {validate: true});

                return {
                    createdNewEntry: true,
                    updatedCount: 1,
                    updatedRecords: [newExtension],
                };
            } else {
                logger.debug('Assessment override found... updating');
                // TODO we weren't checking before that there were actually changes to be made, we should however check first and duck out if there are no changes
                const updates = await StudentTopicAssessmentOverride.update(options.updates.studentTopicAssessmentOverride ?? {}, {
                    where: {
                        userId: options.where.userId, 
                        // Used spread initially but nil check did not persist (from top of function)
                        topicAssessmentInfoId: options.assessmentWhere.topicAssessmentInfoId,
                        active: true
                    },
                    returning: true,
                });

                return {
                    createdNewEntry: false,
                    updatedCount: updates[0],
                    updatedRecords: updates[1],
                    original,
                };
            }
        } catch (e) {
            throw new WrappedError(`Could not extend topic assessment for ${JSON.stringify(options.where)}`, e);
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

    async getTopicAssessmentInfoByTopicId(topicId: number): Promise<TopicAssessmentInfo> {
        const result = await TopicAssessmentInfo.findOne({
            where: {
                courseTopicContentId: topicId,
                active: true,
            }
        });
        if (_.isNil(result)) throw new WrappedError(`There is no topic assessment info for topic id: ${topicId}`);
        return result;
    }

    async getStudentTopicAssessmentOverride(id: number): Promise<StudentTopicAssessmentOverride> {
        try {
            const override = await StudentTopicAssessmentOverride.findOne({
                where: {
                    id,
                    active: true
                }
            });
            if (_.isNil(override)) throw new Error(`Could not find student topic override ${id}`);
            return override;
        } catch (e) {
            throw new WrappedError(`Failed while finding student topic override ${id}`);
        }
    }

    async getStudentTopicOverride(options: GetStudentTopicOverrideOptions): Promise<StudentTopicOverride | null> {
        try {
            const override = await StudentTopicOverride.findOne({
                where: {
                    userId: options.userId,
                    courseTopicContentId: options.topicId,
                    active: true
                }
            });
            return override; // null is fine, there might not *be* any override for this combo...
        } catch (e) {
            throw new WrappedError(`Failed while finding student topic override for user ${options.userId} and topic ${options.topicId}.`, e);
        }
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

    async getQuestionsFromTopicId(options: GetQuestionRepositoryOptions): Promise<CourseWWTopicQuestion[]> {
        const result = await CourseWWTopicQuestion.findAll({
            where: {
                courseTopicContentId: options.id,
                active: true
            },
        });
        if (_.isNil(result) || result.length === 0) {
            throw new NotFoundError(`No questions found for that topic - #${options.id}`);
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
    
    async getStudentGrade(options: GetStudentGradeOptions): Promise<StudentGrade | null> {
        const result = await StudentGrade.findOne({
            where: {
                id: options.id,
                active:true
            }
        });
        if (_.isNil(result)) throw new NotFoundError(`Requested grade #${options.id} not found`);
        return result;
    }

    async getStudentGradeInstance(options: GetStudentGradeInstanceOptions): Promise<StudentGradeInstance> {
        const result = await StudentGradeInstance.findOne({
            where: {
                id: options.id,
                active:true
            }
        });
        if (_.isNil(result)) throw new NotFoundError(`Requested grade instance #${options.id} not found`);
        return result;
    }

    /**
     * This function takes a questionId and a userId
     * It fetches the current gradeInstance, if one exists - returning null if there are no current gradeInstances
     * @param options: {questionId, userId}
     */
    async getCurrentInstanceForQuestion(options: GetQuestionVersionDetailsOptions): Promise<StudentGradeInstance | undefined> {
        // requires a userId and a questionId
        // questionId -> courseTopicContentId (unique, no query)
        // questionId + userId -> StudentGrade (unique)
        // topicId + userId -> StudentTopicAssessmentInfo (many, but only one current?)
        // gradeId + studentTopicAssessmentInfoId -> GradeInstance
        const question = await this.getQuestion({id: options.questionId});
        const topicId = question.courseTopicContentId;
        const topicInfo = await this.getTopicAssessmentInfoByTopicId(topicId);
        const studentGrade = await StudentGrade.findOne({
            where: {
                userId: options.userId,
                courseWWTopicQuestionId: options.questionId,
            }
        });
        if (_.isNil(studentGrade)) throw new IllegalArgumentException('No current version to get when there is no grade for this user.');

        const assessmentInfo = await StudentTopicAssessmentInfo.findAll({
            where: {
                topicAssessmentInfoId: topicInfo.id,
                userId: options.userId,
            },
            order: [
                ['id', 'DESC'], // this is admittedly bad, but 'endTime', 'DESC' was not sorting properly
            ]
        });

        // no versions created, or the most recent version timed out or was closed early
        if ( assessmentInfo.length === 0 || (
            (moment(assessmentInfo[0].endTime).isBefore(moment()) || 
            assessmentInfo[0].isClosed) && 
            topicInfo.hideProblemsAfterFinish) ) return; // no current version available

        const gradeInstance = await StudentGradeInstance.findOne({
            where: {
                studentGradeId: studentGrade.id,
                studentTopicAssessmentInfoId: assessmentInfo[0].id,
            }
        });
        if (_.isNil(gradeInstance)) throw new Error('Impossible! There is a current assessment without matching grade instance.');

        return gradeInstance;
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

            if (updates[0] > 1) {
                logger.error('A single question was expected to update, but multiple update objects are returned.');
            }

            if (updates[0] === 1 &&
                !_.isEmpty(options.updates.courseQuestionAssessmentInfo) &&
                !_.isUndefined(options.updates.courseQuestionAssessmentInfo)) {
                const updatedQuestion: CourseWWTopicQuestion = updates[1][0];

                const assessmentUpdates = await CourseQuestionAssessmentInfo.update(
                    options.updates.courseQuestionAssessmentInfo, {
                    where: {
                        courseWWTopicQuestionId: updatedQuestion.id,
                    },
                    returning: true
                });

                // Update failed, create new record.
                if (assessmentUpdates[0] === 0) {
                    await CourseQuestionAssessmentInfo.create({
                        courseWWTopicQuestionId: updatedQuestion.id,
                        ...options.updates.courseQuestionAssessmentInfo
                    });
                }
            }
            // TODO: Update to return Assessment Info object
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

    // this essentially replicates updateGrade -- seems unnecessary, but the tables are different
    async updateGradeInstance(options: UpdateGradeInstanceOptions): Promise<UpdateResult<StudentGradeInstance>> {
        try {
            const updates = await StudentGradeInstance.update(options.updates, {
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

    async createStudentGradeOverride(obj: Partial<StudentGradeOverride>): Promise<StudentGradeOverride> {
        try {
            return await StudentGradeOverride.create(obj);
        } catch (e) {
            // Check constraint errors if there are any
            throw new WrappedError('Could not create StudentGradeOverride', e);
        }
    }

    async createStudentGradeLockAction(obj: Partial<StudentGradeLockAction>): Promise<StudentGradeLockAction> {
        try {
            return await StudentGradeLockAction.create(obj);
        } catch (e) {
            // Check constraint errors if there are any
            throw new WrappedError('Could not create StudentGradeLockAction', e);
        }
    }

    async extendTopicQuestionByUser(options: ExtendTopicQuestionForUserOptions): Promise<UpsertResult<StudentTopicQuestionOverride>> {
        try {
            const found = await StudentTopicQuestionOverride.findOne({where: {...options.where, active: true}});
            const original = found?.get({ plain: true });
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
                original
            };
        } catch (e) {
            throw new WrappedError(`Could not extend question for ${options.where}`, e);
        }
    }

    createAttachment(obj: Partial<ProblemAttachment>): Promise<ProblemAttachment> {
        return ProblemAttachment.create(obj);
    }

    createStudentGradeProblemAttachment(obj: Partial<StudentGradeProblemAttachment>): Promise<StudentGradeProblemAttachment> {
        return StudentGradeProblemAttachment.create(obj);
    }

    createStudentGradeInstanceProblemAttachment(obj: Partial<StudentGradeInstanceProblemAttachment>): Promise<StudentGradeInstanceProblemAttachment> {
        return StudentGradeInstanceProblemAttachment.create(obj);
    }

    createStudentWorkbookProblemAttachment(obj: Partial<StudentWorkbookProblemAttachment>): Promise<StudentWorkbookProblemAttachment> {
        return StudentWorkbookProblemAttachment.create(obj);
    }
}

const courseRepository = new CourseRepository();
export default courseRepository;
