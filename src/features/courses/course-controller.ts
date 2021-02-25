import * as _ from 'lodash';
import Bluebird = require('bluebird');
import Course, {CourseInterface} from '../../database/models/course';
import StudentEnrollment from '../../database/models/student-enrollment';
import { BaseError } from 'sequelize';
import NotFoundError from '../../exceptions/not-found-error';
import CourseUnitContent, {CourseUnitContentInterface} from '../../database/models/course-unit-content';
import CourseTopicContent, { CourseTopicContentInterface } from '../../database/models/course-topic-content';
import CourseWWTopicQuestion, { CourseWWTopicQuestionInterface, CourseTopicQuestionErrors } from '../../database/models/course-ww-topic-question';
import rendererHelper, { GetProblemParameters, OutputFormat, RendererResponse } from '../../utilities/renderer-helper';
import { stripTarGZExtension } from '../../utilities/file-helper';
import StudentWorkbook from '../../database/models/student-workbook';
import StudentGrade from '../../database/models/student-grade';
import StudentGradeInstance from '../../database/models/student-grade-instance';
import User from '../../database/models/user';
import logger from '../../utilities/logger';
import sequelize = require('sequelize');
import WrappedError from '../../exceptions/wrapped-error';
import AlreadyExistsError from '../../exceptions/already-exists-error';
import { GetTopicsOptions, CourseListOptions, UpdateUnitOptions, UpdateTopicOptions, EnrollByCodeOptions, GetGradesOptions, GetStatisticsOnQuestionsOptions, GetStatisticsOnTopicsOptions, GetStatisticsOnUnitsOptions, GetQuestionOptions, GetQuestionResult, SubmitAnswerOptions, SubmitAnswerResult, FindMissingGradesResult, GetQuestionsOptions, GetQuestionsThatRequireGradesForUserOptions, GetUsersThatRequireGradeForQuestionOptions, CreateGradesForUserEnrollmentOptions, CreateGradesForQuestionOptions, CreateNewStudentGradeOptions, UpdateQuestionOptions, UpdateCourseOptions, MakeProblemNumberAvailableOptions, MakeUnitContentOrderAvailableOptions, MakeTopicContentOrderAvailableOptions, CreateCourseOptions, CreateQuestionsForTopicFromDefFileContentOptions, DeleteQuestionsOptions, DeleteTopicsOptions, DeleteUnitsOptions, GetCalculatedRendererParamsOptions, GetCalculatedRendererParamsResponse, UpdateGradeOptions, DeleteUserEnrollmentOptions, ExtendTopicForUserOptions, GetQuestionRepositoryOptions, ExtendTopicQuestionForUserOptions, GradeOptions, ReGradeStudentGradeOptions, ReGradeQuestionOptions, ReGradeTopicOptions, SetGradeFromSubmissionOptions, CreateGradeInstancesForAssessmentOptions, CreateNewStudentGradeInstanceOptions, GetStudentTopicAssessmentInfoOptions, GetTopicAssessmentInfoByTopicIdOptions, SubmittedAssessmentResultContext, SubmitAssessmentAnswerResult, ScoreAssessmentResult, UserCanStartNewVersionOptions, UserCanStartNewVersionResult, UserCanStartNewVersionResultData, UpdateGradeInstanceOptions, PreviewQuestionOptions, CanUserGetQuestionsOptions, CanUserGetQuestionsResult, CanUserViewQuestionIdOptions, CanUserViewQuestionIdResult, CanUserGradeAssessmentOptions, GetAssessmentForGradingOptions, GetAssessmentForGradingResult, CreateAttachmentOptions, ListAttachmentOptions, DeleteAttachmentOptions, EmailProfOptions, GetAllContentForVersionOptions, GetGradeForQuestionOptions, ImportTarballOptions, ImportCourseTarballResult, OpenLabRedirectInfo, PrepareOpenLabRedirectOptions, CreateQuestionsForTopicFromParsedDefFileOptions, AddQuestionOptions, RequestNewProblemVersionOptions, BrowseProblemsCourseListOptions, GetSearchProblemResultsOptions, BrowseProblemsTopicListOptions, BrowseProblemsUnitListOptions, EnrollManuallyOptions, ManualEnrollmentResult } from './course-types';
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
import { calculateGrade, WillGetCreditReason, WillTrackAttemptReason } from '../../utilities/grading-helper';
import { useDatabaseTransaction } from '../../utilities/database-helper';
import StudentTopicOverride, { StudentTopicOverrideInterface } from '../../database/models/student-topic-override';
import StudentTopicQuestionOverride, { StudentTopicQuestionOverrideInterface } from '../../database/models/student-topic-question-override';
import IllegalArgumentException from '../../exceptions/illegal-argument-exception';
import StudentGradeOverride from '../../database/models/student-grade-override';
import StudentTopicAssessmentInfo from '../../database/models/student-topic-assessment-info';
import StudentTopicAssessmentOverride from '../../database/models/student-topic-assessment-override';
import TopicAssessmentInfo, {TopicAssessmentInfoInterface} from '../../database/models/topic-assessment-info';
import CourseQuestionAssessmentInfo, { CourseQuestionAssessmentInfoInterface } from '../../database/models/course-question-assessment-info';
import schedulerHelper from '../../utilities/scheduler-helper';
import configurations from '../../configurations';
// Had an error using standard import
// cspell:disable-next-line -- urljoin is the name of the library
import urljoin = require('url-join');
import userController from '../users/user-controller';
import AttemptsExceededException from '../../exceptions/attempts-exceeded-exception';
import ProblemAttachment from '../../database/models/problem-attachment';
import RederlyError from '../../exceptions/rederly-error';
import StudentGradeProblemAttachment from '../../database/models/student-grade-problem-attachment';
import StudentGradeInstanceProblemAttachment from '../../database/models/student-grade-instance-problem-attachment';
import StudentWorkbookProblemAttachment from '../../database/models/student-workbook-problem-attachment';
import emailHelper from '../../utilities/email-helper';
import * as utilities from '../../utilities/utilities';
import { findFiles, FindFilesDefFileResult, FindFilesPGFileResult, FindFilesImageFileResult, BucketDefFileResult } from '../../utilities/webwork-utilities/importer';
import * as nodePath from 'path';
import * as tar from 'tar';
import * as fs from 'fs';
import { getAverageGroupsBeforeDate, QUESTION_SQL_NAME, STUDENTTOPICOVERRIDE_SQL_NAME, TOPIC_SQL_NAME } from './statistics-helper';
import qs = require('qs');
import ForbiddenError from '../../exceptions/forbidden-error';
import appSequelize from '../../database/app-sequelize';

// When changing to import it creates the following compiling error (on instantiation): This expression is not constructable.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Sequelize = require('sequelize');

const ABSOLUTE_RENDERER_PATH_REGEX = /^(:?private\/|Contrib\/|webwork-open-problem-library\/|Library\/)/;

