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
}

export default class WebWorkDef {
    public problems: Array<Problem> = [];
    public assignmentType?: string;

    constructor(content: string) {
        const lines = content.split('\n');
        let currentProblem: Problem | null = null;
        lineLoop: for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            const line = lines[lineNumber].trim();

            if (line.length === 0) {
                continue lineLoop;
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
            } else {
                if (currentProblem === null) {
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
                    console.error(`Global field not found for line: ${line}`);
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
                    console.error(`Problem field not found for line: ${line}`);
                }
            }
        }
    }
}
