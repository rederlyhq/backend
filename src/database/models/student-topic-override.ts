import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';
import CourseTopicContent from './course-topic-content';

interface StudentTopicOverrideInterface {
    id: number;
    courseTopicContentId: number;
    userId: number;
    startDate: Date | null;
    endDate: Date | null;
    deadDate: Date | null;
    active: boolean;
}

export default class StudentTopicOverride extends Model implements StudentTopicOverrideInterface {
    public id!: number;
    public courseTopicContentId!: number;
    public userId!: number;
    public startDate!: Date | null;
    public endDate!: Date | null;
    public deadDate!: Date | null;
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
        StudentTopicOverride.belongsTo(CourseTopicContent, {
            foreignKey: 'courseTopicContentId',
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
        field: 'student_topic_override_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    courseTopicContentId: {
        field: 'course_topic_content_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userId: {
        field: 'user_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    startDate: {
        field: 'student_topic_override_start_date',
        type: DataTypes.DATE,
        allowNull: true,
    },
    endDate: {
        field: 'student_topic_override_end_date',
        type: DataTypes.DATE,
        allowNull: true,
    },
    deadDate: {
        field: 'student_topic_override_dead_date',
        type: DataTypes.DATE,
        allowNull: true,
    },
    active: {
        field: 'student_topic_override_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
}, {
    tableName: 'student_topic_override',
    sequelize: appSequelize, // this bit is important
});

import User from './user';
