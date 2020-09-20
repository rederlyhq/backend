import * as _ from "lodash";
import Bluebird = require('bluebird');
import Course from '../../database/models/course';
import StudentWorkbook from '../../database/models/student-workbook';
import StudentGrade from '../../database/models/student-grade';
import sequelize = require("sequelize");

// When changing to import it creates the following compiling error (on instantiation): This expression is not constructable.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Sequelize = require('sequelize');


class StudentWorkController {
 
    async UploadPath(options: any): Promise<any> {
        const studentGrade = await StudentWorkbook.findAll({
            order: [
                [sequelize.literal('updated_at'), 'desc']
         ],
            where: {
                userId: options.userId
            }
        });

        const workbook_id = 0

        const studentWorkbook = await StudentWorkbook.update({file_path: options.file_path},
            {
            where: {
                id: workbook_id
            }
        })
        return workbook_id
    }

    async getPath(options: any): Promise<any> {
        const studentWork = await StudentWorkbook.findAll({
            order: [
                [sequelize.literal('updated_at'), 'desc']
         ],
            where: {
                studentGradeId: options.problemId
            }
        });
        try {
            return 'path';
        }
        catch{
            return 'dne' }


    }
}

export const studentWorkController = new StudentWorkController();
export default studentWorkController;