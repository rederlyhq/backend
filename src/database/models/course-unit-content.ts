import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize'

export default class CourseUnitContent extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public courseId!: number;
    public name!: string;
    public active!: boolean;

    public getCourse!: BelongsToGetAssociationMixin<Course>;

    public readonly course!: Course;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        CourseUnitContent.belongsTo(Course, {
            foreignKey: 'courseId',
            targetKey: 'id',
            as: 'course'
        });

        CourseUnitContent.hasMany(CourseTopicContent, {
            foreignKey: 'courseUnitContentId',
            sourceKey: 'id',
            as: 'topics'
        });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

CourseUnitContent.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    courseId: {
        field: 'course_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
}, {
    tableName: 'course_unit_content',
    sequelize: appSequelize, // this bit is important
});

import Course from './course';import CourseTopicContent from './course-topic-content';

