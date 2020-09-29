import { Model, DataTypes, BelongsToGetAssociationMixin, HasManyGetAssociationsMixin } from 'sequelize';
import appSequelize from '../app-sequelize';

export default class StudentGradeInstance extends Model {
  public id!: number; // Note that the `null assertion` `!` is required in strict mode.
  public active!: boolean;
  public userId!: number;
  public studentGradeId!: number;
  public courseWWTopicQuestionId!: number;
  public randomSeed!: number;
  public bestScore!: number;
  public numAttempts!: number;
  public numLegalAttempts!: number;
  public numExtendedAttempts!: number;
  public firstAttempts!: number;
  public latestAttempts!: number;
  public overallBestScore!: number;
  public effectiveScore!: number;
  public partialCreditBestScore!: number;
  public legalScore!: number;
  public locked!: boolean;
  // This is a jsonb field so it could be any (from db)
  // Submitted in workbook used any so I'm going to keep it consistent here
  // If this is used for form data we will never know any info about what keys are available
  // Might make sense to make this an unknown type since I don't think we will ever access the types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public currentProblemState!: any;

  public lastInfluencingLegalAttemptId!: number;
  public lastInfluencingCreditedAttemptId!: number;
  public lastInfluencingAttemptId!: number;

  public getUser!: BelongsToGetAssociationMixin<User>;
  public getQuestion!: BelongsToGetAssociationMixin<CourseWWTopicQuestion>;
  public getGrade!: BelongsToGetAssociationMixin<StudentGrade>;
  public getWorkbooks!: HasManyGetAssociationsMixin<StudentWorkbook>;

  public user!: User;
  public studentGrade!: StudentGrade;
  public courseWWTopicQuestion!: CourseWWTopicQuestion;
  public workbooks?: Array<StudentWorkbook>;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static createAssociations(): void {
    // This is a hack to add the associations later to avoid cyclic dependencies
    /* eslint-disable @typescript-eslint/no-use-before-define */
    // // Here we associate which actually populates out pre-declared `association` static and other methods.
    // User.hasMany(Session, {
    //   sourceKey: 'id',
    //   foreignKey: 'user_id',
    //   as: 'user' // this determines the name in `associations`!
    // });

    StudentGradeInstance.belongsTo(User, {
      foreignKey: 'userId',
      targetKey: 'id',
      as: 'user'
    });

    StudentGradeInstance.belongsTo(CourseWWTopicQuestion, {
      foreignKey: 'courseWWTopicQuestionId',
      targetKey: 'id',
      as: 'question'
    });

    StudentGradeInstance.belongsTo(StudentGrade, {
      foreignKey: 'studentGradeId',
      targetKey: 'id',
      as: 'grade'
    });

    StudentGradeInstance.hasMany(StudentWorkbook, {
      foreignKey: 'studentGradeId',
      sourceKey: 'id',
      as: 'workbooks'
    });

    StudentGradeInstance.belongsTo(StudentWorkbook, {
      foreignKey: 'lastInfluencingLegalAttemptId',
      targetKey: 'id',
      as: 'lastInfluencingLegalAttempt',
      constraints: false
    });

    StudentGradeInstance.belongsTo(StudentWorkbook, {
      foreignKey: 'lastInfluencingCreditedAttemptId',
      targetKey: 'id',
      as: 'lastInfluencingCreditedAttempt',
      constraints: false
    });

    StudentGradeInstance.belongsTo(StudentWorkbook, {
      foreignKey: 'lastInfluencingAttemptId',
      targetKey: 'id',
      as: 'lastInfluencingAttempt',
      constraints: false
    });
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
  active: {
    field: 'student_grade_instance_active',
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
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
  studentGradeId: {
    field: 'student_grade_id',
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  lastInfluencingLegalAttemptId: {
    field: 'last_influencing_legal_attempt_workbook_id',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  lastInfluencingCreditedAttemptId: {
    field: 'last_influencing_credited_attempt_workbook_id',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  lastInfluencingAttemptId: {
    field: 'last_influencing_attempt_workbook_id',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  randomSeed: {
    field: 'student_grade_random_seed',
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 666
  },
  bestScore: {
    field: 'student_grade_best_score',
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  overallBestScore: {
    field: 'student_grade_overall_best_score',
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  numAttempts: {
    field: 'student_grade_num_attempts',
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  numLegalAttempts: {
    field: 'student_grade_num_legal_attempts',
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  numExtendedAttempts: {
    field: 'student_grade_num_extended_attempts',
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  firstAttempts: {
    field: 'student_grade_first_attempt',
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  latestAttempts: {
    field: 'student_grade_latest_attempt',
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  effectiveScore: {
    field: 'student_grade_effective_score',
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  partialCreditBestScore: {
    field: 'student_grade_partial_best_score',
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  legalScore: {
    field: 'student_grade_legal_score',
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  locked: {
    field: 'student_grade_locked',
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  currentProblemState: {
    field: 'student_grade_current_problem_state',
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'student_grade_instance',
  sequelize: appSequelize, // this bit is important
  indexes: [{
    name: 'student_grade_instance--student_grade_id-course_topic_question_id-user_id',
    unique: true,
    fields: [
      'student_grade_id',
      'course_topic_question_id',
      'user_id'
    ]
  }]
});

import CourseWWTopicQuestion from './course-ww-topic-question';
import User from './user';
import StudentWorkbook from './student-workbook';
import StudentGrade from './student-grade';
