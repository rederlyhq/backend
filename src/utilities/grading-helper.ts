import { Constants } from '../constants';
import * as moment from 'moment';
import * as _ from 'lodash';
import logger from './logger';
import StudentGrade, { StudentGradeInterface } from '../database/models/student-grade';
import { CourseTopicContentInterface } from '../database/models/course-topic-content';
import { CourseWWTopicQuestionInterface } from '../database/models/course-ww-topic-question';

export enum WillTrackAttemptReason {
    NO_IS_AFTER_SOLUTIONS_DATE='NO_IS_AFTER_SOLUTIONS_DATE',
    NO_ALREADY_COMPLETED='NO_ALREADY_COMPLETED',
    YES='YES',
    UNKNOWN='UNKNOWN'
};

export enum WillGetCreditReason {
    NO_GRADE_LOCKED='NO_GRADE_LOCKED',
    NO_ATTEMPTS_EXCEEDED='NO_ATTEMPTS_EXCEEDED',
    NO_ATTEMPT_NOT_RECORDED='NO_ATTEMPT_NOT_RECORDED',
    NO_EXPIRED='NO_EXPIRED',
    NO_SOLUTIONS_AVAILABLE='NO_SOLUTIONS_AVAILABLE',
    YES_BUT_PARTIAL_CREDIT='YES_BUT_PARTIAL_CREDIT',
    YES='YES',
    UNKNOWN='UNKNOWN'
};

interface DetermineGradingRationaleOptions {
    endDate: Date;
    deadDate: Date;
    locked: boolean;

    overallBestScore: number;
    numAttempts: number;

    maxAttempts: number;

    solutionDate: moment.Moment;

    timeOfSubmission: Date;
}

export interface DetermineGradingRationaleResult {
    isCompleted: boolean;
    isExpired: boolean;
    isLocked: boolean;
    isWithinAttemptLimit: boolean;
    isOnTime: boolean;
    isLate: boolean;

    willTrackAttemptReason: WillTrackAttemptReason;
    willGetCreditReason: WillGetCreditReason;
}

export interface CalculateGradeOptions {
    studentGrade: StudentGradeInterface;
    topic: CourseTopicContentInterface;
    question: CourseWWTopicQuestionInterface;

    solutionDate: moment.Moment;

    newScore: number;

    timeOfSubmission: Date;
}

export interface CalculateGradeResult {
    gradingPolicy: DetermineGradingRationaleResult;
    gradeUpdates: Partial<StudentGrade>;
    score: number;
}

export const willBeGraded = (reason: WillGetCreditReason): boolean => {
    return reason === WillGetCreditReason.YES || reason === WillGetCreditReason.YES_BUT_PARTIAL_CREDIT;
};

