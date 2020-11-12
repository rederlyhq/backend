import * as _ from 'lodash';
import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';

interface CurriculumTopicAssessmentInfoInterface {
    id: number;
    curriculumTopicContentId: number;
    hardCutoff: boolean;
    hideHints: boolean;
    showItemizedResults: boolean;
    showTotalGradeImmediately: boolean;
    hideProblemsAfterFinish: boolean;
    randomizeOrder: boolean;
}

export default class CurriculumTopicAssessmentInfo extends Model implements CurriculumTopicAssessmentInfoInterface {
    public id!: number;
    public curriculumTopicContentId!: number;
    public duration!: number; // enforce IN MINUTES
    public hardCutoff!: boolean;
    public maxGradedAttemptsPerVersion!: number;
    public maxVersions!: number;
    public versionDelay!: number; // for consistency do we also force MINUTES here?
    public hideHints!: boolean;
    public showItemizedResults!: boolean;
    public showTotalGradeImmediately!: boolean;
    public hideProblemsAfterFinish!: boolean;
    public randomizeOrder!: boolean;
    public active!: boolean;


    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;


    static constraints = {
    }

    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        CurriculumTopicAssessmentInfo.belongsTo(CurriculumTopicContent, {
            foreignKey: 'curriculumTopicContentId',
            targetKey: 'id',
            as: 'curriculumTopicContent'
        });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

CurriculumTopicAssessmentInfo.init({
    id: {
        field: 'curriculum_topic_assessment_info_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    curriculumTopicContentId: {
        field: 'curriculum_topic_content_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    duration: {
        field: 'curriculum_topic_assessment_info_duration',
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    hardCutoff: {
        field: 'curriculum_topic_assessment_info_hard_cutoff',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    maxGradedAttemptsPerVersion: {
        field: 'curriculum_topic_assessment_info_max_graded_attempts_per_version',
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    maxVersions: {
        field: 'curriculum_topic_assessment_info_max_versions',
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    versionDelay: {
        field: 'curriculum_topic_assessment_info_version_delay',
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    hideHints: {
        field: 'curriculum_topic_assessment_info_hide_hints',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    showItemizedResults: {
        field: 'curriculum_topic_assessment_info_show_itemized_results',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    showTotalGradeImmediately: {
        field: 'curriculum_topic_assessment_info_show_total_grade_immediately',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    hideProblemsAfterFinish: {
        field: 'curriculum_topic_assessment_info_hide_problems_after_finish',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    randomizeOrder: {
        field: 'curriculum_topic_assessment_info_randomize_order',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    active: {
        field: 'curriculum_topic_assessment_info_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
}, {
    tableName: 'curriculum_topic_assessment_info',
    sequelize: appSequelize, // this bit is important
});

import CurriculumTopicContent from './curriculum-topic-content';

