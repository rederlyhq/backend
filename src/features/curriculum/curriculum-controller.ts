import Curriculum from '../../database/models/curriculum';
import UniversityCurriculumPermission from '../../database/models/university-curriculum-permission';
import CurriculumUnitContent from '../../database/models/curriculum-unit-content';
import CurriculumTopicContent from '../../database/models/curriculum-topic-content';
import CurriculumWWTopicQuestion from '../../database/models/curriculum-ww-topic-question';
import { BaseError } from 'sequelize';
import * as Sequelize from 'sequelize';
import AlreadyExistsError from '../../exceptions/already-exists-error';
import WrappedError from '../../exceptions/wrapped-error';
import NotFoundError from '../../exceptions/not-found-error';
import { UpdateTopicOptions, UpdateUnitOptions } from './curriculum-types';
import { Constants } from '../../constants';
import curriculumRepository from './curriculum-repository';
import University from '../../database/models/university';
import User from '../../database/models/user';
import _ = require('lodash');
import logger from '../../utilities/logger';


export enum ListCurriculumFilters {
    ALL = 'ALL',
    INSTITUTIONAL = 'INSTITUTIONAL',
    GLOBAL = 'GLOBAL'
}

class CurriculumController {
    getCurriculumById(id: number): Promise<Curriculum> {
        return curriculumRepository.getCurriculumById(id);
    }

    async getCurriculums({user, filterOptions}: {user: User; filterOptions: ListCurriculumFilters}): Promise<Curriculum[]> {
        const university = await user.getUniversity();

        let where: Sequelize.WhereAttributeHash = {};
        if (!_.isNil(filterOptions)) {
            switch(filterOptions) {
                case ListCurriculumFilters.INSTITUTIONAL:
                    where = {
                        id: university.id
                    };
                    break;
                case ListCurriculumFilters.GLOBAL:
                    where = {
                        id: 1
                    };
                    break;
                case ListCurriculumFilters.ALL:
                    where = {
                        [Sequelize.Op.or]: [
                            {
                                id: 1
                            },
                            {
                                id: university.id
                            }
                        ]
                    };
                    break;
                default:
                    logger.warn('No filters were passed for Curricula.');
                    break;
            }
        }

        return Curriculum.findAll(
            {
                where: {
                    active: true,
                },
                include: [
                    {
                        model: University,
                        as: 'university',
                        attributes: [],
                        where,
                    }
                ],
                order: [
                    ['name', 'DESC']
                ]
            }
        );
    }

    private checkCurriculumError(e: Error): void {
        if (e instanceof BaseError === false) {
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
        const databaseError = e as BaseError;
        switch (databaseError.originalAsSequelizeError?.constraint) {
            case Curriculum.constraints.uniqueNamePerUniversity:
                throw new AlreadyExistsError('A curriculum with this name already exists for this university');
            default:
                throw new WrappedError(Constants.ErrorMessage.UNKNOWN_DATABASE_ERROR_MESSAGE, e);
        }
    }

    async createCurriculum(curriculumObject: Partial<Curriculum>): Promise<Curriculum> {
        try {
            return await Curriculum.create(curriculumObject);
        } catch (e) {
            this.checkCurriculumError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE);
        }
    }

    createUniversityCurriculumPermission(universityCurriculumPermission: Partial<UniversityCurriculumPermission>): Promise<UniversityCurriculumPermission> {
        return UniversityCurriculumPermission.create(universityCurriculumPermission);
    }

    private checkUnitError(e: Error): void {
        if (e instanceof BaseError === false) {
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
        const databaseError = e as BaseError;
        switch (databaseError.originalAsSequelizeError?.constraint) {
            case CurriculumUnitContent.constraints.uniqueNamePerCurriculum:
                throw new AlreadyExistsError('A unit with this name already exists for this curriculum');
            case CurriculumUnitContent.constraints.uniqueOrderPerCurriculum:
                throw new AlreadyExistsError('A unit with this order already exists for this curriculum');
            case CurriculumUnitContent.constraints.foreignKeyCurriculum:
                throw new NotFoundError('Could not create the unit because the given curriculum does not exist');
            default:
                throw new WrappedError(Constants.ErrorMessage.UNKNOWN_DATABASE_ERROR_MESSAGE, e);
        }
    }

    async createUnit(unit: Partial<CurriculumUnitContent>): Promise<CurriculumUnitContent> {
        try {
            return await CurriculumUnitContent.create(unit);
        } catch (e) {
            this.checkUnitError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    private checkTopicError(e: Error): void {
        if (e instanceof BaseError === false) {
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
        const databaseError = e as BaseError;
        switch (databaseError.originalAsSequelizeError?.constraint) {
            case CurriculumTopicContent.constraints.uniqueNamePerUnit:
                throw new AlreadyExistsError('A topic with this name already exists for this unit');
            case CurriculumTopicContent.constraints.uniqueOrderPerUnit:
                throw new AlreadyExistsError('A topic with this order already exists for this unit');
            case CurriculumTopicContent.constraints.foreignKeyUnit:
                throw new NotFoundError('Could not create the topic because the given unit does not exist');
            default:
                throw new WrappedError(Constants.ErrorMessage.UNKNOWN_DATABASE_ERROR_MESSAGE, e);
        }
    }

    async createTopic(topic: Partial<CurriculumTopicContent>): Promise<CurriculumTopicContent> {
        try {
            return await CurriculumTopicContent.create(topic);
        } catch (e) {
            this.checkTopicError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    private checkQuestionError(e: Error): void {
        if (e instanceof BaseError === false) {
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
        const databaseError = e as BaseError;
        switch (databaseError.originalAsSequelizeError?.constraint) {
            case CurriculumWWTopicQuestion.constraints.uniqueOrderPerTopic:
                throw new AlreadyExistsError('A question already exists at this order for this topic');
            case CurriculumWWTopicQuestion.constraints.foreignKeyTopic:
                throw new AlreadyExistsError('Could not create the question because the given topic does not exist');
            default:
                throw new WrappedError(Constants.ErrorMessage.UNKNOWN_DATABASE_ERROR_MESSAGE, e);
        }
    }

    async createQuestion(question: Partial<CurriculumWWTopicQuestion>): Promise<CurriculumWWTopicQuestion> {
        try {
            return await CurriculumWWTopicQuestion.create(question);
        } catch (e) {
            this.checkQuestionError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    async updateTopic(options: UpdateTopicOptions): Promise<number> {
        try {
            const updates = await CurriculumTopicContent.update(options.updates, {
                where: options.where
            });
            // updates count
            return updates[0];
        } catch (e) {
            this.checkTopicError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    async updateUnit(options: UpdateUnitOptions): Promise<number> {
        try {
            const updates = await CurriculumUnitContent.update(options.updates, {
                where: options.where
            });
            // updates count
            return updates[0];
        } catch (e) {
            this.checkUnitError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }
}

export const curriculumController = new CurriculumController();
export default curriculumController;
