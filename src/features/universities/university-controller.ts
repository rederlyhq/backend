import University from "../../database/models/university";
import Bluebird = require("bluebird");
const Sequelize = require('sequelize');

interface GetUniversitiesAssociatedWithEmail {
    emailDomain: string;
}

class UniversityController {
    constructor() {

    }

    getUniversitiesAssociatedWithEmail(options: GetUniversitiesAssociatedWithEmail): Bluebird<University[]> {
        const {
            emailDomain
        } = options;

        return University.findAll({
            where: Sequelize.or(
                {
                    // Database field, disabling
                    // eslint-disable-next-line @typescript-eslint/camelcase
                    prof_email_domain: emailDomain
                },
                {
                    // Database field, disabling
                    // eslint-disable-next-line @typescript-eslint/camelcase
                    student_email_domain: emailDomain
                },
            )
        })
    }
}

const universityController = new UniversityController();
export default universityController;