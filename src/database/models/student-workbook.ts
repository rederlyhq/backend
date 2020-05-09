import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize'
import CourseWWTopicQuestion from './course-ww-topic-question';
import User from './user';
import StudentGrade from './student-grade';

export default class StudentWorkbook extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public studentGradeId!: number;
    public userId!: number;
    public courseWWTopicQuestionId!: number;
    public randomSeed!: number;
    public submitted!: any;
    public result!: number
    public time!: Date;

    public getStudentGrade!: BelongsToGetAssociationMixin<StudentGrade>;
    public getUser!: BelongsToGetAssociationMixin<User>;
    public getCourseWWTopicQuestion!: BelongsToGetAssociationMixin<CourseWWTopicQuestion>;

    public studentGrade!: StudentGrade;
    public user!: User;
    public courseWWTopicQuestion!: CourseWWTopicQuestion;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

StudentWorkbook.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    studentGradeId: {
        field: 'student_grade_id',
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    userId: {
        field: 'user_id',
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    courseWWTopicQuestionId: {
        field: 'course_ww_topic_question_id',
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    randomSeed: {
        field: 'random_seed',
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    submitted: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    result: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    time: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'student_workbook',
    sequelize: appSequelize, // this bit is important
});

StudentWorkbook.belongsTo(StudentGrade, {
    foreignKey: 'studentGradeId',
    targetKey: 'id',
    as: 'studentGrade'
});

StudentWorkbook.belongsTo(User, {
    foreignKey: 'userId',
    targetKey: 'id',
    as: 'user'
});

StudentWorkbook.belongsTo(CourseWWTopicQuestion, {
    foreignKey: 'courseWWTopicQuestionId',
    targetKey: 'id',
    as: 'courseWWTopicQuestion'
});