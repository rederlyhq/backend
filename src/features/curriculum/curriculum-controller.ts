import Bluebird = require('bluebird');
import Curriculum from '../../database/models/curriculum';
import UniversityCurriculumPermission from '../../database/models/university-curriculum-permission';
import CurriculumUnitContent from '../../database/models/curriculum-unit-content';
import CurriculumTopicContent from '../../database/models/curriculum-topic-content';

class CurriculumController {
    getCurriculumById(id: number): Bluebird<Curriculum> {
        return Curriculum.findOne({
            where: {
                id
            }
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
}

export const curriculumController = new CurriculumController();
export default curriculumController;