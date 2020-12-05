import CurriculumUnitContent from '../../database/models/curriculum-unit-content';
import CurriculumTopicContent from '../../database/models/curriculum-topic-content';
import CurriculumWWTopicQuestion from '../../database/models/curriculum-ww-topic-question';
import Curriculum from '../../database/models/curriculum';

class CurriculumRepository {
    // TODO: [SECURITY] Check user's university allows them access to this curriculum.
    getCurriculumById(id: number): Promise<Curriculum> {
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
        });
    }
}

const curriculumRepository = new CurriculumRepository();
export default curriculumRepository;
