import * as _ from 'lodash';
import Bluebird = require('bluebird');
import Course from '../../database/models/course';
import StudentEnrollment from '../../database/models/student-enrollment';
import { BaseError } from 'sequelize';
import NotFoundError from '../../exceptions/not-found-error';
import CourseUnitContent from '../../database/models/course-unit-content';
import CourseTopicContent, { CourseTopicContentInterface } from '../../database/models/course-topic-content';
import CourseWWTopicQuestion, { CourseWWTopicQuestionInterface } from '../../database/models/course-ww-topic-question';
import rendererHelper, { GetProblemParameters, OutputFormat, RendererResponse } from '../../utilities/renderer-helper';
import StudentWorkbook from '../../database/models/student-workbook';
import StudentGrade from '../../database/models/student-grade';
import StudentGradeInstance from '../../database/models/student-grade-instance';
import User from '../../database/models/user';
import logger from '../../utilities/logger';
import sequelize = require('sequelize');
import WrappedError from '../../exceptions/wrapped-error';
import AlreadyExistsError from '../../exceptions/already-exists-error';
import { GetTopicsOptions, CourseListOptions, UpdateUnitOptions, UpdateTopicOptions, EnrollByCodeOptions, GetGradesOptions, GetStatisticsOnQuestionsOptions, GetStatisticsOnTopicsOptions, GetStatisticsOnUnitsOptions, GetQuestionOptions, GetQuestionResult, SubmitAnswerOptions, SubmitAnswerResult, FindMissingGradesResult, GetQuestionsOptions, GetQuestionsThatRequireGradesForUserOptions, GetUsersThatRequireGradeForQuestionOptions, CreateGradesForUserEnrollmentOptions, CreateGradesForQuestionOptions, CreateNewStudentGradeOptions, UpdateQuestionOptions, UpdateCourseOptions, MakeProblemNumberAvailableOptions, MakeUnitContentOrderAvailableOptions, MakeTopicContentOrderAvailableOptions, CreateCourseOptions, CreateQuestionsForTopicFromDefFileContentOptions, DeleteQuestionsOptions, DeleteTopicsOptions, DeleteUnitsOptions, GetCalculatedRendererParamsOptions, GetCalculatedRendererParamsResponse, UpdateGradeOptions, DeleteUserEnrollmentOptions, ExtendTopicForUserOptions, GetQuestionRepositoryOptions, ExtendTopicQuestionForUserOptions, GradeOptions, ReGradeStudentGradeOptions, ReGradeQuestionOptions, ReGradeTopicOptions, SetGradeFromSubmissionOptions, CreateGradeInstancesForAssessmentOptions, CreateNewStudentGradeInstanceOptions, GetStudentTopicAssessmentInfoOptions, GetTopicAssessmentInfoByTopicIdOptions, SubmittedAssessmentResultContext, SubmitAssessmentAnswerResult, ScoreAssessmentResult, UserCanStartNewVersionOptions, UserCanStartNewVersionResult, UserCanStartNewVersionResultData, UpdateGradeInstanceOptions, PreviewQuestionOptions, CanUserGetQuestionsOptions, CanUserGetQuestionsResult, CanUserViewQuestionIdOptions, CanUserViewQuestionIdResult } from './course-types';
import { Constants } from '../../constants';
import courseRepository from './course-repository';
import { UpdateResult, UpsertResult } from '../../generic-interfaces/sequelize-generic-interfaces';
import curriculumRepository from '../curriculum/curriculum-repository';
import CurriculumUnitContent from '../../database/models/curriculum-unit-content';
import CurriculumTopicContent from '../../database/models/curriculum-topic-content';
import CurriculumWWTopicQuestion from '../../database/models/curriculum-ww-topic-question';
import WebWorkDef, { Problem } from '../../utilities/web-work-def-parser';
import { nameof } from '../../utilities/typescript-helpers';
import Role from '../permissions/roles';
import moment = require('moment');
import RederlyExtendedError from '../../exceptions/rederly-extended-error';
import { calculateGrade, WillTrackAttemptReason } from '../../utilities/grading-helper';
import { useDatabaseTransaction } from '../../utilities/database-helper';
import StudentTopicOverride, { StudentTopicOverrideInterface } from '../../database/models/student-topic-override';
import StudentTopicQuestionOverride, { StudentTopicQuestionOverrideInterface } from '../../database/models/student-topic-question-override';
import IllegalArgumentException from '../../exceptions/illegal-argument-exception';
import StudentGradeOverride from '../../database/models/student-grade-override';
import StudentTopicAssessmentInfo from '../../database/models/student-topic-assessment-info';
import StudentTopicAssessmentOverride from '../../database/models/student-topic-assessment-override';
import TopicAssessmentInfo from '../../database/models/topic-assessment-info';
import CourseQuestionAssessmentInfo from '../../database/models/course-question-assessment-info';
import schedulerHelper from '../../utilities/scheduler-helper';
import configurations from '../../configurations';
// Had an error using standard import
// cspell:disable-next-line -- urljoin is the name of the library
import urljoin = require('url-join');
import userController from '../users/user-controller';

