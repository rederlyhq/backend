import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize'

export default class CourseUnitContent extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public courseId!: number;
    public name!: string;
    public active!: boolean;
    public contentOrder!: number;
    public curriculumUnitId!: number;

    public getCourse!: BelongsToGetAssociationMixin<Course>;

    public readonly course!: Course;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static constraints = {
        uniqueNamePerCourse: 'course_unit_content--name-course_id',
        unqiueOrderPerCourse: 'course_unit_content--course_id-order',

        foreignKeyCourse: 'course_unit_content_course_id_fkey'
    };

    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        CourseUnitContent.belongsTo(Course, {
            foreignKey: 'courseId',
            targetKey: 'id',
            as: 'course'
        });

        CourseUnitContent.belongsTo(CurriculumUnitContent, {
            foreignKey: 'curriculumUnitId',
            targetKey: 'id',
            as: 'curriculumUnit'
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
        field: 'course_unit_content_id',
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
        field: 'course_unit_content_name',
        type: DataTypes.TEXT,
        allowNull: false,
    },
    active: {
        field: 'course_unit_content_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
    contentOrder: {
        field: 'course_unit_content_order',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    curriculumUnitId: {
        field: 'curriculum_unit_content_id',
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'course_unit_content',
    sequelize: appSequelize, // this bit is important
    indexes: [
        {
            fields: [
                'course_id',
                'course_unit_content_name',
            ],
            unique: true,
            name: CourseUnitContent.constraints.uniqueNamePerCourse,
        },
        {
            fields: [
                'course_id',
                'course_unit_content_order',
            ],
            unique: true,
            name: CourseUnitContent.constraints.unqiueOrderPerCourse
        },
    ]
});

import Course from './course';
import CourseTopicContent from './course-topic-content';
import CurriculumUnitContent from './curriculum-unit-content';