export const determineGradingRationale = ({
    endDate,
    deadDate,
    locked,

    overallBestScore,
    numAttempts,

    maxAttempts,

    solutionDate,

    timeOfSubmission
}: DetermineGradingRationaleOptions): DetermineGradingRationaleResult => {
    // use the same time for everything
    // also if there was a case in which we were retroing we could take an option param and swap this out
    const theMoment = moment(timeOfSubmission);

    const isCompleted = overallBestScore >= 1;
    const isExpired = theMoment.isBefore(moment(solutionDate)) && theMoment.isSameOrAfter(moment(deadDate));
    const areSolutionsAvailable = theMoment.isSameOrAfter(moment(solutionDate));

    const isLocked = locked;
    const isWithinAttemptLimit =
        maxAttempts <= Constants.Course.INFINITE_ATTEMPT_NUMBER || // There is no limit to the number of attempts
        numAttempts < maxAttempts; // They still have attempts left to use

    const isOnTime = theMoment.isBefore(moment(endDate));
    const isLate = theMoment.isBefore(moment(deadDate)) && theMoment.isSameOrAfter(moment(endDate));

    let willTrackAttemptReason: WillTrackAttemptReason = WillTrackAttemptReason.UNKNOWN;
    if (isCompleted) {
        willTrackAttemptReason = WillTrackAttemptReason.NO_ALREADY_COMPLETED;
    } else if (areSolutionsAvailable) {
        willTrackAttemptReason = WillTrackAttemptReason.NO_IS_AFTER_SOLUTIONS_DATE;
    }
    // This should be the same as doing else, being extra explicity to be careful
    // Also typescript complains if this is else because `UNKNOWN` is not possible below
    else if (!isCompleted && !areSolutionsAvailable) {
        willTrackAttemptReason = WillTrackAttemptReason.YES;
    } else {
        logger.error('An error occurred determining whether or not to keep the attempt');
        willTrackAttemptReason = WillTrackAttemptReason.UNKNOWN;
    }

    let willGetCreditReason: WillGetCreditReason = WillGetCreditReason.UNKNOWN;
    if (willTrackAttemptReason === WillTrackAttemptReason.UNKNOWN) {
        willGetCreditReason = WillGetCreditReason.UNKNOWN;
    } else if (willTrackAttemptReason !== WillTrackAttemptReason.YES) {
        willGetCreditReason = WillGetCreditReason.NO_ATTEMPT_NOT_RECORDED;
    }
    else if (isLocked) {
        willGetCreditReason = WillGetCreditReason.NO_GRADE_LOCKED;
    } else if (!isWithinAttemptLimit) {
        willGetCreditReason = WillGetCreditReason.NO_ATTEMPTS_EXCEEDED;
    } else if (areSolutionsAvailable) {
        willGetCreditReason = WillGetCreditReason.NO_SOLUTIONS_AVAILABLE;
    } else if (isExpired) {
        willGetCreditReason = WillGetCreditReason.NO_EXPIRED;
    }
    // isLate is all that is required to check here
    // though due the sensitivity of a grades adding an exhausitive check to make sure
    else if (isLate && isWithinAttemptLimit && !isLocked && willTrackAttemptReason === WillTrackAttemptReason.YES) {
        willGetCreditReason = WillGetCreditReason.YES_BUT_PARTIAL_CREDIT;
    }
    // isOnTime is all that is required to check here
    // though due the sensitivity of a grades adding an exhausitive check to make sure
    else if (isOnTime && isWithinAttemptLimit && !isLocked && willTrackAttemptReason === WillTrackAttemptReason.YES) {
        willGetCreditReason = WillGetCreditReason.YES;
    } else {
        // This should already be unknown when we get here
        // however we should never get here so i'm being very explicit
        willGetCreditReason = WillGetCreditReason.UNKNOWN;
    }

    return {
        isCompleted,
        isExpired,
        isLocked,
        isWithinAttemptLimit,
        isOnTime,
        isLate,
        willTrackAttemptReason,
        willGetCreditReason,

    };
};

/**
 * This function is responsible for getting the updates for a grade
 * It should not at all be reliant on the db (right now it takes models from the db but I want to change that to interfaces)
 * @param param0 
 */
export const calculateGrade = ({
    studentGrade,
    topic,
    question,

    solutionDate,
    newScore,

    timeOfSubmission
}: CalculateGradeOptions): CalculateGradeResult => {
    const gradingPolicy: DetermineGradingRationaleResult = determineGradingRationale({
        deadDate: topic.deadDate,
        endDate: topic.endDate,

        locked: studentGrade.locked,
        maxAttempts: question.maxAttempts,
        numAttempts: studentGrade.numAttempts,
        overallBestScore: studentGrade.overallBestScore,
        solutionDate,

        timeOfSubmission
    });

    const result: CalculateGradeResult = {
        gradingPolicy,
        gradeUpdates: {},
        score: newScore
    };
    if (gradingPolicy.willTrackAttemptReason === WillTrackAttemptReason.YES) {

        result.gradeUpdates.overallBestScore =
            newScore > studentGrade.overallBestScore ?
                newScore : undefined;

        if (willBeGraded(gradingPolicy.willGetCreditReason)) {
            if (gradingPolicy.willGetCreditReason === WillGetCreditReason.YES) {
                // Full credit.
                // If overall best score was updated then update these
                result.gradeUpdates.bestScore = result.gradeUpdates.overallBestScore;
                result.gradeUpdates.legalScore = result.gradeUpdates.overallBestScore;
                result.gradeUpdates.partialCreditBestScore = result.gradeUpdates.overallBestScore;
                // if it was overwritten to be better use that max value
                result.gradeUpdates.effectiveScore =
                    newScore > studentGrade.effectiveScore ?
                        newScore : undefined;
            } else if (gradingPolicy.willGetCreditReason === WillGetCreditReason.YES_BUT_PARTIAL_CREDIT) {
                // Partial credit
                const partialCreditScalar = 0.5;
                const partialCreditScore = ((newScore - studentGrade.legalScore) * partialCreditScalar) + studentGrade.legalScore;
                result.gradeUpdates.partialCreditBestScore =
                    partialCreditScore > studentGrade.partialCreditBestScore ?
                        partialCreditScore : undefined;

                result.gradeUpdates.bestScore = result.gradeUpdates.partialCreditBestScore;
                result.gradeUpdates.effectiveScore =
                    partialCreditScore > studentGrade.effectiveScore ?
                        partialCreditScore : undefined;
            }
        }
    }
    result.gradeUpdates = _(result.gradeUpdates).omitBy(_.isUndefined).value();
    return result;
};
