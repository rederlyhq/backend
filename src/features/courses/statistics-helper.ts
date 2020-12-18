import sequelize = require('sequelize');
import CourseTopicContent from '../../database/models/course-topic-content';
import CourseUnitContent from '../../database/models/course-unit-content';
import CourseWWTopicQuestion from '../../database/models/course-ww-topic-question';
import StudentGrade from '../../database/models/student-grade';
import StudentTopicOverride from '../../database/models/student-topic-override';

export enum TOPIC_SQL_NAME {
    // Should be the same as CourseTopicContent.name
    ROOT_OF_QUERY = 'CourseTopicContent',
    INCLUDED_AS_TOPICS = 'topics',
    INCLUDED_AS_SINGLE_TOPIC = 'topic',
}

export enum QUESTION_SQL_NAME {
    // Should be the same as CourseWWTopicQuestion.name
    ROOT_OF_QUERY = 'CourseWWTopicQuestion',
    INCLUDED_AS_SINGLE_QUESTION = 'question',
    INCLUDED_AS_QUESTIONS = 'questions',
    CHILDREN_OF_INCLUDED_TOPICS = 'topics->questions',
    CHILDREN_OF_SINGLE_INC_TOPIC = 'topic->question',
}

export enum STUDENTTOPICOVERRIDE_SQL_NAME {
    NOT_INCLUDED = '',
    INCLUDED_AS_STUDENTTOPICOVERRIDE = 'studentTopicOverride',
    CHILD_OF_INCLUDED_TOPICS = 'topics->studentTopicOverride',
    CHILD_OF_SINGLE_INC_TOPIC = 'topic->studentTopicOverride',
}

// Calculate the grades for Open or Dead topics only
// Adds pointsEarnedOpen, pointsAvailableOpen, and openAverage (or equivalent dead/Dead fields) to the query.
export const getAverageGroupsBeforeDate = (
    beforeDate: 'all' | 'startDate' | 'deadDate', 
    topicName: TOPIC_SQL_NAME, 
    questionName: QUESTION_SQL_NAME, 
    studentTopicOverrideName: STUDENTTOPICOVERRIDE_SQL_NAME
): Array<sequelize.ProjectionAlias> => {
    // Adds the where clause to filter based on topic dates and override dates.
    const beforeDateWhereClause = beforeDate === 'all' ? '' : 
    `AND
        ("${topicName}".${CourseTopicContent.rawAttributes[beforeDate].field} < NOW()
        OR "${studentTopicOverrideName}".${StudentTopicOverride.rawAttributes[beforeDate].field} < NOW())`;

    const pointsEarned = `SUM(
        CASE
            WHEN "${questionName}".${CourseWWTopicQuestion.rawAttributes.optional.field} = FALSE
                ${beforeDateWhereClause}
            THEN ${StudentGrade.rawAttributes.effectiveScore.field} * "${questionName}".${CourseWWTopicQuestion.rawAttributes.weight.field}
            ELSE 0
        END)`;

    const pointsAvailable = `SUM(
        CASE
            WHEN "${questionName}".${CourseWWTopicQuestion.rawAttributes.optional.field} = FALSE
                ${beforeDateWhereClause}
            THEN "${questionName}".${CourseWWTopicQuestion.rawAttributes.weight.field}
            ELSE 0
        END)`;

    const averageScoreAttribute = sequelize.literal(`
        CASE WHEN ${pointsAvailable} = 0 THEN
            NULL
        ELSE
            ${pointsEarned} / ${pointsAvailable}
        END
    `);

    const suffix = beforeDate === 'all' ? '' : (beforeDate === 'startDate' ? 'Open' : 'Dead');

    return [
        [pointsEarned, `pointsEarned${suffix}`],
        [pointsAvailable, `pointsAvailable${suffix}`],
        [averageScoreAttribute, `averageScore${suffix}`],
    ];
};


export const getAveragesFromStatistics = (stats: Array<CourseUnitContent | CourseTopicContent | CourseWWTopicQuestion>):
{
    totalAverage: number | null;
    totalOpenAverage: number | null;
    totalDeadAverage: number | null;
} => {
    const points = stats.reduce(
        (accum: {
            pointsEarned: number;
            pointsAvailable: number;
            pointsEarnedOpen: number;
            pointsAvailableOpen: number;
            pointsEarnedDead: number;
            pointsAvailableDead: number;
        }, s) => {
            // Casting as any because using custom column names.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data: any = s.get({plain: true});
            return {
                pointsEarned: accum.pointsEarned + parseFloat(data.pointsEarned),
                pointsAvailable: accum.pointsAvailable + parseFloat(data.pointsAvailable),
                pointsEarnedOpen: accum.pointsEarnedOpen + parseFloat(data.pointsEarnedOpen),
                pointsAvailableOpen: accum.pointsAvailableOpen + parseFloat(data.pointsAvailableOpen),
                pointsEarnedDead:accum.pointsEarnedDead + parseFloat(data.pointsEarnedDead),
                pointsAvailableDead: accum.pointsAvailableDead + parseFloat(data.pointsAvailableDead),
            };
        },
        {
            pointsEarned: 0,
            pointsAvailable: 0,
            pointsEarnedOpen: 0,
            pointsAvailableOpen: 0,
            pointsEarnedDead: 0,
            pointsAvailableDead: 0,
        }
    );

    return {
        totalAverage: points.pointsAvailable === 0 ? null : points.pointsEarned / points.pointsAvailable,
        totalOpenAverage: points.pointsAvailableOpen === 0 ? null : points.pointsEarnedOpen / points.pointsAvailableOpen,
        totalDeadAverage: points.pointsAvailableDead === 0 ? null : points.pointsEarnedDead / points.pointsAvailableDead,
    };
};
