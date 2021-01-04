export const getAllMatches = (pattern: RegExp, str: string): Array<RegExpExecArray> => {
    pattern.lastIndex = 0;
    const matches: Array<RegExpExecArray> = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(str)) !== null) matches.push(match);
    return matches;
};
