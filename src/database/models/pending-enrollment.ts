import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';

interface PendingEnrollmentInterface {
    id: number;
    email: string;
    courseId: number;
    active: boolean;
}
export default class PendingEnrollment extends Model implements PendingEnrollmentInterface {
    public id!: number;
    public email!: string;
    public courseId!: number;
    public active!: boolean;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static constraints = {
        uniqueEmailPerCourse: 'pending_enrollment--course_id-email'
    }

    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        PendingEnrollment.belongsTo(Course, {
            foreignKey: 'courseId',
            targetKey: 'id',
            as: 'course'
        });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

PendingEnrollment.init({
    id: {
        field: 'pending_enrollment_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    email: {
        field: 'pending_enrollment_email',
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true
    },
    courseId: {
        field: 'course_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    active: {
        field: 'pending_enrollment_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
}, {
    tableName: 'pending_enrollment',
    sequelize: appSequelize, // this bit is important
    indexes: [
        {
            unique: true,
            name: PendingEnrollment.constraints.uniqueEmailPerCourse,
            fields: [
                'course_id',
                'pending_enrollment_email'
            ]
        }
    ]
});

import Course from './course';
