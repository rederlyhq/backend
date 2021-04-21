import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';

interface WorkbookFeedbackProblemAttachmentInterface {
    id: number;
    workbookId: number;
    problemAttachmentId: number;
    createdAt: Date;
    updatedAt: Date;
    active: boolean;
}

export default class WorkbookFeedbackProblemAttachment extends Model implements WorkbookFeedbackProblemAttachmentInterface {
    public id!: number;
    public workbookId!: number;
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
        WorkbookFeedbackProblemAttachment.belongsTo(ProblemAttachment, {
            foreignKey: 'problemAttachmentId',
            targetKey: 'id',
            as: 'problemAttachment'
        });
        WorkbookFeedbackProblemAttachment.belongsTo(StudentWorkbook, {
            foreignKey: 'workbookId',
            targetKey: 'id',
            as: 'workbook'
        });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

WorkbookFeedbackProblemAttachment.init({
    id: {
        field: 'id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    workbookId: {
        field: 'workbook_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    problemAttachmentId: {
        field: 'problem_attachment_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    active: {
        field: 'active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    updatedAt: {
        field: 'updated_at',
        type: DataTypes.DATE,
        allowNull: false,
    },
    createdAt: {
        field: 'created_at',
        type: DataTypes.DATE,
        allowNull: false,
    },
}, {
    tableName: 'workbook_feedback_problem_attachment',
    sequelize: appSequelize, // this bit is important
});

import ProblemAttachment from './problem-attachment';
import StudentWorkbook from './student-workbook';

// -------------------------------------------
