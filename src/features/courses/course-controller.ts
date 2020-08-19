import * as _ from 'lodash';
import Bluebird = require('bluebird');
import Course from '../../database/models/course';
import StudentEnrollment from '../../database/models/student-enrollment';
import { BaseError } from 'sequelize';
import NotFoundError from '../../exceptions/not-found-error';
import CourseUnitContent from '../../database/models/course-unit-content';
import CourseTopicContent from '../../database/models/course-topic-content';
import CourseWWTopicQuestion from '../../database/models/course-ww-topic-question';
import rendererHelper from '../../utilities/renderer-helper';
import StudentWorkbook from '../../database/models/student-workbook';
import StudentGrade from '../../database/models/student-grade';
import User from '../../database/models/user';
import logger from '../../utilities/logger';
import sequelize = require('sequelize');
import WrappedError from '../../exceptions/wrapped-error';
import AlreadyExistsError from '../../exceptions/already-exists-error';
import appSequelize from '../../database/app-sequelize';
import { GetTopicsOptions, CourseListOptions, UpdateUnitOptions, UpdateTopicOptions, EnrollByCodeOptions, GetGradesOptions, GetStatisticsOnQuestionsOptions, GetStatisticsOnTopicsOptions, GetStatisticsOnUnitsOptions, GetQuestionOptions, GetQuestionResult, SubmitAnswerOptions, SubmitAnswerResult, FindMissingGradesResult, GetQuestionsOptions, GetQuestionsThatRequireGradesForUserOptions, GetUsersThatRequireGradeForQuestionOptions, CreateGradesForUserEnrollmentOptions, CreateGradesForQuestionOptions, CreateNewStudentGradeOptions, UpdateQuestionOptions, UpdateCourseOptions, MakeProblemNumberAvailableOptions, MakeUnitContentOrderAvailableOptions, MakeTopicContentOrderAvailableOptions, CreateCourseOptions, CreateQuestionsForTopicFromDefFileContentOptions, DeleteQuestionsOptions, DeleteTopicsOptions, DeleteUnitsOptions } from './course-types';
import { Constants } from '../../constants';
import courseRepository from './course-repository';
import { UpdateResult } from '../../generic-interfaces/sequelize-generic-interfaces';
import curriculumRepository from '../curriculum/curriculum-repository';
import CurriculumUnitContent from '../../database/models/curriculum-unit-content';
import CurriculumTopicContent from '../../database/models/curriculum-topic-content';
import CurriculumWWTopicQuestion from '../../database/models/curriculum-ww-topic-question';
import WebWorkDef, { Problem } from '../../utilities/web-work-def-parser';
import { nameof } from '../../utilities/typescript-helpers';
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

    getTopics(options: GetTopicsOptions): Promise<CourseTopicContent[]> {
        const { courseId, isOpen } = options;
        const where: sequelize.WhereOptions = {};
        const include = [];
        if (!_.isNil(courseId)) {
            include.push({
                model: CourseUnitContent,
                as: 'unit',
                attributes: []
            });
            where[`$unit.${CourseUnitContent.rawAttributes.courseId.field}$`] = courseId;
        }

        if (isOpen) {
            const date = new Date();
            where.startDate = {
                [Sequelize.Op.lte]: date
            };

            where.deadDate = {
                [Sequelize.Op.gte]: date
            };
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
        if(options.options.useCurriculum) {
            return appSequelize.transaction(async () => {
                // I didn't want this in the transaction, however use strict throws errors if not
                if(_.isNil(options.object.curriculumId)) {
                    throw new NotFoundError('Cannot useCurriculum if curriculumId is not given');
                }
                const curriculum = await curriculumRepository.getCurriculumById(options.object.curriculumId);
                const createdCourse = await courseRepository.createCourse(options.object);
                await curriculum.units?.asyncForEach(async (curriculumUnit: CurriculumUnitContent) => {
                    const createdCourseUnit = await courseRepository.createUnit({
                        active: curriculumUnit.active,
                        contentOrder: curriculumUnit.contentOrder,
                        courseId: createdCourse.id,
                        curriculumUnitId: curriculumUnit.id,
                        name: curriculumUnit.name,
                    });
                    await curriculumUnit.topics?.asyncForEach(async (curriculumTopic: CurriculumTopicContent) => {
                        const createdCourseTopic: CourseTopicContent = await courseRepository.createCourseTopic({
                            curriculumTopicContentId: curriculumTopic.id,
                            courseUnitContentId: createdCourseUnit.id,
                            topicTypeId: curriculumTopic.topicTypeId,
                            name: curriculumTopic.name,
                            active: curriculumTopic.active,
                            contentOrder: curriculumTopic.contentOrder,

                            startDate: createdCourse.end,
                            endDate: createdCourse.end,
                            deadDate: createdCourse.end,
                            partialExtend: false
                        });
                        await curriculumTopic.questions?.asyncForEach(async (curriculumQuestion: CurriculumWWTopicQuestion) => {
                            await courseRepository.createQuestion({
                                courseTopicContentId: createdCourseTopic.id,
                                problemNumber: curriculumQuestion.problemNumber,
                                webworkQuestionPath: curriculumQuestion.webworkQuestionPath,
                                weight: curriculumQuestion.weight,
                                maxAttempts: curriculumQuestion.maxAttempts,
                                hidden: curriculumQuestion.hidden,
                                active: curriculumQuestion.active,
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
        if(_.isNil(courseUnitContent.contentOrder)) {
            if(_.isNil(courseUnitContent.courseId)) {
                throw new Error('We need a course id in order to get a content order');
            }
            courseUnitContent.contentOrder = await courseRepository.getNextContentOrderForCourse(courseUnitContent.courseId);
        }

        if(_.isNil(courseUnitContent.name)) {
            courseUnitContent.name = `Unit #${courseUnitContent.contentOrder}`;
        }
        return courseRepository.createUnit(courseUnitContent);
    }


    async createTopic(courseTopicContent: CourseTopicContent): Promise<CourseTopicContent> {
        if(_.isNil(courseTopicContent.startDate) || _.isNil(courseTopicContent.endDate) || _.isNil(courseTopicContent.deadDate)) {
            if(_.isNil(courseTopicContent.courseUnitContentId)) {
                throw new Error('Cannot assume start, end or dead date if a unit is not supplied');
            }

            const unit = await courseRepository.getCourseUnit({
                id: courseTopicContent.courseUnitContentId
            });

            const course = await unit.getCourse();

            // Date default to end date
            if(_.isNil(courseTopicContent.startDate)) {
                courseTopicContent.startDate = course.end;
            }
            
            if(_.isNil(courseTopicContent.endDate)) {
                courseTopicContent.endDate = course.end;
            }
            
            if(_.isNil(courseTopicContent.deadDate)) {
                courseTopicContent.deadDate = course.end;    
            }    
        }

        if(_.isNil(courseTopicContent.contentOrder)) {
            if(_.isNil(courseTopicContent.courseUnitContentId)) {
                throw new Error('Cannot assume assume content order if a unit is not supplied');
            }
            courseTopicContent.contentOrder = await courseRepository.getNextContentOrderForUnit(courseTopicContent.courseUnitContentId);
        }

        if(_.isNil(courseTopicContent.name)) {
            courseTopicContent.name = `Topic #${courseTopicContent.contentOrder}`;
        }
        return courseRepository.createCourseTopic(courseTopicContent);
    }

    async updateCourse(options: UpdateCourseOptions): Promise<Course[]> {
        const result = await courseRepository.updateCourse(options);
        return result.updatedRecords;
    }

    private async makeCourseTopicOrderAvailable(options: MakeTopicContentOrderAvailableOptions): Promise<UpdateResult<CourseTopicContent>[]> {
        // TODO make this more efficient
        // Currently this updates more records than it has to so that it can remain generic due to time constraints
        // See problem number comment for more details
        const contentOrderField = CourseTopicContent.rawAttributes.contentOrder.field;
        const decrementResult = await courseRepository.updateTopics({
            where: {
                contentOrder: {
                    [Sequelize.Op.gt]: options.sourceContentOrder
                },
                courseUnitContentId: options.sourceCourseUnitId
            },
            updates: {
                contentOrder: sequelize.literal(`-1 * (${contentOrderField} - 1)`),
            }
        });

        const fixResult = await courseRepository.updateTopics({
            where: {
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
                contentOrder: {
                    [Sequelize.Op.gte]: options.targetContentOrder
                },
                courseUnitContentId: options.targetCourseUnitId
            },
            updates: {
                contentOrder: sequelize.literal(`-1 * (${contentOrderField} + 1)`),
            }
        });

        const fixResult2 = await courseRepository.updateTopics({
            where: {
                contentOrder: {
                    [Sequelize.Op.lt]: 0
                },
            },
            updates: {
                contentOrder: sequelize.literal(`ABS(${contentOrderField})`),
            }
        });

        return [decrementResult, fixResult, incrementResult, fixResult2];
    }

    async updateTopic(options: UpdateTopicOptions): Promise<CourseTopicContent[]> {
        return appSequelize.transaction(async () => {
            // This is a set of all update results as they come in, since there are 5 updates that occur this will have 5 elements
            let updatesResults: UpdateResult<CourseTopicContent>[]  = [];
            if(!_.isNil(options.updates.contentOrder) || !_.isNil(options.updates.courseUnitContentId)) {
                // What happens if you move from one topic to another? Disregarding since that should not be possible from the UI
                const existingTopic = await courseRepository.getCourseTopic({
                    id: options.where.id
                });
                const sourceContentOrder = existingTopic.contentOrder;
                // Move the object out of the way for now, this is due to constraint issues
                // TODO make unique index a deferable unique constraint and then make the transaction deferable
                // NOTE: sequelize did not have a nice way of doing this on unique constraints that use the same key in a composite key
                existingTopic.contentOrder = 2147483640;
                await existingTopic.save();
                updatesResults = await this.makeCourseTopicOrderAvailable({
                    sourceContentOrder,
                    sourceCourseUnitId: existingTopic.courseUnitContentId,
                    targetContentOrder: options.updates.contentOrder ?? sourceContentOrder,
                    targetCourseUnitId: options.updates.courseUnitContentId ?? existingTopic.courseUnitContentId
                });
                if(_.isNil(options.updates.contentOrder) && !_.isNil(options.updates.courseUnitContentId)) {
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
            return resultantUpdates;
        });
    }

    private async makeCourseUnitOrderAvailable(options: MakeUnitContentOrderAvailableOptions): Promise<UpdateResult<CourseUnitContent>[]> {
        // TODO make this more efficient
        // Currently this updates more records than it has to so that it can remain generic due to time constraints
        // See problem number comment for more details
        const contentOrderField = CourseUnitContent.rawAttributes.contentOrder.field;
        const decrementResult = await courseRepository.updateUnits({
            where: {
                contentOrder: {
                    [Sequelize.Op.gt]: options.sourceContentOrder
                },
                courseId: options.sourceCourseId
            },
            updates: {
                contentOrder: sequelize.literal(`-1 * (${contentOrderField} - 1)`),
            }
        });

        const fixResult = await courseRepository.updateUnits({
            where: {
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
                contentOrder: {
                    [Sequelize.Op.gte]: options.targetContentOrder
                },
                courseId: options.targetCourseId
            },
            updates: {
                contentOrder: sequelize.literal(`-1 * (${contentOrderField} + 1)`),
            }
        });

        const fixResult2 = await courseRepository.updateUnits({
            where: {
                contentOrder: {
                    [Sequelize.Op.lt]: 0
                },
            },
            updates: {
                contentOrder: sequelize.literal(`ABS(${contentOrderField})`),
            }
        });

        return [decrementResult, fixResult, incrementResult, fixResult2];
    }

    async softDeleteQuestions(options: DeleteQuestionsOptions): Promise<UpdateResult<CourseWWTopicQuestion>> {
        let courseTopicContentId = options.courseTopicContentId;
        return appSequelize.transaction(async (): Promise<UpdateResult<CourseWWTopicQuestion>> => {
            const where: sequelize.WhereOptions = _({
                id: options.id,
                courseTopicContentId,
                active: true
            }).omitBy(_.isUndefined).value() as sequelize.WhereOptions;
            
            // It will always have active, needs more info than that
            if(Object.keys(where).length < 2) {
                throw new Error('Not enough information in where clause');
            }

            if(_.isNil(courseTopicContentId) && !_.isNil(options.id)) {
                const existingQuestion = await courseRepository.getQuestion({
                    id: options.id
                });
                courseTopicContentId = existingQuestion.courseTopicContentId;
            }

            if(_.isNil(courseTopicContentId)) {
                throw new Error('Could not figure out course topic content id');
            }

            let problemNumber: number | sequelize.Utils.Literal = await courseRepository.getNextDeletedProblemNumberForTopic(courseTopicContentId);
            if(!_.isNil(courseTopicContentId)) {
                problemNumber = sequelize.literal(`${CourseWWTopicQuestion.rawAttributes.problemNumber.field} + ${problemNumber}`);
            }

            const results: UpdateResult<CourseWWTopicQuestion> = await courseRepository.updateQuestions({
                where,
                updates: {
                    active: false,
                    problemNumber
                }
            });
    
            return results;    
        });
    }

    async softDeleteTopics(options: DeleteTopicsOptions): Promise<UpdateResult<CourseTopicContent>> {
        let courseUnitContentId = options.courseUnitContentId;
        return appSequelize.transaction(async (): Promise<UpdateResult<CourseTopicContent>> => {
            const results: CourseTopicContent[] = [];
            let updatedCount = 0;
            const where: sequelize.WhereOptions = _({
                id: options.id,
                courseUnitContentId: courseUnitContentId,
                active: true
            }).omitBy(_.isUndefined).value() as sequelize.WhereOptions;
            
            // It will always have active, needs more info than that
            if(Object.keys(where).length < 2) {
                throw new Error('Not enough information in where clause');
            }

            if(_.isNil(courseUnitContentId) && !_.isNil(options.id)) {
                const existingTopic = await courseRepository.getCourseTopic({
                    id: options.id
                });
                courseUnitContentId = existingTopic.courseUnitContentId;
            }

            if(_.isNil(courseUnitContentId)) {
                throw new Error('Could not figure out course unit content id');
            }

            let contentOrder: number | sequelize.Utils.Literal = await courseRepository.getNextDeletedContentOrderForUnit(courseUnitContentId);
            let name: sequelize.Utils.Literal = sequelize.literal(`${CourseTopicContent.rawAttributes[nameof<CourseTopicContent>('name') as string].field} || ${contentOrder}`);
            if(!_.isNil(courseUnitContentId)) {
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
        return appSequelize.transaction(async (): Promise<UpdateResult<CourseUnitContent>> => {
            const results: CourseUnitContent[] = [];
            let updatedCount = 0;
            const where: sequelize.WhereOptions = _({
                id: options.id,
                active: true
            }).omitBy(_.isUndefined).value() as sequelize.WhereOptions;
            
            // It will always have active, needs more info than that
            if(Object.keys(where).length < 2) {
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

            await updateCourseUnitResult.updatedRecords.asyncForEach(async(unit: CourseUnitContent) => {
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
        return appSequelize.transaction(async () => {
            // This is a set of all update results as they come in, since there are 5 updates that occur this will have 5 elements
            let updatesResults: UpdateResult<CourseUnitContent>[]  = [];
            if(!_.isNil(options.updates.contentOrder)) {
                // What happens if you move from one topic to another? Disregarding since that should not be possible from the UI
                const existingUnit = await courseRepository.getCourseUnit({
                    id: options.where.id
                });
                const sourceContentOrder = existingUnit.contentOrder;
                // Move the object out of the way for now, this is due to constraint issues
                // TODO make unique index a deferable unique constraint and then make the transaction deferable
                // NOTE: sequelize did not have a nice way of doing this on unique constraints that use the same key in a composite key
                existingUnit.contentOrder = 2147483640;
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
        // TODO make this more efficient
        // Currently this updates more records than it has to so that it can remain generic due to time constraints
        // i.e. if update the problem number from 1 to 1, it will increment and decrement all question in the topic
        // if that problem number update was the only parameter we would not actually make any changes even though it updated all the records
        const problemNumberField = CourseWWTopicQuestion.rawAttributes.problemNumber.field;
        const decrementResult = await courseRepository.updateQuestions({
            where: {
                problemNumber: {
                    [Sequelize.Op.gt]: options.sourceProblemNumber
                },
                courseTopicContentId: options.sourceTopicId
            },
            updates: {
                problemNumber: sequelize.literal(`-1 * (${problemNumberField} - 1)`),
            }
        });

        const fixResult = await courseRepository.updateQuestions({
            where: {
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
                problemNumber: {
                    [Sequelize.Op.gte]: options.targetProblemNumber
                },
                courseTopicContentId: options.targetTopicId
            },
            updates: {
                problemNumber: sequelize.literal(`-1 * (${problemNumberField} + 1)`),
            }
        });

        const fixResult2 = await courseRepository.updateQuestions({
            where: {
                problemNumber: {
                    [Sequelize.Op.lt]: 0
                },
            },
            updates: {
                problemNumber: sequelize.literal(`ABS(${problemNumberField})`),
            }
        });

        return [decrementResult, fixResult, incrementResult, fixResult2];
    }

    updateQuestion(options: UpdateQuestionOptions): Promise<CourseWWTopicQuestion[]> {
        return appSequelize.transaction(async () => {
            // This is a set of all update results as they come in, since there are 5 updates that occur this will have 5 elements
            let updatesResults: UpdateResult<CourseWWTopicQuestion>[]  = [];
            if(!_.isNil(options.updates.problemNumber)) {
                // What happens if you move from one topic to another? Disregarding since that should not be possible from the UI
                const existingQuestion = await courseRepository.getQuestion({
                    id: options.where.id
                });
                const sourceProblemNumber = existingQuestion.problemNumber;
                // Move the question out of the way for now, this is due to constraint issues
                // TODO make unique index a deferable unique constraint and then make the transaction deferable
                // NOTE: sequelize did not have a nice way of doing this on unique constraints that use the same key in a composite key
                existingQuestion.problemNumber = 2147483640;
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
            return resultantUpdates;
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
        return appSequelize.transaction(() => {
            return parsedWebworkDef.problems.asyncForEach(async (problem: Problem) => {
                return courseRepository.createQuestion({
                    courseTopicContentId: options.courseTopicId,
                    problemNumber: ++lastProblemNumber,
                    webworkQuestionPath: problem.source_file,
                    weight: parseInt(problem.value ?? '1'),
                    maxAttempts: parseInt(problem.max_attempts ?? '-1'),
                    hidden: false,
                    active: false,
                    optional: false
                });
            });
        });
    }

    async addQuestion(question: Partial<CourseWWTopicQuestion>): Promise<CourseWWTopicQuestion> {
        return await appSequelize.transaction(async () => {
            const result = await this.createQuestion(question);
            await this.createGradesForQuestion({
                questionId: result.id
            });
            return result;
        });
    }

    async getQuestion(options: GetQuestionOptions): Promise<GetQuestionResult> {
        const courseQuestion = await courseRepository.getQuestion({
            id: options.questionId
        });

        if (_.isNil(courseQuestion)) {
            throw new NotFoundError('Could not find the question in the database');
        }

        const studentGrade: StudentGrade | null = await StudentGrade.findOne({
            where: {
                userId: options.userId,
                courseWWTopicQuestionId: options.questionId
            }
        });

        const randomSeed = _.isNil(studentGrade) ? 666 : studentGrade.randomSeed;

        const rendererData = await rendererHelper.getProblem({
            sourceFilePath: courseQuestion.webworkQuestionPath,
            problemSeed: randomSeed,
            formURL: options.formURL,
        });
        return {
            // courseQuestion,
            rendererData
        };
    }

    async submitAnswer(options: SubmitAnswerOptions): Promise<SubmitAnswerResult> {
        const studentGrade = await StudentGrade.findOne({
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

        const bestScore = Math.max(studentGrade.overallBestScore, options.score);

        studentGrade.bestScore = bestScore;
        studentGrade.overallBestScore = bestScore;
        studentGrade.numAttempts++;
        if (studentGrade.numAttempts === 1) {
            studentGrade.firstAttempts = options.score;
        }
        studentGrade.latestAttempts = options.score;
        await studentGrade.save();

        const studentWorkbook = await StudentWorkbook.create({
            studentGradeId: studentGrade.id,
            userId: options.userId,
            courseWWTopicQuestionId: studentGrade.courseWWTopicQuestionId,
            randomSeed: studentGrade.randomSeed,
            submitted: options.submitted,
            result: options.score,
            time: new Date()
        });

        return {
            studentGrade,
            studentWorkbook
        };
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
        return await appSequelize.transaction(async () => {
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
                                    required: false
                                }]
                            }]
                        }]
                    }]
                }]
            }],
            where: {
                [`$courseEnrollments.course.units.topics.questions.grades.${StudentGrade.rawAttributes.id.field}$`]: {
                    [Sequelize.Op.eq]: null
                }
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
        }).omitBy(_.isUndefined).value() as sequelize.WhereOptions;

        const totalProblemCountCalculationString = `COUNT(question.${CourseWWTopicQuestion.rawAttributes.id.field})`;
        const pendingProblemCountCalculationString = `COUNT(CASE WHEN ${StudentGrade.rawAttributes.numAttempts.field} = 0 THEN ${StudentGrade.rawAttributes.numAttempts.field} END)`;
        const masteredProblemCountCalculationString = `COUNT(CASE WHEN ${StudentGrade.rawAttributes.bestScore.field} >= 1 THEN ${StudentGrade.rawAttributes.bestScore.field} END)`;
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
            }];
        }

        let topicInclude;
        if (includeOthers || _.isNil(unitId) === false) {
            includeOthers = true;
            topicInclude = [{
                model: CourseUnitContent,
                as: 'unit',
                attributes: [],
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
                include: topicInclude || [],
            }];
        }

        let attributes: sequelize.FindAttributeOptions;
        // Group cannot be empty array, use null if there is no group clause
        let group: string[] | undefined = undefined;
        if (_.isNil(questionId) === false) {
            attributes = [
                'id',
                'bestScore',
                'numAttempts'
            ];
            // This should already be the case but let's guarentee it
            group = undefined;
        } else {
            attributes = [
                [sequelize.fn('avg', sequelize.col(`${StudentGrade.rawAttributes.bestScore.field}`)), 'average'],
                [sequelize.literal(pendingProblemCountCalculationString), 'pendingProblemCount'],
                [sequelize.literal(masteredProblemCountCalculationString), 'masteredProblemCount'],
                [sequelize.literal(inProgressProblemCountCalculationString), 'inProgressProblemCount'],
            ];
            // TODO This group needs to match the alias below, I'd like to find a better way to do this
            group = [`user.${User.rawAttributes.id.field}`, `user.${User.rawAttributes.firstName.field}`, `user.${User.rawAttributes.lastName.field}`];
        }

        return StudentGrade.findAll({
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName']
            }, {
                model: CourseWWTopicQuestion,
                as: 'question',
                attributes: [],
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

        // Using strict with typescript results in WhereOptions failing when set to a partial object, casting it as WhereOptions since it works
        const where: sequelize.WhereOptions = _({
            courseId,
            [`$topics.questions.grades.${StudentGrade.rawAttributes.userId.field}$`]: userId,
        }).omitBy(_.isNil).value() as sequelize.WhereOptions;

        return CourseUnitContent.findAll({
            where,
            attributes: [
                'id',
                'name',
                [sequelize.fn('avg', sequelize.col(`topics.questions.grades.${StudentGrade.rawAttributes.numAttempts.field}`)), 'averageAttemptedCount'],
                [sequelize.fn('avg', sequelize.col(`topics.questions.grades.${StudentGrade.rawAttributes.bestScore.field}`)), 'averageScore'],
                [sequelize.fn('count', sequelize.col(`topics.questions.grades.${StudentGrade.rawAttributes.id.field}`)), 'totalGrades'],
                [sequelize.literal(`count(CASE WHEN "topics->questions->grades".${StudentGrade.rawAttributes.bestScore.field} >= 1 THEN "topics->questions->grades".${StudentGrade.rawAttributes.id.field} END)`), 'completedCount'],
                [sequelize.literal(`CASE WHEN COUNT("topics->questions->grades".${StudentGrade.rawAttributes.id.field}) > 0 THEN count(CASE WHEN "topics->questions->grades".${StudentGrade.rawAttributes.bestScore.field} >= 1 THEN "topics->questions->grades".${StudentGrade.rawAttributes.id.field} END)::FLOAT / count("topics->questions->grades".${StudentGrade.rawAttributes.id.field}) ELSE NULL END`), 'completionPercent'],
            ],
            include: [{
                model: CourseTopicContent,
                as: 'topics',
                attributes: [],
                include: [{
                    model: CourseWWTopicQuestion,
                    as: 'questions',
                    attributes: [],
                    include: [{
                        model: StudentGrade,
                        as: 'grades',
                        attributes: []
                    }]
                }]
            }],
            group: [`${CourseUnitContent.name}.${CourseUnitContent.rawAttributes.id.field}`, `${CourseUnitContent.name}.${CourseUnitContent.rawAttributes.id.field}`]
        });
    }

    getStatisticsOnTopics(options: GetStatisticsOnTopicsOptions): Promise<CourseTopicContent[]> {
        const {
            courseUnitContentId,
            courseId,
            userId,
        } = options.where;

        // Using strict with typescript results in WhereOptions failing when set to a partial object, casting it as WhereOptions since it works
        const where: sequelize.WhereOptions = _({
            courseUnitContentId,
            [`$unit.${CourseUnitContent.rawAttributes.courseId.field}$`]: courseId,
            [`$questions.grades.${StudentGrade.rawAttributes.userId.field}$`]: userId,
        }).omitBy(_.isNil).value() as sequelize.WhereOptions;

        const include: sequelize.IncludeOptions[] = [{
            model: CourseWWTopicQuestion,
            as: 'questions',
            attributes: [],
            include: [{
                model: StudentGrade,
                as: 'grades',
                attributes: []
            }]
        }];

        if (!_.isNil(courseId)) {
            include.push({
                model: CourseUnitContent,
                as: 'unit',
                attributes: []
            });
        }


        return CourseTopicContent.findAll({
            where,
            attributes: [
                'id',
                'name',
                [sequelize.fn('avg', sequelize.col(`questions.grades.${StudentGrade.rawAttributes.numAttempts.field}`)), 'averageAttemptedCount'],
                [sequelize.fn('avg', sequelize.col(`questions.grades.${StudentGrade.rawAttributes.bestScore.field}`)), 'averageScore'],
                [sequelize.fn('count', sequelize.col(`questions.grades.${StudentGrade.rawAttributes.id.field}`)), 'totalGrades'],
                [sequelize.literal(`count(CASE WHEN "questions->grades".${StudentGrade.rawAttributes.bestScore.field} >= 1 THEN "questions->grades".${StudentGrade.rawAttributes.id.field} END)`), 'completedCount'],
                [sequelize.literal(`CASE WHEN COUNT("questions->grades".${StudentGrade.rawAttributes.id.field}) > 0 THEN count(CASE WHEN "questions->grades".${StudentGrade.rawAttributes.bestScore.field} >= 1 THEN "questions->grades".${StudentGrade.rawAttributes.id.field} END)::FLOAT / count("questions->grades".${StudentGrade.rawAttributes.id.field}) ELSE NULL END`), 'completionPercent'],
            ],
            include,
            group: [`${CourseTopicContent.name}.${CourseTopicContent.rawAttributes.id.field}`, `${CourseTopicContent.name}.${CourseTopicContent.rawAttributes.name.field}`]
        });
    }

    getStatisticsOnQuestions(options: GetStatisticsOnQuestionsOptions): Promise<CourseWWTopicQuestion[]> {
        const {
            courseTopicContentId,
            courseId,
            userId,
        } = options.where;

        // Using strict with typescript results in WhereOptions failing when set to a partial object, casting it as WhereOptions since it works
        const where: sequelize.WhereOptions = _({
            courseTopicContentId,
            [`$topic.unit.${CourseUnitContent.rawAttributes.courseId.field}$`]: courseId,
            [`$grades.${StudentGrade.rawAttributes.userId.field}$`]: userId,
        }).omitBy(_.isNil).value() as sequelize.WhereOptions;

        const include: sequelize.IncludeOptions[] = [{
            model: StudentGrade,
            as: 'grades',
            attributes: []
        }];

        if (!_.isNil(courseId)) {
            include.push({
                model: CourseTopicContent,
                as: 'topic',
                attributes: [],
                include: [{
                    model: CourseUnitContent,
                    as: 'unit',
                    attributes: []
                }]
            });
        }

        return CourseWWTopicQuestion.findAll({
            where,
            attributes: [
                'id',
                [sequelize.literal(`'Problem ' || "${CourseWWTopicQuestion.name}".${CourseWWTopicQuestion.rawAttributes.problemNumber.field}`), 'name'],
                [sequelize.fn('avg', sequelize.col(`grades.${StudentGrade.rawAttributes.numAttempts.field}`)), 'averageAttemptedCount'],
                [sequelize.fn('avg', sequelize.col(`grades.${StudentGrade.rawAttributes.bestScore.field}`)), 'averageScore'],
                [sequelize.fn('count', sequelize.col(`grades.${StudentGrade.rawAttributes.id.field}`)), 'totalGrades'],
                [sequelize.literal(`count(CASE WHEN "grades".${StudentGrade.rawAttributes.bestScore.field} >= 1 THEN "grades".${StudentGrade.rawAttributes.id.field} END)`), 'completedCount'],
                [sequelize.literal(`CASE WHEN COUNT("grades".${StudentGrade.rawAttributes.id.field}) > 0 THEN count(CASE WHEN "grades".${StudentGrade.rawAttributes.bestScore.field} >= 1 THEN "grades".${StudentGrade.rawAttributes.id.field} END)::FLOAT / count("grades".${StudentGrade.rawAttributes.id.field}) ELSE NULL END`), 'completionPercent'],
            ],
            include,
            group: [`${CourseWWTopicQuestion.name}.${CourseWWTopicQuestion.rawAttributes.id.field}`]
        });
    }

    async getQuestions(options: GetQuestionsOptions): Promise<CourseWWTopicQuestion[]> {
        const {
            courseTopicContentId,
            userId
        } = options;

        try {
            const include: sequelize.IncludeOptions[] = [];
            if (!_.isNil(userId)) {
                include.push({
                    model: StudentGrade,
                    as: 'grades',
                    required: false,
                    where: {
                        userId: userId
                    }
                });
            }

            // Using strict with typescript results in WhereOptions failing when set to a partial object, casting it as WhereOptions since it works
            const where: sequelize.WhereOptions = _({
                courseTopicContentId
            }).omitBy(_.isUndefined).value() as sequelize.WhereOptions;

            const findOptions: sequelize.FindOptions = {
                include,
                where,
                order: [
                    ['problemNumber', 'ASC'],
                ]
            };
            return await CourseWWTopicQuestion.findAll(findOptions);
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
    }

    async createGradesForQuestion(options: CreateGradesForQuestionOptions): Promise<number> {
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
    }

    generateRandomSeed(): number {
        return Math.floor(Math.random() * 999999);
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
}

export const courseController = new CourseController();
export default courseController;
