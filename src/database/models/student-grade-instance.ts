import { Model, DataTypes, BelongsToGetAssociationMixin, HasManyGetAssociationsMixin } from 'sequelize';
import appSequelize from '../app-sequelize';

export default class StudentGradeInstance extends Model {
  public id!: number; // Note that the `null assertion` `!` is required in strict mode.
  public active!: boolean;
  public userId!: number;
  public studentGradeId!: number;
  public courseWWTopicQuestionId!: number;
  public studentTopicAssessmentInfoId!: number;
  public webworkQuestionPath!: string;
  public randomSeed!: number;
  public bestIndividualScore!: number;
  public bestVersionScore!: number;
  public effectiveScore!: number;
  public numAttempts!: number;
  public overallBestScore!: number;
  public locked!: boolean; // drop?
  // This is a jsonb field so it could be any (from db)
  // Submitted in workbook used any so I'm going to keep it consistent here
  // If this is used for form data we will never know any info about what keys are available
  // Might make sense to make this an unknown type since I don't think we will ever access the types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public currentProblemState!: any;

  public bestIndividualAttemptId!: number;
  public bestVersionAttemptId!: number;

  public getUser!: BelongsToGetAssociationMixin<User>;
  public getQuestion!: BelongsToGetAssociationMixin<CourseWWTopicQuestion>;
  public getGrade!: BelongsToGetAssociationMixin<StudentGrade>;
  public getWorkbooks!: HasManyGetAssociationsMixin<StudentWorkbook>;
  public getStudentAssessmentInfo!: BelongsToGetAssociationMixin<StudentTopicAssessmentInfo>;

  public user!: User;
  public studentGrade!: StudentGrade;
  public courseWWTopicQuestion!: CourseWWTopicQuestion;
  public workbooks?: Array<StudentWorkbook>;
  public StudentTopicAssessmentInfo!: StudentTopicAssessmentInfo;

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

    StudentGradeInstance.belongsTo(StudentTopicAssessmentInfo, {
      foreignKey: 'studentTopicAssessmentInfoId',
      targetKey: 'id',
      as: 'info'
    });

    StudentGradeInstance.hasMany(StudentWorkbook, {
      foreignKey: 'studentGradeId',
      sourceKey: 'id',
      as: 'workbooks'
    });

    StudentGradeInstance.belongsTo(StudentWorkbook, {
      foreignKey: 'bestIndividualAttemptId',
      targetKey: 'id',
      as: 'bestIndividualAttempt',
      constraints: false
    });

    StudentGradeInstance.belongsTo(StudentWorkbook, {
      foreignKey: 'bestVersionAttemptId',
      targetKey: 'id',
      as: 'bestVersionAttempt',
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
  studentTopicAssessmentInfoId: {
    field: 'student_topic_assessment_info_id',
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  webworkQuestionPath: {
    field: 'course_topic_question_webwork_question_ww_path',
    type: DataTypes.TEXT,
    allowNull: false,
  },
  studentGradeId: {
    field: 'student_grade_id',
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  bestIndividualAttemptId: {
    field: 'best_individual_attempt_id',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  bestVersionAttemptId: {
    field: 'best_version_attempt_id',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  randomSeed: {
    field: 'student_grade_random_seed',
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 666
  },
  bestIndividualScore: {
    field: 'student_grade_best_score',
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  bestVersionScore: {
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
  effectiveScore: {
    field: 'student_grade_effective_score',
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
import StudentTopicAssessmentInfo from './student-topic-assessment-info';
