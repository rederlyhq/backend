import { Model, DataTypes, HasManyGetAssociationsMixin, HasOneGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize';

export default class Course extends Model {
    static constraints = {
        uniqueCourseCode: 'course_course_code_key',

        foreignKeyCurriculum: 'course_curriculum_id_fkey'
    }
    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        Course.belongsTo(User, {
            foreignKey: 'instructorId',
            targetKey: 'id',
            as: 'instructor'
        });

        Course.belongsTo(Curriculum, {
            foreignKey: 'curriculumId',
            targetKey: 'id',
            as: 'curriculum'
        });

        Course.hasMany(StudentEnrollment, {
            foreignKey: 'courseId',
            sourceKey: 'id',
            as: 'enrolledStudents'
        });

        Course.hasMany(CourseUnitContent, {
            foreignKey: 'courseId',
            sourceKey: 'id',
            as: 'units'
        });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }

    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public active!: boolean;
    public curriculumId!: number;
    public instructorId!: number;
    public universityId!: number;
    public name!: string;
    public code!: string;
    public start!: Date;
    public end!: Date;
    public sectionCode!: string;
    public semesterCode!: string;

    public units?: CourseUnitContent[];

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    public readonly instructor?: User;

    public getEnrolledStudents!: HasManyGetAssociationsMixin<StudentEnrollment>;
    public getInstructor!: HasOneGetAssociationMixin<User>;
}

Course.init({
    id: {
        field: 'course_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    active: {
        field: 'course_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    curriculumId: {
        field: 'curriculum_id',
        type: DataTypes.INTEGER,
        allowNull: true
    },
    instructorId: {
        field: 'user_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    universityId: {
        field: 'university_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    name: {
        field: 'course_name',
        type: DataTypes.TEXT,
        allowNull: false,
    },
    textbooks: {
        field: 'course_textbooks',
        type: DataTypes.TEXT,
        allowNull: false
    },
    code: {
        field: 'course_code',
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true
    },
    start: {
        field: 'course_start',
        type: DataTypes.DATE,
        allowNull: false
    },
    end: {
        field: 'course_end',
        type: DataTypes.DATE,
        allowNull: false
    },
    sectionCode: {
        field: 'course_section_code',
        type: DataTypes.TEXT,
        allowNull: false,
    },
    semesterCode: {
        field: 'course_semester_code',
        type: DataTypes.TEXT,
        allowNull: false,
    },
}, {
    tableName: 'course',
    sequelize: appSequelize, // this bit is important
});

import User from './user';
import StudentEnrollment from './student-enrollment';
import CourseUnitContent from './course-unit-content';
import Curriculum from './curriculum';
