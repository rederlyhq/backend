import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize';
import CourseWWTopicQuestion from './course-ww-topic-question';
import User from './user';
import StudentGrade from './student-grade';
import StudentGradeInstance from './student-grade-instance';

export interface StudentWorkbookInterface {
    id: number;
    active: boolean;
    studentGradeId: number;
    userId: number;
    courseWWTopicQuestionId: number;
    studentGradeInstanceId?: number;
    randomSeed: number;
    problemPath: string;

    // This is a jsonb field so it could be any (from db)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    submitted: any;
    result: number;
    time: Date;
    wasLate: boolean;
    wasExpired: boolean;
    wasAfterAttemptLimit: boolean;
    wasLocked: boolean;
    wasAutoSubmitted: boolean;

    createdAt: Date;
    updatedAt: Date;

    // This is a Quill Delta object, which we don't need to manipulate here.
    feedback: unknown;

    credited: boolean;
}

export default class StudentWorkbook extends Model implements StudentWorkbookInterface {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public active!: boolean;
    public studentGradeId!: number;
    public userId!: number;
    public courseWWTopicQuestionId!: number;
    public studentGradeInstanceId?: number;
    public randomSeed!: number;
    public problemPath!: string;
    // This is a jsonb field so it could be any (from db)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public submitted!: any;
    public result!: number
    public time!: Date;
    public wasLate!: boolean;
    public wasExpired!: boolean;
    public wasAfterAttemptLimit!: boolean;
    public wasLocked!: boolean;
    public wasAutoSubmitted!: boolean;
    
    // This is a Quill Delta object, which we don't need to manipulate here.
    public feedback!: unknown;
    public credited!: boolean;

    public getStudentGrade!: BelongsToGetAssociationMixin<StudentGrade>;
    public getUser!: BelongsToGetAssociationMixin<User>;
    public getCourseWWTopicQuestion!: BelongsToGetAssociationMixin<CourseWWTopicQuestion>;
    public getStudentGradeInstance!: BelongsToGetAssociationMixin<StudentGradeInstance>;

    public studentGrade!: StudentGrade;
    public user!: User;
    public courseWWTopicQuestion!: CourseWWTopicQuestion;
    public studentGradeInstance?: StudentGradeInstance;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

StudentWorkbook.init({
    id: {
        field: 'student_workbook_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    active: {
        field: 'student_workbook_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    studentGradeId: {
        field: 'student_grade_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    userId: {
        field: 'user_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    courseWWTopicQuestionId: {
        field: 'course_topic_question_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    studentGradeInstanceId: {
        field: 'student_grade_instance_id',
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
    },
    problemPath: {
        field: 'student_workbook_problem_path',
        type: DataTypes.TEXT,
        allowNull: false,
    },
    randomSeed: {
        field: 'student_workbook_random_seed',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    submitted: {
        field: 'student_workbook_submitted',
        type: DataTypes.JSONB,
        allowNull: false,
    },
    result: {
        field: 'student_workbook_result',
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    time: {
        field: 'student_workbook_time',
        type: DataTypes.DATE,
        allowNull: false,
    },
    wasLate: {
        field: 'student_workbook_was_late',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    wasExpired: {
        field: 'student_workbook_was_expired',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    wasAfterAttemptLimit: {
        field: 'student_workbook_was_after_attempt_limit',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    wasAutoSubmitted: {
        field: 'student_workbook_was_auto_submitted',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    wasLocked: {
        field: 'student_workbook_was_locked',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    feedback: {
        field: 'student_workbook_feedback',
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null,
    },
    credited: {
        field: 'student_workbook_credited',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

StudentWorkbook.belongsTo(StudentGradeInstance, {
    foreignKey: 'studentGradeInstanceId',
    targetKey: 'id',
    as: 'studentGradeInstance'
});
