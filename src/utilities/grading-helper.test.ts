import { calculateGrade } from './grading-helper';
import * as moment from 'moment';

const defaultUnusedFields = {
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
};

const defaultQuestionUnusedFields = {
    // Ids
    id: -1,
    courseTopicContentId: -1,
    curriculumQuestionId: -1,
    // Fields
    weight: 1,
    problemNumber: 1,
    webworkQuestionPath: '',
    optional: false,
    hidden: false,
    ...defaultUnusedFields,
    // Probably used
    maxAttempts: 1,
};

const defaultStudentGradeUnusedFields = {
    // Ids
    id: -1,
    courseWWTopicQuestionId: -1,
    userId: -1,
    // Fields
    firstAttempts: 0,
    latestAttempts: 0,
    randomSeed: 0,
    ...defaultUnusedFields,
    // Probably used
    numAttempts: 0,
    numExtendedAttempts: 0,
    numLegalAttempts: 0,
    bestScore: 0,
    effectiveScore: 0,
    legalScore: 0,
    overallBestScore: 0,
    partialCreditBestScore: 0,
    locked: false,
};

const defaultTopicUnusedFields = {
    // Ids
    id: -1,
    topicTypeId: -1,
    courseUnitContentId: -1,
    curriculumTopicContentId: -1,
    // Fields
    startDate: new Date(),
    contentOrder: 0,
    deadDate: new Date(),
    endDate: new Date(),
    name: 'Topic Name',
    partialExtend: false,
    ...defaultUnusedFields
};

describe('Grades Tests', () => {
    describe('Full Credit', () => {
        it('pass', () => {
            const result = calculateGrade({
                newScore: 0,
                question: {
                    ...defaultQuestionUnusedFields,
                },
                solutionDate: moment(),
                studentGrade: {
                    ...defaultStudentGradeUnusedFields

                },
                timeOfSubmission: new Date(),
                topic: {
                    ...defaultTopicUnusedFields
                }
            });

            expect(result).toStrictEqual({
                gradingPolicy: {
                  isCompleted: false,
                  isExpired: false,
                  isLocked: false,
                  isWithinAttemptLimit: true,
                  isOnTime: false,
                  isLate: false,
                  willTrackAttemptReason: 'NO_IS_AFTER_SOLUTIONS_DATE',
                  willGetCreditReason: 'NO_SOLUTIONS_AVAILABLE'
                },
                gradeUpdates: {},
                score: 0
              });
        });
    });
});
