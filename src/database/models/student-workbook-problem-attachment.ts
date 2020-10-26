import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';

interface StudentWorkbookProblemAttachmentInterface {
    id: number;
    studentWorkbookId: number;
    problemAttachmentId: number;
    createdAt: Date;
    updatedAt: Date;
    active: boolean;
}

export default class StudentWorkbookProblemAttachment extends Model implements StudentWorkbookProblemAttachmentInterface {
    public id!: number;
    public studentWorkbookId!: number;
    public problemAttachmentId!: number;
    public active!: boolean;
    
    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static constraints = {
    }

    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        StudentWorkbookProblemAttachment.belongsTo(ProblemAttachment, {
            foreignKey: 'problemAttachmentId',
            targetKey: 'id',
            as: 'problemAttachment'
        });
        StudentWorkbookProblemAttachment.belongsTo(StudentWorkbook, {
            foreignKey: 'studentWorkbookId',
            targetKey: 'id',
            as: 'workbook'
        });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

StudentWorkbookProblemAttachment.init({
    id: {
        field: 'student_workbook_problem_attachment_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    studentWorkbookId: {
        field: 'student_workbook_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    problemAttachmentId: {
        field: 'problem_attachment_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    active: {
        field: 'student_workbook_problem_attachment_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
}, {
    tableName: 'student_workbook_problem_attachment',
    sequelize: appSequelize, // this bit is important
});

import ProblemAttachment from './problem-attachment';
import StudentWorkbook from './student-workbook';
