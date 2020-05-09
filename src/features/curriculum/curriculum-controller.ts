import Bluebird = require('bluebird');
import Curriculum from '../../database/models/curriculum';


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

    createCurriculum(courseObject: Curriculum): Bluebird<Curriculum> {
        return Curriculum.create(courseObject);
    }
}

export const curriculumController = new CurriculumController();
export default curriculumController;