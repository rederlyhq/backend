import * as _ from 'lodash';
import WrappedError from '../../exceptions/wrapped-error';
import { Constants } from '../../constants';
import { UpdateQuestionOptions, UpdateQuestionsOptions, GetQuestionRepositoryOptions } from './course-types';
import CourseWWTopicQuestion from '../../database/models/course-ww-topic-question';
import NotFoundError from '../../exceptions/not-found-error';
import AlreadyExistsError from '../../exceptions/already-exists-error';
import { BaseError } from 'sequelize';
import { UpdateResult } from '../../generic-interfaces/sequelize-generic-interfaces';

class CourseRepository {
    async getQuestion(options: GetQuestionRepositoryOptions): Promise<CourseWWTopicQuestion> {
        const result = await CourseWWTopicQuestion.findOne({
            where: {
                id: options.id
            },
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
                where: options.where,
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
                where: options.where,
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
        try {
            return await CourseWWTopicQuestion.create(question);
        } catch (e) {
            this.checkQuestionError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }
}

const courseRepository = new CourseRepository();
export default courseRepository;