class CourseController {
    getCourseById(id: number, userId?: number): Promise<Course> {
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
                    include: 
                    [
                        {
                            model: CourseWWTopicQuestion,
                            as: 'questions',
                            required: false,
                            where: {
                                active: true
                            }
                        },
                        {
                            model: StudentTopicOverride,
                            as: 'studentTopicOverride',
                            // attributes: [],
                            where: {
                                active: true,
                                ...(userId && {userId: userId}),
                            },
                            required: false,
                        }
                    ],
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

    getTopicById({id, userId, includeQuestions, includeWorkbookCount}: {id: number; userId?: number; includeQuestions?: boolean; includeWorkbookCount?: boolean}): Promise<CourseTopicContent> {
        const include = [];
        const subInclude = [];
        const questionSubInclude = [];
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

        if (includeQuestions || includeWorkbookCount) {
            questionSubInclude.push({
                model: CourseQuestionAssessmentInfo,
                as: 'courseQuestionAssessmentInfo',
                required: false,
                where: {
                    active: true,
                }
            });

            if (includeWorkbookCount) {
                questionSubInclude.push({
                    model: StudentWorkbook,
                    as: 'workbooks',
                    required: false,
                    where: {
                        active: true,
                    },
                });
            }

            include.push({
                model: CourseWWTopicQuestion,
                as: 'questions',
                required: false,
                where: {
                    active: true,
                },
                include: questionSubInclude
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
            include,
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

        if (!_.isNil(options.filter.enrolledUserId)) {
            include.push({
                model: StudentEnrollment,
                attributes: [],
                as: 'enrolledStudents',
                where: {
                    userId: options.filter.enrolledUserId,
                    dropDate: null,
                    active: true,
                }
            });
        }

        if (!_.has(where, 'active')) {
            where.active = true;
        }

        return Course.findAll({
            where,
            include,
        });
    }

    // TODO combine with the above call when there is time to vet the changes
    browseProblemsCourseList({
        filter: {
            instructorId
        }
    }: BrowseProblemsCourseListOptions): Bluebird<Course[]> {
        const where: sequelize.WhereOptions = {};
        const attributes: Array<keyof CourseInterface> = ['name', 'id'];

        if (!_.isNil(instructorId)) {
            where.instructorId = instructorId;
        }

        if (!_.has(where, 'active')) {
            where.active = true;
        }

        return Course.findAll({
            where,
            attributes: attributes
        });
    }

    // TODO make reusable
    browseProblemsUnitList({
        filter: {
            courseId
        }
    }: BrowseProblemsUnitListOptions): Bluebird<CourseUnitContent[]> {
        const where: sequelize.WhereOptions = {};
        const attributes: Array<keyof CourseUnitContentInterface> = ['name', 'id'];

        if (!_.isNil(courseId)) {
            where.courseId = courseId;
        }

        if (!_.has(where, 'active')) {
            where.active = true;
        }

        return CourseUnitContent.findAll({
            where,
            attributes: attributes
        });
    }

    // TODO make reusable
    browseProblemsTopicList({
        filter: {
            unitId
        }
    }: BrowseProblemsTopicListOptions): Bluebird<CourseTopicContent[]> {
        const where: sequelize.WhereOptions = {};
        const attributes: Array<keyof CourseTopicContentInterface> = ['name', 'id'];

        if (!_.isNil(unitId)) {
            where.courseUnitContentId = unitId;
        }

        if (!_.has(where, 'active')) {
            where.active = true;
        }

        return CourseTopicContent.findAll({
            where,
            attributes: attributes
        });
    }

    // TODO make reusable
    browseProblemsSearch({
        filter: {
            courseId,
            unitId,
            topicId,
            instructorId,
        }
    }: GetSearchProblemResultsOptions): Bluebird<CourseWWTopicQuestion[]> {
        const where: sequelize.WhereOptions = {};
        if (!_.has(where, 'active')) {
            where.active = true;
        }

        return CourseWWTopicQuestion.findAll({
            attributes: ['id', 'webworkQuestionPath'] as Array<keyof CourseWWTopicQuestionInterface>,
            include: [{
                model: CourseQuestionAssessmentInfo,
                as: 'courseQuestionAssessmentInfo',
                required: false,
                where: {
                    active: true
                },
                attributes: ['id', 'additionalProblemPaths'] as Array<keyof CourseQuestionAssessmentInfoInterface>,
            }, {
                model: CourseTopicContent,
                as: 'topic',
                required: true,
                attributes: ['name', 'id'] as Array<keyof CourseTopicContentInterface>,
                where: _.omitBy({
                    active: true,
                    id: topicId
                }, _.isUndefined) as sequelize.WhereOptions,
                include: [{
                    model: CourseUnitContent,
                    as: 'unit',
                    required: true,
                    attributes: ['name', 'id'] as Array<keyof CourseUnitContentInterface>,
                    where: _.omitBy({
                        active: true,
                        id: unitId,
                    }, _.isUndefined) as sequelize.WhereOptions,
                    include: [{
                        model: Course,
                        as: 'course',
                        required: true,
                        attributes: ['name', 'id'] as Array<keyof CourseInterface>,
                        where: _.omitBy({
                            active: true,
                            id: courseId,
                            instructorId: instructorId
                        }, _.isUndefined) as sequelize.WhereOptions
                    }]
                }]
            }],
            order: [
                ['topic', 'unit', 'course', 'id', 'ASC'],
                ['topic', 'unit', 'contentOrder', 'ASC'],
                ['topic', 'contentOrder', 'ASC'],
                ['problemNumber', 'ASC'],
            ],
        });
    };
    
    async createCourse(options: CreateCourseOptions): Promise<Course> {
        if (options.options.useCurriculum) {
            return useDatabaseTransaction(async () => {
                // I didn't want this in the transaction, however use strict throws errors if not
                if (_.isNil(options.object.curriculumId)) {
                    throw new NotFoundError('Cannot useCurriculum if curriculumId is not given');
                }
                const curriculum = await curriculumRepository.getCurriculumById(options.object.curriculumId);
                const createdCourse = await courseRepository.createCourse(options.object);
                logger.debug('Created a course from a curriculum.');
                await curriculum.units?.asyncForEach(async (curriculumUnit: CurriculumUnitContent) => {
                    if (curriculumUnit.active === false) {
                        logger.debug(`Inactive curriculum unit was fetched in query for create course ID#${curriculumUnit.id}`);
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
                            logger.debug(`Inactive curriculum topic was fetched in query for create course ID#${curriculumTopic.id}`);
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

                        const topicAssessmentInfo = await curriculumTopic.getCurriculumTopicAssessmentInfo();

                        if (!_.isNil(topicAssessmentInfo)) {
                            await TopicAssessmentInfo.create({
                                ..._.omit(topicAssessmentInfo.get({plain: true}), ['id']),
                                courseTopicContentId: createdCourseTopic.id,
                                curriculumTopicAssessmentInfoId: topicAssessmentInfo.id,
                            });
                        }

                        await curriculumTopic.questions?.asyncForEach(async (curriculumQuestion: CurriculumWWTopicQuestion) => {
                            if (curriculumQuestion.active === false) {
                                logger.debug(`Inactive curriculum question was fetched in query for create course ID#${curriculumQuestion.id}`);
                                return;
                            }

                            const createdCourseQuestion = await courseRepository.createQuestion({
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

                            const questionAssessmentInfo = await curriculumQuestion.getCurriculumQuestionAssessmentInfo();

                            if (!_.isNil(questionAssessmentInfo)) {
                                const createFromCurriculum = {
                                    ..._.omit(questionAssessmentInfo.get({plain: true}), ['id']),
                                    courseWWTopicQuestionId: createdCourseQuestion.id,
                                    curriculumQuestionAssessmentInfoId: questionAssessmentInfo.id,
                                };

                                await CourseQuestionAssessmentInfo.create(createFromCurriculum);
                            }

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

    async createTopic(courseTopicContent: Partial<CourseTopicContent>): Promise<CourseTopicContent> {
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
            id: options.where.id,
            checkUsed: true,
        });

        const workbookCount = existingTopic.calculateWorkbookCount();
        const versionCount = existingTopic.calculateVersionCount();
        const topicIsChangingTypes = !_.isNil(options.updates.topicTypeId) && (existingTopic.topicTypeId !== options.updates.topicTypeId);

        if ((
                (workbookCount && workbookCount > 0) || 
                (versionCount && versionCount > 0)
            ) && topicIsChangingTypes
        ) {
            throw new IllegalArgumentException('Topic type cannot be changed. Students have begun working on this topic.');
        }

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

            // If only one question is deleted, rather than a whole topic.
            if (!_.isNil(existingQuestion)) {
                // If this question was previously in an error state, decrement the topic's error cache.
                if (!_.isNil(existingQuestion.errors)) {
                    existingQuestion.getTopic().then(topic => topic.decrement('errors'));
                }

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

    getAdditionalPathsFromBuckets = ({
        defFileDiscoveryResult: {
            defFileResult,
            bucketDefFiles
        },
        pgFilePath,
        result = []
    }: {
        defFileDiscoveryResult: {
            defFileResult: FindFilesDefFileResult;
            bucketDefFiles: { [key: string]: [BucketDefFileResult] };
        };
        pgFilePath: string;
        result?: Array<string>;
    }): Array<string> => {
        const bucketDefFileMap: BucketDefFileResult | undefined = bucketDefFiles[pgFilePath].find((value: BucketDefFileResult) => {
            return value.pgFilePathFromDefFile === pgFilePath;
        });
        if (_.isNil(bucketDefFileMap)) {
            throw new RederlyError('Could not find bucket');
        }
        const subDefFileResult = defFileResult.bucketDefFiles[bucketDefFileMap.bucketDefFile];
        if (_.isNil(subDefFileResult)) {
            throw new RederlyError(`Bucket def file not found ${bucketDefFileMap.bucketDefFile}`);
        }
        Object.values(subDefFileResult.pgFiles).forEach(pgFileResult => {
            // Buckets of buckets
            if(pgFileResult.pgFilePathFromDefFile.startsWith('group:')) {
                // Recursion!
                this.getAdditionalPathsFromBuckets({
                    defFileDiscoveryResult: {
                        defFileResult: subDefFileResult,
                        bucketDefFiles: bucketDefFiles
                    },
                    pgFilePath: pgFileResult.pgFilePathFromDefFile,
                    result: result
                });
            } else {
                if (_.isNil(pgFileResult.resolvedRendererPath)) {
                    throw new RederlyError(`${pgFileResult.pgFilePathFromDefFile} was not resolved (check if on disk or check renderer)`);
                } else {
                    result.push(pgFileResult.resolvedRendererPath);
                }
            }
        });

        return result;
    };

    async getEnrolledUserIdsInCourse({ courseId }: { courseId: number }): Promise<Array<number>> {
        const course = await Course.findOne({
            where: {
                id: courseId
            },
            attributes: [],
            include: [{
                model: StudentEnrollment,
                as: 'enrolledStudents',
                attributes: ['userId'],
            }]
        });

        if (_.isNil(course)) {
            throw new RederlyError('getEnrolledUserIdsInCourse: Invalid course id');
        }
        const enrolledStudents = course.enrolledStudents;
        if (_.isNil(enrolledStudents)) {
            throw new RederlyError('getEnrolledUserIdsInCourse: course was missing enrolledStudents');
        }
        return enrolledStudents.map(enrolledStudent => enrolledStudent.userId);
    }

    async getEnrolledUserIdsInTopic({ topicId }: { topicId: number }): Promise<Array<number>> {
        const topics = await CourseTopicContent.findAll({
            where: {
                id: topicId
            },
            attributes: [],
            include: [{
                model: CourseUnitContent,
                as: 'unit',
                attributes: ['courseId'],
                include:[{
                    model: Course,
                    as: 'course',
                    attributes: ['id'],
                    include: [{
                        model: StudentEnrollment,
                        as: 'enrolledStudents',
                        attributes: ['userId'],
                    }]
                }]
            }]
        });

        if (topics.length === 0) {
            throw new RederlyError('getEnrolledUserIdsInTopic: fetch for topics had 0 results');
        }
        if (topics.length > 1) {
            logger.warn('getEnrolledUserIdsInTopic fetched more than 1 topic, expected only one');
        }
        const unit = topics[0].unit;
        if (_.isNil(unit)) {
            throw new RederlyError('getEnrolledUserIdsInTopic: topic was missing unit');
        }
        const course = unit.course;
        if (_.isNil(course)) {
            throw new RederlyError('getEnrolledUserIdsInTopic: course is missing from the unit');
        }
        const enrolledStudents = course.enrolledStudents;
        if (_.isNil(enrolledStudents)) {
            throw new RederlyError('getEnrolledUserIdsInTopic: course was missing enrolledStudents');
        }
        return enrolledStudents.map(enrolledStudent => enrolledStudent.userId);
    }
    
    async createQuestionsForTopicFromDefFileContent(options: CreateQuestionsForTopicFromDefFileContentOptions | CreateQuestionsForTopicFromParsedDefFileOptions): Promise<CourseWWTopicQuestion[]> {
        const hasParsed = (options: CreateQuestionsForTopicFromDefFileContentOptions | CreateQuestionsForTopicFromParsedDefFileOptions): options is CreateQuestionsForTopicFromParsedDefFileOptions => options.hasOwnProperty(nameof<CreateQuestionsForTopicFromParsedDefFileOptions>('parsedWebworkDef'));

        const parsedWebworkDef: WebWorkDef = hasParsed(options) ? options.parsedWebworkDef : new WebWorkDef(options.webworkDefFileContent);
        let lastProblemNumber = await courseRepository.getLatestProblemNumberForTopic(options.courseTopicId) || 0;

        const topic = options.topic ?? await CourseTopicContent.findOne({where: {id: options.courseTopicId}});

        if (topic?.id !== options.courseTopicId) {
            logger.warn('A topic ID was passed specifically, but a topic object with a different ID was also passed and took precedence.');
        }
        
        if (_.isNil(topic)) {
            throw new NotFoundError('Tried to increment for a topic ID that doesn\'t exist.');
        }

        // TODO fix typings - remove any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return useDatabaseTransaction<any>(async (): Promise<any> => {
            const userIds = options.userIds ?? await this.getEnrolledUserIdsInTopic({
                topicId: options.courseTopicId
            });

            return parsedWebworkDef.problems.asyncForEach(async (problem: Problem, index: number) => {
                const pgFilePath = options.defFileDiscoveryResult?.defFileResult.pgFiles[problem.source_file ?? '']?.resolvedRendererPath ?? problem.source_file;

                if (pgFilePath?.startsWith('group:')) {
                    if(_.isNil(options.defFileDiscoveryResult)) {
                        throw new IllegalArgumentException('Cannot import buckets without archive import');
                    } else if (!parsedWebworkDef.isExam()) {
                        throw new IllegalArgumentException('Can only import buckets / group for exams');
                    }
                    const result = this.getAdditionalPathsFromBuckets({
                        defFileDiscoveryResult: options.defFileDiscoveryResult,
                        pgFilePath: pgFilePath,
                    });
                    const problemPath = result.shift();
                    
                    // Currently, group imports are only supported by archive and fail completely if there are any bad paths.
                    // Thus, at this point, no errors are available to be set for courseQuestionAssessmentInfo.

                    const question = await this.addQuestion({
                        question: {
                            // active: true,
                            courseTopicContentId: options.courseTopicId,
                            problemNumber: ++lastProblemNumber,
                            webworkQuestionPath: problemPath,
                            weight: parseInt(problem.value ?? '1'),
                            maxAttempts: parseInt(problem.max_attempts ?? '-1'),
                            hidden: false,
                            optional: false,
                        },
                        userIds: userIds
                    });

                    await CourseQuestionAssessmentInfo.create({
                        additionalProblemPaths: result,
                        courseWWTopicQuestionId: question.id,
                        randomSeedSet: [],
                    });

                    return question;
                } else {
                    const additionalProblemPaths = _.isSomething(problem.rederlyAdditionalPaths) ? JSON.parse(problem.rederlyAdditionalPaths) as string[] : undefined;
                    const randomSeedRestrictions = _.isSomething(problem.rederlyRandomSeedRestrictions) ? JSON.parse(problem.rederlyRandomSeedRestrictions) as number[] : undefined;

                    let errors: CourseTopicQuestionErrors | null = null;
                    if (pgFilePath === undefined) {
                        throw new NotFoundError('The file path for this problem was not defined.');
                    }

                    const parsedErrors = (options as CreateQuestionsForTopicFromParsedDefFileOptions).errors;
                    if (_.isNil(parsedErrors)) {
                        const allProblemPaths = [pgFilePath, ...(additionalProblemPaths ?? [])];
                        await allProblemPaths.asyncForEach(async (problemPath) => {
                            if (await rendererHelper.isPathAccessibleToRenderer({problemPath: problemPath}) === false) {
                                errors = errors ?? {};
                                errors[pgFilePath] = [`${pgFilePath} cannot be found.`];
                            }
                        });
                    } else {
                        // If an error object was passed in from an archive import, pull specifically the errors associated with this path, or null.
                        errors = _.isNil(parsedErrors[pgFilePath]) ? null : {[pgFilePath]: parsedErrors[pgFilePath]};
                    }

                    // This increments on a per-problem basis. We could improve DB performance by doing this at the archive import when we do parsing.
                    if (!_.isNil(errors) && !_.isEmpty(errors)) {
                        await topic.increment('errors');
                    }

                    const question = await this.addQuestion({
                        question: {
                            // active: true,
                            courseTopicContentId: options.courseTopicId,
                            problemNumber: lastProblemNumber + index + 1,
                            webworkQuestionPath: pgFilePath,
                            weight: parseInt(problem.value ?? '1'),
                            maxAttempts: parseInt(problem.max_attempts ?? '-1'),
                            hidden: false,
                            optional: false,
                            errors: errors ?? null,
                        },
                        userIds: userIds
                    });

                    if (_.isSomething(additionalProblemPaths) || _.isSomething(randomSeedRestrictions)) {
                        question.courseQuestionAssessmentInfo = await question.createCourseQuestionAssessmentInfo({
                            additionalProblemPaths: additionalProblemPaths,
                            courseWWTopicQuestionId: question.id,
                            randomSeedSet: randomSeedRestrictions,
                        });
                    }
                    return question;
                }
            });
        });
    }

    async addQuestion(options: AddQuestionOptions): Promise<CourseWWTopicQuestion> {
        return await useDatabaseTransaction(async () => {
            const result = await this.createQuestion(options.question);
            await this.createGradesForQuestion({
                questionId: result.id,
                userIds: options.userIds
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
        gradeInstance,
        courseQuestion,
        userId
    }: GetCalculatedRendererParamsOptions): Promise<GetCalculatedRendererParamsResponse> {
        let showSolutions = role !== Role.STUDENT;
        let outputFormat: OutputFormat | undefined;
        // Currently we only need this fetch for student, small optimization to not call the db again
        if (!showSolutions) {
            if (_.isNil(topic)) {
                topic = await this.getTopicById({id: courseQuestion.courseTopicContentId});
            }
            let topicObj: CourseTopicContentInterface = topic;
            if (!_.isNil(userId)) {
                const overrides = await topic.getStudentTopicOverride({
                    where: {
                        userId: userId,
                        active: true,
                    }
                });
                if (overrides.length > 1) {
                    logger.warn('getCalculatedRendererParams got multiple overrides, using first');
                }
                if (!_.isNil(overrides.first)) {
                    topicObj = topic.getWithOverrides(overrides.first);
                }
            }
            if (moment(topicObj.deadDate).add(Constants.Course.SHOW_SOLUTIONS_DELAY_IN_DAYS, 'days').isBefore(moment())) {
                showSolutions = true;
                outputFormat = OutputFormat.PRACTICE;
            }
        }
        if (!_.isNil(gradeInstance)) {
            const version = await gradeInstance.getStudentAssessmentInfo();
            outputFormat = (version.isClosed || version.endTime.toMoment().isBefore(moment())) ? OutputFormat.STATIC : OutputFormat.ASSESS;
        }
        return {
            outputformat: outputFormat ?? rendererHelper.getOutputFormatForRole(role),
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

        let gradeInstance: StudentGradeInstance | undefined;

        // get studentGrade from workbook if workbookID,
        // otherwise studentGrade from userID + questionID | null
        if(_.isNil(workbook)) {
            // when no workbook is sent, the source of truth depends on whether question belongs to an assessment
            const thisQuestionIsFromAnAssessment = await this.isQuestionAnAssessment(options.questionId);
            if (thisQuestionIsFromAnAssessment) {
                if (_.isNil(options.studentTopicAssessmentInfoId)) {
                    gradeInstance = await courseRepository.getCurrentInstanceForQuestion({
                        questionId: options.questionId,
                        userId: options.userId
                    });
                } else {
                    // student grade instances do not have a direct reference to userId
                    // we have to pass through the studentGrade to get there
                    const questionGrade = await courseQuestion.getGrades({
                        where: {
                            userId: options.userId,
                            active: true,
                        }
                    });

                    if (!_.isNil(questionGrade.first)) {
                        const requestedGradeInstance = await StudentGradeInstance.findOne({
                            where: {
                                studentTopicAssessmentInfoId: options.studentTopicAssessmentInfoId,
                                studentGradeId: questionGrade.first.id,
                                active: true
                            }
                        });
                        if (!_.isNil(requestedGradeInstance)) {
                            gradeInstance = requestedGradeInstance;
                        } else {
                            throw new IllegalArgumentException('The version you requested does not correspond to the requested user.');
                        }
                    } else {
                        throw new IllegalArgumentException('Requested user has not been assigned this problem.');
                    }
                }

                if (_.isNil(gradeInstance)) throw new IllegalArgumentException('No current grade instance for this assessment question.');
                formData = gradeInstance.currentProblemState;
                sourceFilePath = gradeInstance.webworkQuestionPath;
                problemSeed = gradeInstance.randomSeed;
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
            // make sure to grab the right path & seed if this is an assessment workbook!
            if (_.isNil(workbook.studentGradeInstanceId)) {
                numIncorrect = studentGrade.numAttempts;
            } else {
                gradeInstance = await courseRepository.getStudentGradeInstance({id: workbook.studentGradeInstanceId});
                if (_.isNil(gradeInstance)) throw new NotFoundError(`workbook ${workbook.id} has grade instance ${workbook.studentGradeInstanceId} which could not be found`);
            }
            problemSeed = workbook.randomSeed;
            sourceFilePath = workbook.problemPath;
            formData = workbook.submitted.form_data;
        }

        const calculatedRendererParameters = await this.getCalculatedRendererParams({
            courseQuestion,
            role: options.role,
            gradeInstance,
            userId: options.userId
        });

        // TODO; rework calculatedRendererParameters
        if (options.readonly) {
            calculatedRendererParameters.outputformat = OutputFormat.STATIC;
        }

        let showCorrectAnswers = false;
        let answersSubmitted: number | undefined;
        if (options.role === Role.PROFESSOR && (!_.isNil(workbook) || options.showCorrectAnswers)) {
            answersSubmitted = Number(true);

            if (options.showCorrectAnswers !== false) {
                showCorrectAnswers = true;
            } else {
                showCorrectAnswers = false;
                calculatedRendererParameters.permissionLevel = rendererHelper.getPermissionForRole(Role.STUDENT);
                calculatedRendererParameters.showSolutions = Number(false);
                numIncorrect = 0;
            }
        }

        const rendererData = await rendererHelper.getProblem({
            sourceFilePath,
            problemSeed: problemSeed,
            formURL: options.formURL,
            numIncorrect,
            formData,
            showCorrectAnswers,
            answersSubmitted,
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
            answersSubmitted: Number(options.showAnswersUpfront),
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
        timeOfSubmission,
        problemPath
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
                        problemPath: problemPath,
                        randomSeed: studentGrade.randomSeed,
                        submitted: rendererHelper.cleanRendererResponseForTheDatabase(submitted as RendererResponse),
                        result: gradeResult.score,
                        time: timeOfSubmission ?? new Date(),
                        wasLate: gradeResult.gradingRationale.isLate,
                        wasExpired: gradeResult.gradingRationale.isExpired,
                        wasAfterAttemptLimit: !gradeResult.gradingRationale.isWithinAttemptLimit,
                        wasLocked: gradeResult.gradingRationale.isLocked,
                        wasAutoSubmitted: false
                    });

                    const attachments = await this.listAttachments({
                        studentGradeId: studentGrade.id
                    });

                    await attachments.asyncForEach(async (attachment: ProblemAttachment) => {
                        if (!_.isNil(workbook)) {
                            await courseRepository.createStudentWorkbookProblemAttachment({
                                studentWorkbookId: workbook.id,
                                problemAttachmentId: attachment.id
                            });
                        } else {
                            // should never be possible
                            logger.warn('nil workbook after creation for create attachments');
                        }
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
                } else if (_.isNil(studentGrade.lastInfluencingAttemptId) && gradeResult.gradingRationale.willTrackAttemptReason === WillTrackAttemptReason.YES) {
                    studentGrade.lastInfluencingAttemptId = workbook.id;
                }

                // TODO do we need to track "best score"
                if (!_.isNil(gradeResult.gradeUpdates.bestScore)) {
                    studentGrade.bestScore = gradeResult.gradeUpdates.bestScore;
                    studentGrade.lastInfluencingAttemptId = workbook.id;
                } else if (_.isNil(studentGrade.lastInfluencingAttemptId) && gradeResult.gradingRationale.willTrackAttemptReason === WillTrackAttemptReason.YES) {
                    studentGrade.lastInfluencingAttemptId = workbook.id;
                }

                if (!_.isNil(gradeResult.gradeUpdates.legalScore)) {
                    studentGrade.legalScore = gradeResult.gradeUpdates.legalScore;
                    studentGrade.lastInfluencingLegalAttemptId = workbook.id;
                } else if (_.isNil(studentGrade.lastInfluencingLegalAttemptId) && gradeResult.gradingRationale.willGetCreditReason === WillGetCreditReason.YES) {
                    studentGrade.lastInfluencingLegalAttemptId = workbook.id;
                }

                if (!_.isNil(gradeResult.gradeUpdates.partialCreditBestScore)) {
                    studentGrade.partialCreditBestScore = gradeResult.gradeUpdates.partialCreditBestScore;
                    studentGrade.lastInfluencingCreditedAttemptId = workbook.id;
                } else if (_.isNil(studentGrade.lastInfluencingCreditedAttemptId) && (gradeResult.gradingRationale.willGetCreditReason === WillGetCreditReason.YES || gradeResult.gradingRationale.willGetCreditReason === WillGetCreditReason.YES_BUT_PARTIAL_CREDIT)) {
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


            if(workbook?.randomSeed === studentGrade.originalRandomSeed) {
                await studentGrade.save();
            } else {
                if (_.isNil(workbook)) {
                    logger.debug('Workbook not kept, did not update grade');
                } else {
                    logger.debug('Random seed was different, not saving due to SMA');
                }
            }
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
                        throw new RederlyError('TSNH: This cannot be undefined, strict is confused because of transaction callback');
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

            // Needs to be here in case grade was updated from override
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
        let realSolutionDate: moment.Moment = solutionDate;
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
            realSolutionDate = moment(topic.deadDate).add(Constants.Course.SHOW_SOLUTIONS_DELAY_IN_DAYS, 'days');
            question = _.isNil(questionOverride) ? question : passedQuestion.getWithOverrides(questionOverride);
        }

        const gradeResult = calculateGrade({
            newScore,
            question,
            solutionDate: realSolutionDate,
            studentGrade,
            topic,
            timeOfSubmission
        });
        return await this.setGradeFromSubmission({
            gradeResult,
            studentGrade,
            submitted,
            timeOfSubmission,
            workbook,
            problemPath: question.webworkQuestionPath,
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

    async enroll(options: CreateGradesForUserEnrollmentOptions): Promise<StudentEnrollment> {
        const fetchedEnrollment = await StudentEnrollment.findOne({
            where: {
                courseId: options.courseId,
                userId: options.userId,
            }
        });
        if (!_.isNil(fetchedEnrollment)) {
            if (!_.isNil(fetchedEnrollment.dropDate)) {
                if (options.reEnrollIfDropped ?? false) {
                    fetchedEnrollment.dropDate = null;
                    await fetchedEnrollment.save();
                } else {
                    throw new IllegalArgumentException('Cannot enroll with enrollment link if you have dropped the course');
                }
            }
            return fetchedEnrollment;
        }

        return await useDatabaseTransaction(async () => {
            const result = await this.createStudentEnrollment({
                userId: options.userId,
                courseId: options.courseId,
                enrollDate: new Date()
            });
            await this.createGradesForUserEnrollment({
                courseId: options.courseId,
                userId: options.userId,
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

    async enrollManually(options: EnrollManuallyOptions): Promise<ManualEnrollmentResult> {
        let userId: number | null = null;
        let user: User | null = null;
        if ('userId' in options) {
            userId = options.userId;
        } else if ('studentEmail' in options) {
            const user = await userController.getUserByEmail(options.studentEmail);
            if (_.isNil(user)) {
                throw new IllegalArgumentException(`The user with the email ${options.studentEmail} is not registered with rederly.`);
            }
            userId = user.id;
        }

        if (_.isNil(userId)) {
            throw new RederlyError('enrollManually: Could not determine userId');
        }

        user = user ?? await userController.getUserById(userId);
        const enrollment = await this.enroll({
            courseId: options.courseId,
            userId: userId,
            reEnrollIfDropped: true,
        });
        return {
            enrollment: enrollment,
            user: user
        };
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

        const setFilterCount = utilities.countNotNil([
            courseId,
            questionId,
            topicId,
            unitId,
        ]);

        if (setFilterCount < 1) {
            throw new IllegalArgumentException(`At least one filter must be included but got ${setFilterCount}`);
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
            }, {
                model: StudentTopicOverride,
                as: 'studentTopicOverride',
                attributes: [],
                required: false,
                where: {
                    active: true
                }
            }
        ];
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
                'numAttempts',
                'effectiveScore',
                ['student_grade_partial_best_score', 'systemScore'],
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

            const pointsEarnedSystem = `SUM(${StudentGrade.rawAttributes.partialCreditBestScore.field} * "question".${CourseWWTopicQuestion.rawAttributes.weight.field})`;
            const pointsAvailableSystem = `SUM(CASE WHEN "question".${CourseWWTopicQuestion.rawAttributes.optional.field} = FALSE THEN "question".${CourseWWTopicQuestion.rawAttributes.weight.field} ELSE 0 END)`;
            const systemScoreAttribute = sequelize.literal(`
                CASE WHEN ${pointsAvailableSystem} = 0 THEN
                    NULL
                ELSE
                    ${pointsEarnedSystem} / ${pointsAvailableSystem}
                END
            `);

            // If the topicId isn't present (and implicitly, the questionId as well),
            // include average grades for open-topics only and dead-topics only.
            if (_.isNil(topicId)) {
                // Calculate the OPEN grades only
                const pointsEarnedOpen = `SUM(
                    CASE
                        WHEN ("question->topic".${CourseTopicContent.rawAttributes.startDate.field} < NOW()
                            OR "question->topic->studentTopicOverride".${StudentTopicOverride.rawAttributes.startDate.field} < NOW())
                        THEN ${StudentGrade.rawAttributes.effectiveScore.field} * "question".${CourseWWTopicQuestion.rawAttributes.weight.field}
                        ELSE 0
                    END)`;
                const pointsAvailableOpen = `SUM(
                    CASE
                        WHEN "question".${CourseWWTopicQuestion.rawAttributes.optional.field} = FALSE
                            AND
                                ("question->topic".${CourseTopicContent.rawAttributes.startDate.field} < NOW()
                                OR "question->topic->studentTopicOverride".${StudentTopicOverride.rawAttributes.startDate.field} < NOW())
                        THEN "question".${CourseWWTopicQuestion.rawAttributes.weight.field}
                        ELSE 0
                    END)`;
                const averageScoreAttributeOpen = sequelize.literal(`
                    CASE WHEN ${pointsAvailableOpen} = 0 THEN
                        NULL
                    ELSE
                        ${pointsEarnedOpen} / ${pointsAvailableOpen}
                    END
                `);

                // Calculate the DEAD grades only
                const pointsEarnedDead = `SUM(
                    CASE
                        WHEN ("question->topic".${CourseTopicContent.rawAttributes.deadDate.field} < NOW()
                            OR "question->topic->studentTopicOverride".${StudentTopicOverride.rawAttributes.deadDate.field} < NOW())
                        THEN ${StudentGrade.rawAttributes.effectiveScore.field} * "question".${CourseWWTopicQuestion.rawAttributes.weight.field}
                        ELSE 0
                    END)`;
                const pointsAvailableDead = `SUM(
                    CASE
                        WHEN "question".${CourseWWTopicQuestion.rawAttributes.optional.field} = FALSE
                            AND
                                ("question->topic".${CourseTopicContent.rawAttributes.deadDate.field} < NOW()
                                OR "question->topic->studentTopicOverride".${StudentTopicOverride.rawAttributes.deadDate.field} < NOW())
                        THEN "question".${CourseWWTopicQuestion.rawAttributes.weight.field}
                        ELSE 0
                    END)`;
                const averageScoreAttributeDead = sequelize.literal(`
                    CASE WHEN ${pointsAvailableDead} = 0 THEN
                        NULL
                    ELSE
                        ${pointsEarnedDead} / ${pointsAvailableDead}
                    END
                `);

                attributes = [
                    [averageScoreAttribute, 'average'],
                    [averageScoreAttributeOpen, 'openAverage'],
                    [averageScoreAttributeDead, 'deadAverage'],
                    [sequelize.literal(pendingProblemCountCalculationString), 'pendingProblemCount'],
                    [sequelize.literal(masteredProblemCountCalculationString), 'masteredProblemCount'],
                    [sequelize.literal(inProgressProblemCountCalculationString), 'inProgressProblemCount'],
                ];
            } else {
                attributes = [
                    [averageScoreAttribute, 'average'],
                    [systemScoreAttribute, 'systemScore'],
                    [sequelize.literal(pendingProblemCountCalculationString), 'pendingProblemCount'],
                    [sequelize.literal(masteredProblemCountCalculationString), 'masteredProblemCount'],
                    [sequelize.literal(inProgressProblemCountCalculationString), 'inProgressProblemCount'],
                ];
            }
            
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
            where: _.omitBy({
                courseId: courseId,
                dropDate: null
            }, _.isUndefined) as sequelize.WhereOptions
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

    async getGradeForQuestion(options: GetGradeForQuestionOptions): Promise<StudentGrade | null> {
        const {
            questionId,
            userId,
            includeWorkbooks
        } = options;
        const include: sequelize.IncludeOptions[] = [{
            model: StudentGradeInstance,
            as: 'gradeInstances',
            required: false,
            where: {
                active: true,
            }
        }];
        if (includeWorkbooks) {
            include.push({
                model: StudentWorkbook,
                as: 'workbooks',
                required: false,
                where: {
                    active: true
                }
            });
        }
        try {
            return StudentGrade.findOne({
                where: {
                    courseWWTopicQuestionId: questionId,
                    userId,
                    active: true,
                },
                include
            });
        } catch (e) {
            throw new WrappedError(`Unable to get grade for user #${userId} and question #${questionId}`, e);
        }
    }

    getStatisticsOnUnits(options: GetStatisticsOnUnitsOptions): Promise<CourseUnitContent[]> {
        const {
            courseId,
            userId,
            userRole,
        } = options.where;

        const { followQuestionRules } = options;

        // Using strict with typescript results in WhereOptions failing when set to a partial object, casting it as WhereOptions since it works
        const where: sequelize.WhereOptions = _({
            active: true,
            courseId,
            [`$topics.questions.grades.${StudentGrade.rawAttributes.userId.field}$`]: userId,
        }).omitBy(_.isNil).value() as sequelize.WhereOptions;

        let averageScoreAttribute;
        // This is averageScoreAttribute, with points earned/available if applicable.
        let averageScoreGroup: Array<sequelize.ProjectionAlias>;
        if (followQuestionRules) {
            averageScoreGroup = getAverageGroupsBeforeDate('all', TOPIC_SQL_NAME.INCLUDED_AS_TOPICS, QUESTION_SQL_NAME.CHILDREN_OF_INCLUDED_TOPICS, STUDENTTOPICOVERRIDE_SQL_NAME.NOT_INCLUDED);
        } else {
            averageScoreAttribute = sequelize.fn('avg', sequelize.col(`topics.questions.grades.${StudentGrade.rawAttributes.overallBestScore.field}`));
            averageScoreGroup = [[averageScoreAttribute, 'averageScore']];
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

        const closedAndOpenedGroups = followQuestionRules ? [
            ...getAverageGroupsBeforeDate('startDate', TOPIC_SQL_NAME.INCLUDED_AS_TOPICS, QUESTION_SQL_NAME.CHILDREN_OF_INCLUDED_TOPICS, STUDENTTOPICOVERRIDE_SQL_NAME.CHILD_OF_INCLUDED_TOPICS),
            ...getAverageGroupsBeforeDate('deadDate', TOPIC_SQL_NAME.INCLUDED_AS_TOPICS, QUESTION_SQL_NAME.CHILDREN_OF_INCLUDED_TOPICS, STUDENTTOPICOVERRIDE_SQL_NAME.CHILD_OF_INCLUDED_TOPICS),
        ] : [];

        const topicWhere: sequelize.WhereOptions = { active: true };

        const topicInclude = [{
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
        },
        {
            model: StudentTopicOverride,
            as: 'studentTopicOverride',
            attributes: [],
            required: false,
        }] as sequelize.IncludeOptions[];

        if (userRole === Role.STUDENT) {
            topicWhere[`$topics.topicAssessmentInfo.${TopicAssessmentInfo.rawAttributes.showTotalGradeImmediately.field}$`] = {
                [sequelize.Op.or]: [true, null]
            };
            topicInclude.push({
                model: TopicAssessmentInfo,
                as: 'topicAssessmentInfo',
                attributes: [],
                required: false,
            });
        }

        return CourseUnitContent.findAll({
            where,
            attributes: [
                'id',
                'name',
                [sequelize.fn('avg', sequelize.col(`topics.questions.grades.${StudentGrade.rawAttributes.numAttempts.field}`)), 'averageAttemptedCount'],
                ...averageScoreGroup,
                ...closedAndOpenedGroups,
                [sequelize.fn('count', sequelize.col(`topics.questions.grades.${StudentGrade.rawAttributes.id.field}`)), 'totalGrades'],
                [sequelize.fn('avg', sequelize.col(`topics.questions.grades.${StudentGrade.rawAttributes.partialCreditBestScore.field}`)), 'systemScore'],
                [sequelize.literal(`count(CASE WHEN "topics->questions->grades".${StudentGrade.rawAttributes.overallBestScore.field} >= 1 THEN "topics->questions->grades".${StudentGrade.rawAttributes.id.field} END)`), 'completedCount'],
                [completionPercentAttribute, 'completionPercent'],
            ],
            include: [{
                model: CourseTopicContent,
                as: 'topics',
                attributes: [],
                required: false,
                where: topicWhere,
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
                },
                {
                    model: StudentTopicOverride,
                    as: 'studentTopicOverride',
                    attributes: [],
                    required: false,
                },
                {
                    model: TopicAssessmentInfo,
                    as: 'topicAssessmentInfo',
                    attributes: [],
                    required: false,
                }
            ]
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
            userRole,
        } = options.where;

        const { followQuestionRules } = options;

        // Using strict with typescript results in WhereOptions failing when set to a partial object, casting it as WhereOptions since it works
        const where: sequelize.WhereOptions = _({
            active: true,
            courseUnitContentId,
            [`$unit.${CourseUnitContent.rawAttributes.courseId.field}$`]: courseId,
            [`$questions.grades.${StudentGrade.rawAttributes.userId.field}$`]: userId,
            [`$topicAssessmentInfo.${TopicAssessmentInfo.rawAttributes.showTotalGradeImmediately.field}$`]: {
                [sequelize.Op.or]: [true, null]
            }
        }).omitBy(_.isNil).value() as sequelize.WhereOptions;

        const include: sequelize.IncludeOptions[] = [
            {
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
            },
            {
                model: StudentTopicOverride,
                as: 'studentTopicOverride',
                attributes: [],
                required: false,
            }
        ];

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

        if (userRole === Role.STUDENT) {
            include.push({
                model: TopicAssessmentInfo,
                as: 'topicAssessmentInfo',
                attributes: [],
                required: false,
            });
        }

        let averageScoreAttribute;
        // This is averageScoreAttribute, with points earned/available if applicable.
        let averageScoreGroup: Array<sequelize.ProjectionAlias>;

        if (followQuestionRules) {
            averageScoreGroup = getAverageGroupsBeforeDate('all', TOPIC_SQL_NAME.ROOT_OF_QUERY, QUESTION_SQL_NAME.INCLUDED_AS_QUESTIONS, STUDENTTOPICOVERRIDE_SQL_NAME.NOT_INCLUDED);
        } else {
            averageScoreAttribute = sequelize.fn('avg', sequelize.col(`questions.grades.${StudentGrade.rawAttributes.overallBestScore.field}`));
            averageScoreGroup = [
                [averageScoreAttribute, 'averageScore']
            ];
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

        const closedAndOpenedGroups = followQuestionRules ? [
            ...getAverageGroupsBeforeDate('startDate', TOPIC_SQL_NAME.ROOT_OF_QUERY, QUESTION_SQL_NAME.INCLUDED_AS_QUESTIONS, STUDENTTOPICOVERRIDE_SQL_NAME.INCLUDED_AS_STUDENTTOPICOVERRIDE),
            ...getAverageGroupsBeforeDate('deadDate', TOPIC_SQL_NAME.ROOT_OF_QUERY, QUESTION_SQL_NAME.INCLUDED_AS_QUESTIONS, STUDENTTOPICOVERRIDE_SQL_NAME.INCLUDED_AS_STUDENTTOPICOVERRIDE),
        ] : [];

        return CourseTopicContent.findAll({
            where,
            attributes: [
                'id',
                'name',
                [sequelize.fn('avg', sequelize.col(`questions.grades.${StudentGrade.rawAttributes.numAttempts.field}`)), 'averageAttemptedCount'],
                ...averageScoreGroup,
                ...closedAndOpenedGroups,
                [sequelize.fn('count', sequelize.col(`questions.grades.${StudentGrade.rawAttributes.id.field}`)), 'totalGrades'],
                [sequelize.fn('avg', sequelize.col(`questions.grades.${StudentGrade.rawAttributes.partialCreditBestScore.field}`)), 'systemScore'],
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
            userRole,
        } = options.where;

        const { followQuestionRules } = options;

        // Using strict with typescript results in WhereOptions failing when set to a partial object, casting it as WhereOptions since it works
        const where: sequelize.WhereOptions = _({
            active: true,
            courseTopicContentId,
            [`$topic.unit.${CourseUnitContent.rawAttributes.courseId.field}$`]: courseId,
            [`$grades.${StudentGrade.rawAttributes.userId.field}$`]: userId,
            [`$topic.topicAssessmentInfo.${TopicAssessmentInfo.rawAttributes.showTotalGradeImmediately.field}$`]: {
                [sequelize.Op.or]: [true, null]
            },
            [`$topic.topicAssessmentInfo.${TopicAssessmentInfo.rawAttributes.showItemizedResults.field}$`]: {
                [sequelize.Op.or]: [true, null]
            },
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

        const topicInclude: sequelize.IncludeOptions[] = [{
            model: StudentTopicOverride,
            as: 'studentTopicOverride',
            attributes: [],
            required: false,
        }];

        if (!_.isNil(courseId)) {
            topicInclude.push({
                model: CourseUnitContent,
                as: 'unit',
                attributes: [],
                where: {
                    active: true
                }
            });
        }

        if (userRole === Role.STUDENT) {
            topicInclude.push({
                model: TopicAssessmentInfo,
                as: 'topicAssessmentInfo',
                attributes: [],
                required: false,
            });
        }

        if (!_.isNil(courseId) || userRole === Role.STUDENT) {
            include.push({
                model: CourseTopicContent,
                as: 'topic',
                attributes: [],
                where: {
                    active: true
                },
                include: topicInclude
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

        const closedAndOpenedGroups = followQuestionRules ? [
            // ...getAverageGroupsBeforeDate('all', TOPIC_SQL_NAME.INCLUDED_AS_SINGLE_TOPIC, QUESTION_SQL_NAME.ROOT_OF_QUERY, STUDENTTOPICOVERRIDE_SQL_NAME.NOT_INCLUDED),
            ...getAverageGroupsBeforeDate('startDate', TOPIC_SQL_NAME.INCLUDED_AS_SINGLE_TOPIC, QUESTION_SQL_NAME.ROOT_OF_QUERY, STUDENTTOPICOVERRIDE_SQL_NAME.CHILD_OF_SINGLE_INC_TOPIC),
            ...getAverageGroupsBeforeDate('deadDate', TOPIC_SQL_NAME.INCLUDED_AS_SINGLE_TOPIC, QUESTION_SQL_NAME.ROOT_OF_QUERY, STUDENTTOPICOVERRIDE_SQL_NAME.CHILD_OF_SINGLE_INC_TOPIC),
        ] : [];

        return CourseWWTopicQuestion.findAll({
            where,
            attributes: [
                'id',
                [sequelize.literal(`'Problem ' || "${CourseWWTopicQuestion.name}".${CourseWWTopicQuestion.rawAttributes.problemNumber.field}`), 'name'],
                [sequelize.fn('avg', sequelize.col(`grades.${StudentGrade.rawAttributes.numAttempts.field}`)), 'averageAttemptedCount'],
                // [pointsEarned, 'pointsEarned'],
                // [pointsAvailable, 'pointsAvailable'],
                [sequelize.fn('avg', scoreField), 'averageScore'],
                ...closedAndOpenedGroups,
                [sequelize.fn('avg', sequelize.col(`grades.${StudentGrade.rawAttributes.partialCreditBestScore.field}`)), 'systemScore'],
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

            const userRole = options.role;
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
                        (version.maxAttempts <= version.numAttempts && version.maxAttempts > 0)
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
                    required: false,
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
                    questions.forEach( (question, index, questions) => {
                        if (_.isNil(question.grades) || question.grades.length === 0) throw new RederlyExtendedError('Impossible! Found an assessment question without a grade.');
                        const version = question.grades[0].gradeInstances?.[0];
                        // TODO: prevent adding problems to an exam once versions have been generated
                        if (_.isNil(version)) {
                            questions.splice(index, 1);
                            logger.error(`Topic #${topic.id}: Assessment version has a problem (${question.id}) with grade #${question.grades[0].id} but no grade instance`);
                        } else {
                            question.webworkQuestionPath = version?.webworkQuestionPath ?? question.webworkQuestionPath;
                            question.grades[0].randomSeed = version?.randomSeed ?? question.grades[0].randomSeed;
                            question.problemNumber = version?.problemNumber ?? question.problemNumber;
                        }
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
                                // This where is ok here because we just don't want results to propagate past this point
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
            let userIds: Array<number> | undefined = options.userIds;
            if (_.isNil(userIds)) {
                const results = await this.getUsersThatRequireGradeForQuestion({
                    questionId
                });
                userIds = results.map(result => result.userId);    
            }
            await userIds.asyncForEach(async (userId: number) => {
                await this.createNewStudentGrade({
                    courseTopicQuestionId: questionId,
                    userId: userId
                });
            });
            return userIds.length;
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
            const randomSeed = this.generateRandomSeed();
            return await StudentGrade.create({
                userId: userId,
                courseWWTopicQuestionId: courseTopicQuestionId,
                randomSeed: randomSeed,
                originalRandomSeed: randomSeed,
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
        const { topicId, userId } = options;
        // overrides will strip includes down to raw values -- no methods
        let topic = await this.getTopicById({id: topicId, userId});
        let topicInfo = topic.topicAssessmentInfo;
        if (_.isNil(topicInfo)) {
            throw new IllegalArgumentException(`Tried to create grade instances for topic ${topic.id} without topic assessment info`);
        }

        // apply user overrides to topic
        if (!_.isNil(topic.studentTopicOverride) && !_.isEmpty(topic.studentTopicOverride)) {
            topic = topic.getWithOverrides(topic.studentTopicOverride[0]) as CourseTopicContent;
        }

        // apply user overrides to version
        if (!_.isNil(topicInfo) &&
            !_.isNil(topicInfo.studentTopicAssessmentOverride) &&
            !_.isEmpty(topicInfo.studentTopicAssessmentOverride)
        ){
            const studentTopicAssessmentOverrideId = topicInfo.studentTopicAssessmentOverride[0].id;
            // we have the studentTopicAssessmentOverride object, but this extra step is
            // needed because sequelize truncates when nested include namespaces get too long
            // {minifyAliases: true} introduced in sequelize-5.18
            // https://github.com/sequelize/sequelize/pull/11095
            if (!_.isNil(studentTopicAssessmentOverrideId)) {
                const studentTopicAssessmentOverride = await courseRepository.getStudentTopicAssessmentOverride(studentTopicAssessmentOverrideId);
                topicInfo = topicInfo.getWithOverrides(studentTopicAssessmentOverride) as TopicAssessmentInfo;
            }
        }

        const questions = await courseRepository.getQuestionsFromTopicId({id:topicId});
        const startTime = moment().add(1,'minute'); // should cover any delay in creating records before a student can actually begin

        let endTime = moment(startTime).add(topicInfo.duration, 'minutes');
        if (topicInfo.hardCutoff) {
            endTime = moment.min(topic.endDate.toMoment(), endTime);
        }

        const nextVersionAvailableTime = moment(startTime).add(topicInfo.versionDelay, 'minutes');
        // in trying to be clever about shuffling the order, don't forget to shift from 0..n-1 to 1..n
        const problemOrder = (topicInfo.randomizeOrder) ? _.shuffle([...Array(questions.length).keys()]) : [...Array(questions.length).keys()];

        const gradeInstances: Array<StudentGradeInstance> = [];
        await questions.asyncForEach(async (question, index) => {
            const questionInfo = await question.getCourseQuestionAssessmentInfo();
            const questionGrade = await StudentGrade.findOne({
                where: {
                    userId,
                    courseWWTopicQuestionId: question.id,
                    active: true
                }
            });
            if (_.isNil(questionGrade)) {
                throw new RederlyError(`Question id: ${question.id} has no corresponding grade.`);
            }
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
            const result = await rendererHelper.isPathAccessibleToRenderer({problemPath: webworkQuestionPath});
            if (result === false) {
                throw new IllegalArgumentException(`There is an issue with problem with #${question.problemNumber} (${question.id}). Please contact your professor.`);
            }
            gradeInstances.push(new StudentGradeInstance({
                studentGradeId: questionGrade.id,
                webworkQuestionPath,
                randomSeed,
                userId,
                problemNumber: problemOrder[index]+1, // problemOrder starts from 0
            }));
        });

        return useDatabaseTransaction(async (): Promise<StudentTopicAssessmentInfo> => {
            if (_.isNil(topicInfo)) {
                throw new RederlyError('TSNH, topicInfo nil check happened outside db transaction');
            }

            const studentTopicAssessmentInfo = await this.createStudentTopicAssessmentInfo({
                userId,
                topicAssessmentInfoId: topicInfo.id,
                startTime: startTime.toDate(),
                endTime: endTime.toDate(),
                nextVersionAvailableTime: nextVersionAvailableTime.toDate(),
                maxAttempts: topicInfo.maxGradedAttemptsPerVersion,
            });

            await gradeInstances.asyncForEach(async (gradeInstance) => {
                gradeInstance.studentTopicAssessmentInfoId = studentTopicAssessmentInfo.id;
                await gradeInstance.save();
            });


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
                // DO NOT AWAIT, we do not want this to keep the transaction alive, it's result is not important to the application
                schedulerHelper.setJob({
                    id: studentTopicAssessmentInfo.id.toString(),
                    time: endTime.toDate(),
                    webHookScheduleEvent: {
                        url: autoSubmitURL,
                        data: {}
                    }
                })
                .catch((e) => {
                    logger.error(`Could not create scheduler job for studentTopicAssessmentInfo ${studentTopicAssessmentInfo.id}`, e);
                });
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
        if (options.role === Role.PROFESSOR || options.role === Role.ADMIN) return {userCanViewQuestion: true, message};
        const question = await courseRepository.getQuestion({ id: questionId });
        const dbTopic = await question.getTopic();
        const topicOverride = await courseRepository.getStudentTopicOverride({userId: user.id, topicId: dbTopic.id});
        const topic: CourseTopicContentInterface = (_.isNil(topicOverride)) ? dbTopic : dbTopic.getWithOverrides(topicOverride);

        // applies to all topics - not just homeworks...
        if (topic.startDate.toMoment().isAfter(moment())) {
            message = `${topic.name} hasn't started yet.`;
            return { userCanViewQuestion: false, message };
        } else {
            if (topic.topicTypeId === 1) return { userCanViewQuestion: true, message };
        }

        if (topic.topicTypeId === 2) {
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
            const topicInfo = await dbTopic.getTopicAssessmentInfo();
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
        });
        const unit = await topic.getUnit();
        const course = await unit.getCourse();
        const enroll = await course.getEnrolledStudents({
            where: {
                userId: user.id,
                active: true,
                dropDate: null,
            }
        });
        if (_.isEmpty(enroll)) {
            message = 'Only enrolled students may begin an assessment.';
            data.status = 'NOT_ENROLLED';
            userCanStartNewVersion = false;
            return {
                message,
                data,
                userCanStartNewVersion
            };
        }

        // apply topic overrides
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
        if (options.role === Role.STUDENT) {
            // if the assessment has not yet started, students cannot generate a version
            if ( moment().isBefore(topic.startDate.toMoment()) ) {
                message = `The topic "${topic.name}" has not started yet.`;
                data.status = 'NOT_STARTED';
                userCanStartNewVersion = false;
            } else if (topicInfo.maxVersions > 0 && versions.length >= topicInfo.maxVersions) {
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
            if (studentTopicAssessmentInfo.numAttempts >= studentTopicAssessmentInfo.maxAttempts && studentTopicAssessmentInfo.maxAttempts > 0) {
                // This can happen with auto submit if delete job task was not successful
                throw new AttemptsExceededException('Cannot submit assessment answers when there are no attempts remaining');
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
                    answersSubmitted: 1,
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

            const time = new Date();

            await questionResponses.asyncForEach(async (result: SubmittedAssessmentResultContext) => {

                if (_.isNil(result.instance.id)) {
                    throw new Error('the grade instance ID cannot be empty');
                }

                const previousWorkbook = await StudentWorkbook.findOne({
                    where: {
                        courseWWTopicQuestionId: result.grade.courseWWTopicQuestionId
                    },
                    order: [
                        ['createdAt', 'desc']
                    ]
                });

                const currentAttachments = await this.listAttachments({
                    studentGradeInstanceId: result.instance.id
                });
                const currentAttachmentIds = _.map(currentAttachments, 'id');

                const cleanSubmitted = rendererHelper.cleanRendererResponseForTheDatabase(result.questionResponse);

                let createNewWorkbook = true;
                if (!_.isNil(previousWorkbook)){
                    // do not compare the "previous_*" fields
                    const newSubmitted = _.omitBy(cleanSubmitted, rendererHelper.isPrevious);
                    const oldSubmitted = _.omitBy(previousWorkbook.submitted, rendererHelper.isPrevious);

                    const previousAttachments = await this.listAttachments({
                        studentWorkbookId: previousWorkbook.id
                    });
                    const previousAttachmentIds = _.map(previousAttachments, 'id');

                    if ( _.isEqual(newSubmitted, oldSubmitted) &&  _.isEqual(currentAttachmentIds, previousAttachmentIds)) {
                        createNewWorkbook = false; // skip out on creating a workbook
                    }
                }

                const workbook = (createNewWorkbook || _.isNil(previousWorkbook)) ? await StudentWorkbook.create({
                    studentGradeId: result.grade.id,
                    userId: result.grade.userId,
                    courseWWTopicQuestionId: result.grade.courseWWTopicQuestionId,
                    studentGradeInstanceId: result.instance.id, // shouldn't this workbook be tied to a grade instance?
                    randomSeed: result.instance.randomSeed,
                    problemPath: result.instance.webworkQuestionPath,
                    submitted: cleanSubmitted,
                    result: result.questionResponse.problem_result.score,
                    time,
                    wasLate: false,
                    wasExpired: false,
                    wasAfterAttemptLimit: false,
                    wasLocked: false,
                    wasAutoSubmitted: wasAutoSubmitted,
                }) : previousWorkbook;

                await currentAttachments.asyncForEach(async (attachment: ProblemAttachment) => {
                    await courseRepository.createStudentWorkbookProblemAttachment({
                        studentWorkbookId: workbook.id,
                        problemAttachmentId: attachment.id
                    });
                });

                // update individual problem high-scores
                if (result.questionResponse.problem_result.score > result.instance.overallBestScore || _.isNil(result.instance.bestIndividualAttemptId)) {
                    // update instance: overallBestScore, bestIndividualAttemptId
                    result.instance.overallBestScore = result.questionResponse.problem_result.score;
                    result.instance.bestIndividualAttemptId = workbook.id;
                    if (result.questionResponse.problem_result.score > result.grade.overallBestScore || _.isNil(result.grade.lastInfluencingAttemptId)) {
                        // update grade: overallBestScore, *what about workbook id*?
                        result.grade.overallBestScore = result.questionResponse.problem_result.score;
                        result.grade.lastInfluencingAttemptId = workbook.id;
                        // which workbookId field should be used?
                    }
                }

                // update aggregate best-scores
                if (isBestForThisVersion || _.isNil(result.instance.bestVersionAttemptId)) {
                    // update instance: bestScore, bestVersionAttemptId
                    result.instance.scoreForBestVersion = result.questionResponse.problem_result.score;
                    result.instance.bestVersionAttemptId = workbook.id;
                    if (isBestOverallVersion || _.isNil(result.grade.lastInfluencingCreditedAttemptId)) {
                        // update grade: bestScore, lastInfluencingLegalAttemptId? (or do we forego workbooks on grades for assessments because of grade instances)
                        result.grade.bestScore = result.questionResponse.problem_result.score;
                        result.grade.legalScore = result.questionResponse.problem_result.score;
                        result.grade.effectiveScore = result.questionResponse.problem_result.score;
                        result.grade.partialCreditBestScore = result.questionResponse.problem_result.score;
                        result.grade.lastInfluencingLegalAttemptId = workbook.id;
                        result.grade.lastInfluencingCreditedAttemptId = workbook.id;
                    }
                }

                // const versionAverage = (incoming.instance.averageScore * incoming.instance.numAttempts + incoming.questionResponse.problem_result.score)/(incoming.instance.numAttempts + 1);
                if (createNewWorkbook) {
                    // keep these in line with workbook count -- all attempts are legal, extensions not allowed
                    result.grade.numAttempts++;
                    result.grade.numLegalAttempts++;
                    result.grade.numExtendedAttempts++;
                }

                // save updates
                await result.grade.save();
                await result.instance.save();
            });

            // update the number of attempts for this version
            studentTopicAssessmentInfo.numAttempts++;
            // close the version if student has maxed out their attempts
            if (studentTopicAssessmentInfo.numAttempts === studentTopicAssessmentInfo.maxAttempts) {
                await this.endAssessmentEarly(studentTopicAssessmentInfo, wasAutoSubmitted);
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

    async endAssessmentEarly(studentTopicAssessmentInfo: StudentTopicAssessmentInfo, wasAutoSubmitted: boolean): Promise<void> {
        studentTopicAssessmentInfo.isClosed = true;
        await studentTopicAssessmentInfo.save();
        if (wasAutoSubmitted === false) {
            // intentionally orphaned promise -- we don't care how long this takes
            schedulerHelper.deleteJob({
                id: studentTopicAssessmentInfo.id.toString()
            }).catch((e) => logger.error(`Failed to delete job ${studentTopicAssessmentInfo.id}`, e) );
        }
    }

    async canUserGradeAssessment({
        user,
        topicId
    }: CanUserGradeAssessmentOptions): Promise<boolean> {
        // TODO merge into single call
        const topic = await courseRepository.getCourseTopic({ id: topicId });
        const unit = await courseRepository.getCourseUnit({ id: topic.courseUnitContentId });
        const course = await courseRepository.getCourse({ id: unit.courseId });
        return (user.id === course.instructorId);
    }

    async getAssessmentForGrading({
        topicId
    }: GetAssessmentForGradingOptions): Promise<GetAssessmentForGradingResult> {
        // eventually update to include different parameters
        // grade best individual problems // grade best version attempt // get ALL versions?!?
        try {
            const topic = await CourseTopicContent.findOne({
                where: {
                    id: topicId,
                    active: true,
                },
                include: [{
                    model: TopicAssessmentInfo,
                    as: 'topicAssessmentInfo',
                    where: {
                        active: true,
                    },
                    include: [{
                        model: StudentTopicAssessmentInfo,
                        as: 'studentTopicAssessmentInfo',
                        where: {
                            active: true,
                        },
                    }]
                }]
            });

            if (_.isNil(topic)) {
                throw new WrappedError(`failed to retrieve topic #${topicId} for grading`);
            }

            // TODO change to includes on the above get topic
            const problems = await CourseWWTopicQuestion.findAll({
                where: {
                    courseTopicContentId: topicId,
                    active: true,
                    hidden: false,
                },
                include: [{
                    model: StudentGrade,
                    as: 'grades',
                    include: [{
                        model: StudentWorkbook,
                        as: 'workbooks',
                        required: false,
                        where: {
                            active: true,
                        }
                    }]
                }]
            });
            return {problems, topic};
        } catch (e) {
            throw new WrappedError(`Topic #${topicId} failed to retrieve problems for grading assessment.`, e);
        }
    }

    async createAttachment({
        obj,
        studentGradeId,
        studentGradeInstanceId,
        studentWorkbookId
    }: CreateAttachmentOptions): Promise<ProblemAttachment> {
        return useDatabaseTransaction(async (): Promise<ProblemAttachment> => {
            const filterCount = utilities.countNotNil([
                studentGradeId,
                studentGradeInstanceId,
                studentWorkbookId,
            ]);

            if (filterCount !== 1) {
                throw new IllegalArgumentException('Create attachment requires exactly 1 of [studentGradeId, studentGradeInstanceId, studentWorkbookId] to be set');
            }

            if(!_.isNil(studentWorkbookId)) {
                if(!_.isNil(studentGradeInstanceId)) {
                    throw new IllegalArgumentException('studentGradeInstanceId was almost overwritten, this should not be possible due to the filter count');
                }

                if(!_.isNil(studentGradeId)) {
                    throw new IllegalArgumentException('studentGradeId was almost overwritten, this should not be possible due to the filter count');
                }

                const studentWorkbook = await courseRepository.getWorkbookById(studentWorkbookId);
                if (_.isNil(studentWorkbook)) {
                    throw new NotFoundError('Could not find the student workbook for create attachment');
                }
                studentGradeInstanceId = studentWorkbook.studentGradeInstanceId;
                studentGradeId = studentWorkbook.studentGradeId;
            } else if(!_.isNil(studentGradeInstanceId)) {
                if(!_.isNil(studentGradeId)) {
                    throw new IllegalArgumentException('studentGradeId was almost overwritten, this should not be possible due to the filter count');
                }
                const studentGradeInstance = await courseRepository.getStudentGradeInstance({
                    id: studentGradeInstanceId
                });
                studentGradeId = studentGradeInstance.studentGradeId;
            }

            const result = await courseRepository.createAttachment(obj);

            /**
             * Currently this could and should be validated by the constraint
             * however that causes gaps in ids which I know we aren't too worried about
             * furthermore we will need to fetch the grade anyway for permissions so why not throw it in for now
             */
            if(_.isNil(studentGradeId)) throw new RederlyError('Based on above logic this is not possible, however use strict did not pick up on that');
            // on failure this will throw an error and bubble up
            await courseRepository.getStudentGrade({
                id: studentGradeId
            });

            await courseRepository.createStudentGradeProblemAttachment({
                problemAttachmentId: result.id,
                studentGradeId: studentGradeId
            });

            if(!_.isNil(studentGradeInstanceId)) {
                await courseRepository.createStudentGradeInstanceProblemAttachment({
                    problemAttachmentId: result.id,
                    studentGradeInstanceId: studentGradeInstanceId
                });
            }

            if(!_.isNil(studentWorkbookId)) {
                await courseRepository.createStudentWorkbookProblemAttachment({
                    problemAttachmentId: result.id,
                    studentWorkbookId: studentWorkbookId
                });
            }

            return result;
        });
    }

    async listAttachments({
        studentGradeId,
        studentGradeInstanceId,
        studentWorkbookId
    }: ListAttachmentOptions): Promise<Array<ProblemAttachment>> {
        return useDatabaseTransaction(async (): Promise<Array<ProblemAttachment>> => {
            const filterCount = utilities.countNotNil([
                studentGradeId,
                studentGradeInstanceId,
                studentWorkbookId,
            ]);

            if (filterCount !== 1) {
                throw new IllegalArgumentException('List attachment requires exactly 1 of [studentGradeId, studentGradeInstanceId, studentWorkbookId] to be set');
            }
            // Does it make sense to do this with a union in the future?
            const result = [];
            if (!_.isNil(studentGradeId)) {
                const studentGradeProblemAttachments = await ProblemAttachment.findAll({
                    where: {
                        active: true
                    },
                    include: [{
                        model: StudentGradeProblemAttachment,
                        as: 'studentGradeProblemAttachments',
                        attributes: [],
                        where: {
                            active: true,
                            studentGradeId: studentGradeId
                        }
                    }]
                });
                result.push(...studentGradeProblemAttachments);
            }

            if (!_.isNil(studentGradeInstanceId)) {
                const studentGradeProblemAttachments = await ProblemAttachment.findAll({
                    where: {
                        active: true
                    },
                    include: [{
                        model: StudentGradeInstanceProblemAttachment,
                        as: 'studentGradeInstanceProblemAttachments',
                        attributes: [],
                        where: {
                            active: true,
                            studentGradeInstanceId: studentGradeInstanceId
                        }
                    }]
                });
                result.push(...studentGradeProblemAttachments);
            }

            if (!_.isNil(studentWorkbookId)) {
                const studentGradeProblemAttachments = await ProblemAttachment.findAll({
                    where: {
                        active: true
                    },
                    include: [{
                        model: StudentWorkbookProblemAttachment,
                        as: 'studentWorkbookProblemAttachments',
                        attributes: [],
                        where: {
                            active: true,
                            studentWorkbookId: studentWorkbookId
                        }
                    }]
                });
                result.push(...studentGradeProblemAttachments);
            }

            return result;
        });
    }

    async deleteAttachment({
        problemAttachmentId,
    }: DeleteAttachmentOptions): Promise<UpdateResult<ProblemAttachment>> {
        const result = await ProblemAttachment.update({
            active: false
        }, {
            where: {
                id: problemAttachmentId,
                active: true
            },
            returning: true
        });

        return {
            updatedCount: result[0],
            updatedRecords: result[1]
        };
    }

    // Sends an email to the professor associated with the course.
    async emailProfessor(options: EmailProfOptions): Promise<boolean> {
        const coursePromise = Course.findOne({
            where: {
                id: options.courseId,
            },
            include: [{
                model: User,
                as: 'instructor',
                attributes: ['id', 'firstName', 'lastName', 'email', 'preferredEmail'],
                where: {
                    active: true
                },
                required: true,
            }],
        });

        const topicPromise = CourseTopicContent.findOne({
            attributes: ['id', 'name'],
            where: {},
            include: [{
                model: CourseWWTopicQuestion,
                as: 'questions',
                attributes: ['problemNumber', 'id'],
                required: true,
                where: {
                    id: options.question.id,
                    active: true,
                },
            }, {
                model: CourseUnitContent,
                as: 'unit',
                attributes: ['name'],
                required: true,
                where: {
                    active: true
                },    
            }]
        });

        const [course, topic] = await Promise.all([coursePromise, topicPromise]);

        if (_.isNil(course) || _.isNil(course.instructor)) {
            throw new RederlyError('Could not find an instructor for this course.');
        }

        if (_.isNil(topic)) {
            throw new RederlyError('Could not find a topic associated with the problem this student is trying to ask about.');
        }

        const unit = await topic.unit;

        const question = topic.questions?.[0];

        if (_.isNil(question)) {
            throw new RederlyError('Could not find the question associated with the problem/topic this student is trying to ask about.');
        }
        if (_.isNil(unit)) {
            throw new RederlyError('Could not find a unit associated with the problem this student is trying to ask about.');
        }

        const gradingURL = urljoin(
            options.baseURL,
            '/common/courses',
            String(course.id),
            '/topic',
            String(topic.id),
            'grading',
            `?${qs.stringify({
                problemId: question.id,
                userId: options.student.id
            })}`
        );
        const poorMansTemplate = `
Hello Professor ${course.instructor.lastName},

Your student ${options.student.firstName} ${options.student.lastName} is emailing you about:
Course: ${course.name}
Unit: ${unit.name}
Topic: ${topic.name}
Problem Number: ${question.problemNumber} (ID#${question.id})

To view the problem for this student use the following link:
${gradingURL}

Here is the message that was sent:

${options.content}

You can contact your student at ${options.student.email} or by replying to this email.
`;

        return emailHelper.sendEmail({
            template: 'generic',
            locals: {
                SUBJECT_TEXT: `${options.student.firstName} - Topic ${topic.id} - Question ${options.question.id}`,
                BODY_TEXT: poorMansTemplate,
            },
            email: course.instructor.email,
            subject: `${options.student.firstName} - Topic ${topic.id} - Question ${options.question.id}`,
            replyTo: options.student.email,
        });
    }

    async printBlankTopic(options: {topicId: number}): Promise<CourseTopicContent> {
        const topicWithQuestions = await CourseTopicContent.findOne({
            attributes: ['id', 'name'],
            where: {
                id: options.topicId,
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
                }
            ]
        });

        if (_.isNil(topicWithQuestions)) throw new NotFoundError('Could not find topic.');

        // topicWithQuestions?.questions?.asyncForEach(async (question)=>{

        // });

        return topicWithQuestions;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getAllContentForVersion(options: GetAllContentForVersionOptions): Promise<any> {

        // To display which user that submitted this exam version.
        const user = await User.findOne({
            attributes: ['id', 'firstName', 'lastName'],
            where: {
                id: options.userId,
            },
        });

        // if (_.isNil(userForVersion)) {
        //     throw new RederlyError('This grade is not associated with a user.');
        // }

        /**
         * Start with a GradeInstanceId. This represents a version.
         * Find all questions associated with the Topic associated with this GradeInstanceId.
         *      These are all the questions for that version. Should be the same for GradeInstanceIds with the same parent GradeId.
         */
        const mainData = await CourseTopicContent.findOne({
            attributes: ['id', 'name', 'topicTypeId'],
            where: {
                id: options.topicId,
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
                                userId: options.userId,
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
                    logger.warn(`Cannot find the best version for Grade ${grade.id} with lastInfluencingCreditedAttemptId or lastInfluencingAttemptId.`);
                }

                const gradeInstanceAttachments = influencingWorkbook ? await StudentWorkbook.findOne({
                    where: {
                        id: influencingWorkbook,
                        active: true,
                    },
                    attributes: ['id'],
                    include: [
                        {
                            model: StudentGradeInstance,
                            as: 'studentGradeInstance',
                            attributes: ['id', 'webworkQuestionPath'],
                            required: false,
                            where: {
                                active: true,
                            },
                            include: [
                                {
                                    model: ProblemAttachment,
                                    as: 'problemAttachments',
                                    attributes: ['id', 'cloudFilename', 'userLocalFilename', 'updatedAt'],
                                    required: false,
                                    where: {
                                        active: true,
                                    }
                                }
                            ]
                        },
                    ]
                }) : null;
                
                let attachments = gradeInstanceAttachments?.studentGradeInstance?.problemAttachments;                
                if (mainData.topicTypeId === 1) {
                    attachments = await grade.getProblemAttachments({
                        where: {
                            active: true,
                        }
                    });
                }

                data.questions[i].grades[j].webworkQuestionPath = gradeInstanceAttachments?.studentGradeInstance?.webworkQuestionPath;
                data.questions[i].grades[j].problemAttachments = attachments;
            })
        );

        const baseUrl = configurations.attachments.baseUrl;
        return {user: user, topic: data, baseUrl};
    }

    async importCourseTarball ({ filePath, fileName, courseId, user, keepBucketsAsTopics }: ImportTarballOptions): Promise<ImportCourseTarballResult> {
        // TODO remove
        const startTime = new Date().getTime();
        logger.info(`Import Course Archive start ${new Date()}`);
        const workingDirectoryName = stripTarGZExtension(nodePath.basename(fileName))?.replace(/\s/g, '_');
        if (_.isNil(workingDirectoryName)) {
            throw new IllegalArgumentException('File must be a `.tar`, `.tar.gz` or a `.tgz` file!');
        }
        const workingDirectory = `${nodePath.dirname(filePath)}/${workingDirectoryName}`;
        await fs.promises.mkdir(workingDirectory);
        try {
            await tar.x({
                file: filePath,
                cwd: workingDirectory
            });
        } catch (e) {
            if (e.code === 'TAR_BAD_ARCHIVE') {
                throw new IllegalArgumentException('The archive you have uploaded is corrupted and could not be extracted');
            }
            throw new WrappedError('Could not upload tar file', e);
        }

        // TODO remove
        logger.info(`Import Course Archive extracted, discovering files now ${new Date().getTime() - startTime} ${new Date()}`);
        const discoveredFiles = await findFiles({ filePath: workingDirectory, keepBucketsAsTopics: keepBucketsAsTopics });

        // TODO remove
        logger.info(`Import Course Archive discovered files, fetching course ${new Date().getTime() - startTime} ${new Date()}`);

        const course = await courseRepository.getCourse({
            id: courseId
        });

        let rendererSavePGFileRequests = 0;
        let rendererSaveAssetRequests = 0;
        let rendererAccessibleRequests = 0;

        const missingPGFileErrorsObject: CourseTopicQuestionErrors = {};
        const missingPGFileErrors: Array<string> = [];
        const missingAssetFileErrors: Array<string> = [];
        const missingFileErrorCheck = (): string => {
            const errorLength = missingAssetFileErrors.length + missingPGFileErrors.length;
            let errorMessage = '';
            if (!_.isEmpty(missingPGFileErrors)) {
                errorMessage += `Could not find the following pg files in the archive or in the OPL: ${missingPGFileErrors.join(', ')}.\n`;
            }

            if (!_.isEmpty(missingAssetFileErrors)) {
                errorMessage += `Could not find the following image files in the archive: ${missingAssetFileErrors.join(', ')}.\n`;
            }

            if (errorLength >= configurations.importer.missingFileThreshold) {
                if (errorLength === configurations.importer.missingFileThreshold) {
                    logger.error(errorMessage);
                }
                throw new IllegalArgumentException(errorMessage, {
                    missingAssetFileErrors,
                    missingPGFileErrors
                });
            }
            return errorMessage;
        };
        const saveAndResolveProblems = async (defFiles: { [key: string]: FindFilesDefFileResult }): Promise<void> => {
            await Object.values(defFiles).asyncForEach(async (defFile: FindFilesDefFileResult) => {
                await  Object.values(defFile.pgFiles).asyncForEach(async (pgFile: FindFilesPGFileResult) => {
                    if (pgFile.pgFileExists) {
                        // If the path does not start with the usual starting points
                        // and it is not a local file
                        // then check if it is already in the renderer
                        if (ABSOLUTE_RENDERER_PATH_REGEX.test(pgFile.pgFilePathFromDefFile) === false && pgFile.pgFilePathFromDefFile.startsWith('local') === false) {
                            const tryPath = `Contrib/${pgFile.pgFilePathFromDefFile}`;
                            rendererAccessibleRequests++;
                            const isAccessible = await rendererHelper.isPathAccessibleToRenderer({
                                problemPath: tryPath
                            });

                            if (isAccessible) {
                                // It's a secret to everyone #ZeldaReference
                                // Potentially if someone had a sym link to private files with a university name
                                // and named their file to match contrib - but the file was different
                                // and used the script that follows sym links
                                // That would result in the fetching of the wrong problem
                                // TSNH
                                pgFile.resolvedRendererPath = tryPath;
                                return;
                            }
                            // /^local/ should always be true at this point (doesn't have to be but generally)
                        }

                        // At this point the file is not on the renderer
                        let fileDir = `private/my/${user.uuid}/${course.name.replace(/\s/g, '_')}/${defFile.topicName.replace(/\s/g, '_')}`;
                        const targetSavedPath = `${fileDir}/${pgFile.pgFileName}`;
                        const pgFileContent = await fs.promises.readFile(pgFile.pgFilePathOnDisk);
                        rendererSavePGFileRequests++;
                        pgFile.resolvedRendererPath = await rendererHelper.saveProblemSource({
                            problemSource: pgFileContent.toString(),
                            writeFilePath: targetSavedPath
                        });    
                        fileDir = nodePath.dirname(pgFile.resolvedRendererPath);
                        await  Object.values(pgFile.assetFiles.imageFiles).asyncForEach(async (imageFile: FindFilesImageFileResult) => {
                            if (imageFile.imageFileExists) {
                                const savedPath = `${fileDir}/${imageFile.imageFileName}`;
                                rendererSaveAssetRequests++;
                                await rendererHelper.uploadAsset({
                                    filePath: imageFile.imageFilePath,
                                    rendererPath: savedPath
                                });
                                imageFile.resolvedRendererPath = savedPath;    
                            } else {
                                missingAssetFileErrors.push(`"${imageFile.imageFilePathFromPgFile}" from "${pgFile.pgFilePathFromDefFile}" from "${defFile.defFileRelativePath}"`);
                                // This method throws an error, therefore it doesn't need to return
                                missingFileErrorCheck();
                            }
                        });
                    } else {
                        const resolvedPath = ABSOLUTE_RENDERER_PATH_REGEX.test(pgFile.pgFilePathFromDefFile) ? pgFile.pgFilePathFromDefFile : `Contrib/${pgFile.pgFilePathFromDefFile}`;
                        // It is not accessible if it was not found on disk
                        // or it was not found by the renderer
                        const notLocalFile = pgFile.pgFilePathFromDefFile.startsWith('local') === false;
                        notLocalFile && rendererAccessibleRequests++;
                        const isAccessible = notLocalFile && await rendererHelper.isPathAccessibleToRenderer({
                            problemPath: resolvedPath
                        });
                        if (!isAccessible) {
                            missingPGFileErrorsObject[pgFile.pgFilePathFromDefFile] = [`${pgFile.pgFilePathFromDefFile} cannot be found. It was referenced in ${defFile.defFileRelativePath} from a legacy WeBWorK course archive.`];
                            missingPGFileErrors.push(`"${pgFile.pgFilePathFromDefFile}" from "${defFile.defFileRelativePath}"`);
                            // This method throws an error, therefore it doesn't need to return
                            missingFileErrorCheck();
                        } else {
                            pgFile.resolvedRendererPath = resolvedPath;
                        }
                    }
                });
                await saveAndResolveProblems(defFile.bucketDefFiles);
            });
        };
        // TODO remove
        logger.info(`Import Course Archive fetched course, Sending to renderer ${new Date().getTime() - startTime} ${new Date()}`);
        await saveAndResolveProblems(discoveredFiles.defFiles);
        // TODO remove
        logger.info(`Import Course Archive sent to renderer, Sending information to the database ${new Date().getTime() - startTime} ${new Date()}`);

        const topics: Array<CourseTopicContent> = [];
        const unit: CourseUnitContent = await useDatabaseTransaction(async (): Promise<CourseUnitContent> => {
            const unitName = `${workingDirectoryName} Course Archive Import`;
            // Fore dev it's nice to have a timestamp to avoid conflicts
            // const unitName = `${workingDirectoryName} Course Archive Import ${new Date().getTime()}`;
            const unit = await this.createUnit({
                courseId: courseId,
                name: unitName
            });

            // Can't use async for each because these can't be done in parallel
            // get next content order needs to wait for the previous one to finish
            for (const key in discoveredFiles.defFiles) {
                const defFile = discoveredFiles.defFiles[key];
                const parsedWebworkDef = new WebWorkDef((await fs.promises.readFile(defFile.defFileAbsolutePath)).toString());
                const topic = await this.createTopic({
                    name: defFile.topicName,
                    startDate: course.end,
                    endDate: course.end,
                    deadDate: course.end,
                    courseUnitContentId: unit.id,
                    // TODO use enum
                    topicTypeId: parsedWebworkDef.isExam() ? 2 : 1,
                });

                if (parsedWebworkDef.isExam()) {
                    let possibleIntervals = 1;
                    let timeInterval: number | undefined = undefined;
                    if (!_.isNil(parsedWebworkDef.timeInterval)) {
                        timeInterval = parseInt(parsedWebworkDef.timeInterval, 10);

                        if (_.isNaN(timeInterval)) {
                            throw new IllegalArgumentException(`The def file: ${defFile.defFileRelativePath} has an invalid time interval: ${parsedWebworkDef.timeInterval}.`);
                        }

                        timeInterval /= 60;

                        if (timeInterval > 0) {
                            if (_.isNil(parsedWebworkDef.openDate) || _.isNil(parsedWebworkDef.dueDate)) {
                                throw new IllegalArgumentException(`The def file: ${defFile.defFileRelativePath} is missing the open or due date.`);
                            }
                            // The format from webwork has a timezone (i.e. EDT, EST)
                            // However moment didn't have a nice way to format with the timezone
                            // This should not be a problem unless the start and end date are in different timezones (daylight savings)
                            const webworkDateFormat = 'MM/DD/YYYY [at] HH:mma';
                            const examDuration = moment(parsedWebworkDef.dueDate, webworkDateFormat).diff(moment(parsedWebworkDef.openDate, webworkDateFormat));
                            // / 60000 to convert to minutes
                            possibleIntervals = examDuration / 60000 / timeInterval;
                        }
                        timeInterval = Math.round(timeInterval);
                    }
                    const topicAssessmentInfo: Partial<TopicAssessmentInfoInterface> = _.omitBy({
                        // id,
                        courseTopicContentId: topic.id,
                        duration: parsedWebworkDef.versionTimeLimit ? Math.round(parseInt(parsedWebworkDef.versionTimeLimit, 10) / 60) : undefined,
                        hardCutoff: WebWorkDef.characterBoolean(parsedWebworkDef.capTimeLimit),
                        hideHints: undefined,
                        hideProblemsAfterFinish: WebWorkDef.characterBoolean(parsedWebworkDef.hideWork),
                        maxGradedAttemptsPerVersion: parsedWebworkDef.attemptsPerVersion ? parseInt(parsedWebworkDef.attemptsPerVersion, 10) : undefined,
                        maxVersions: parsedWebworkDef.versionsPerInterval ? Math.round(parseInt(parsedWebworkDef.versionsPerInterval, 10) * possibleIntervals) : undefined,
                        randomizeOrder: WebWorkDef.numberBoolean(parsedWebworkDef.problemRandOrder),
                        showItemizedResults: !WebWorkDef.characterBoolean(parsedWebworkDef.hideScoreByProblem),
                        showTotalGradeImmediately: !WebWorkDef.characterBoolean(parsedWebworkDef.hideScore),
                        versionDelay: timeInterval
                    }, _.isUndefined);
                    try {
                        await TopicAssessmentInfo.create(topicAssessmentInfo);
                    } catch (e) {
                        throw new WrappedError(`Failed to create topic assessment info for ${defFile.defFileRelativePath}`, e);
                    }
                }
                
                try {
                    const userIds = await this.getEnrolledUserIdsInCourse({
                        courseId: courseId
                    });
                    await this.createQuestionsForTopicFromDefFileContent({
                        parsedWebworkDef: parsedWebworkDef,
                        courseTopicId: topic.id,
                        topic: topic,
                        defFileDiscoveryResult: {
                            defFileResult: defFile,
                            bucketDefFiles: discoveredFiles.bucketDefFiles
                        },
                        userIds: userIds,
                        errors: missingPGFileErrorsObject,
                    });
                } catch (e) {
                    throw new WrappedError(`Failed to add questions to topic for ${defFile.defFileRelativePath}`, e);
                }

                topics.push(topic);
            }

            const errorMessage = missingFileErrorCheck();
            // TODO remove once we track warnings in the application
            if(!_.isEmpty(errorMessage)) {
                logger.warn(`importCourseArchive succeeded with warnings: ${errorMessage}`);
                emailHelper.sendEmail({
                    template: 'generic',
                    email: user.email,
                    locals: {
                        SUBJECT_TEXT: `${workingDirectoryName} archive import`,
                        BODY_TEXT: `Hello Professor ${user.lastName},

                        Your course archive upload (${nodePath.basename(fileName)}) was successfully imported into your course (${course.name}), however there were a few files missing:
                        
                        ${errorMessage}

                        All the best,
                        The Rederly Team
                        `
                    },
                })
                .catch(e => logger.error('importCourseTarball: Could not send professor email with archive warnings', e));
            }
            return unit;
        });

        logger.info(`Import Course Archive complete ${JSON.stringify({
            rendererSavePGFileRequests,
            rendererSaveAssetRequests,
            rendererAccessibleRequests,
        })} ${new Date().getTime() - startTime} ${new Date()}`);

        return {
            unit: {
                // avoid infinite chain
                ...unit.get({plain: true}),
                topics: topics
            },
            missingFileErrors: {
                missingPGFileErrors: missingPGFileErrors,
                missingAssetFileErrors: missingAssetFileErrors,
            }
        };
    }

    async prepareOpenLabRedirect(options: PrepareOpenLabRedirectOptions): Promise<OpenLabRedirectInfo> {
        const {user, questionId, baseURL} = options;
        // if question belongs to an exam, they may not proceed
        // exam questions should not be posted to OpenLab
        const question = await courseRepository.getQuestion({id: questionId, userId: user.id});
        const topic = await question.getTopic();
        if (topic.topicTypeId === 2) {
            const message = 'Exam problems cannot be submitted to the OpenLab.';
            logger.error(`TSNH, it should be blocked by frontend ${message}`);
            throw new IllegalArgumentException(message);
        }

        const grade = await this.getGradeForQuestion({questionId, userId: user.id});
        if (_.isNil(grade)) {
            throw new IllegalArgumentException('Cannot ask for help on a question that has not been assigned.');
        }
        const unit = await topic.getUnit();
        const course = await unit.getCourse();
        // TODO: fetch all enrolled users and pull any with permission > student
        // course.getEnrolled().forEach( email.push if role > student )
        // support for TAs receiving notifications
        const instructor = await course.getInstructor();
        const instructorEmail = `Prof. ${instructor.lastName} <${instructor.email}>`;

        const problem = question.problemNumber;
        const problemSetId = topic.name;
        const courseId = course.name;
        const problemPath = question.webworkQuestionPath;
        const email = [instructorEmail];
        const studentName = `${user.firstName} ${user.lastName}`;
        const emailURL = `${baseURL}/common/courses/${course.id}/topic/${topic.id}/grading?problemId=${question.id}&userId=${user.id}`;
        const renderResponse = await rendererHelper.getProblem({
            sourceFilePath: problemPath,
            problemSeed: grade.randomSeed,
            outputformat: OutputFormat.STATIC,
            showHints: false,
            showSolutions: false,
            permissionLevel: 0,
        }) as RendererResponse;
        const rawHTML = renderResponse.renderedHTML;

        if (_.isNil(rawHTML)) {
            throw new RederlyError('Someone tried to ask for help on a problem with empty renderedHTML');
        }

        return {
            problem,
            problemSetId,
            courseId,
            problemPath,
            email,
            studentName,
            emailURL,
            rawHTML,
        };
    }

    async requestProblemNewVersion(options: RequestNewProblemVersionOptions): Promise<StudentGrade | null> {
        const {userId, questionId} = options;
        
        const grade = await StudentGrade.findOne({
            where: {
                userId,
                courseWWTopicQuestionId: questionId,
                active: true,
            }
        });
        if (_.isNil(grade)) {
            throw new RederlyError(`User #${userId} requested SMA on a problem (${questionId}) for which they do not have an active grade.`);
        }

        const question = await grade.getQuestion();
        if (_.isNil(question)) {
            throw new RederlyError(`(SMA) TSNH: User #${userId} has a grade (${grade.id}) without a corresponding topic question`);
        }

        const params = {
            sourceFilePath: question.webworkQuestionPath,
            avoidSeeds: [grade.randomSeed],
        };
        const response = await rendererHelper.showMeAnother(params);

        if (_.isNil(response)) {
            return null;
        } else {
            grade.randomSeed = response?.problemSeed;
            grade.currentProblemState = null;
            const updatedGrade = await grade.save();
            return updatedGrade;
        }
    }

    async isUserEnrolledInCourse ({
        userId,
        courseId
    }: {
        userId: number;
        courseId: number;
    }): Promise<boolean> {
        const enrollment = await StudentEnrollment.findOne({
            where: {
                userId: userId,
                courseId: courseId,
                dropDate: null,
                active: true
            }
        });
        return !_.isNil(enrollment);
    }

    async canUserViewCourse ({
        user,
        course,
        rederlyUserRole: rederlyUserRoleParam,
    }: {
        user: User;
        course: Course;
        rederlyUserRole?: Role;
    }): Promise<void> {
        const rederlyUserRole = rederlyUserRoleParam ?? user.roleId as Role;
        // TODO make enum to return that specifies what kind of user was allowed in
        if (rederlyUserRole === Role.PROFESSOR && course.instructorId === user.id) {
            logger.debug('Is course cowner');
        // } else if (user.roleId === Role.PROFESSOR) {
        //     // TODO this is temporary, when we have TA access setup this will become more comprehensive
        //     // In the future not all profs will be a be able to access
        //     logger.debug('Is faculty');
        } else if (await this.isUserEnrolledInCourse({
            userId: user.id,
            courseId: course.id
        })) {
            logger.debug('Is enrolled student (or professor');
        } else {
            throw new ForbiddenError('You do not have access to this course');
        }
    }

    async getGradesForTopics ({
        courseId
    }: {
        courseId: number;
    }): Promise<unknown> {
        const result = await  appSequelize.query(`
        SELECT
        topics.course_topic_content_name as name,
        topics.course_topic_content_total_problem_weight as "totalProblemWeight",
        topics.course_topic_content_required_problem_weight as "requiredProblemWeight",
        json_agg(students) as students
        FROM
        (
            SELECT
            course_topic_content.course_topic_content_id,
            student_grade.user_id,
            users.user_first_name || ' ' || users.user_last_name as "userName",
            SUM(student_grade.student_grade_effective_score * course_topic_question.course_topic_question_weight) AS "pointsEarned"
            FROM student_grade
            INNER JOIN users ON users.user_id = student_grade.user_id and users.course_topic_question_active AND student_grade.student_grade_active
            INNER JOIN course_topic_question ON course_topic_question.course_topic_question_id = student_grade.course_topic_question_id and course_topic_question.course_topic_question_active
            INNER JOIN course_topic_content ON course_topic_content.course_topic_content_id = course_topic_question.course_topic_content_id and course_topic_content.course_topic_content_active
            INNER JOIN course_unit_content ON course_unit_content.course_unit_content_id = course_topic_content.course_unit_content_id and course_unit_content.course_unit_content_active
            INNER JOIN course ON course.course_active AND course.course_id = :courseId AND course.course_id = course_unit_content.course_id
            INNER JOIN student_enrollment ON student_enrollment.student_enrollment_active and student_enrollment.student_enrollment_drop_date is null and student_enrollment.course_id = course.course_id and student_enrollment.user_id = student_grade.user_id 
            GROUP BY course_topic_content.course_topic_content_id, student_grade.user_id, users.user_first_name, users.user_last_name
            ORDER BY student_grade.user_id
        ) students
        INNER JOIN
        (
            SELECT
            course_topic_content.course_topic_content_id,
            course_topic_content.course_topic_content_name,
            SUM(course_topic_question.course_topic_question_weight) as course_topic_content_total_problem_weight,
            course_unit_content.course_unit_content_order,
            course_topic_content.course_topic_content_order,
            sum(CASE WHEN course_topic_question.course_topic_question_optional = FALSE THEN course_topic_question.course_topic_question_weight ELSE 0 END) as course_topic_content_required_problem_weight
            FROM course_topic_content
            INNER JOIN course_unit_content ON course_unit_content.course_unit_content_id = course_topic_content.course_unit_content_id AND course_unit_content.course_unit_content_active
            INNER JOIN course_topic_question ON course_topic_question.course_topic_content_id = course_topic_content.course_topic_content_id AND course_topic_question.course_topic_question_active
            WHERE course_unit_content.course_id = :courseId AND course_topic_content.course_topic_content_active
            GROUP BY
            course_topic_content.course_topic_content_id,
            course_topic_content.course_topic_content_name,
            course_unit_content.course_unit_content_order,
            course_topic_content.course_topic_content_order
            ORDER BY course_topic_content.course_topic_content_id
        ) topics
        ON students.course_topic_content_id = topics.course_topic_content_id
        GROUP BY
        topics.course_topic_content_id,
        topics.course_topic_content_name,
        topics.course_topic_content_total_problem_weight,
        topics.course_topic_content_required_problem_weight,
        topics.course_unit_content_order,
        topics.course_topic_content_order
        ORDER BY
        topics.course_unit_content_order,
        topics.course_topic_content_order;
        `, {
            replacements: {
                courseId: courseId,
                type: sequelize.QueryTypes.SELECT,
            }
        });
        type Student = {
            userName: string;
            pointsEarned: number;
        };
        // this isn't an array it's a tuple so 0 is guarenteed
        const typedResult = result[0] as Array<{
            // Defined fields
            students?: Array<Student>;
        } & {
            // dictionary fields
            [userName: string]: number;
        }>;

        return typedResult.map(row => {
            // Can't be nil at this point
            const students = row.students as Array<Student>;
            delete row.students;
            students.forEach(student => {
                row[student.userName] = student.pointsEarned;
            });
            return row;
        });
    }

}

export const courseController = new CourseController();
export default courseController;
