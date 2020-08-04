import Bluebird = require('bluebird');
import Curriculum from '../../database/models/curriculum';
import UniversityCurriculumPermission from '../../database/models/university-curriculum-permission';
import CurriculumUnitContent from '../../database/models/curriculum-unit-content';
import CurriculumTopicContent from '../../database/models/curriculum-topic-content';
import CurriculumWWTopicQuestion from '../../database/models/curriculum-ww-topic-question';
import { UniqueConstraintError } from 'sequelize';
import AlreadyExistsError from '../../exceptions/already-exists-error';
import WrappedError from '../../exceptions/wrapped-error';
import { ForeignKeyConstraintError } from 'sequelize';
import NotFoundError from '../../exceptions/not-found-error';
import { UpdateTopicOptions, UpdateUnitOptions } from './curriculum-types';

class CurriculumController {
    getCurriculumById(id: number): Bluebird<Curriculum> {
        return Curriculum.findOne({
            where: {
                id
            },
            include: [{
                model: CurriculumUnitContent,
                as: 'units',
                include: [{
                    model: CurriculumTopicContent,
                    as: 'topics',
                    include: [{
                        model: CurriculumWWTopicQuestion,
                        as: 'questions'
                    }]
                }]
            }],
            order: [
                ['units', 'contentOrder', 'ASC'],
                ['units', 'topics', 'contentOrder', 'ASC'],
                ['units', 'topics', 'questions', 'problemNumber', 'ASC'],
            ]
        })
    }

    getCurriculums(): Bluebird<Curriculum[]> {
        return Curriculum.findAll();
    }

    async createCurriculum(curriculumObject: Partial<Curriculum>): Promise<Curriculum> {
        try {
            return await Curriculum.create(curriculumObject);
        } catch (e) {
            if (e instanceof UniqueConstraintError) {
                // The sequelize type as original as error but the error comes back with this additional field
                // To workaround the typescript error we must declare any
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const violatedConstraint = (e.original as any).constraint
                if (violatedConstraint === Curriculum.constraints.uniqueNamePerUniversity) {
                    throw new AlreadyExistsError('A curriculum with this name already exists for this university');
                }
            }
            throw new WrappedError("Unknown error occurred", e);
        }
    }

    createUniversityCurriculumPermission(universityCurriculumPermission: Partial<UniversityCurriculumPermission>): Promise<UniversityCurriculumPermission> {
        return UniversityCurriculumPermission.create(universityCurriculumPermission);
    }

    async createUnit(unit: Partial<CurriculumUnitContent>): Promise<CurriculumUnitContent> {
        try {
            return await CurriculumUnitContent.create(unit);
        } catch (e) {
            if (e instanceof UniqueConstraintError) {
                // The sequelize type as original as error but the error comes back with this additional field
                // To workaround the typescript error we must declare any
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const violatedConstraint = (e.original as any).constraint
                if (violatedConstraint === CurriculumUnitContent.constraints.uniqueNamePerCurriculum) {
                    throw new AlreadyExistsError('A unit with this name already exists for this curriculum');
                } else if (violatedConstraint === CurriculumUnitContent.constraints.uniqueOrderPerCurriculum) {
                    throw new AlreadyExistsError('A unit with this order already exists for this curriculum');
                }
            } else if (e instanceof ForeignKeyConstraintError) {
                // The sequelize type as original as error but the error comes back with this additional field
                // To workaround the typescript error we must declare any
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const violatedConstraint = (e.original as any).constraint
                if (violatedConstraint === CurriculumUnitContent.constraints.foreignKeyCurriculum) {
                    throw new NotFoundError('Could not create the unit because the given curriculum does not exist');
                }
            }
            throw new WrappedError("Unknown error occurred", e);
        }
    }

    async createTopic(topic: Partial<CurriculumTopicContent>): Promise<CurriculumTopicContent> {
        try {
            return await CurriculumTopicContent.create(topic);
        } catch (e) {
            if (e instanceof UniqueConstraintError) {
                // The sequelize type as original as error but the error comes back with this additional field
                // To workaround the typescript error we must declare any
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const violatedConstraint = (e.original as any).constraint
                if (violatedConstraint === CurriculumTopicContent.constraints.uniqueNamePerUnit) {
                    throw new AlreadyExistsError('A topic with this name already exists for this unit');
                } else if (violatedConstraint === CurriculumTopicContent.constraints.uniqueOrderPerUnit) {
                    throw new AlreadyExistsError('A topic with this order already exists for this unit');
                }
            } else if (e instanceof ForeignKeyConstraintError) {
                // The sequelize type as original as error but the error comes back with this additional field
                // To workaround the typescript error we must declare any
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const violatedConstraint = (e.original as any).constraint
                if (violatedConstraint === CurriculumTopicContent.constraints.foreignKeyUnit) {
                    throw new NotFoundError('Could not create the topic because the given unit does not exist');
                }
            }
            throw new WrappedError("Unknown error occurred", e);
        }
    }

    async createQuestion(question: Partial<CurriculumWWTopicQuestion>): Promise<CurriculumWWTopicQuestion> {
        try {
            return await CurriculumWWTopicQuestion.create(question);
        } catch (e) {
            if (e instanceof UniqueConstraintError) {
                // The sequelize type as original as error but the error comes back with this additional field
                // To workaround the typescript error we must declare any
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const violatedConstraint = (e.original as any).constraint
                if (violatedConstraint === CurriculumWWTopicQuestion.constraints.uniqueOrderPerTopic) {
                    throw new AlreadyExistsError('A question already exists at this order for this topic');
                }
            } else if (e instanceof ForeignKeyConstraintError) {
                // The sequelize type as original as error but the error comes back with this additional field
                // To workaround the typescript error we must declare any
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const violatedConstraint = (e.original as any).constraint
                if (violatedConstraint === CurriculumWWTopicQuestion.constraints.foreignKeyTopic) {
                    throw new AlreadyExistsError('Could not create the question because the given topic does not exist');
                }
            }
            throw new WrappedError("Unknown error occurred", e);
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
            if (e instanceof UniqueConstraintError) {
                // The sequelize type as original as error but the error comes back with this additional field
                // To workaround the typescript error we must declare any
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const violatedConstraint = (e.original as any).constraint
                if (violatedConstraint === CurriculumTopicContent.constraints.uniqueNamePerUnit) {
                    throw new AlreadyExistsError('A topic with this name already exists for this unit');
                } else if (violatedConstraint === CurriculumTopicContent.constraints.uniqueOrderPerUnit) {
                    throw new AlreadyExistsError('A topic with this order already exists for this unit');
                }
            }
            throw new WrappedError("Unknown error occurred", e);
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
            if (e instanceof UniqueConstraintError) {
                // The sequelize type as original as error but the error comes back with this additional field
                // To workaround the typescript error we must declare any
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const violatedConstraint = (e.original as any).constraint
                if (violatedConstraint === CurriculumUnitContent.constraints.uniqueNamePerCurriculum) {
                    throw new AlreadyExistsError('A unit with this name already exists for this curriculum');
                } else if (violatedConstraint === CurriculumUnitContent.constraints.uniqueOrderPerCurriculum) {
                    throw new AlreadyExistsError('A unit with this order already exists for this curriculum');
                }
            }
            throw new WrappedError("Unknown error occurred", e);
        }
    }
}

export const curriculumController = new CurriculumController();
export default curriculumController;
