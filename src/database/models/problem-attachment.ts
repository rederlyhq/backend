import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';

interface ProblemAttachmentInterface {
    id: number;
    cloudFilename: string;
    userLocalFilename: string;
    createdAt: Date;
    updatedAt: Date;
    active: boolean;
}

export default class ProblemAttachment extends Model implements ProblemAttachmentInterface {
    public id!: number;
    public cloudFilename!: string;
    public userLocalFilename!: string;
    public active!: boolean;
    
    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static constraints = {
    }

    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        ProblemAttachment.hasMany(StudentGradeProblemAttachment, {
            as: 'studentGradeProblemAttachments',
            foreignKey: 'problemAttachmentId',
            sourceKey: 'id'
        });

        ProblemAttachment.hasMany(StudentGradeInstanceProblemAttachment, {
            as: 'studentGradeInstanceProblemAttachments',
            foreignKey: 'problemAttachmentId',
            sourceKey: 'id'
        });

        ProblemAttachment.hasMany(StudentWorkbookProblemAttachment, {
            as: 'studentWorkbookProblemAttachments',
            foreignKey: 'problemAttachmentId',
            sourceKey: 'id'
        });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

ProblemAttachment.init({
    id: {
        field: 'problem_attachment_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    cloudFilename: {
        field: 'problem_attachment_cloud_filename',
        type: DataTypes.TEXT,
        allowNull: false
    },
    userLocalFilename: {
        field: 'problem_attachment_user_local_filename',
        type: DataTypes.TEXT,
        allowNull: false
    },
    active: {
        field: 'problem_attachment_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
}, {
    tableName: 'problem_attachment',
    sequelize: appSequelize, // this bit is important
});

import StudentGradeInstanceProblemAttachment from './student-grade-instance-problem-attachment';
import StudentGradeProblemAttachment from './student-grade-problem-attachment';
import StudentWorkbookProblemAttachment from './student-workbook-problem-attachment';
