import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';

interface TopicFeedbackProblemAttachmentInterface {
    id: number;
    topicFeedbackId: number;
    problemAttachmentId: number;
    createdAt: Date;
    updatedAt: Date;
    active: boolean;
}

export default class TopicFeedbackProblemAttachment extends Model implements TopicFeedbackProblemAttachmentInterface {
    public id!: number;
    public topicFeedbackId!: number;
    public problemAttachmentId!: number;
    public active!: boolean;
    
    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static constraints = {
    }

    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        TopicFeedbackProblemAttachment.belongsTo(ProblemAttachment, {
            foreignKey: 'problemAttachmentId',
            targetKey: 'id',
            as: 'problemAttachment'
        });
        TopicFeedbackProblemAttachment.belongsTo(TopicFeedback, {
            foreignKey: 'topicFeedbackId',
            targetKey: 'id',
            as: 'topicFeedback'
        });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

TopicFeedbackProblemAttachment.init({
    id: {
        field: 'id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    topicFeedbackId: {
        field: 'topic_feedback_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    problemAttachmentId: {
        field: 'problem_attachment_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    active: {
        field: 'active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    updatedAt: {
        field: 'updated_at',
        type: DataTypes.DATE,
        allowNull: false,
    },
    createdAt: {
        field: 'created_at',
        type: DataTypes.DATE,
        allowNull: false,
    },
}, {
    tableName: 'topic_feedback_problem_attachment',
    sequelize: appSequelize, // this bit is important
});

import ProblemAttachment from './problem-attachment';
import TopicFeedback from './topic-feedback';

// -------------------------------------------
