import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';
import CourseTopicContent from './course-topic-content';

interface TopicFeedbackInterface {
    id: number;
    topicId: number;
    userId: number;
    feedback: unknown | null;
    createdAt: Date;
    updatedAt: Date;
    active: boolean;
}

export default class TopicFeedback extends Model implements TopicFeedbackInterface {
    public id!: number;
    public topicId!: number;
    public userId!: number;
    public feedback!: unknown;
    public active!: boolean;
    
    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static constraints = {
    }

    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        TopicFeedback.belongsTo(ProblemAttachment, {
            foreignKey: 'problemAttachmentId',
            targetKey: 'id',
            as: 'problemAttachment'
        });
        TopicFeedback.belongsTo(User, {
            foreignKey: 'userId',
            targetKey: 'id',
            as: 'student'
        });
        TopicFeedback.belongsTo(CourseTopicContent, {
            foreignKey: 'topicId',
            targetKey: 'id',
            as: 'topic'
        });
        
        TopicFeedback.belongsToMany(ProblemAttachment, {
            through: TopicFeedbackProblemAttachment,
            as: 'problemAttachments',
        });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

TopicFeedback.init({
    id: {
        field: 'topic_feedback_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    topicId: {
        field: 'topic_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    userId: {
        field: 'user_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    feedback: {
        field: 'topic_feedback_feedback',
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null,
    },
    active: {
        field: 'topic_feedback_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
}, {
    tableName: 'topic_feedback',
    sequelize: appSequelize, // this bit is important
});

import ProblemAttachment from './problem-attachment';
import TopicFeedbackProblemAttachment from './topic-feedback-problem-attachment';
import User from './user';

// -------------------------------------------
