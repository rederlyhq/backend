import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize';

export default class StudentEnrollment extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public courseId!: number;
    public userId!: number;
    public enrollDate!: Date;
    public dropDate!: Date;

    public getCourse!: BelongsToGetAssociationMixin<Course>;
    public getUser!: BelongsToGetAssociationMixin<User>;

    public readonly course!: Course;
    public readonly user!: User;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        StudentEnrollment.belongsTo(Course, {
            foreignKey: 'courseId',
            targetKey: 'id',
            as: 'course'
        });

        StudentEnrollment.belongsTo(User, {
            foreignKey: 'userId',
            targetKey: 'id',
            as: 'user'
        });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

StudentEnrollment.init({
    id: {
        field: 'student_enrollment_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    courseId: {
        field: 'course_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    userId: {
        field: 'user_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    enrollDate: {
        field: 'student_enrollment_enroll_date',
        type: DataTypes.DATE,
        allowNull: false,
    },
    dropDate: {
        field: 'student_enrollment_drop_date',
        type: DataTypes.DATE,
        allowNull: false,
    },
}, {
    tableName: 'student_enrollment',
    sequelize: appSequelize, // this bit is important
});

import Course from './course';
import User from './user';
