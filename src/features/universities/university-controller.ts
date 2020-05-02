import University from "../../database/models/university";
import Bluebird = require("bluebird");
const Sequelize = require('sequelize');

interface getUniversitiesAssociatedWithEmail {
    emailDomain:string
}

class UniversityController {
    constructor() {

    }

    getUniversitiesAssociatedWithEmail(options: getUniversitiesAssociatedWithEmail): Bluebird<University[]> {
        const {
            emailDomain
        } = options;

        return University.findAll({
            where: Sequelize.or(
                {
                    prof_email_domain: emailDomain
                },
                {
                    student_email_domain: emailDomain
                },
            )
        })
    }
}

const universityController = new UniversityController();
export default universityController;