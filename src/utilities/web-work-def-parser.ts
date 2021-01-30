import _ = require('lodash');
import logger from './logger';

class WebWorkDefKeyValueMap {
    public webWorkKey: string;
    public resultKey: string;
    constructor(webWorkKey: string, resultKey?: string) {
        this.webWorkKey = webWorkKey;
        this.resultKey = resultKey || webWorkKey;
    }

    get regex(): RegExp {
        // if any of the keys included regex characters it would be a problem
        // but they are predefined and they don't so we are ignorming
        return new RegExp(`^${this.webWorkKey}\\s*=\\s*(.*)?\\s*`);
    }
}

const webWorkDefKeyMaps: Array<WebWorkDefKeyValueMap> = [
    new WebWorkDefKeyValueMap('assignmentType'),

    // assignmentType = default
    new WebWorkDefKeyValueMap('openDate'),
    new WebWorkDefKeyValueMap('reducedScoringDate'),
    new WebWorkDefKeyValueMap('dueDate'),
    new WebWorkDefKeyValueMap('answerDate'),
    new WebWorkDefKeyValueMap('enableReducedScoring'),
    new WebWorkDefKeyValueMap('paperHeaderFile'),
    new WebWorkDefKeyValueMap('screenHeaderFile'),
    new WebWorkDefKeyValueMap('description'),
    new WebWorkDefKeyValueMap('restrictProbProgression'),
    new WebWorkDefKeyValueMap('emailInstructor'),

    // assignmentType = gateway
    new WebWorkDefKeyValueMap('attemptsPerVersion'),
    new WebWorkDefKeyValueMap('timeInterval'),
    new WebWorkDefKeyValueMap('versionsPerInterval'),
    new WebWorkDefKeyValueMap('versionTimeLimit'),
    new WebWorkDefKeyValueMap('problemRandOrder'),
    new WebWorkDefKeyValueMap('problemsPerPage'),
    new WebWorkDefKeyValueMap('hideScore'),
    new WebWorkDefKeyValueMap('hideScoreByProblem'),
    new WebWorkDefKeyValueMap('hideWork'),
    new WebWorkDefKeyValueMap('capTimeLimit'),
];

const webWorkDefProblemKeyMaps: Array<WebWorkDefKeyValueMap> = [
    new WebWorkDefKeyValueMap('problem_id'),
    new WebWorkDefKeyValueMap('source_file'),
    new WebWorkDefKeyValueMap('value'),
    new WebWorkDefKeyValueMap('max_attempts'),
    new WebWorkDefKeyValueMap('showMeAnother'),
    new WebWorkDefKeyValueMap('prPeriod'),
    new WebWorkDefKeyValueMap('counts_parent_grade'),
    new WebWorkDefKeyValueMap('att_to_open_children'),
];

export class Problem {
    public problem_id?: string;
    public source_file?: string;
    public value?: string;
    public max_attempts?: string;
    public showMeAnother?: string;
    public prPeriod?: string;
    public counts_parent_grade?: string;
    public att_to_open_children?: string;
}

export default class WebWorkDef {
    public problems: Array<Problem> = [];
    public assignmentType?: string;
    public openDate?: string;
    public dueDate?: string;
    public attemptsPerVersion?: string;
    public timeInterval?: string;
    public versionsPerInterval?: string;
    public versionTimeLimit?: string;
    public problemRandOrder?: string;
    public problemsPerPage?: string;
    public hideScore?: string;
    public hideScoreByProblem?: string;
    public hideWork?: string;
    public capTimeLimit?: string;
    private v1ListMode = false;

    constructor(content: string) {
        const lines = content.split('\n');
        let currentProblem: Problem | null = null;
        lineLoop: for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            const line = lines[lineNumber].trim();
            if (line.length === 0) {
                continue lineLoop;
            } else if (this.v1ListMode) {
                const tokens = line.split(',');
                if (tokens.length > 3) {
                    logger.warn(`V1 Def file has more than 3 values: [${line}]`);
                }
                const problem = new Problem();
                // Technically this field can't be nil since split on a string will at least return the string
                // but going to add nil accessor anyway
                // webwork field
                // eslint-disable-next-line @typescript-eslint/camelcase
                problem.source_file = tokens[0]?.trim();
                problem.value = tokens[1]?.trim();
                // webwork field
                // eslint-disable-next-line @typescript-eslint/camelcase
                problem.max_attempts = tokens[2]?.trim();

                if (!_.isUndefined(problem.value) && _.isNaN(parseInt(problem.value, 10))) {
                    throw new Error(`Error parsing v1 problem list, value ${problem.value} is not a number`);
                }

                if (!_.isUndefined(problem.max_attempts) && _.isNaN(parseInt(problem.max_attempts, 10))) {
                    throw new Error(`Error parsing v1 problem list, max_attempts ${problem.max_attempts} is not a number`);
                }

                this.problems.push(problem);
            } else if (line === 'problem_start') {
                if (currentProblem !== null) {
                    throw new Error('Problem started in the middle of a problem');
                } else {
                    currentProblem = new Problem();
                }
            } else if (line === 'problem_end') {
                if (currentProblem === null) {
                    throw new Error('Problem ended when it wasn\'t currently in a problem');
                } else {
                    this.problems.push(currentProblem);
                    currentProblem = null;
                }
            } else if (line === 'problemListV2') {
                // Nothing to do
            } else if (line.split('=').first?.trim() === 'problemList') {
                this.v1ListMode = true;
            } else {
                if (line.startsWith('#')) {
                    // This does not handle mid line comments
                    logger.debug('Comment in def file');
                } else if (currentProblem === null) {
                    for (let keyIndex = 0; keyIndex < webWorkDefKeyMaps.length; keyIndex++) {
                        const webWorkDefKeyMap = webWorkDefKeyMaps[keyIndex];
                        let match;
                        if (match = line.match(webWorkDefKeyMap.regex)) {
                            // TODO this was a hack to be able to use dynamic tags against "this"
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (this as any)[webWorkDefKeyMap.resultKey] = match[1];
                            continue lineLoop;
                        }
                    }
                    logger.warn(`Global field not found for line: ${line}`);
                } else {
                    for (let keyIndex = 0; keyIndex < webWorkDefProblemKeyMaps.length; keyIndex++) {
                        const webWorkDefKeyMap = webWorkDefProblemKeyMaps[keyIndex];
                        let match;
                        if (match = line.match(webWorkDefKeyMap.regex)) {
                            // TODO this was a hack to be able to use dynamic tags against "this"
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (currentProblem as any)[webWorkDefKeyMap.resultKey] = match[1];
                            continue lineLoop;
                        }
                    }
                    logger.error(`Problem field not found for line: ${line}`);
                }
            }
        }
    }

    isExam(): boolean {
        return ['gateway', 'proctored_gateway'].indexOf(this.assignmentType?.toLowerCase() ?? '') >= 0;
    }

    static characterBoolean = (value: string | undefined): boolean => {
        return value === 'Y';
    }

    static numberBoolean = (value: string | undefined): boolean => {
        return value !== undefined ? Boolean(parseInt(value, 0)) : false;
    }
}