// When changing to import it creates the following compiling error (on instantiation): This expression is not constructable.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Sequelize = require('sequelize');

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
                        required: false,
                        where: {
                            active: true
                        }
                    }],
                    required: false,
                    where: {
                        active: true
                    }
                }],
                required: false,
                where: {
                    active: true
                }
            }],
            order: [
                ['units', 'contentOrder', 'ASC'],
                ['units', 'topics', 'contentOrder', 'ASC'],
                ['units', 'topics', 'questions', 'problemNumber', 'ASC'],
            ]
        });
    }

    getTopicById({id, userId, includeQuestions}: {id: number; userId?: number; includeQuestions?: boolean}): Promise<CourseTopicContent> {
        const include = [];
        const subInclude = [];
        if (!_.isNil(userId)) {
            include.push({
                model: StudentTopicOverride,
                as: 'studentTopicOverride',
                attributes: ['userId', 'startDate', 'endDate', 'deadDate'],
                required: false,
                where: {
                    active: true,
                    userId: userId
                }
            });
            subInclude.push({
                model: StudentTopicAssessmentInfo,
                as: 'studentTopicAssessmentInfo',
                required: false,
                where: {
                    active: true,
                    userId,
                },
                // order: [
                //     [StudentTopicAssessmentInfo, 'startTime', 'DESC'],
                // ]
            });

            subInclude.push({
                model: StudentTopicAssessmentOverride,
                as: 'studentTopicAssessmentOverride',
                required: false,
                where: {
                    active: true,
                    userId,
                },
            });
        }

        if (includeQuestions) {
            include.push({
                model: CourseWWTopicQuestion,
                as: 'questions',
                required: false,
                where: {
                    active: true,
                },
                include: [{
                    model: CourseQuestionAssessmentInfo,
                    as: 'courseQuestionAssessmentInfo',
                    required: false,
                    where: {
                        active: true,
                    }
                }]
            });
        }

        include.push({
            model: TopicAssessmentInfo,
            as: 'topicAssessmentInfo',
            required: false,
            where: {
                active: true,
                // courseTopicContentId: id,
            },
            include: subInclude
        });

        return CourseTopicContent.findOne({
            where: {
                id,
            },
            include
        });
    }

    getTopics(options: GetTopicsOptions): Promise<CourseTopicContent[]> {
        const { courseId, isOpen, userId } = options;
        const where: sequelize.WhereOptions = {
            active: true
        };
        const include = [];
        if (!_.isNil(courseId)) {
            include.push({
                model: CourseUnitContent,
                as: 'unit',
                attributes: []
            },
            {
                model: StudentTopicOverride,
                as: 'studentTopicOverride',
                attributes: ['userId', 'startDate', 'endDate', 'deadDate'],
                required: false
            });
            where[`$unit.${CourseUnitContent.rawAttributes.courseId.field}$`] = courseId;
            // where[`$studentTopicOverride.${StudentTopicOverride.rawAttributes.courseTopicContentId.field}$`] = `$${CourseTopicContent.rawAttributes.id.field}`;
        }
        
        if (isOpen) {
            const date = new Date();
            // If no userId is passed, show all active topics and topics with extensions (professor view)
            // TODO: Consider breaking these complex queries into functions that describe their utility.
            if (_.isNil(userId)) {
                where[Sequelize.Op.or] = [
                    {
                        [Sequelize.Op.and]: [
                            {
                                startDate: {
                                    [Sequelize.Op.lte]: date
                                }
                            },
                            {
                                deadDate: {
                                    [Sequelize.Op.gte]: date
                                }
                            },
                        ]
                    },
                    {
                        [Sequelize.Op.and]: [
                            {
                                [`$studentTopicOverride.${StudentTopicOverride.rawAttributes.startDate.field}$`]: {
                                    [Sequelize.Op.lte]: date,
                                }
                            },
                            {
                                [`$studentTopicOverride.${StudentTopicOverride.rawAttributes.deadDate.field}$`]: {
                                    [Sequelize.Op.gte]: date,
                                }
                            }
                        ]
                    }
                ];
            } else {
                // If you have overrides, use the overrides, else use the base daterange (student view)
                where[Sequelize.Op.or] = [
                    {
                        [Sequelize.Op.and]: [
                            {
                                startDate: {
                                    [Sequelize.Op.lte]: date
                                }
                            },
                            {
                                deadDate: {
                                    [Sequelize.Op.gte]: date
                                }
                            },
                            {
                                [`$studentTopicOverride.${StudentTopicOverride.rawAttributes.startDate.field}$`]: {
                                    [Sequelize.Op.is]: null,
                                }
                            },
                            {
                                [`$studentTopicOverride.${StudentTopicOverride.rawAttributes.deadDate.field}$`]: {
                                    [Sequelize.Op.is]: null,
                                }
                            },
                        ]
                    },
                    {
                        [Sequelize.Op.and]: [
                            {
                                [`$studentTopicOverride.${StudentTopicOverride.rawAttributes.startDate.field}$`]: {
                                    [Sequelize.Op.lte]: date,
                                }
                            },
                            {
                                [`$studentTopicOverride.${StudentTopicOverride.rawAttributes.deadDate.field}$`]: {
                                    [Sequelize.Op.gte]: date,
                                }
                            }
                        ]
                    }
                ];
            }

            // Only allow original dates if extension dates are null (i.e., no extension was given).
            // Otherwise, use the extension dates.

        }
        return CourseTopicContent.findAll({
            where,
            include
        });
    }

    getCourses(options: CourseListOptions): Bluebird<Course[]> {
        const where: sequelize.WhereOptions = {};
        const include: sequelize.IncludeOptions[] = [];
        if (options.filter.instructorId !== null && options.filter.instructorId !== undefined) {
            where.instructorId = options.filter.instructorId;
        }

        if (options.filter.enrolledUserId !== null && options.filter.enrolledUserId !== undefined) {
            include.push({
                model: StudentEnrollment,
                attributes: [],
                as: 'enrolledStudents',
            });
            where[`$enrolledStudents.${StudentEnrollment.rawAttributes.userId.field}$`] = options.filter.enrolledUserId;
        }

        return Course.findAll({
            where,
            include,
        });
    }

    async createCourse(options: CreateCourseOptions): Promise<Course> {
        if (options.options.useCurriculum) {
            return useDatabaseTransaction(async () => {
                // I didn't want this in the transaction, however use strict throws errors if not
                if (_.isNil(options.object.curriculumId)) {
                    throw new NotFoundError('Cannot useCurriculum if curriculumId is not given');
                }
                const curriculum = await curriculumRepository.getCurriculumById(options.object.curriculumId);
                const createdCourse = await courseRepository.createCourse(options.object);
                await curriculum.units?.asyncForEach(async (curriculumUnit: CurriculumUnitContent) => {
                    if (curriculumUnit.active === false) {
                        logger.warn(`Inactive curriculum unit was fetched in query for create course ID#${curriculumUnit.id}`);
                        return;
                    }
                    const createdCourseUnit = await courseRepository.createUnit({
                        // active: curriculumUnit.active,
                        contentOrder: curriculumUnit.contentOrder,
                        courseId: createdCourse.id,
                        curriculumUnitId: curriculumUnit.id,
                        name: curriculumUnit.name,
                    });
                    await curriculumUnit.topics?.asyncForEach(async (curriculumTopic: CurriculumTopicContent) => {
                        if (curriculumTopic.active === false) {
                            logger.warn(`Inactive curriculum topic was fetched in query for create course ID#${curriculumTopic.id}`);
                            return;
                        }
                        const createdCourseTopic: CourseTopicContent = await courseRepository.createCourseTopic({
                            // active: curriculumTopic.active,
                            curriculumTopicContentId: curriculumTopic.id,
                            courseUnitContentId: createdCourseUnit.id,
                            topicTypeId: curriculumTopic.topicTypeId,
                            name: curriculumTopic.name,
                            contentOrder: curriculumTopic.contentOrder,

                            startDate: createdCourse.end,
                            endDate: createdCourse.end,
                            deadDate: createdCourse.end,
                            partialExtend: false
                        });
                        await curriculumTopic.questions?.asyncForEach(async (curriculumQuestion: CurriculumWWTopicQuestion) => {
                            if (curriculumQuestion.active === false) {
                                logger.warn(`Inactive curriculum question was fetched in query for create course ID#${curriculumQuestion.id}`);
                                return;
                            }
                            await courseRepository.createQuestion({
                                // active: curriculumQuestion.active,
                                courseTopicContentId: createdCourseTopic.id,
                                problemNumber: curriculumQuestion.problemNumber,
                                webworkQuestionPath: curriculumQuestion.webworkQuestionPath,
                                weight: curriculumQuestion.weight,
                                maxAttempts: curriculumQuestion.maxAttempts,
                                hidden: curriculumQuestion.hidden,
                                optional: curriculumQuestion.optional,
                                curriculumQuestionId: curriculumQuestion.id
                            });
                        });
                    });
                });
                return createdCourse;
            });
        } else {
            return courseRepository.createCourse(options.object);
        }
    }

    async createUnit(courseUnitContent: Partial<CourseUnitContent>): Promise<CourseUnitContent> {
        if (_.isNil(courseUnitContent.contentOrder)) {
            if (_.isNil(courseUnitContent.courseId)) {
                throw new Error('We need a course id in order to get a content order');
            }
            courseUnitContent.contentOrder = await courseRepository.getNextContentOrderForCourse(courseUnitContent.courseId);
        }

        if (_.isNil(courseUnitContent.name)) {
            courseUnitContent.name = `Unit #${courseUnitContent.contentOrder}`;
        }
        return courseRepository.createUnit(courseUnitContent);
    }

    async createTopic(courseTopicContent: CourseTopicContent): Promise<CourseTopicContent> {
        if (_.isNil(courseTopicContent.startDate) || _.isNil(courseTopicContent.endDate) || _.isNil(courseTopicContent.deadDate)) {
            if (_.isNil(courseTopicContent.courseUnitContentId)) {
                throw new Error('Cannot assume start, end or dead date if a unit is not supplied');
            }

            const unit = await courseRepository.getCourseUnit({
                id: courseTopicContent.courseUnitContentId
            });

            const course = await unit.getCourse();

            // Date default to end date
            if (_.isNil(courseTopicContent.startDate)) {
                courseTopicContent.startDate = course.end;
            }

            if (_.isNil(courseTopicContent.endDate)) {
                courseTopicContent.endDate = course.end;
            }

            if (_.isNil(courseTopicContent.deadDate)) {
                courseTopicContent.deadDate = course.end;
            }
        }

        if (_.isNil(courseTopicContent.contentOrder)) {
            if (_.isNil(courseTopicContent.courseUnitContentId)) {
                throw new Error('Cannot assume assume content order if a unit is not supplied');
            }
            courseTopicContent.contentOrder = await courseRepository.getNextContentOrderForUnit(courseTopicContent.courseUnitContentId);
        }

        if (_.isNil(courseTopicContent.name)) {
            courseTopicContent.name = `Topic #${courseTopicContent.contentOrder}`;
        }
        return courseRepository.createCourseTopic(courseTopicContent);
    }

    async updateCourse(options: UpdateCourseOptions): Promise<Course[]> {
        const result = await courseRepository.updateCourse(options);
        return result.updatedRecords;
    }

    private async makeCourseTopicOrderAvailable(options: MakeTopicContentOrderAvailableOptions): Promise<UpdateResult<CourseTopicContent>[]> {
        return useDatabaseTransaction(async (): Promise<UpdateResult<CourseTopicContent>[]> => {
            // TODO make this more efficient
            // Currently this updates more records than it has to so that it can remain generic due to time constraints
            // See problem number comment for more details
            const contentOrderField = CourseTopicContent.rawAttributes.contentOrder.field;
            const decrementResult = await courseRepository.updateTopics({
                where: {
                    active: true,
                    contentOrder: {
                        [Sequelize.Op.gt]: options.sourceContentOrder,
                        // Don't want to mess with the object that was moved out of the way
                        [Sequelize.Op.lt]: Constants.Database.MAX_INTEGER_VALUE
                    },
                    courseUnitContentId: options.sourceCourseUnitId
                },
                updates: {
                    contentOrder: sequelize.literal(`-1 * (${contentOrderField} - 1)`),
                }
            });

            const fixResult = await courseRepository.updateTopics({
                where: {
                    active: true,
                    contentOrder: {
                        [Sequelize.Op.lt]: 0
                    },
                },
                updates: {
                    contentOrder: sequelize.literal(`ABS(${contentOrderField})`),
                }
            });

            const incrementResult = await courseRepository.updateTopics({
                where: {
                    active: true,
                    contentOrder: {
                        [Sequelize.Op.gte]: options.targetContentOrder,
                        // Don't want to mess with the object that was moved out of the way
                        [Sequelize.Op.lt]: Constants.Database.MAX_INTEGER_VALUE
                    },
                    courseUnitContentId: options.targetCourseUnitId
                },
                updates: {
                    contentOrder: sequelize.literal(`-1 * (${contentOrderField} + 1)`),
                }
            });

            const fixResult2 = await courseRepository.updateTopics({
                where: {
                    active: true,
                    contentOrder: {
                        [Sequelize.Op.lt]: 0
                    },
                },
                updates: {
                    contentOrder: sequelize.literal(`ABS(${contentOrderField})`),
                }
            });

            return [decrementResult, fixResult, incrementResult, fixResult2];

        });
    }

    async updateTopic(options: UpdateTopicOptions): Promise<CourseTopicContent[]> {
        const existingTopic = await courseRepository.getCourseTopic({
            id: options.where.id
        });

        const originalTopic = existingTopic.get({
            plain: true
        }) as CourseTopicContentInterface;

        return useDatabaseTransaction(async () => {
            // This is a set of all update results as they come in, since there are 5 updates that occur this will have 5 elements
            let updatesResults: UpdateResult<CourseTopicContent>[] = [];
            if (!_.isNil(options.updates.contentOrder) || !_.isNil(options.updates.courseUnitContentId)) {
                // What happens if you move from one topic to another? Disregarding since that should not be possible from the UI
                const sourceContentOrder = existingTopic.contentOrder;
                // Move the object out of the way for now, this is due to constraint issues
                // TODO make unique index a deferable unique constraint and then make the transaction deferable
                // NOTE: sequelize did not have a nice way of doing this on unique constraints that use the same key in a composite key
                existingTopic.contentOrder = Constants.Database.MAX_INTEGER_VALUE;
                await existingTopic.save();
                updatesResults = await this.makeCourseTopicOrderAvailable({
                    sourceContentOrder,
                    sourceCourseUnitId: existingTopic.courseUnitContentId,
                    targetContentOrder: options.updates.contentOrder ?? sourceContentOrder,
                    targetCourseUnitId: options.updates.courseUnitContentId ?? existingTopic.courseUnitContentId
                });
                if (_.isNil(options.updates.contentOrder) && !_.isNil(options.updates.courseUnitContentId)) {
                    options.updates.contentOrder = sourceContentOrder;
                }
            }

            const updateCourseTopicResult = await courseRepository.updateCourseTopic(options);
            updatesResults.push(updateCourseTopicResult);

            // Here we extract the list of updated records
            const updatesResultsUpdatedRecords: CourseTopicContent[][] = updatesResults.map((arr: UpdateResult<CourseTopicContent>) => arr.updatedRecords);
            // Here we come up with a list of all records (they are in the order in which they were updated)
            const updatedRecords: CourseTopicContent[] = new Array<CourseTopicContent>().concat(...updatesResultsUpdatedRecords);
            // Lastly we convert to an object and back to an array so that we only have the last updates
            const resultantUpdates: CourseTopicContent[] = _.chain(updatedRecords)
                .keyBy('id')
                .values()
                .value();

            if (updateCourseTopicResult.updatedCount > 0) {
                const topic = updateCourseTopicResult.updatedRecords[0];
                await this.reGradeTopic({
                    topic: topic,
                    // We will need to fetch these on a per user basis
                    topicOverride: undefined,
                    userId: undefined,
                    skipContext: {
                        originalTopic: originalTopic,
                        newTopic: topic,
                        skipIfPossible: true,
                    }
                });
            }
            return resultantUpdates;
        });
    }

    async extendTopicForUser(options: ExtendTopicForUserOptions): Promise<{extendTopicResult: UpsertResult<StudentTopicOverride>; extendTopicAssessmentResult: UpsertResult<StudentTopicAssessmentOverride>}> {
        return useDatabaseTransaction(async () =>  {
            const extendTopicResult = await courseRepository.extendTopicByUser(options);
            const extendTopicAssessmentResult = await courseRepository.extendTopicAssessmentByUser(options);
            if (extendTopicResult.updatedRecords.length > 0) {
                const topic = await courseRepository.getCourseTopic({
                    id: options.where.courseTopicContentId
                });
                const newOverride = extendTopicResult.updatedRecords[0];
                const originalOverride: StudentTopicOverrideInterface = extendTopicResult.original as StudentTopicOverrideInterface;
                
                const originalTopic: CourseTopicContentInterface = topic.getWithOverrides(originalOverride);
                const newTopic: CourseTopicContentInterface = topic.getWithOverrides(newOverride);

                await this.reGradeTopic({
                    topic,
                    topicOverride: newOverride,
                    // We are only overriding for one user so filter the results by that
                    userId: newOverride.userId,
                    skipContext: {
                        skipIfPossible: true,
                        originalTopic,
                        newTopic,
                    }
                });
            }
            return {
                extendTopicResult,
                extendTopicAssessmentResult
            };
        });
    }

    private async makeCourseUnitOrderAvailable(options: MakeUnitContentOrderAvailableOptions): Promise<UpdateResult<CourseUnitContent>[]> {
        return useDatabaseTransaction(async (): Promise<UpdateResult<CourseUnitContent>[]> => {
            // TODO make this more efficient
            // Currently this updates more records than it has to so that it can remain generic due to time constraints
            // See problem number comment for more details
            const contentOrderField = CourseUnitContent.rawAttributes.contentOrder.field;
            const decrementResult = await courseRepository.updateUnits({
                where: {
                    active: true,
                    contentOrder: {
                        [Sequelize.Op.gt]: options.sourceContentOrder,
                        // Don't want to mess with the object that was moved out of the way
                        [Sequelize.Op.lt]: Constants.Database.MAX_INTEGER_VALUE
                    },
                    courseId: options.sourceCourseId
                },
                updates: {
                    contentOrder: sequelize.literal(`-1 * (${contentOrderField} - 1)`),
                }
            });

            const fixResult = await courseRepository.updateUnits({
                where: {
                    active: true,
                    contentOrder: {
                        [Sequelize.Op.lt]: 0
                    },
                },
                updates: {
                    contentOrder: sequelize.literal(`ABS(${contentOrderField})`),
                }
            });

            const incrementResult = await courseRepository.updateUnits({
                where: {
                    active: true,
                    contentOrder: {
                        [Sequelize.Op.gte]: options.targetContentOrder,
                        // Don't want to mess with the object that was moved out of the way
                        [Sequelize.Op.lt]: Constants.Database.MAX_INTEGER_VALUE
                    },
                    courseId: options.targetCourseId
                },
                updates: {
                    contentOrder: sequelize.literal(`-1 * (${contentOrderField} + 1)`),
                }
            });

            const fixResult2 = await courseRepository.updateUnits({
                where: {
                    active: true,
                    contentOrder: {
                        [Sequelize.Op.lt]: 0
                    },
                },
                updates: {
                    contentOrder: sequelize.literal(`ABS(${contentOrderField})`),
                }
            });

            return [decrementResult, fixResult, incrementResult, fixResult2];
        });
    }

    async softDeleteQuestions(options: DeleteQuestionsOptions): Promise<UpdateResult<CourseWWTopicQuestion>> {
        let courseTopicContentId = options.courseTopicContentId;
        return useDatabaseTransaction(async (): Promise<UpdateResult<CourseWWTopicQuestion>> => {
            const where: sequelize.WhereOptions = _({
                id: options.id,
                courseTopicContentId,
                active: true
            }).omitBy(_.isUndefined).value() as sequelize.WhereOptions;

            // It will always have active, needs more info than that
            if (Object.keys(where).length < 2) {
                throw new Error('Not enough information in where clause');
            }

            let existingQuestion: CourseWWTopicQuestion | null = null;
            if (_.isNil(courseTopicContentId) && !_.isNil(options.id)) {
                existingQuestion = await courseRepository.getQuestion({
                    id: options.id
                });
                courseTopicContentId = existingQuestion.courseTopicContentId;
            }

            if (_.isNil(courseTopicContentId)) {
                throw new Error('Could not figure out course topic content id');
            }

            let problemNumber: number | sequelize.Utils.Literal = await courseRepository.getNextDeletedProblemNumberForTopic(courseTopicContentId);
            if (!_.isNil(courseTopicContentId)) {
                problemNumber = sequelize.literal(`${CourseWWTopicQuestion.rawAttributes.problemNumber.field} + ${problemNumber}`);
            }

            const results: UpdateResult<CourseWWTopicQuestion> = await courseRepository.updateQuestions({
                where,
                updates: {
                    active: false,
                    problemNumber
                }
            });

            if (!_.isNil(existingQuestion)) {
                const problemNumberField = CourseWWTopicQuestion.rawAttributes.problemNumber.field;
                await courseRepository.updateQuestions({
                    where: {
                        active: true,
                        problemNumber: {
                            [Sequelize.Op.gt]: existingQuestion.problemNumber,
                            // Don't want to mess with the object that was moved out of the way
                            [Sequelize.Op.lt]: Constants.Database.MAX_INTEGER_VALUE
                        },
                        courseTopicContentId: existingQuestion.courseTopicContentId
                    },
                    updates: {
                        problemNumber: sequelize.literal(`${problemNumberField} - 1`),
                    }
                });
            }

            return results;
        });
    }

    async softDeleteTopics(options: DeleteTopicsOptions): Promise<UpdateResult<CourseTopicContent>> {
        let courseUnitContentId = options.courseUnitContentId;
        return useDatabaseTransaction(async (): Promise<UpdateResult<CourseTopicContent>> => {
            const results: CourseTopicContent[] = [];
            let updatedCount = 0;
            const where: sequelize.WhereOptions = _({
                id: options.id,
                courseUnitContentId: courseUnitContentId,
                active: true
            }).omitBy(_.isUndefined).value() as sequelize.WhereOptions;

            // It will always have active, needs more info than that
            if (Object.keys(where).length < 2) {
                throw new Error('Not enough information in where clause');
            }

            let existingTopic: CourseTopicContent | null = null;
            if (_.isNil(courseUnitContentId) && !_.isNil(options.id)) {
                existingTopic = await courseRepository.getCourseTopic({
                    id: options.id
                });
                courseUnitContentId = existingTopic.courseUnitContentId;
            }

            if (_.isNil(courseUnitContentId)) {
                throw new Error('Could not figure out course unit content id');
            }

            let contentOrder: number | sequelize.Utils.Literal = await courseRepository.getNextDeletedContentOrderForUnit(courseUnitContentId);
            let name: sequelize.Utils.Literal = sequelize.literal(`${CourseTopicContent.rawAttributes[nameof<CourseTopicContent>('name') as string].field} || ${contentOrder}`);
            if (!_.isNil(courseUnitContentId)) {
                const problemNumberLiteralString = `${CourseTopicContent.rawAttributes[nameof<CourseTopicContent>('contentOrder') as string].field} + ${contentOrder}`;
                contentOrder = sequelize.literal(problemNumberLiteralString);
                name = sequelize.literal(`${CourseTopicContent.rawAttributes[nameof<CourseTopicContent>('name') as string].field} || (${problemNumberLiteralString})`);
            }

            const updateCourseTopicResult: UpdateResult<CourseTopicContent> = await courseRepository.updateTopics({
                where,
                updates: {
                    active: false,
                    contentOrder,
                    name
                }
            });

            // TODO should this be returned in the response
            if (!_.isNil(existingTopic)) {
                const contentOrderField = CourseTopicContent.rawAttributes.contentOrder.field;
                await courseRepository.updateTopics({
                    where: {
                        active: true,
                        contentOrder: {
                            [Sequelize.Op.gt]: existingTopic.contentOrder,
                            // Don't want to mess with the object that was moved out of the way
                            [Sequelize.Op.lt]: Constants.Database.MAX_INTEGER_VALUE
                        },
                        courseUnitContentId: existingTopic.courseUnitContentId
                    },
                    updates: {
                        contentOrder: sequelize.literal(`${contentOrderField} - 1`),
                    }
                });
            }

            updatedCount = updateCourseTopicResult.updatedCount;
            await updateCourseTopicResult.updatedRecords.asyncForEach(async (topic: CourseTopicContent) => {
                const result: CourseTopicContent = {
                    ...topic.get({ plain: true }),
                    questions: []
                } as never as CourseTopicContent;

                const questionsResult: UpdateResult<CourseWWTopicQuestion> = await this.softDeleteQuestions({
                    courseTopicContentId: topic.id
                });

                result.questions?.push(...questionsResult.updatedRecords);
                updatedCount += questionsResult.updatedCount;
                results.push(result);
            });
            return {
                updatedCount: updatedCount,
                updatedRecords: results
            };
        });
    }

    async softDeleteUnits(options: DeleteUnitsOptions): Promise<UpdateResult<CourseUnitContent>> {
        return useDatabaseTransaction(async (): Promise<UpdateResult<CourseUnitContent>> => {
            const results: CourseUnitContent[] = [];
            let updatedCount = 0;
            const where: sequelize.WhereOptions = _({
                id: options.id,
                active: true
            }).omitBy(_.isUndefined).value() as sequelize.WhereOptions;

            // It will always have active, needs more info than that
            if (Object.keys(where).length < 2) {
                throw new Error('Not enough information in where clause');
            }

            // When deleting multiple units is support this will need to be handled like the other calls
            const existingUnit = await courseRepository.getCourseUnit({
                id: options.id
            });
            const courseId = existingUnit.courseId;

            const contentOrder: number | sequelize.Utils.Literal = await courseRepository.getNextDeletedContentOrderForCourse(courseId);
            const name: sequelize.Utils.Literal = sequelize.literal(`${CourseUnitContent.rawAttributes[nameof<CourseUnitContent>('name') as string].field} || ${contentOrder}`);

            const updateCourseUnitResult = await courseRepository.updateUnits({
                where,
                updates: {
                    active: false,
                    contentOrder,
                    name
                }
            });

            const contentOrderField = CourseUnitContent.rawAttributes.contentOrder.field;
            await courseRepository.updateUnits({
                where: {
                    active: true,
                    contentOrder: {
                        [Sequelize.Op.gt]: existingUnit.contentOrder,
                        // Don't want to mess with the object that was moved out of the way
                        [Sequelize.Op.lt]: Constants.Database.MAX_INTEGER_VALUE
                    },
                    courseId: existingUnit.courseId
                },
                updates: {
                    contentOrder: sequelize.literal(`${contentOrderField} - 1`),
                }
            });


            await updateCourseUnitResult.updatedRecords.asyncForEach(async (unit: CourseUnitContent) => {
                const result: CourseUnitContent = {
                    ...unit.get({ plain: true }),
                    topics: []
                } as never as CourseUnitContent;

                const topicResult: UpdateResult<CourseTopicContent> = await this.softDeleteTopics({
                    courseUnitContentId: unit.id
                });

                result.topics?.push(...topicResult.updatedRecords);
                updatedCount += topicResult.updatedCount;
                results.push(result);
            });

            return {
                updatedCount: updatedCount,
                updatedRecords: results
            };
        });
    }

    async updateCourseUnit(options: UpdateUnitOptions): Promise<CourseUnitContent[]> {
        return useDatabaseTransaction(async () => {
            // This is a set of all update results as they come in, since there are 5 updates that occur this will have 5 elements
            let updatesResults: UpdateResult<CourseUnitContent>[] = [];
            if (!_.isNil(options.updates.contentOrder)) {
                // What happens if you move from one topic to another? Disregarding since that should not be possible from the UI
                const existingUnit = await courseRepository.getCourseUnit({
                    id: options.where.id
                });
                const sourceContentOrder = existingUnit.contentOrder;
                // Move the object out of the way for now, this is due to constraint issues
                // TODO make unique index a deferable unique constraint and then make the transaction deferable
                // NOTE: sequelize did not have a nice way of doing this on unique constraints that use the same key in a composite key
                existingUnit.contentOrder = Constants.Database.MAX_INTEGER_VALUE;
                await existingUnit.save();
                updatesResults = await this.makeCourseUnitOrderAvailable({
                    sourceContentOrder,
                    sourceCourseId: existingUnit.courseId,
                    targetContentOrder: options.updates.contentOrder,
                    targetCourseId: options.updates.courseId ?? existingUnit.courseId
                });
            }
            const updateCourseUnitResult = await courseRepository.updateCourseUnit(options);
            updatesResults.push(updateCourseUnitResult);

            // Here we extract the list of updated records
            const updatesResultsUpdatedRecords: CourseUnitContent[][] = updatesResults.map((arr: UpdateResult<CourseUnitContent>) => arr.updatedRecords);
            // Here we come up with a list of all records (they are in the order in which they were updated)
            const updatedRecords: CourseUnitContent[] = new Array<CourseUnitContent>().concat(...updatesResultsUpdatedRecords);
            // Lastly we convert to an object and back to an array so that we only have the last updates
            const resultantUpdates: CourseUnitContent[] = _.chain(updatedRecords)
                .keyBy('id')
                .values()
                .value();
            return resultantUpdates;
        });
    }

    private async makeProblemNumberAvailable(options: MakeProblemNumberAvailableOptions): Promise<UpdateResult<CourseWWTopicQuestion>[]> {
        return useDatabaseTransaction(async (): Promise<UpdateResult<CourseWWTopicQuestion>[]> => {
            // TODO make this more efficient
            // Currently this updates more records than it has to so that it can remain generic due to time constraints
            // i.e. if update the problem number from 1 to 1, it will increment and decrement all question in the topic
            // if that problem number update was the only parameter we would not actually make any changes even though it updated all the records
            const problemNumberField = CourseWWTopicQuestion.rawAttributes.problemNumber.field;
            const decrementResult = await courseRepository.updateQuestions({
                where: {
                    active: true,
                    problemNumber: {
                        [Sequelize.Op.gt]: options.sourceProblemNumber,
                        // Don't want to mess with the object that was moved out of the way
                        [Sequelize.Op.lt]: Constants.Database.MAX_INTEGER_VALUE
                    },
                    courseTopicContentId: options.sourceTopicId
                },
                updates: {
                    problemNumber: sequelize.literal(`-1 * (${problemNumberField} - 1)`),
                }
            });

            const fixResult = await courseRepository.updateQuestions({
                where: {
                    active: true,
                    problemNumber: {
                        [Sequelize.Op.lt]: 0
                    },
                },
                updates: {
                    problemNumber: sequelize.literal(`ABS(${problemNumberField})`),
                }
            });

            const incrementResult = await courseRepository.updateQuestions({
                where: {
                    active: true,
                    problemNumber: {
                        [Sequelize.Op.gte]: options.targetProblemNumber,
                        // Don't want to mess with the object that was moved out of the way
                        [Sequelize.Op.lt]: Constants.Database.MAX_INTEGER_VALUE
                    },
                    courseTopicContentId: options.targetTopicId
                },
                updates: {
                    problemNumber: sequelize.literal(`-1 * (${problemNumberField} + 1)`),
                }
            });

            const fixResult2 = await courseRepository.updateQuestions({
                where: {
                    active: true,
                    problemNumber: {
                        [Sequelize.Op.lt]: 0
                    },
                },
                updates: {
                    problemNumber: sequelize.literal(`ABS(${problemNumberField})`),
                }
            });

            return [decrementResult, fixResult, incrementResult, fixResult2];
        });
    }

    updateQuestion(options: UpdateQuestionOptions): Promise<CourseWWTopicQuestion[]> {
        return useDatabaseTransaction(async () => {
            const existingQuestion = await courseRepository.getQuestion({
                id: options.where.id
            });
            const originalQuestion = existingQuestion.get({ plain: true }) as CourseWWTopicQuestionInterface;

            // This is a set of all update results as they come in, since there are 5 updates that occur this will have 5 elements
            let updatesResults: UpdateResult<CourseWWTopicQuestion>[] = [];
            if (!_.isNil(options.updates.problemNumber)) {
                // What happens if you move from one topic to another? Disregarding since that should not be possible from the UI
                const sourceProblemNumber = existingQuestion.problemNumber;
                // Move the question out of the way for now, this is due to constraint issues
                // TODO make unique index a deferable unique constraint and then make the transaction deferable
                // NOTE: sequelize did not have a nice way of doing this on unique constraints that use the same key in a composite key
                existingQuestion.problemNumber = Constants.Database.MAX_INTEGER_VALUE;
                await existingQuestion.save();
                updatesResults = await this.makeProblemNumberAvailable({
                    sourceProblemNumber: sourceProblemNumber,
                    sourceTopicId: existingQuestion.courseTopicContentId,
                    targetProblemNumber: options.updates.problemNumber,
                    targetTopicId: options.updates.courseTopicContentId ?? existingQuestion.courseTopicContentId
                });
            }
            const updateQuestionResult = await courseRepository.updateQuestion(options);
            updatesResults.push(updateQuestionResult);

            // Here we extract the list of updated records
            const updatesResultsUpdatedRecords: CourseWWTopicQuestion[][] = updatesResults.map((arr: UpdateResult<CourseWWTopicQuestion>) => arr.updatedRecords);
            // Here we come up with a list of all records (they are in the order in which they were updated)
            const updatedRecords: CourseWWTopicQuestion[] = new Array<CourseWWTopicQuestion>().concat(...updatesResultsUpdatedRecords);
            // Lastly we convert to an object and back to an array so that we only have the last updates
            const resultantUpdates: CourseWWTopicQuestion[] = _.chain(updatedRecords)
                .keyBy('id')
                .values()
                .value();

            if (updateQuestionResult.updatedCount > 0) {
                const question = updateQuestionResult.updatedRecords[0];
                const newQuestion = question.get({ plain: true }) as CourseWWTopicQuestionInterface;
                await this.reGradeQuestion({
                    question,
                    skipContext: {
                        skipIfPossible: true,
                        originalQuestion,
                        newQuestion,
                    }
                });
            }
            return resultantUpdates;
        });
    }

    async updateGrade(options: UpdateGradeOptions): Promise<UpdateResult<StudentGrade>> {
        return useDatabaseTransaction(async (): Promise<UpdateResult<StudentGrade>> => {
            if (!_.isNil(options.updates.effectiveScore)) {
                await courseRepository.createStudentGradeOverride({
                    studentGradeId: options.where.id,
                    initiatingUserId: options.initiatingUserId,
                    newValue: options.updates.effectiveScore,
                });
            }

            if (!_.isNil(options.updates.locked)) {
                await courseRepository.createStudentGradeLockAction({
                    studentGradeId: options.where.id,
                    initiatingUserId: options.initiatingUserId,
                    newValue: options.updates.locked
                });
            }

            try {
                return await courseRepository.updateGrade(options);
            } catch (e) {
                throw new WrappedError('Could not update the grade', e);
            }
        });
    }

    async updateGradeInstance(options: UpdateGradeInstanceOptions): Promise<UpdateResult<StudentGradeInstance>> {
        return useDatabaseTransaction(async (): Promise<UpdateResult<StudentGradeInstance>> => {
            try {
                return await courseRepository.updateGradeInstance(options);
            } catch (e) {
                throw new WrappedError('Could not update the grade instance', e);
            }
        });
    }

    async createQuestion(question: Partial<CourseWWTopicQuestion>): Promise<CourseWWTopicQuestion> {
        if (_.isNil(question.problemNumber)) {
            if (_.isNil(question.courseTopicContentId)) {
                throw new Error('Cannot assume problem number if a topic is not provided');
            }
            question.problemNumber = await courseRepository.getNextProblemNumberForTopic(question.courseTopicContentId);
        }
        return courseRepository.createQuestion(question);
    }

    async createQuestionsForTopicFromDefFileContent(options: CreateQuestionsForTopicFromDefFileContentOptions): Promise<CourseWWTopicQuestion[]> {
        const parsedWebworkDef = new WebWorkDef(options.webworkDefFileContent);
        let lastProblemNumber = await courseRepository.getLatestProblemNumberForTopic(options.courseTopicId) || 0;
        // TODO fix typings - remove any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return useDatabaseTransaction<any>((): Promise<any> => {
            return parsedWebworkDef.problems.asyncForEach(async (problem: Problem) => {
                return this.addQuestion({
                    // active: true,
                    courseTopicContentId: options.courseTopicId,
                    problemNumber: ++lastProblemNumber,
                    webworkQuestionPath: problem.source_file,
                    weight: parseInt(problem.value ?? '1'),
                    maxAttempts: parseInt(problem.max_attempts ?? '-1'),
                    hidden: false,
                    optional: false
                });
            });
        });
    }

    async addQuestion(question: Partial<CourseWWTopicQuestion>): Promise<CourseWWTopicQuestion> {
        return await useDatabaseTransaction(async () => {
            const result = await this.createQuestion(question);
            await this.createGradesForQuestion({
                questionId: result.id
            });
            return result;
        });
    }

    getQuestionRecord(id: number): Promise<CourseWWTopicQuestion> {
        return courseRepository.getQuestion({
            id
        });
    }

    async getCalculatedRendererParams({
        role,
        topic,
        courseQuestion
    }: GetCalculatedRendererParamsOptions): Promise<GetCalculatedRendererParamsResponse> {
        let showSolutions = role !== Role.STUDENT;
        // Currently we only need this fetch for student, small optimization to not call the db again
        if (!showSolutions) {
            if (_.isNil(topic)) {
                topic = await this.getTopicById({id: courseQuestion.courseTopicContentId});
            }
            showSolutions = moment(topic.deadDate).add(Constants.Course.SHOW_SOLUTIONS_DELAY_IN_DAYS, 'days').isBefore(moment());
        }
        return {
            outputformat: rendererHelper.getOutputFormatForRole(role),
            permissionLevel: rendererHelper.getPermissionForRole(role),
            showSolutions: Number(showSolutions),
        };
    }

    async extendQuestionForUser(options: ExtendTopicQuestionForUserOptions): Promise<UpsertResult<StudentTopicQuestionOverride>> {
        return useDatabaseTransaction(async () =>  {
            const result = await courseRepository.extendTopicQuestionByUser(options);
            if (result.updatedRecords.length > 0) {
                const question = await courseRepository.getQuestion({
                    id: options.where.courseTopicQuestionId
                });
                const originalOverride: StudentTopicQuestionOverrideInterface = result.original as StudentTopicQuestionOverrideInterface;
                const newOverride = result.updatedRecords[0];
                // Since only the override is changing the question would be the same except the overrides
                const originalQuestion: CourseWWTopicQuestionInterface  = question.getWithOverrides(originalOverride);
                const newQuestion: CourseWWTopicQuestionInterface  = question.getWithOverrides(newOverride);
                await this.reGradeQuestion({
                    question,
                    // We are only overriding for one user so filter the results by that
                    userId: newOverride.userId,
                    questionOverride: newOverride,
                    skipContext: {
                        skipIfPossible: true,
                        originalQuestion,
                        newQuestion,
                    }
                });
            }
            return result;
        });
    }

    async getQuestionWithoutRenderer(options: GetQuestionRepositoryOptions): Promise<CourseWWTopicQuestion> {
        return await courseRepository.getQuestion(options);
    }

    async getQuestion(options: GetQuestionOptions): Promise<GetQuestionResult> {
        // grades/statistics may send workbookID => show problem with workbookID.form_data
        // problem page (not enrolled) will send questionID without userID => show problem with no form_data
        // problem page (enrolled, hw) will send questionID with userID => show problem with grades.currentProblemState
        // problem page (enrolled, assess) needs to check if the question belongs to an assessment: isQuestionAnAssessment() 
        const courseQuestion = await this.getQuestionRecord(options.questionId);

        if (_.isNil(courseQuestion)) {
            throw new NotFoundError('Could not find the question in the database');
        }

        const calculatedRendererParameters = await this.getCalculatedRendererParams({
            courseQuestion,
            role: options.role,
        });

        let workbook: StudentWorkbook | null = null;
        if(!_.isNil(options.workbookId)) {
            workbook = await courseRepository.getWorkbookById(options.workbookId);
            // if you requested a workbook then a workbook must be found
            if(_.isNil(workbook)) {
                throw new NotFoundError('Could not find the specified workbook');
            }
        }

        // it may be undefined (user not enrolled or first interaction)
        // GetProblemParameters requires undefined over null
        let formData: { [key: string]: unknown } | undefined;

        // included in workbook, so do not bother with retrieving it if workbook
        let numIncorrect: number | undefined;
        let problemSeed: number | undefined;
        let sourceFilePath = courseQuestion.webworkQuestionPath;

        // get studentGrade from workbook if workbookID, 
        // otherwise studentGrade from userID + questionID | null
        if(_.isNil(workbook)) {
            // when no workbook is sent, the source of truth depends on whether question belongs to an assessment
            const thisQuestionIsFromAnAssessment = await this.isQuestionAnAssessment(options.questionId);
            if (thisQuestionIsFromAnAssessment) {
                const gradeInstance = await courseRepository.getCurrentInstanceForQuestion({
                    questionId: options.questionId, 
                    userId: options.userId
                }); 

                if (_.isNil(gradeInstance)) throw new IllegalArgumentException('No current grade instance for this assessment question.');
                formData = gradeInstance.currentProblemState;
                sourceFilePath = gradeInstance.webworkQuestionPath;
                problemSeed = gradeInstance.randomSeed;
                calculatedRendererParameters.outputformat = OutputFormat.ASSESS;
            } else {
                const studentGrade = await StudentGrade.findOne({
                    where: {
                        userId: options.userId,
                        courseWWTopicQuestionId: options.questionId
                    }
                });
                numIncorrect = studentGrade?.numAttempts;
                formData = studentGrade?.currentProblemState;
                problemSeed = studentGrade?.randomSeed;
            }
        } else {
            // right now this is only in here as a sanity check -- is it worth the extra db query?
            const studentGrade = await workbook.getStudentGrade();
            if (studentGrade.courseWWTopicQuestionId !== options.questionId) {
                throw new NotFoundError('The workbook you have requested does not belong to the question provided');
            }
            formData = workbook.submitted.form_data;
        }

        // TODO; rework calculatedRendererParameters
        if (options.readonly) {
            calculatedRendererParameters.outputformat = OutputFormat.STATIC;
        }

        let showCorrectAnswers = false;
        if (options.role === Role.PROFESSOR && !_.isNil(workbook)) {
            showCorrectAnswers = true;
        }

        const rendererData = await rendererHelper.getProblem({
            sourceFilePath,
            problemSeed,
            formURL: options.formURL,
            numIncorrect,
            formData,
            showCorrectAnswers,
            ...calculatedRendererParameters
        });
        return {
            // courseQuestion,
            rendererData
        };
    }

    // Unlike the above getQuestion, this allows previewing based solely on a path, not an existing Problem.
    async previewQuestion(options: PreviewQuestionOptions): Promise<GetQuestionResult> {
        const rendererData = await rendererHelper.getProblem({
            sourceFilePath: options.webworkQuestionPath,
            problemSeed: options.problemSeed,
            formURL: options.formURL,
            formData: options.formData,
            showSolutions: true,
            showCorrectAnswers: true,
            outputformat: rendererHelper.getOutputFormatForRole(options.role),
            permissionLevel: rendererHelper.getPermissionForRole(options.role),
        });

        return {
            rendererData
        };
    }


    /**
     * This function takes the grade results and merges it into the database objects and save them
     * @param param0 
     */
    setGradeFromSubmission = async ({
        studentGrade,
        workbook,
        gradeResult,
        submitted,
        timeOfSubmission
    }: SetGradeFromSubmissionOptions): Promise<StudentWorkbook | undefined> => {
        return useDatabaseTransaction(async (): Promise<StudentWorkbook | undefined> => {
            if (gradeResult.gradingRationale.willTrackAttemptReason === WillTrackAttemptReason.YES) {
                if(studentGrade.numAttempts === 0) {
                    studentGrade.firstAttempts = gradeResult.score;
                } 
                studentGrade.latestAttempts = gradeResult.score;
                studentGrade.numAttempts++;
                if (gradeResult.gradingRationale.isOnTime && !gradeResult.gradingRationale.isLocked && gradeResult.gradingRationale.isWithinAttemptLimit) {
                    studentGrade.numLegalAttempts++;
                }
                if (!gradeResult.gradingRationale.isExpired && !gradeResult.gradingRationale.isLocked && gradeResult.gradingRationale.isWithinAttemptLimit) {
                    studentGrade.numExtendedAttempts++;
                }
    
                if (_.isNil(workbook)) {
                    workbook = await StudentWorkbook.create({
                        studentGradeId: studentGrade.id,
                        userId: studentGrade.userId,
                        courseWWTopicQuestionId: studentGrade.courseWWTopicQuestionId,
                        randomSeed: studentGrade.randomSeed,
                        submitted: rendererHelper.cleanRendererResponseForTheDatabase(submitted as RendererResponse),
                        result: gradeResult.score,
                        time: timeOfSubmission ?? new Date(),
                        wasLate: gradeResult.gradingRationale.isLate,
                        wasExpired: gradeResult.gradingRationale.isExpired,
                        wasAfterAttemptLimit: !gradeResult.gradingRationale.isWithinAttemptLimit,
                        wasLocked: gradeResult.gradingRationale.isLocked,
                        wasAutoSubmitted: false // TODO
                    });
                } else {
                    _.assign(workbook, {
                        wasLate: gradeResult.gradingRationale.isLate,
                        wasExpired: gradeResult.gradingRationale.isExpired,
                        wasAfterAttemptLimit: !gradeResult.gradingRationale.isWithinAttemptLimit,
                        wasLocked: gradeResult.gradingRationale.isLocked,
                        active: true
                    });
                    
                    await workbook.save();
                }
    
                if (!_.isNil(gradeResult.gradeUpdates.overallBestScore)) {
                    studentGrade.overallBestScore = gradeResult.gradeUpdates.overallBestScore;
                    studentGrade.lastInfluencingAttemptId = workbook.id;
                }
    
                // TODO do we need to track "best score"
                if (!_.isNil(gradeResult.gradeUpdates.bestScore)) {
                    studentGrade.bestScore = gradeResult.gradeUpdates.bestScore;
                    studentGrade.lastInfluencingAttemptId = workbook.id;
                }
    
                if (!_.isNil(gradeResult.gradeUpdates.legalScore)) {
                    studentGrade.legalScore = gradeResult.gradeUpdates.legalScore;
                    studentGrade.lastInfluencingLegalAttemptId = workbook.id;
                }
    
                if (!_.isNil(gradeResult.gradeUpdates.partialCreditBestScore)) {
                    studentGrade.partialCreditBestScore = gradeResult.gradeUpdates.partialCreditBestScore;
                    studentGrade.lastInfluencingCreditedAttemptId = workbook.id;
                }
    
                if (!_.isNil(gradeResult.gradeUpdates.effectiveScore)) {
                    studentGrade.effectiveScore = gradeResult.gradeUpdates.effectiveScore;
                    // We don't track the effective grade that altered the effective score, in part because it could be updated externally
                }
            } else {
                if (!_.isNil(workbook)) {
                    if (gradeResult.gradingRationale.willTrackAttemptReason !== WillTrackAttemptReason.UNKNOWN) {
                        logger.error(`${workbook.id} now meets critieria that is should not be kept, marking it as active false (as well as audit fields)`);
                        _.assign(workbook, {
                            wasLate: false,
                            wasExpired: false,
                            wasAfterAttemptLimit: false,
                            wasLocked: false,
                            active: false
                        });
                        await workbook.save();
                    } else {
                        logger.error(`Did not regrade submission ${workbook.id} because of an error that occured in coming up with grading rationale`);
                    }
                } else {
                    logger.debug('Not keeping a workbook');                
                }
            }
            await studentGrade.save();
            // If nil coming in and the attempt was tracked this will result in the new workbook
            return workbook;
        });
    }

    reGradeTopic = async ({
        topic,
        topicOverride,
        userId,
        skipContext: {
            skipIfPossible = false,
            originalTopic,
            newTopic,
        } = {}
    }: ReGradeTopicOptions): Promise<void> => {
        let minDate: Date | undefined;
        if (skipIfPossible) {
            // Skip exams
            // TODO enums
            if (topic.topicTypeId === 2) {
                return;
            }

            if (!_.isNil(originalTopic) && !_.isNil(newTopic)) {
                const {
                    endDate: originalEndDate,
                    deadDate: originalDeadDate
                } = originalTopic;

                const {
                    endDate: newEndDate,
                    deadDate: newDeadDate
                } = newTopic;

                const dueDateTuples: [Date, Date][] = [
                    [originalEndDate, newEndDate],
                    [originalDeadDate, newDeadDate]
                ];

                const changedDueDateTuples: [Date, Date][] = _.filter(dueDateTuples, (dateTuple: [Date, Date]) => !dateTuple[0].toMoment().isSame(dateTuple[1].toMoment()));
                const dateArray = _.flatten(changedDueDateTuples).map((date: Date) => date.toMoment());
                const minDateMoment = _.isEmpty(dateArray) ? null : moment.min(dateArray);
                // For use with optimization, skipping grade reprocessing
                minDate = minDateMoment?.toDate();

                const theMoment = moment();
                const canSkip = _.isNil(minDateMoment) || theMoment.isBefore(minDateMoment);

                if (canSkip) {
                    logger.debug('Skipping topic regrade');
                    return;
                }

            } else {
                logger.error('Skip is not possible if the original topic is not passed');
            }
        }

        return useDatabaseTransaction(async () => {
            const questions = await topic.getQuestions({
                where: {
                    active: true
                }
            });
            await questions.asyncForEach(async (question: CourseWWTopicQuestion) => {
                await this.reGradeQuestion({
                    topic,
                    question,
                    userId,
                    minDate,
                    topicOverride,
                    skipContext: {
                        skipIfPossible: false,
                    }
                });
            });
        });
    }

    reGradeQuestion = async ({
        question,
        topic,
        userId,
        minDate,
        topicOverride,
        questionOverride,
        skipContext: {
            skipIfPossible = false,
            originalQuestion,
            newQuestion,
        } = {}
    }: ReGradeQuestionOptions): Promise<void> => {
        let grades: Array<StudentGrade> | undefined;
        if (skipIfPossible) {
            let canSkip = false;

            const maxAttemptsArray: number[] = _.filter([
                newQuestion?.maxAttempts,
                originalQuestion?.maxAttempts,
            ], (elm: unknown): boolean => !_.isNil(elm)) as number[]; // nil check prevents the undefined s from going back

            if (maxAttemptsArray.length < 2) {
                // Not throwing it because it is recoverable
                // If not enough context is provided then don't regrade the question
                logger.error(new IllegalArgumentException('Not enough context sent to reGradeQuestion with skipIfPossible true to regrade the question'));
            } else if (Math.max(...maxAttemptsArray) === Math.min(...maxAttemptsArray)) {
                logger.debug('Nothing changed');
                canSkip = true;
            } else {
                const lowestMaxAttempts = Math.min(...maxAttemptsArray);
                grades = await question.getGrades({
                    where: _({
                        numAttempts: {
                            [Sequelize.Op.gt]: lowestMaxAttempts
                        },
                        userId
                    }).omitBy(_.isUndefined).value() as sequelize.WhereOptions, // Adding this suppresses the error of userId could be undefined, sequelize disregards undefined so that is a bad sequelize type
                });
                canSkip = _.isEmpty(grades);
            }
            if (canSkip) {
                logger.debug('Skipping question regrade');
                return;
            } else {
                logger.debug('Question needs regrade');
            }
    }

        return useDatabaseTransaction(async () => {
            // Validation that passed in values match up (fk) are done deeper
            grades = grades ?? await question.getGrades({
                where: _({
                    userId,
                    active: true
                }).omitBy(_.isUndefined).value() as sequelize.WhereOptions
            });
            topic = topic ?? await question.getTopic({
                where: {
                    active: true
                }
            });

            logger.debug(`Regrading ${grades.length} grades`);

            await grades.asyncForEach(async (studentGrade: StudentGrade) => {
                await this.reGradeStudentGrade({
                    studentGrade,
                    question,
                    topic,
                    minDate,
                    questionOverride: questionOverride,
                    topicOverride: topicOverride
                });
            });
        });
    }

    reGradeStudentGrade = async ({
        studentGrade,
        topic,
        question,
        workbooks,
        minDate,
        topicOverride,
        questionOverride
    }: ReGradeStudentGradeOptions): Promise<void> => {
        // Locked grades cannot be processed
        if (studentGrade.locked) {
            logger.debug(`Skipping retro on locked student grade Grade: ${studentGrade.id}; User: ${studentGrade.userId};`);
            return;
        }

        return useDatabaseTransaction(async () => {
            // Can't grade a subset of workbooks because the rest of the logic is absolute
            // It resets the grade entirely and then rebuilds it from the beginning
            // const timeClause = _.isNil(minDate) ? undefined : {
            //     time: {
            //         [Sequelize.Op.gte]: minDate
            //     }
            // };
            workbooks = workbooks ?? await studentGrade.getWorkbooks({
                order: ['id'],
                // I was thinking of using the active flag for the case where the solutions date would be available
                // That shouldn't be possible, but this way we have a catch
                // where: {
                //     active: true
                // }
                // Use something like object assign if there are more clauses
                // where: timeClause
            });

            if(!_.isNil(minDate)) {
                // Min date can't be used in the actual grading
                // however we can use it skip the regrading process
                const applicableWorkbooks = _.filter(workbooks, ((workbook: StudentWorkbook) => workbook.time.toMoment().isSameOrAfter(minDate.toMoment())));
                if (_.isEmpty(applicableWorkbooks)) {
                    logger.debug('Dates changed but none of the workbooks were after the min date, skipping');
                    return;
                } else {
                    logger.debug('Cannot skip regrade!');
                }
            }

            // have to make sure order is correct
            workbooks = _.orderBy(workbooks, 'id', 'asc');
            logger.debug(`Regrading ${workbooks.length} attempts`);

            question = question ?? await studentGrade.getQuestion({
                where: {
                    active: true
                }
            });
            topic = topic ?? await question.getTopic({
                where: {
                    active: true
                }
            });

            if (studentGrade.courseWWTopicQuestionId !== question.id) {
                throw new IllegalArgumentException('studentGrade question id does not match the question\'s id');
            }

            if (question.courseTopicContentId !== topic.id) {
                throw new IllegalArgumentException('question topic id does not match the topic\'s id');
            }
            
            const solutionDate = moment(topic.deadDate).add(Constants.Course.SHOW_SOLUTIONS_DELAY_IN_DAYS, 'days');

            // reset student grade before submitting
            studentGrade.bestScore = 0;
            studentGrade.overallBestScore = 0;
            studentGrade.partialCreditBestScore = 0;
            studentGrade.effectiveScore = 0;
            studentGrade.legalScore = 0;
            studentGrade.numAttempts = 0;
            studentGrade.numLegalAttempts = 0;
            studentGrade.numExtendedAttempts = 0;
            studentGrade.lastInfluencingAttemptId = null;
            studentGrade.lastInfluencingCreditedAttemptId = null;
            studentGrade.lastInfluencingLegalAttemptId = null;
            studentGrade.firstAttempts = 0;
            studentGrade.latestAttempts = 0;
            
            const gradeOverrides: StudentGradeOverride[] = await studentGrade.getOverrides({
                order: ['id'],
                where: {
                    active: true
                }
            });
            
            const workbooksAndOverrides: (StudentWorkbook | StudentGradeOverride)[] = [...workbooks, ...gradeOverrides];
            const sortedWorkbooksAndOverrides = workbooksAndOverrides.sort((first: StudentWorkbook | StudentGradeOverride, second: StudentWorkbook | StudentGradeOverride): number => {
                const getDate = (object: StudentWorkbook | StudentGradeOverride): Date => {
                    if (object instanceof StudentWorkbook) {
                        return object.time;
                    } else {
                        if (!(object instanceof StudentGradeOverride)) {
                            logger.error('Invalid type, should be StudentWorkbook | StudentGradeOverride');
                        }
                        // could always be createdAt...
                        // time for workbook is redundant and should always be the same as created at
                        // That being said
                        return object.createdAt;
                    }
                };
                return getDate(first).getTime() - getDate(second).getTime();
            });

            // Order is extremely important here, our async for each does not wait for one to be done before starting another
            for (let i = 0; i < sortedWorkbooksAndOverrides.length; i++) {
                const workbookOrOverride = sortedWorkbooksAndOverrides[i];
                if (workbookOrOverride instanceof StudentWorkbook) {
                    const workbook = workbookOrOverride;
                    if (workbook.wasLocked) {
                        studentGrade.numAttempts++;
                        if (workbook.result > studentGrade.overallBestScore) {
                            studentGrade.overallBestScore = workbook.result;
                            studentGrade.lastInfluencingAttemptId = workbook.id;
                        }
                        continue;
                    }
    
                    if (workbook.studentGradeId !== studentGrade.id) {
                        throw new IllegalArgumentException('workbook studentGradeId does not match studentGrade.id');
                    }
        
                    if(_.isNil(question) || _.isNil(topic)) {
                        throw new Error('This cannot be undefined, strict is confused because of transaction callback');
                    }
    
                    await this.gradeSubmission({
                        newScore: workbook.result,
                        question,
                        solutionDate,
                        studentGrade,
                        topic,
    
                        timeOfSubmission: workbook.time.toMoment(),
                        submitted: null,
                        workbook,
                        override: {
                            useOverride: true,
                            questionOverride: questionOverride,
                            topicOverride: topicOverride
                        }
                    });                        
                } else if (workbookOrOverride instanceof StudentGradeOverride) {
                    // redundant but makes it easier to read
                    const override = workbookOrOverride;
                    studentGrade.effectiveScore = override.newValue;
                } else {
                    logger.error('Impossible case, workbookOrOverride is not a workbook or an override');
                }
            }

            await studentGrade.save();
        });
    }

    /**
     * This function is in charge of getting the grade updates and passing it along to be updated
     * @param param0 
     */
    gradeSubmission = async ({
        studentGrade,
        newScore,
        question: passedQuestion,
        solutionDate,
        topic: passedTopic,
        submitted,
        timeOfSubmission,
        workbook,
        override: {
            useOverride = true,
            questionOverride,
            topicOverride
        } = {}
    }: GradeOptions): Promise<StudentWorkbook | undefined> => {
        let topic: CourseTopicContentInterface = passedTopic;
        let question: CourseWWTopicQuestionInterface = passedQuestion;
        if (useOverride) {
            /**
             * Currently:
             * Submit answers fetches the override as an includes and it will be passed in
             * When an extension is performed that extension will be passed in
             * When an update is performed to topic or question that triggers regrade we'll need each student's extensions
             */
            // Don't fetch if null is passed in (there is no extension)
            if (_.isUndefined(topicOverride)) {
                const overrides = await passedTopic.getStudentTopicOverride({
                    where: {
                        userId: studentGrade.userId,
                        active: true
                    }
                });
                topicOverride = overrides?.[0] ?? null;
            }

            if (_.isUndefined(questionOverride)) {
                const overrides = await passedQuestion.getStudentTopicQuestionOverride({
                    where: {
                        userId: studentGrade.userId,
                        active: true
                    }
                });
                questionOverride = overrides?.[0] ?? null;
            }

            topic = _.isNil(topicOverride) ? topic : passedTopic.getWithOverrides(topicOverride);
            question = _.isNil(questionOverride) ? question : passedQuestion.getWithOverrides(questionOverride);
        }

        const gradeResult = calculateGrade({
            newScore,
            question,
            solutionDate,
            studentGrade,
            topic,
            timeOfSubmission
        });
        return await this.setGradeFromSubmission({
            gradeResult,
            studentGrade,
            submitted,
            timeOfSubmission,
            workbook
        });
    };

    /**
     * This function is to be called after submission
     * It handles aggregating some data and calling to get the db objects updated
     * @param options
     */
    async submitAnswer(options: SubmitAnswerOptions): Promise<SubmitAnswerResult> {
        const studentGrade: StudentGrade | null = await StudentGrade.findOne({
            where: {
                userId: options.userId,
                courseWWTopicQuestionId: options.questionId
            }
        });

        if (_.isNil(studentGrade)) {
            return {
                studentGrade: null,
                studentWorkbook: null
            };
        }

        // Should this go up a level?
        if (_.isNil(options.submitted.form_data.submitAnswers)) {
            return {
                studentGrade,
                studentWorkbook: null
            };
        }
        const question: CourseWWTopicQuestion = await studentGrade.getQuestion(
            {
                include: [{
                        model: StudentTopicQuestionOverride,
                        as: 'studentTopicQuestionOverride',
                        attributes: ['userId', 'maxAttempts'],
                        required: false,
                        where: {
                            active: true,
                            userId: options.userId
                        }
                }]
            }
        );
        
        
        const topic: CourseTopicContent = await question.getTopic({
            include: [{
                model: StudentTopicOverride,
                as: 'studentTopicOverride',
                attributes: ['userId', 'startDate', 'endDate', 'deadDate'],
                required: false,
                where: {
                    active: true,
                    userId: options.userId
                }
            }]
        });

        const solutionDate = moment(topic.deadDate).add(Constants.Course.SHOW_SOLUTIONS_DELAY_IN_DAYS, 'days');

        try {
            return await useDatabaseTransaction(async (): Promise<SubmitAnswerResult> => {
                const workbook = await this.gradeSubmission({
                    newScore: options.score,
                    question,
                    solutionDate,
                    studentGrade,
                    submitted: options.submitted,
                    topic,
                    timeOfSubmission: options.timeOfSubmission?.toMoment() ?? moment(),
                    override: {
                        useOverride: true,
                        questionOverride: question.studentTopicQuestionOverride?.[0] ?? null,
                        topicOverride: topic.studentTopicOverride?.[0] ?? null
                    }
                });

                return {
                    studentGrade,
                    studentWorkbook: workbook ?? null
                };
            });
        } catch (e) {
            if (e instanceof RederlyExtendedError === false) {
                throw new WrappedError(e.message, e);
            } else {
                throw e;
            }
        }
    }

    getCourseByCode(code: string): Promise<Course> {
        return Course.findOne({
            where: {
                code
            }
        });
    }

    private checkStudentEnrollmentError(e: Error): void {
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
    }

    async createStudentEnrollment(enrollment: Partial<StudentEnrollment>): Promise<StudentEnrollment> {
        try {
            return await StudentEnrollment.create(enrollment);
        } catch (e) {
            this.checkStudentEnrollmentError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    async enroll(enrollment: CreateGradesForUserEnrollmentOptions): Promise<StudentEnrollment> {
        return await useDatabaseTransaction(async () => {
            const result = await this.createStudentEnrollment({
                ...enrollment,
                enrollDate: new Date()
            });
            await this.createGradesForUserEnrollment({
                courseId: enrollment.courseId,
                userId: enrollment.userId,
            });
            return result;
        });
    }

    async enrollByCode(enrollment: EnrollByCodeOptions): Promise<StudentEnrollment> {
        const course = await this.getCourseByCode(enrollment.code);
        if (course === null) {
            throw new NotFoundError('Could not find course with the given code');
        }
        return this.enroll({
            courseId: course.id,
            userId: enrollment.userId,
        });
    }

    // TODO fix return type, transactions were returning any so type checking was suspended
    // Returns true is successfully deleted the enrollment.
    async softDeleteEnrollment(deEnrollment: DeleteUserEnrollmentOptions): Promise<boolean> {
        // TODO fix typings - remove any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await useDatabaseTransaction<any>(async (): Promise<any> => {
            const enrollment = await StudentEnrollment.findOne({
                where: {
                    ...deEnrollment
                }
            });

            if (_.isNull(enrollment)) {
                throw new NotFoundError(`Could not find Student ${deEnrollment.userId} to remove from Course ${deEnrollment.courseId}`);
            }
            
            if (enrollment.dropDate) {
                throw new NotFoundError(`Student ${deEnrollment.userId} has already been dropped from Course ${deEnrollment.courseId}`);
            }

            enrollment.dropDate = new Date();
            return await enrollment.save();
        });
    }

    async findMissingGrades(): Promise<FindMissingGradesResult[]> {
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
                                    required: false,
                                    where: {
                                        userId: {
                                            [Sequelize.Op.eq]: sequelize.literal('"courseEnrollments".user_id')
                                        }
                                    }
                                }]
                            }]
                        }]
                    }]
                }]
            }],
            where: {
                [`$courseEnrollments.course.units.topics.questions.grades.${StudentGrade.rawAttributes.id.field}$`]: {
                    [Sequelize.Op.eq]: null
                },
            }
        });

        const results: FindMissingGradesResult[] = [];
        result.forEach((student: User) => {
            student.courseEnrollments?.forEach((studentEnrollment: StudentEnrollment) => {
                studentEnrollment.course?.units?.forEach((unit: CourseUnitContent) => {
                    unit.topics?.forEach((topic: CourseTopicContent) => {
                        topic.questions?.forEach((question: CourseWWTopicQuestion) => {
                            results.push({
                                student,
                                question,
                            });
                        });
                    });
                });
            });
        });
        return results;
    }

    async syncMissingGrades(): Promise<void> {
        // Should this be in a transaction? is it inherently an all or nothing del?
        const missingGrades = await this.findMissingGrades();
        logger.info(`Found ${missingGrades.length} missing grades`);
        await missingGrades.asyncForEach(async (missingGrade: FindMissingGradesResult) => {
            await this.createNewStudentGrade({
                userId: missingGrade.student.id,
                courseTopicQuestionId: missingGrade.question.id
            });
        });
    }

    async getGrades(options: GetGradesOptions): Promise<StudentGrade[]> {
        const {
            courseId,
            questionId,
            topicId,
            unitId,
            userId,
        } = options.where;

        const setFilterCount = [
            courseId,
            questionId,
            topicId,
            unitId,
        ].reduce((accumulator, val) => (accumulator || 0) + (!_.isNil(val) && 1 || 0), 0);

        if (setFilterCount !== 1) {
            throw new Error(`One filter must be set but found ${setFilterCount}`);
        }

        // Using strict with typescript results in WhereOptions failing when set to a partial object, casting it as WhereOptions since it works
        const where: sequelize.WhereOptions = _({
            [`$question.topic.unit.course.${Course.rawAttributes.id.field}$`]: courseId,
            [`$question.topic.unit.${CourseUnitContent.rawAttributes.id.field}$`]: unitId,
            [`$question.topic.${CourseTopicContent.rawAttributes.id.field}$`]: topicId,
            [`$question.${CourseWWTopicQuestion.rawAttributes.id.field}$`]: questionId,
            [`$user.${User.rawAttributes.id.field}$`]: userId,
            active: true
        }).omitBy(_.isUndefined).value() as sequelize.WhereOptions;

        const totalProblemCountCalculationString = `COUNT(question.${CourseWWTopicQuestion.rawAttributes.id.field})`;
        const pendingProblemCountCalculationString = `COUNT(CASE WHEN ${StudentGrade.rawAttributes.numAttempts.field} = 0 THEN ${StudentGrade.rawAttributes.numAttempts.field} END)`;
        const masteredProblemCountCalculationString = `COUNT(CASE WHEN ${StudentGrade.rawAttributes.overallBestScore.field} >= 1 THEN ${StudentGrade.rawAttributes.overallBestScore.field} END)`;
        const inProgressProblemCountCalculationString = `${totalProblemCountCalculationString} - ${pendingProblemCountCalculationString} - ${masteredProblemCountCalculationString}`;

        // Include cannot be null or undefined, coerce to empty array
        let includeOthers = false;
        let unitInclude;
        if (includeOthers || _.isNil(courseId) === false) {
            includeOthers = true;
            unitInclude = [{
                model: Course,
                as: 'course',
                attributes: [],
                where: {
                    active: true
                },
            }];
        }

        let topicInclude;
        if (includeOthers || _.isNil(unitId) === false) {
            includeOthers = true;
            topicInclude = [{
                model: CourseUnitContent,
                as: 'unit',
                attributes: [],
                where: {
                    active: true
                },
                include: unitInclude || [],
            }];
        }

        let questionInclude;
        if (includeOthers || _.isNil(topicId) === false) {
            includeOthers = true;
            questionInclude = [{
                model: CourseTopicContent,
                as: 'topic',
                attributes: [],
                where: {
                    active: true
                },
                include: topicInclude || [],
            }];
        }

        let attributes: sequelize.FindAttributeOptions;
        // Group cannot be empty array, use null if there is no group clause
        let group: string[] | undefined = undefined;
        if (_.isNil(questionId) === false) {
            attributes = [
                'id',
                'effectiveScore',
                'numAttempts'
            ];
            // This should already be the case but let's guarentee it
            group = undefined;
        } else {
            // Not follow the rules version
            // const averageScoreAttribute = sequelize.fn('avg', sequelize.col(`${StudentGrade.rawAttributes.overallBestScore.field}`));
            const pointsEarned = `SUM(${StudentGrade.rawAttributes.effectiveScore.field} * "question".${CourseWWTopicQuestion.rawAttributes.weight.field})`;
            const pointsAvailable = `SUM(CASE WHEN "question".${CourseWWTopicQuestion.rawAttributes.optional.field} = FALSE THEN "question".${CourseWWTopicQuestion.rawAttributes.weight.field} ELSE 0 END)`;
            const averageScoreAttribute = sequelize.literal(`
                CASE WHEN ${pointsAvailable} = 0 THEN
                    NULL
                ELSE
                    ${pointsEarned} / ${pointsAvailable}
                END
            `);

            attributes = [
                [averageScoreAttribute, 'average'],
                [sequelize.literal(pendingProblemCountCalculationString), 'pendingProblemCount'],
                [sequelize.literal(masteredProblemCountCalculationString), 'masteredProblemCount'],
                [sequelize.literal(inProgressProblemCountCalculationString), 'inProgressProblemCount'],
            ];
            // TODO This group needs to match the alias below, I'd like to find a better way to do this
            group = [`user.${User.rawAttributes.id.field}`, 
                `user.${User.rawAttributes.firstName.field}`, 
                `user.${User.rawAttributes.lastName.field}`
            ];
        }

        // Filter all grades to only be included if the student has not been dropped.
        const studentGradeInclude = [{
                model: StudentEnrollment,
                as: 'courseEnrollments',
                required: true,
                attributes: [],
                where: {
                    courseId: {
                        [Sequelize.Op.eq]: sequelize.literal(`"user->courseEnrollments".${Course.rawAttributes.id.field}`)
                    },
                    dropDate: null
                }
            }];

        return StudentGrade.findAll({
            // This query must be run raw, otherwise the deduplication logic in Sequelize will force-add the primary key
            // resulting in a group-by error. For more information: https://github.com/sequelize/sequelize/issues/3920
            raw: true,
            // Using raw results in nested objects being represented with . notation, using this will expand it like we see elsewhere
            nest: true,
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName'],
                where: {
                    active: true
                },
                include: studentGradeInclude || []
            }, {
                model: CourseWWTopicQuestion,
                as: 'question',
                attributes: [],
                where: {
                    active: true,
                    hidden: false
                },
                include: questionInclude || [],
            }],
            attributes,
            where,
            group
        });
    }

    getStatisticsOnUnits(options: GetStatisticsOnUnitsOptions): Promise<CourseUnitContent[]> {
        const {
            courseId,
            userId,
        } = options.where;

        const { followQuestionRules } = options;

        // Using strict with typescript results in WhereOptions failing when set to a partial object, casting it as WhereOptions since it works
        const where: sequelize.WhereOptions = _({
            active: true,
            courseId,
            [`$topics.questions.grades.${StudentGrade.rawAttributes.userId.field}$`]: userId,
        }).omitBy(_.isNil).value() as sequelize.WhereOptions;

        let averageScoreAttribute;
        if (followQuestionRules) {
            const pointsEarned = `SUM("topics->questions->grades".${StudentGrade.rawAttributes.effectiveScore.field} * "topics->questions".${CourseWWTopicQuestion.rawAttributes.weight.field})`;
            const pointsAvailable = `SUM(CASE WHEN "topics->questions".${CourseWWTopicQuestion.rawAttributes.optional.field} = FALSE THEN "topics->questions".${CourseWWTopicQuestion.rawAttributes.weight.field} ELSE 0 END)`;
            averageScoreAttribute = sequelize.literal(`
                CASE WHEN ${pointsAvailable} = 0 THEN
                    NULL
                ELSE
                    ${pointsEarned} / ${pointsAvailable}
                END
            `);
        } else {
            averageScoreAttribute = sequelize.fn('avg', sequelize.col(`topics.questions.grades.${StudentGrade.rawAttributes.overallBestScore.field}`));
        }

        // const completionPercentAttribute = sequelize.literal(`
        // CASE WHEN COUNT("topics->questions->grades".${StudentGrade.rawAttributes.id.field}) > 0 THEN
        //     count(
        //         CASE WHEN "topics->questions->grades".${StudentGrade.rawAttributes.overallBestScore.field} >= 1 THEN
        //             "topics->questions->grades".${StudentGrade.rawAttributes.id.field}
        //         END
        //     )::FLOAT / count("topics->questions->grades".${StudentGrade.rawAttributes.id.field})
        // ELSE
        //     NULL
        // END`);
        const completionPercentAttribute = sequelize.fn('avg', sequelize.col(`topics.questions.grades.${StudentGrade.rawAttributes.overallBestScore.field}`));


        return CourseUnitContent.findAll({
            where,
            attributes: [
                'id',
                'name',
                [sequelize.fn('avg', sequelize.col(`topics.questions.grades.${StudentGrade.rawAttributes.numAttempts.field}`)), 'averageAttemptedCount'],
                [averageScoreAttribute, 'averageScore'],
                [sequelize.fn('count', sequelize.col(`topics.questions.grades.${StudentGrade.rawAttributes.id.field}`)), 'totalGrades'],
                [sequelize.literal(`count(CASE WHEN "topics->questions->grades".${StudentGrade.rawAttributes.overallBestScore.field} >= 1 THEN "topics->questions->grades".${StudentGrade.rawAttributes.id.field} END)`), 'completedCount'],
                [completionPercentAttribute, 'completionPercent'],
            ],
            include: [{
                model: CourseTopicContent,
                as: 'topics',
                attributes: [],
                where: {
                    active: true
                },
                include: [{
                    model: CourseWWTopicQuestion,
                    as: 'questions',
                    attributes: [],
                    where: {
                        active: true,
                        hidden: false
                    },
                    include: [{
                        model: StudentGrade,
                        as: 'grades',
                        attributes: [],
                        where: {
                            active: true,
                        }
                    }]
                }]
            }],
            group: [`${CourseUnitContent.name}.${CourseUnitContent.rawAttributes.id.field}`, `${CourseUnitContent.name}.${CourseUnitContent.rawAttributes.id.field}`],
            order: [
                ['contentOrder', 'asc']
            ],
        });
    }

    getStatisticsOnTopics(options: GetStatisticsOnTopicsOptions): Promise<CourseTopicContent[]> {
        const {
            courseUnitContentId,
            courseId,
            userId,
        } = options.where;

        const { followQuestionRules } = options;

        // Using strict with typescript results in WhereOptions failing when set to a partial object, casting it as WhereOptions since it works
        const where: sequelize.WhereOptions = _({
            active: true,
            courseUnitContentId,
            [`$unit.${CourseUnitContent.rawAttributes.courseId.field}$`]: courseId,
            [`$questions.grades.${StudentGrade.rawAttributes.userId.field}$`]: userId,
        }).omitBy(_.isNil).value() as sequelize.WhereOptions;

        const include: sequelize.IncludeOptions[] = [{
            model: CourseWWTopicQuestion,
            as: 'questions',
            attributes: [],
            where: {
                active: true,
                hidden: false
            },
            include: [{
                model: StudentGrade,
                as: 'grades',
                attributes: [],
                where: {
                    active: true
                }
            }]
        }];

        if (!_.isNil(courseId)) {
            include.push({
                model: CourseUnitContent,
                as: 'unit',
                attributes: [],
                where: {
                    active: true
                }
            });
        }

        let averageScoreAttribute;
        if (followQuestionRules) {
            const pointsEarned = `SUM("questions->grades".${StudentGrade.rawAttributes.effectiveScore.field} * "questions".${CourseWWTopicQuestion.rawAttributes.weight.field})`;
            const pointsAvailable = `SUM(CASE WHEN "questions".${CourseWWTopicQuestion.rawAttributes.optional.field} = FALSE THEN "questions".${CourseWWTopicQuestion.rawAttributes.weight.field} ELSE 0 END)`;
            averageScoreAttribute = sequelize.literal(`
                CASE WHEN ${pointsAvailable} = 0 THEN
                    NULL
                ELSE
                    ${pointsEarned} / ${pointsAvailable}
                END
            `);
        } else {
            averageScoreAttribute = sequelize.fn('avg', sequelize.col(`questions.grades.${StudentGrade.rawAttributes.overallBestScore.field}`));
        }

        // const completionPercentAttribute = sequelize.literal(`
        // CASE WHEN COUNT("questions->grades".${StudentGrade.rawAttributes.id.field}) > 0 THEN
        //     count(
        //         CASE WHEN "questions->grades".${StudentGrade.rawAttributes.overallBestScore.field} >= 1 THEN
        //             "questions->grades".${StudentGrade.rawAttributes.id.field}
        //         END
        //     )::FLOAT / count("questions->grades".${StudentGrade.rawAttributes.id.field})
        // ELSE
        //     NULL
        // END`);
        const completionPercentAttribute = sequelize.fn('avg', sequelize.col(`questions.grades.${StudentGrade.rawAttributes.overallBestScore.field}`));

        return CourseTopicContent.findAll({
            where,
            attributes: [
                'id',
                'name',
                [sequelize.fn('avg', sequelize.col(`questions.grades.${StudentGrade.rawAttributes.numAttempts.field}`)), 'averageAttemptedCount'],
                [averageScoreAttribute, 'averageScore'],
                [sequelize.fn('count', sequelize.col(`questions.grades.${StudentGrade.rawAttributes.id.field}`)), 'totalGrades'],
                [sequelize.literal(`count(CASE WHEN "questions->grades".${StudentGrade.rawAttributes.overallBestScore.field} >= 1 THEN "questions->grades".${StudentGrade.rawAttributes.id.field} END)`), 'completedCount'],
                [completionPercentAttribute, 'completionPercent'],
            ],
            include,
            group: [`${CourseTopicContent.name}.${CourseTopicContent.rawAttributes.id.field}`, `${CourseTopicContent.name}.${CourseTopicContent.rawAttributes.name.field}`],
            order: [
                ['contentOrder', 'asc']
            ],
        });
    }

    getStatisticsOnQuestions(options: GetStatisticsOnQuestionsOptions): Promise<CourseWWTopicQuestion[]> {
        const {
            courseTopicContentId,
            courseId,
            userId,
        } = options.where;

        const { followQuestionRules } = options;

        // Using strict with typescript results in WhereOptions failing when set to a partial object, casting it as WhereOptions since it works
        const where: sequelize.WhereOptions = _({
            active: true,
            courseTopicContentId,
            [`$topic.unit.${CourseUnitContent.rawAttributes.courseId.field}$`]: courseId,
            [`$grades.${StudentGrade.rawAttributes.userId.field}$`]: userId,
        }).omitBy(_.isNil).value() as sequelize.WhereOptions;

        const include: sequelize.IncludeOptions[] = [{
            model: StudentGrade,
            as: 'grades',
            // only send the student grade down if we are listing for a user
            attributes: _.isNil(userId) ? [] : undefined,
            where: {
                active: true
            }
        }];

        if (!_.isNil(courseId)) {
            include.push({
                model: CourseTopicContent,
                as: 'topic',
                attributes: [],
                where: {
                    active: true
                },
                include: [{
                    model: CourseUnitContent,
                    as: 'unit',
                    attributes: [],
                    where: {
                        active: true
                    }
                }]
            });
        }

        let scoreField: sequelize.Utils.Col = sequelize.col(`grades.${StudentGrade.rawAttributes.overallBestScore.field}`);
        if (followQuestionRules) {
            scoreField = sequelize.col(`grades.${StudentGrade.rawAttributes.effectiveScore.field}`);
        }

        const group = [`${CourseWWTopicQuestion.name}.${CourseWWTopicQuestion.rawAttributes.id.field}`];
        // required to send down the user grade, which we only need when fetching for a user
        if (!_.isNil(userId)) {
            group.push(`grades.${StudentGrade.rawAttributes.id.field}`);
        }

        // // When using this for a single students grade, it's either 100% for completed or 0% for anything else, it doesn't really make sense
        // const completionPercentAttribute = sequelize.literal(`
        // CASE WHEN COUNT("grades".${StudentGrade.rawAttributes.id.field}) > 0 THEN
        //     count(
        //         CASE WHEN "grades".${StudentGrade.rawAttributes.bestScore.field} >= 1 THEN
        //             "grades".${StudentGrade.rawAttributes.id.field}
        //         END
        //     )::FLOAT / count("grades".${StudentGrade.rawAttributes.id.field})
        // ELSE
        //     NULL
        // END`);
        const completionPercentAttribute = sequelize.fn('avg', sequelize.col(`grades.${StudentGrade.rawAttributes.overallBestScore.field}`));

        return CourseWWTopicQuestion.findAll({
            where,
            attributes: [
                'id',
                [sequelize.literal(`'Problem ' || "${CourseWWTopicQuestion.name}".${CourseWWTopicQuestion.rawAttributes.problemNumber.field}`), 'name'],
                [sequelize.fn('avg', sequelize.col(`grades.${StudentGrade.rawAttributes.numAttempts.field}`)), 'averageAttemptedCount'],
                [sequelize.fn('avg', scoreField), 'averageScore'],
                [sequelize.fn('count', sequelize.col(`grades.${StudentGrade.rawAttributes.id.field}`)), 'totalGrades'],
                [sequelize.literal(`count(CASE WHEN "grades".${StudentGrade.rawAttributes.bestScore.field} >= 1 THEN "grades".${StudentGrade.rawAttributes.id.field} END)`), 'completedCount'],
                [completionPercentAttribute, 'completionPercent'],
            ],
            include,
            group,
            order: [
                ['problemNumber', 'asc']
            ],
        });
    }

    async canUserGetQuestions(options: CanUserGetQuestionsOptions): Promise<CanUserGetQuestionsResult> {
        const {userId, courseTopicContentId, studentTopicAssessmentInfoId} = options;
        let message = '';

        let topic: CourseTopicContent | null = null;
        let version: StudentTopicAssessmentInfo | null = null;

        const user = await userController.getUserById(userId);

        if (_.isNil(courseTopicContentId)) {
            message = 'Sure, why not?';
            return {message, userCanGetQuestions: true, topic, version};
        } else {
            topic = await this.getTopicById({
                id: courseTopicContentId,
                userId,
            });
            if (_.isNil(topic)) {
                message = 'No topic found with that id.';
                return { message, userCanGetQuestions: false, topic, version };
            }
            // const overrideStartDate = topic.studentTopicOverride?.[0]?.startDate;
            // const startDate = overrideStartDate ?? topic.startDate;
            if (!_.isNil(topic.studentTopicOverride) && !_.isEmpty(topic.studentTopicOverride)) {
                topic = topic.getWithOverrides(topic.studentTopicOverride[0]) as CourseTopicContent;
            }

            const userRole = user.roleId;
            if (moment().isBefore(topic.startDate)) {
                if (userRole === Role.STUDENT) {
                    message = `The topic "${topic.name}" has not started yet.`;
                    return { message, userCanGetQuestions: false, topic, version };
                }
            }

            if (topic.topicTypeId === 2 && !_.isNil(userId)) {
                if (_.isNil(topic.topicAssessmentInfo)) {
                    throw new NotFoundError('Topic is an assessment, but does not have corresponding assessment info. This should never happen.');
                }

                // get version info - descending by startTime unless specific id is included in query
                if (_.isNil(studentTopicAssessmentInfoId)) {
                    // _.orderBy puts in ascending order
                    const versions = _.orderBy(topic.topicAssessmentInfo.studentTopicAssessmentInfo, ['startTime'], ['desc']);
                    if (_.isNil(versions) || versions.length === 0) {
                        message = 'You have not started any versions of this assessment.';
                        // TODO return topic?
                        return { message, userCanGetQuestions: false, topic, version };
                    }
                    version = versions[0];
                } else {
                    version = await this.getStudentTopicAssessmentInfoById(studentTopicAssessmentInfoId);
                }

                if (
                    topic.topicAssessmentInfo.hideProblemsAfterFinish && (
                        moment().isAfter(moment(version.endTime)) ||
                        version.isClosed ||
                        version.maxAttempts <= version.numAttempts
                    ) &&
                    userRole === Role.STUDENT
                ) {
                    message = 'You have finished this version of the assessment and you are blocked from seeing the problems.';
                    // TODO return topic?
                    return { message, userCanGetQuestions: false, topic, version };
                }
            }
        }

        return { message, userCanGetQuestions: true, topic, version };
    }
    async getQuestions(options: GetQuestionsOptions): Promise<CourseWWTopicQuestion[]> {
        const {
            courseTopicContentId,
            userId,
            studentTopicAssessmentInfoId,
        } = options;

        try {
            const include: sequelize.IncludeOptions[] = [];
            const subInclude: sequelize.IncludeOptions[] = [];

            // a student-grade-instances cannot exist without corresponding student-topic-assessment-info
            // and vice versa -- they are created in the same transaction
            if (!_.isNil(studentTopicAssessmentInfoId)) {
                subInclude.push({
                    model: StudentGradeInstance,
                    as: 'gradeInstances',
                    required: true,
                    where: {
                        studentTopicAssessmentInfoId,
                    },
                });
            }
            if (!_.isNil(userId)) {
                include.push({
                    model: StudentGrade,
                    as: 'grades',
                    required: false,
                    where: {
                        userId: userId
                    },
                    include: subInclude
                });
                include.push({
                    model: StudentTopicQuestionOverride,
                    as: 'studentTopicQuestionOverride',
                    attributes: ['userId', 'maxAttempts'],
                    required: false,
                    where: {
                        active: true,
                        userId: userId
                    }
                });
            }

            // Using strict with typescript results in WhereOptions failing when set to a partial object, casting it as WhereOptions since it works
            const where: sequelize.WhereOptions = _({
                courseTopicContentId,
                active: true
            }).omitBy(_.isUndefined).value() as sequelize.WhereOptions;

            const findOptions: sequelize.FindOptions = {
                include,
                where,
                order: [
                    ['problemNumber', 'ASC'],
                ]
            };
            const questions = await CourseWWTopicQuestion.findAll(findOptions);
            if (!_.isNil(courseTopicContentId)){
                const topic = await this.getTopicById({id: courseTopicContentId});
                // TODO remove assessment hardcoding -- userId nil-check is for TS
                if (topic.topicTypeId === 2 && !_.isNil(userId)) {
                    await questions.asyncForEach(async (question) => {
                        if (_.isNil(question.grades) || question.grades.length === 0) throw new RederlyExtendedError('Impossible! Found an assessment question without a grade.');
                        const version = await courseRepository.getCurrentInstanceForQuestion({questionId: question.id, userId});
                        question.webworkQuestionPath = version?.webworkQuestionPath ?? question.webworkQuestionPath;
                        question.grades[0].randomSeed = version?.randomSeed ?? question.grades[0].randomSeed;
                        question.problemNumber = version?.problemNumber ?? question.problemNumber;
                    });
                } else {
                    questions.forEach( (question) => {
                        // question-level overrides do not exist on assessments
                        if (!_.isNil(question.studentTopicQuestionOverride) && !_.isNil(question.studentTopicQuestionOverride?.[0]) && question.studentTopicQuestionOverride[0].active && !_.isNil(question.studentTopicQuestionOverride[0].maxAttempts)) {
                            question.maxAttempts = question.studentTopicQuestionOverride[0].maxAttempts;
                        }
                    });
                }
            }
            return questions;
        } catch (e) {
            throw new WrappedError('Error fetching problems', e);
        }
    }

    /**
     * Get's a list of questions that are missing a grade
     * We can then go and create a course
     */
    async getQuestionsThatRequireGradesForUser(options: GetQuestionsThatRequireGradesForUserOptions): Promise<CourseWWTopicQuestion[]> {
        const { courseId, userId } = options;
        try {
            return await CourseWWTopicQuestion.findAll({
                include: [{
                    model: CourseTopicContent,
                    as: 'topic',
                    required: true,
                    attributes: [],
                    include: [{
                        model: CourseUnitContent,
                        as: 'unit',
                        required: true,
                        attributes: [],
                        // This where is fine here
                        // We just don't want further results to propogate
                        // Also we don't need course in the join, we need to add a relationship to go through course
                        where: {
                            courseId
                        },
                        include: [{
                            model: Course,
                            as: 'course',
                            required: true,
                            attributes: [],
                            include: [{
                                model: StudentEnrollment,
                                as: 'enrolledStudents',
                                required: true,
                                attributes: [],
                            }]
                        }]
                    }]
                }, {
                    model: StudentGrade,
                    as: 'grades',
                    required: false,
                    attributes: [],
                    where: {
                        id: {
                            [Sequelize.Op.eq]: null
                        }
                    }
                }],
                attributes: [
                    'id'
                ],
                where: {
                    ['$topic.unit.course.enrolledStudents.user_id$']: userId
                }
            });
        } catch (e) {
            throw new WrappedError('Could not getQuestionsThatRequireGradesForUser', e);
        }
    }

    /*
    * Get all users that don't have a grade on a question
    * Useful when adding a question to a course that already has enrollments
    */
    async getUsersThatRequireGradeForQuestion(options: GetUsersThatRequireGradeForQuestionOptions): Promise<StudentEnrollment[]> {
        const { questionId } = options;
        try {
            return await StudentEnrollment.findAll({
                include: [{
                    model: Course,
                    as: 'course',
                    required: true,
                    attributes: [],
                    include: [{
                        model: CourseUnitContent,
                        as: 'units',
                        required: true,
                        attributes: [],
                        include: [{
                            model: CourseTopicContent,
                            as: 'topics',
                            required: true,
                            attributes: [],
                            include: [{
                                model: CourseWWTopicQuestion,
                                required: true,
                                as: 'questions',
                                attributes: [],
                                // This where is ok here because we just don't want results to propogate past this point
                                where: {
                                    id: questionId
                                },
                                include: [{
                                    model: StudentGrade,
                                    as: 'grades',
                                    required: false,
                                    attributes: []
                                }]
                            }]
                        }]
                    }]
                }],
                attributes: [
                    'userId'
                ],
                where: {
                    ['$course.units.topics.questions.grades.student_grade_id$']: {
                        [Sequelize.Op.eq]: null
                    }
                }
            });
        } catch (e) {
            throw new WrappedError('Could not getUsersThatRequireGradeForQuestion', e);
        }
    }

    async createGradesForUserEnrollment(options: CreateGradesForUserEnrollmentOptions): Promise<number> {
        return useDatabaseTransaction(async (): Promise<number> => {
            const { courseId, userId } = options;
            const results = await this.getQuestionsThatRequireGradesForUser({
                courseId,
                userId
            });
            await results.asyncForEach(async (result) => {
                await this.createNewStudentGrade({
                    courseTopicQuestionId: result.id,
                    userId: userId
                });
            });
            return results.length;
        });
    }

    async createGradesForQuestion(options: CreateGradesForQuestionOptions): Promise<number> {
        return useDatabaseTransaction(async (): Promise<number> => {
            const { questionId } = options;
            const results = await this.getUsersThatRequireGradeForQuestion({
                questionId
            });
            await results.asyncForEach(async (result) => {
                await this.createNewStudentGrade({
                    courseTopicQuestionId: questionId,
                    userId: result.userId
                });
            });
            return results.length;
        });
    }

    generateRandomSeed(): number {
        return Math.floor(Math.random() * 999999);
    }

    async getStudentTopicAssessmentInfo(options: GetStudentTopicAssessmentInfoOptions): Promise<StudentTopicAssessmentInfo[]> {
        const topicInfo = await TopicAssessmentInfo.findOne({
            where: {
                id: options.topicAssessmentInfoId,
            }
        });
        if (_.isNil(topicInfo)) throw new IllegalArgumentException('Requested student topic assessment info with a bad topic ID.');
        const result = await StudentTopicAssessmentInfo.findAll({
            where: {
                topicAssessmentInfoId: topicInfo.id,
                userId: options.userId,
                active: true,
            },
            order: [
                ['startTime', 'DESC'],
            ],
        });
        if (_.isNil(result)) {
            throw new NotFoundError('The requested student topic assessment info does not exist');
        }
        return result;
    }

    async getStudentTopicAssessmentInfoById(id: number): Promise<StudentTopicAssessmentInfo> {
        const result = await StudentTopicAssessmentInfo.findOne({
            where: {
                id,
                active: true,
            },
        });
        if (_.isNil(result)) {
            throw new NotFoundError('The requested student topic assessment info does not exist');
        }
        return result;
    }

    async getTopicAssessmentInfoByTopicId(options: GetTopicAssessmentInfoByTopicIdOptions): Promise<TopicAssessmentInfo> {
        const include = [];
        if (!_.isNil(options.userId)) {
            include.push({
                model: StudentTopicAssessmentOverride,
                as: 'studentTopicAssessmentOverride',
                attributes: ['duration', 'maxGradedAttemptsPerVersion', 'maxVersions', 'versionDelay'],
                required: false,
                where: {
                    active: true,
                    userId: options.userId,
                }
            });
        }

        const result = await TopicAssessmentInfo.findOne({
            where: {
                courseTopicContentId: options.topicId,
                active: true
            },
            include,
        });
        if (_.isNil(result)) {
            throw new NotFoundError('The requested topic does not exist');
        }
        return result;
    }

    async createNewStudentGrade(options: CreateNewStudentGradeOptions): Promise<StudentGrade> {
        const {
            userId,
            courseTopicQuestionId
        } = options;
        try {
            return await StudentGrade.create({
                userId: userId,
                courseWWTopicQuestionId: courseTopicQuestionId,
                randomSeed: this.generateRandomSeed(),
                bestScore: 0,
                overallBestScore: 0,
                numAttempts: 0,
                firstAttempts: 0,
                latestAttempts: 0,
            });
        } catch (e) {
            throw new WrappedError('Could not create new student grade', e);
        }
    }

    // does this actually belong in course-repository?
    async createStudentTopicAssessmentInfo(options: Partial<StudentTopicAssessmentInfo>): Promise<StudentTopicAssessmentInfo> {
        try {
            return await StudentTopicAssessmentInfo.create(options);
        } catch (e) {
            throw new WrappedError('Could not create new Student Topic Assessment info for this topic', e);
        }
    }

    async createGradeInstancesForAssessment(options: CreateGradeInstancesForAssessmentOptions): Promise<StudentTopicAssessmentInfo> {
        return useDatabaseTransaction(async (): Promise<StudentTopicAssessmentInfo> => {
            const { topicId, userId } = options;
            const topic = await courseRepository.getCourseTopic({id: topicId});
            const topicInfo = await topic.getTopicAssessmentInfo(); // order by startDate 
    
            const questions = await courseRepository.getQuestionsFromTopicId({id:topicId});
            const startTime = moment().add(1,'minute'); // 1 minute should cover any delay in creating records before a student can actually begin
    
            let endTime = moment(startTime).add(topicInfo.duration, 'minutes');
            if (topicInfo.hardCutoff) {
                endTime = moment.min(topic.endDate.toMoment(), endTime);
            } 
    
            const nextVersionAvailableTime = moment(startTime).add(topicInfo.versionDelay, 'minutes');
            // in trying to be clever about shuffling the order, don't forget to shift from 0..n-1 to 1..n
            const problemOrder = (topicInfo.randomizeOrder) ? _.shuffle([...Array(questions.length).keys()]) : [...Array(questions.length).keys()];
    
            const studentTopicAssessmentInfo = await this.createStudentTopicAssessmentInfo({
                userId,
                topicAssessmentInfoId: topicInfo.id,
                startTime: startTime.toDate(),
                endTime: endTime.toDate(),
                nextVersionAvailableTime: nextVersionAvailableTime.toDate(),
                maxAttempts: topicInfo.maxGradedAttemptsPerVersion,
            });

            await questions.asyncForEach(async (question, index) => {
                const questionInfo = await question.getCourseQuestionAssessmentInfo();
                const questionGrade = await StudentGrade.findOne({
                    where: {
                        userId,
                        courseWWTopicQuestionId: question.id,
                        active: true
                    }
                });
                if (_.isNil(questionGrade)) throw new WrappedError(`Question id: ${question.id} has no corresponding grade.`);
                let randomSeed: number | undefined;
                let webworkQuestionPath: string | undefined;
                if (_.isNil(questionInfo)) {
                    randomSeed = this.generateRandomSeed();
                    webworkQuestionPath = question.webworkQuestionPath;
                } else {
                    randomSeed = _.sample(questionInfo.randomSeedSet) ?? this.generateRandomSeed(); // coalesce should NEVER happen - but TS doesn't recognize that _.sample(nonEmptyArray) will not return undefined
                    const problemPaths = [...new Set([question.webworkQuestionPath, ...questionInfo.additionalProblemPaths])]; // Set removes duplicates
                    webworkQuestionPath = _.sample(problemPaths) ?? question.webworkQuestionPath; // same coalesce chicanery to mollify TS _.sample() is string | undefined
                }
                await this.createNewStudentGradeInstance({
                    studentGradeId: questionGrade.id,
                    studentTopicAssessmentInfoId: studentTopicAssessmentInfo.id,
                    webworkQuestionPath,
                    randomSeed,
                    userId,
                    problemNumber: problemOrder[index]+1, // problemOrder starts from 0
                });

                // for assessments, 
                // numAttempts on a StudentGrade should refer to the number of versions the student has tried
                // do we use StudentGrade.numExtendedAttempts for number of versions generated?
                // or is that a confusing abuse of data?
                // questionGrade.numExtendedAttempts++; 
                // await questionGrade.save();
            });

            try {
                let autoSubmitURL: string | undefined;
                if(_.isNil(options.requestURL)) {
                    logger.error('requestURL is nil for auto submit');
                    // TODO configuration backup?
                } else {
                    // cspell:disable-next-line -- urljoin is the name of the library
                    autoSubmitURL = urljoin(options.requestURL, configurations.server.basePath, `/courses/assessment/topic/${topicId}/submit/${studentTopicAssessmentInfo.id}/auto`);
                }
    
                if (_.isNil(autoSubmitURL)) {
                    logger.error(`Could not determine the url for auto submit for studentTopicAssessmentInfo: ${studentTopicAssessmentInfo.id}`);
                } else {
                    await schedulerHelper.setJob({
                        id: studentTopicAssessmentInfo.id.toString(),
                        time: endTime.toDate(),
                        webHookScheduleEvent: {
                            url: autoSubmitURL,
                            data: {}
                        }
                    });                    
                }
            } catch(e) {
                logger.error(`Could not create scheduler job for studentTopicAssessmentInfo ${studentTopicAssessmentInfo.id}`, e);
            }
    
            return studentTopicAssessmentInfo;
        });
    }

   async createNewStudentGradeInstance(options: CreateNewStudentGradeInstanceOptions): Promise<StudentGradeInstance> {
        const {
            userId,
            studentGradeId,
            studentTopicAssessmentInfoId,
            webworkQuestionPath,
            randomSeed,
            problemNumber
        } = options;
        try {
            return await StudentGradeInstance.create({
                userId,
                studentGradeId,
                studentTopicAssessmentInfoId,
                webworkQuestionPath,
                randomSeed,
                problemNumber,
            });
        } catch (e) {
            throw new WrappedError('Could not create new student grade instance', e);
        }
    }

    async isQuestionAnAssessment(questionId: number): Promise<boolean> {
        const question = await courseRepository.getQuestion({ id: questionId });
        const topic = await courseRepository.getCourseTopic({ id: question.courseTopicContentId });
        return topic.topicTypeId === 2;
    }

    /*
    * Determine if a user (student) is allowed to view a question -- profs+ => always true
    * If the question belongs to an assessment, check for a current version unless a versionId is provided
    * TODO: include current instance in return object, include message in return object (replace/extend getCurrentInstanceForQuestion)
    */
    async canUserViewQuestionId(options: CanUserViewQuestionIdOptions): Promise<CanUserViewQuestionIdResult> {
        const { user, questionId, studentTopicAssessmentInfoId } = options;
        let message = '';
        if (user.roleId === Role.PROFESSOR || user.roleId === Role.ADMIN) return {userCanViewQuestion: true, message};
        const question = await courseRepository.getQuestion({ id: questionId });
        const topic = await question.getTopic();
        if (topic.topicTypeId === 1) {
            if (topic.startDate.toMoment().isAfter(moment())) {
                message = `${topic.name} hasn't started yet.`;
                return { userCanViewQuestion: false, message };
            } else {
                return { userCanViewQuestion: true, message };
            }
        } else if (topic.topicTypeId === 2) {
            let topicIsLive = false;
            if (_.isNil(studentTopicAssessmentInfoId)) {
                // specific version was not supplied - see if there's a live version for this question
                const gradeInstance = await courseRepository.getCurrentInstanceForQuestion({questionId, userId: user.id});
                topicIsLive = !_.isNil(gradeInstance); // if we got a current instance, then topic is live
            } else {
                const studentTopicInfo = await this.getStudentTopicAssessmentInfoById(studentTopicAssessmentInfoId);
                topicIsLive = studentTopicInfo.isClosed === false && // isClosed might not be accurate when the assessment times out
                    moment().isBetween(studentTopicInfo.startTime.toMoment(), studentTopicInfo.endTime.toMoment());
            }
            const topicInfo = await topic.getTopicAssessmentInfo();
            if (topicIsLive) {
                return { userCanViewQuestion: true, message };
            } else {
                if (topicInfo.hideProblemsAfterFinish) {
                    message = `${topic.name} does not allow problems to be viewed after completion`;
                    return { userCanViewQuestion: false, message };
                } else {
                    return { userCanViewQuestion: true, message };
                }
            }
        }
        // we *should* never get here - but if we do, then the answer is NO
        logger.error(`User #${user.id} asked to view question #${questionId} and the answer was undetermined.`);
        return { userCanViewQuestion: false, message};
    };

    /*
    * Determine if a user (student) is allowed to start a new version
    * No one may start a new version if one is already open
    * If the question belongs to an assessment, check for a current version unless a versionId is provided
    */
    async canUserStartNewVersion(options: UserCanStartNewVersionOptions): Promise<UserCanStartNewVersionResult> {
        const {user, topicId} = options;
        let userCanStartNewVersion = true;
        let message = '';
        const data: UserCanStartNewVersionResultData = {
            status: 'none'
        };

        let topic = await this.getTopicById({ 
            id: topicId, 
            userId: user.id 
        }); // includes TopicOverrides
        if (!_.isNil(topic.studentTopicOverride) && topic.studentTopicOverride.length > 0) {
            topic = topic.getWithOverrides(topic.studentTopicOverride[0]) as CourseTopicContent;
        }

        let topicInfo = await this.getTopicAssessmentInfoByTopicId({
            topicId: topicId,
            userId: user.id
        }); 
        if (!_.isNil(topicInfo.studentTopicAssessmentOverride) && topicInfo.studentTopicAssessmentOverride.length > 0) {
            topicInfo = topicInfo.getWithOverrides(topicInfo.studentTopicAssessmentOverride[0]) as TopicAssessmentInfo;
        }

        const versions = await this.getStudentTopicAssessmentInfo({
            topicAssessmentInfoId: topicInfo.id,
            userId: user.id
        });

        // restrictions on start time, maximum versions, and version delay only apply to students
        if (user.roleId === Role.STUDENT) {
            // if the assessment has not yet started, students cannot generate a version
            if ( moment().isBefore(topic.startDate.toMoment()) ) {
                message = `The topic "${topic.name}" has not started yet.`;
                data.status = 'NOT_STARTED';
                userCanStartNewVersion = false;
            } else if (versions.length >= topicInfo.maxVersions) {
            // check number of versions already used
                if (versions[0].isClosed !== true) {
                    versions[0].isClosed = true;
                    await versions[0].save();
                }
                message = 'You have no retakes remaining.';
                data.status = 'NO_MORE_VERSIONS';
                userCanStartNewVersion = false;
            } else if (versions[0] && moment().isBefore(versions[0].nextVersionAvailableTime.toMoment())) {
            // versions remaining, have we waited long enough?
                // toLocaleString supports timezone, which we should maybe use?
                message = `Another version of this assessment will be available after ${versions[0].nextVersionAvailableTime.toLocaleString()}.`;
                data.nextAvailableStartTime = versions[0].nextVersionAvailableTime;
                data.status = 'NOT_AVAILABLE_YET';
                userCanStartNewVersion = false;
            }
        }

        // finally - *no one* should be able to create a version if there is already one "open"
        if (versions[0] &&  // user has a version (the most recent one)
            versions[0].isClosed === false && // it has not been closed early
            moment().isBefore(versions[0].endTime.toMoment()) // and the time hasn't expired
        ) {
            message = 'You already have an open version of this assessment.';
            data.status = 'ALREADY_OPEN';
            userCanStartNewVersion = false;
        }

        return {
            userCanStartNewVersion,
            message,
            data
        };
    }

    scoreAssessment = (results: SubmittedAssessmentResultContext[]): ScoreAssessmentResult => {
        let totalScore = 0;
        let bestVersionScore = 0;
        let bestOverallVersion = 0;
        const problemScores: { [key: string]: number } = {};

        results.forEach((result: SubmittedAssessmentResultContext) => {
            const { questionResponse, grade, instance, weight } = result;
            totalScore += weight * questionResponse.problem_result.score;
            bestVersionScore += weight * instance.scoreForBestVersion;
            bestOverallVersion += weight * grade.bestScore;
            problemScores[result.instance.problemNumber.toString(10)] = result.questionResponse.problem_result.score * result.weight;
        });

        problemScores['total'] = totalScore;
        return {problemScores, bestVersionScore: bestVersionScore, bestOverallVersion};
    }

    async submitAssessmentAnswers(studentTopicAssessmentInfoId: number, wasAutoSubmitted: boolean): Promise<SubmitAssessmentAnswerResult> {
        return useDatabaseTransaction(async (): Promise<SubmitAssessmentAnswerResult> => {
            const studentTopicAssessmentInfo = await this.getStudentTopicAssessmentInfoById(studentTopicAssessmentInfoId);
            if (studentTopicAssessmentInfo.numAttempts >= studentTopicAssessmentInfo.maxAttempts) {
                throw new IllegalArgumentException('Cannot submit assessment answers when there are no attempts remaining'); // sanity check, shouldn't happen
            }
            const topicInfo = await studentTopicAssessmentInfo.getTopicAssessmentInfo();
            const { showItemizedResults, showTotalGradeImmediately } = topicInfo;
    
            const studentGradeInstances = await studentTopicAssessmentInfo.getStudentGradeInstances();
    
            const questionResponses = [] as SubmittedAssessmentResultContext[];
            await studentGradeInstances.asyncForEach(async (instance) => {
                const grade = await instance.getGrade(); // passing studentGrade, studentGradeInstance, and questionResponse for grading
                const question = await grade.getQuestion(); // getting this just for weight -- will save queries later
    
                const getProblemParams: GetProblemParameters = {
                    formURL: '/', // we don't care about this - no one sees the rendered version
                    sourceFilePath: instance.webworkQuestionPath,
                    problemSeed: instance.randomSeed,
                    formData: instance.currentProblemState,
                };
    
                const questionResponse = await rendererHelper.getProblem(getProblemParams) as RendererResponse;
                questionResponses.push({
                    questionResponse,
                    grade,
                    instance,
                    weight: question.weight,
                });
            });
    
            const { problemScores, bestVersionScore, bestOverallVersion } = this.scoreAssessment(questionResponses);
            const isBestForThisVersion = problemScores.total >= bestVersionScore;
            const isBestOverallVersion = problemScores.total >= bestOverallVersion;
    
            await questionResponses.asyncForEach(async (result: SubmittedAssessmentResultContext) => {
    
                if (_.isNil(result.instance.id)) {
                    throw new Error('the grade instance ID cannot be empty');
                }
                // create workbook for attempt
                const workbook = await StudentWorkbook.create({
                    studentGradeId: result.grade.id,
                    userId: result.grade.userId,
                    courseWWTopicQuestionId: result.grade.courseWWTopicQuestionId,
                    studentGradeInstanceId: result.instance.id, // shouldn't this workbook be tied to a grade instance?
                    randomSeed: result.instance.randomSeed,
                    submitted: rendererHelper.cleanRendererResponseForTheDatabase(result.questionResponse.form_data as RendererResponse),
                    result: result.questionResponse.problem_result.score,
                    time: new Date(),
                    wasLate: false,
                    wasExpired: false,
                    wasAfterAttemptLimit: false,
                    wasLocked: false,
                    wasAutoSubmitted: wasAutoSubmitted,
                });
    
                // update individual problem high-scores
                if (result.questionResponse.problem_result.score > result.instance.overallBestScore) {
                    // update instance: overallBestScore, bestIndividualAttemptId
                    result.instance.overallBestScore = result.questionResponse.problem_result.score;
                    result.instance.bestIndividualAttemptId = workbook.id;
                    if (result.questionResponse.problem_result.score > result.grade.overallBestScore) {
                        // update grade: overallBestScore, *what about workbook id*?
                        result.grade.overallBestScore = result.questionResponse.problem_result.score;
                        // which workbookId field should be used?
                    }
                }
    
                // update aggregate best-scores
                if (isBestForThisVersion) {
                    // update instance: bestScore, bestVersionAttemptId
                    result.instance.scoreForBestVersion = result.questionResponse.problem_result.score;
                    result.instance.bestVersionAttemptId = workbook.id;
                    if (isBestOverallVersion) {
                        // update grade: bestScore, lastInfluencingLegalAttemptId? (or do we forego workbooks on grades for assessments because of grade instances)
                        result.grade.bestScore = result.questionResponse.problem_result.score;
                        result.grade.lastInfluencingAttemptId = workbook.id;
                    }
                }
    
                // const versionAverage = (incoming.instance.averageScore * incoming.instance.numAttempts + incoming.questionResponse.problem_result.score)/(incoming.instance.numAttempts + 1);
    
                if (studentTopicAssessmentInfo.numAttempts === 0) {
                    // this is the student's first submission for this version -- 
                    // update StudentGrade numAttempts to reflect the number of versions that were actually attempted
                    result.grade.numAttempts++;
                }
                // save updates
                await result.grade.save();
                await result.instance.save();
            });
    
            // update the number of attempts for this version
            studentTopicAssessmentInfo.numAttempts++;
            // close the version if student has maxed out their attempts
            if (studentTopicAssessmentInfo.numAttempts === studentTopicAssessmentInfo.maxAttempts) {
                studentTopicAssessmentInfo.isClosed = true;
            }
            await studentTopicAssessmentInfo.save();
    
            // use topic assessment info settings to decide what data is exposed to the frontend
            let problemScoresReturn: { [key: string]: number } | undefined;
            let bestVersionScoreReturn: number | undefined;
            let bestOverallVersionReturn: number | undefined;
            if (showTotalGradeImmediately){
                bestVersionScoreReturn = Math.max(bestVersionScore, problemScores.total);
                bestOverallVersionReturn = Math.max(bestOverallVersion, problemScores.total);
                if (showItemizedResults) {
                    problemScoresReturn = problemScores;
                } else {
                    problemScoresReturn = {total: problemScores.total};
                }
            }
            return { problemScores: problemScoresReturn, bestVersionScore: bestVersionScoreReturn, bestOverallVersion: bestOverallVersionReturn};
        });
    };

}

export const courseController = new CourseController();
export default courseController;
