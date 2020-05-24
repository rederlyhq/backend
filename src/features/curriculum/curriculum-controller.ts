import Bluebird = require('bluebird');
import Curriculum from '../../database/models/curriculum';
import UniversityCurriculumPermission from '../../database/models/university-curriculum-permission';
import CurriculumUnitContent from '../../database/models/curriculum-unit-content';
import CurriculumTopicContent from '../../database/models/curriculum-topic-content';
import CurriculumWWTopicQuestion from '../../database/models/curriculum-ww-topic-question';

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
            }]
        })
    }

    getCurriculums(): Bluebird<Curriculum[]> {
        return Curriculum.findAll();
    }

    createCurriculum(courseObject: Curriculum): Promise<Curriculum> {
        return Curriculum.create(courseObject);
    }

    createUniversityCurriculumPermission(universityCurriculumPermission: UniversityCurriculumPermission): Promise<UniversityCurriculumPermission> {
        return UniversityCurriculumPermission.create(universityCurriculumPermission);
    }

    createUnit(unit: CurriculumUnitContent): Promise<CurriculumUnitContent> {
        return CurriculumUnitContent.create(unit);
    }

    createTopic(topic: CurriculumTopicContent): Promise<CurriculumTopicContent> {
        return CurriculumTopicContent.create(topic);
    }

    createQuestion(question: CurriculumWWTopicQuestion): Promise<CurriculumWWTopicQuestion> {
        return CurriculumWWTopicQuestion.create(question);
    }
}

export const curriculumController = new CurriculumController();
export default curriculumController;