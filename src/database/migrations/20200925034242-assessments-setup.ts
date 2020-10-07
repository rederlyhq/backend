import { QueryInterface, DataTypes } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface): Promise<void> => {
        // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
        await queryInterface.sequelize.transaction(async () => {
            /**
             * course_topic_assessment_info
             */
            await queryInterface.createTable('course_question_assessment_info', {
                id: {
                    field: 'course_topic_assessment_info_id',
                    type: DataTypes.INTEGER,
                    autoIncrement: true,
                    primaryKey: true,
                },
                courseTopicContentId: {
                    field: 'course_topic_content_id',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    // Defaults to cascade when generating the db, no action on migrations
                    onUpdate: 'CASCADE',
                    // Different from sequelize model, on models I do this with associations so I can use types
                    references: {
                        model: 'course_topic_content',
                        key: 'course_topic_content_id',
                    },
                },
                randomSeedSet: {
                    field: 'course_topic_assessment_info_random_seed_set',
                    type: DataTypes.ARRAY(DataTypes.INTEGER),
                    allowNull: false,
                    defaultValue: []
                },
                additionalProblemPaths: {
                    field: 'course_topic_assessment_info_additional_problem_paths',
                    type: DataTypes.ARRAY(DataTypes.TEXT),
                    allowNull: false,
                    defaultValue: []
                },
                active: {
                    field: 'course_topic_assessment_info_active',
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true,
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
            });

            /**
             * student_grade_instance
             */
            await queryInterface.createTable('student_grade_instance', {
                id: {
                    field: 'student_grade_instance_id',
                    type: DataTypes.INTEGER,
                    autoIncrement: true,
                    primaryKey: true,
                },
                studentGradeId: {
                    field: 'student_grade_id',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    // Defaults to cascade when generating the db, no action on migrations
                    onUpdate: 'CASCADE',
                    // Different from sequelize model, on models I do this with associations so I can use types
                    references: {
                        model: 'student_grade',
                        key: 'student_grade_id',
                    },
                },
                userId: {
                    field: 'user_id',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    // Defaults to cascade when generating the db, no action on migrations
                    onUpdate: 'CASCADE',
                    // Different from sequelize model, on models I do this with associations so I can use types
                    references: {
                        model: 'users',
                        key: 'user_id',
                    },
                },
                courseWWTopicQuestionId: {
                    field: 'course_topic_question_id',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    // Defaults to cascade when generating the db, no action on migrations
                    onUpdate: 'CASCADE',
                    // Different from sequelize model, on models I do this with associations so I can use types
                    references: {
                        model: 'course_topic_question',
                        key: 'course_topic_question_id',
                    },
                },
                studentTopicAssessmentInfoId: {
                    field: 'student_topic_assessment_info_id',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    // Defaults to cascade when generating the db, no action on migrations
                    onUpdate: 'CASCADE',
                    // Different from sequelize model, on models I do this with associations so I can use types
                    references: {
                        model: 'student_topic_assessment_info',
                        key: 'student_topic_assessment_info_id',
                    },
                },
                randomSeed: {
                    field: 'student_grade_instance_random_seed',
                    type: DataTypes.INTEGER,
                    allowNull: false
                },
                problemPath: {
                    field: 'student_grade_instance_problem_path',
                    type: DataTypes.TEXT,
                    allowNull: false
                },
                bestScore: {
                    field: 'student_grade_instance_best_score',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0
                },
                overallBestScore: {
                    field: 'student_grade_isntance_overall_best_score',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0
                },
                numAttempts: {
                    field: 'student_grade_isntance_num_attempts',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0
                },
                active: {
                    field: 'student_grade_isntance_active',
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                },
                currentProblemState: {
                    field: 'student_grade_instance_current_problem_state',
                    type: DataTypes.JSONB,
                    allowNull: true,
                },
                bestIndividualAttemptId: {
                    field: 'student_grade_instance_best_individual_workbook_id',
                    type: DataTypes.INTEGER,
                    allowNull: true,
                },
                bestVersionAttemptId: {
                    field: 'student_grade_instance_best_version_workbook_id',
                    type: DataTypes.INTEGER,
                    allowNull: true,
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
            });

            /**
             * student_topic_assessment_info
             */
            await queryInterface.createTable('student_topic_assessment_info', {
                id: {
                    field: 'student_topic_assessment_info_id',
                    type: DataTypes.INTEGER,
                    autoIncrement: true,
                    primaryKey: true,
                },
                courseTopicContentId: {
                    field: 'course_topic_content_id',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    // Defaults to cascade when generating the db, no action on migrations
                    onUpdate: 'CASCADE',
                    // Different from sequelize model, on models I do this with associations so I can use types
                    references: {
                        model: 'course_topic_content',
                        key: 'course_topic_content_id',
                    },
                },
                userId: {
                    field: 'user_id',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    // Defaults to cascade when generating the db, no action on migrations
                    onUpdate: 'CASCADE',
                    // Different from sequelize model, on models I do this with associations so I can use types
                    references: {
                        model: 'users',
                        key: 'user_id',
                    },
                },
                startTime: {
                    field: 'student_topic_assessment_info_start_time',
                    type: DataTypes.DATE,
                    allowNull: false,
                    // Incorrect type on sequelize
                    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                    // @ts-ignore
                    defaultValue: queryInterface.sequelize.literal('NOW()')
                },
                endTime: {
                    field: 'student_topic_assessment_info_end_time',
                    type: DataTypes.DATE,
                    allowNull: false,
                    // Incorrect type on sequelize
                    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                    // @ts-ignore
                    defaultValue: queryInterface.sequelize.literal('NOW()')
                },
                nextVersionAvailableTime: {
                    field: 'student_topic_assessment_info_next_version_time',
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                active: {
                    field: 'student_topic_assessment_info_active',
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
            });

            /**
             * student_topic_assessment_override
             */
            await queryInterface.createTable('student_topic_assessment_override', {
                id: {
                    field: 'student_topic_assessment_override_id',
                    type: DataTypes.INTEGER,
                    autoIncrement: true,
                    primaryKey: true,
                },
                courseTopicContentId: {
                    field: 'course_topic_content_id',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    // Defaults to cascade when generating the db, no action on migrations
                    onUpdate: 'CASCADE',
                    // Different from sequelize model, on models I do this with associations so I can use types
                    references: {
                        model: 'course_topic_content',
                        key: 'course_topic_content_id',
                    },
                },
                userId: {
                    field: 'user_id',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    // Defaults to cascade when generating the db, no action on migrations
                    onUpdate: 'CASCADE',
                    // Different from sequelize model, on models I do this with associations so I can use types
                    references: {
                        model: 'users',
                        key: 'user_id',
                    },
                },
                duration: {
                    field: 'student_topic_assessment_override_duration',
                    type: DataTypes.INTEGER,
                    allowNull: true,
                },
                maxGradedAttemptsPerRandomization: {
                    field: 'student_topic_assessment_override_max_graded_attempts_per_randomization',
                    type: DataTypes.INTEGER,
                    allowNull: true,
                },
                maxReRandomizations: {
                    field: 'student_topic_assessment_override_max_re_randomizations',
                    type: DataTypes.INTEGER,
                    allowNull: true,
                },
                randomizationDelay: {
                    field: 'student_topic_assessment_override_randomization_delay',
                    type: DataTypes.INTEGER,
                    allowNull: true,
                },
                active: {
                    field: 'student_topic_assessment_override_active',
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
            });

            /**
             * topic_assessment_info
             */
            await queryInterface.createTable('topic_assessment_info', {
                id: {
                    field: 'topic_assessment_info_id',
                    type: DataTypes.INTEGER,
                    autoIncrement: true,
                    primaryKey: true,
                },
                courseTopicContentId: {
                    field: 'course_topic_content_id',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    // Defaults to cascade when generating the db, no action on migrations
                    onUpdate: 'CASCADE',
                    // Different from sequelize model, on models I do this with associations so I can use types
                    references: {
                        model: 'course_topic_content',
                        key: 'course_topic_content_id',
                    },
                },
                duration: {
                    field: 'topic_assessment_info_duration',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0
                },
                hardCutoff: {
                    field: 'topic_assessment_info_hard_cutoff',
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                },
                maxGradedAttemptsPerRandomization: {
                    field: 'topic_assessment_info_max_graded_attempts_per_randomization',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0
                },
                maxReRandomizations: {
                    field: 'topic_assessment_info_max_re_randomizations',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
                randomizationDelay: {
                    field: 'topic_assessment_info_randomization_delay',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
                hideHints: {
                    field: 'topic_assessment_info_hide_hints',
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                },
                showItemizedResults: {
                    field: 'topic_assessment_info_show_itemized_results',
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                },
                showTotalGradeImmediately: {
                    field: 'topic_assessment_info_showTotalGradeImmediately',
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                },
                hideProblemsAfterFinish: {
                    field: 'topic_assessment_info_hideProblemsAfterFinish',
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                },
                randomizeOrder: {
                    field: 'topic_assessment_info_randomizeOrder',
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                },
                active: {
                    field: 'student_topic_override_active',
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
            });

            await queryInterface.addColumn('student_workbook', 'student_grade_instance_id', {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: false
            });

        });
    },
    down: async (queryInterface: QueryInterface): Promise<void> => {
        // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
        await queryInterface.sequelize.transaction(async () => {
            await queryInterface.dropTable('course_question_assessment_info');
            await queryInterface.dropTable('student_grade_instance');
            await queryInterface.dropTable('student_topic_assessment_info');
            await queryInterface.dropTable('student_topic_assessment_override');
            await queryInterface.dropTable('topic_assessment_info');
            await queryInterface.removeColumn('student_workbook', 'student_grade_instance_id');
        });
    }
};
