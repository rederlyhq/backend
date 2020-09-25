import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';

interface StudentGradeInstanceInterface {
    id: number;
    studentGradeId: number;
    userId: number;
    randomSeed: number;
    problemPath: string;
    bestScore: number;
    overallBestScore: number;
    // Grade instances shouldn't be overwritten
    // effectiveScore: number;
    // Doesn't have dead date
    // legalScore: number;
    // Don't need other num attempts fields because there is no doing so after the fact?
    numAttempts: number;
    // Don't need locked because it is very controlled
    // Don't need references to workbooks since there should be a relatively 1-1 relationship
    active: boolean;
}

export default class StudentGradeInstance extends Model implements StudentGradeInstanceInterface {
    public id!: number;
    public studentGradeId!: number;
    public userId!: number;
    public randomSeed!: number;
    public problemPath!: string;
    public bestScore!: number;
    public overallBestScore!: number;
    public numAttempts!: number;
    public active!: boolean;


    // public getCurriculumTopicContent!: BelongsToGetAssociationMixin<CurriculumTopicContent>;

    // public readonly curriculumTopicContent!: CurriculumTopicContent;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static constraints = {
    }

    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        StudentGradeInstance.belongsTo(StudentGrade, {
            foreignKey: 'studentGradeId',
            targetKey: 'id',
            as: 'studentGrade'
        });

        StudentGradeInstance.belongsTo(User, {
            foreignKey: 'userId',
            targetKey: 'id',
            as: 'user'
        });
        // CourseTopicContent.hasMany(CourseWWTopicQuestion, {
        //     foreignKey: 'courseTopicContentId',
        //     sourceKey: 'id',
        //     as: 'questions'
        // });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

StudentGradeInstance.init({
    id: {
        field: 'student_grade_instance_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    studentGradeId: {
        field: 'student_grade_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userId: {
        field: 'user_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    randomSeed: {
        field: 'student_grade_instance_random_seed',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    problemPath: {
        field: 'student_grade_instance_problem_path',
        type: DataTypes.TEXT,
        allowNull: false
    },
    bestScore: {
        field: 'student_grade_instance_best_score',
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    overallBestScore: {
        field: 'student_grade_isntance_overall_best_score',
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    numAttempts: {
        field: 'student_grade_isntance_num_attempts',
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    active: {
        field: 'student_grade_isntance_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
}, {
    tableName: 'student_grade_instance',
    sequelize: appSequelize, // this bit is important
});

import StudentGrade from './student-grade';
import User from './user';
