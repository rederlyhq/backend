import { Model, DataTypes, HasOneGetAssociationMixin, BelongsToGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize'
import University from './university';
import Curriculum from './curriculum';

export default class UniversityCurriculumPermission extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public universityId!: number;
    public curriculumId!: number;

    public getUniversity!: HasOneGetAssociationMixin<University>;
    public getCurriculum!: BelongsToGetAssociationMixin<Curriculum>;

    public readonly university!: University;
    public readonly curriculum!: Curriculum;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

UniversityCurriculumPermission.init({
    id: {
        field: 'university_curriculum_permission_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    universityId: {
        field: 'university_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    curriculumId: {
        field: 'curriculum_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    tableName: 'university_curriculum_permission',
    sequelize: appSequelize, // this bit is important,
    indexes: [
        {
            fields: [
                'curriculum_id',
                'university_id',
            ],
            unique: true,
            name: 'university_curriculum_permission--curriculum_id-university_id'
        },
    ]
});

UniversityCurriculumPermission.belongsTo(Curriculum, {
    foreignKey: 'curriculumId',
    targetKey: 'id',
    as: 'curriculum'
});

UniversityCurriculumPermission.belongsTo(University, {
    foreignKey: 'universityId',
    targetKey: 'id',
    as: 'university'
});