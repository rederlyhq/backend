import { calculateGrade, CalculateGradeOptions } from './grading-helper';
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
    numExtendedAttempts: 0,
    numLegalAttempts: 0,
};

const defaultTopicUnusedFields = {
    // Ids
    id: -1,
    topicTypeId: -1,
    courseUnitContentId: -1,
    curriculumTopicContentId: -1,
    // Fields
    contentOrder: 0,
    name: 'Topic Name',
    partialExtend: false,
    ...defaultUnusedFields
};

describe('Grading Helper Tests', () => {
    const timeOfSubmission = new Date();
    describe('calculateGrade', () => {
        describe('On Time', () => {
            const startDate = moment().subtract(1, 'days');
            const endDate = moment().add(1, 'days');
            const deadDate = moment().add(2, 'days');
            const solutionDate = moment().add(3, 'days');

            const resultIsLate = false;
            const resultIsExpired = false;
            const resultIsOnTime = true;

            describe('Within attempt limit', () => {
                const maxAttempts = 1;
                const numAttempts = 0;

                const resultIsWithinAttemptLimit = true;

                describe('Has no score', () => {
                    const bestScore = 0;
                    const effectiveScore = 0;
                    const legalScore = 0;
                    const overallBestScore = 0;
                    const partialCreditBestScore = 0;

                    const resultIsCompleted = false;

                    describe('Grade unlocked', () => {
                        const locked = false;
                        const resultIsLocked = false;

                        it('Scored 0', () => {
                            const newScore = 0;
                            const params: CalculateGradeOptions = {
                                newScore,
                                question: {
                                    ...defaultQuestionUnusedFields,
                                    maxAttempts,
                                },
                                solutionDate,
                                studentGrade: {
                                    ...defaultStudentGradeUnusedFields,
                                    numAttempts,
                                    bestScore,
                                    effectiveScore,
                                    legalScore,
                                    overallBestScore,
                                    partialCreditBestScore,
                                    locked,
                                },
                                timeOfSubmission,
                                topic: {
                                    ...defaultTopicUnusedFields,
                                    startDate: startDate.toDate(),
                                    endDate: endDate.toDate(),
                                    deadDate: deadDate.toDate(),
                                }
                            };
                            const result = calculateGrade(params);

                            expect(result).toStrictEqual({
                                gradingPolicy: {
                                    isCompleted: resultIsCompleted,
                                    isExpired: resultIsExpired,
                                    isLocked: resultIsLocked,
                                    isWithinAttemptLimit: resultIsWithinAttemptLimit,
                                    isOnTime: resultIsOnTime,
                                    isLate: resultIsLate,
                                    willTrackAttemptReason: 'YES',
                                    willGetCreditReason: 'YES'
                                },
                                // Nothing should be updated since nothing improved
                                gradeUpdates: {},
                                // Should match score from params
                                score: newScore
                            });
                        });

                        it('Scored .5', () => {
                            const newScore = .5;
                            const params: CalculateGradeOptions = {
                                newScore,
                                question: {
                                    ...defaultQuestionUnusedFields,
                                    maxAttempts,
                                },
                                solutionDate,
                                studentGrade: {
                                    ...defaultStudentGradeUnusedFields,
                                    numAttempts,
                                    bestScore,
                                    effectiveScore,
                                    legalScore,
                                    overallBestScore,
                                    partialCreditBestScore,
                                    locked,
                                },
                                timeOfSubmission,
                                topic: {
                                    ...defaultTopicUnusedFields,
                                    startDate: startDate.toDate(),
                                    endDate: endDate.toDate(),
                                    deadDate: deadDate.toDate(),
                                }
                            };
                            const result = calculateGrade(params);


                            expect(result).toStrictEqual({
                                gradingPolicy: {
                                    isCompleted: resultIsCompleted,
                                    isExpired: resultIsExpired,
                                    isLocked: resultIsLocked,
                                    isWithinAttemptLimit: resultIsWithinAttemptLimit,
                                    isOnTime: resultIsOnTime,
                                    isLate: resultIsLate,
                                    willTrackAttemptReason: 'YES',
                                    willGetCreditReason: 'YES'
                                },
                                // Nothing should be updated since nothing improved
                                gradeUpdates: {
                                    bestScore: newScore,
                                    effectiveScore: newScore,
                                    legalScore: newScore,
                                    overallBestScore: newScore,
                                    partialCreditBestScore: newScore
                                },
                                // Should match score from params
                                score: newScore
                            });
                        });
                    });
                });
            });
        });
    });
});
