import University from '../../database/models/university';
import Bluebird = require('bluebird');
import Sequelize = require('sequelize');

interface GetUniversitiesAssociatedWithEmail {
    emailDomain: string;
}

class UniversityController {
    getUniversitiesAssociatedWithEmail(options: GetUniversitiesAssociatedWithEmail): Bluebird<University[]> {
        const {
            emailDomain
        } = options;

        return University.findAll({
            where: Sequelize.or(
                {
                    profEmailDomain: emailDomain.toLowerCase()
                },
                {
                    studentEmailDomain: emailDomain.toLowerCase()
                },
            )
        });
    }
}

const universityController = new UniversityController();
export default universityController;
