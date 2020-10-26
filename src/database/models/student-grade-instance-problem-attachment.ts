import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';

interface StudentGradeInstanceProblemAttachmentInterface {
    id: number;
    studentGradeInstanceId: number;
    problemAttachmentId: number;
    createdAt: Date;
    updatedAt: Date;
    active: boolean;
}

export default class StudentGradeInstanceProblemAttachment extends Model implements StudentGradeInstanceProblemAttachmentInterface {
    public id!: number;
    public studentGradeInstanceId!: number;
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
        StudentGradeInstanceProblemAttachment.belongsTo(ProblemAttachment, {
            foreignKey: 'problemAttachmentId',
            targetKey: 'id',
            as: 'problemAttachment'
        });
        StudentGradeInstanceProblemAttachment.belongsTo(StudentGradeInstance, {
            foreignKey: 'studentGradeInstanceId',
            targetKey: 'id',
            as: 'studentGrade'
        });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

StudentGradeInstanceProblemAttachment.init({
    id: {
        field: 'student_grade_instance_problem_attachment_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    studentGradeInstanceId: {
        field: 'student_grade_instance_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    problemAttachmentId: {
        field: 'problem_attachment_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    active: {
        field: 'student_grade_instance_problem_attachment_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
}, {
    tableName: 'student_grade_instance_problem_attachment',
    sequelize: appSequelize, // this bit is important
});

import ProblemAttachment from './problem-attachment';
import StudentGradeInstance from './student-grade-instance';
