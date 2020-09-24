import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';
import CourseWWTopicQuestion from './course-ww-topic-question';

interface StudentTopicOverrideInterface {
    id: number;
    courseTopicQuestionId: number;
    userId: number;
    maxAttempts: number;
    active: boolean;
}

export default class StudentTopicOverride extends Model implements StudentTopicOverrideInterface {
    public id!: number;
    public courseTopicQuestionId!: number;
    public userId!: number;
    public maxAttempts!: number;
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
        StudentTopicOverride.belongsTo(CourseWWTopicQuestion, {
            foreignKey: 'courseTopicQuestionId',
            targetKey: 'id',
            as: 'studentGrade'
        });

        StudentTopicOverride.belongsTo(User, {
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

StudentTopicOverride.init({
    id: {
      field: 'student_topic_question_override_id',
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    courseTopicQuestionId: {
      field: 'course_topic_question_id',
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      field: 'user_id',
      type: DataTypes.INTEGER,
      allowNull: false
    },
    maxAttempts: {
      field: 'student_topic_question_override_max_attempts',
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: 0
    },
    active: {
      field: 'student_topic_question_override_active',
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
  }, {
    tableName: 'student_topic_question_override',
    sequelize: appSequelize, // this bit is important
});

import User from './user';
