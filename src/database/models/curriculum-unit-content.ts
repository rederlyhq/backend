import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize'
import Curriculum from './curriculum';

export default class CurriculumUnitContent extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public curriculumId!: number;
    public name!: string;
    public active!: boolean;

    public getCurriculum!: BelongsToGetAssociationMixin<Curriculum>;

    public readonly curriculum!: Curriculum;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

CurriculumUnitContent.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    curriculumId: {
        field: 'curriculum_id',
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
    tableName: 'curriculum_unit_content',
    sequelize: appSequelize, // this bit is important
});

CurriculumUnitContent.belongsTo(Curriculum, {
    foreignKey: 'curriculumId',
    targetKey: 'id',
    as: 'curriculum'
});