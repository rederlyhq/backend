import logger from '../utilities/logger';
import rendererHelper from '../utilities/renderer-helper';

const runRendererPlayground = async (): Promise<void> => {
    const date = new Date();
    // Returns "private/my/tom/test.pg"
    const saveProblemSourceResult = await rendererHelper.saveProblemSource({
        writeFilePath: 'private/my/tom/test.pg',
        problemSource: `This is my problem source ${date.toString()}`
    });
    logger.info(JSON.stringify(saveProblemSourceResult, null, 2));

    // Returns "This is my problem source Fri Oct 30 2020 18:02:29 GMT-0400 (Eastern Daylight Time)"
    const readProblemSourceResult = await rendererHelper.readProblemSource({
        sourceFilePath: 'private/my/tom/test.pg'
    });
    logger.info(JSON.stringify(readProblemSourceResult, null, 2));
    
    // Returns renderer object
    const getProblemResult = await rendererHelper.getProblem({
        problemSource: `
            DOCUMENT();
            loadMacros("PGstandard.pl","PGML.pl");
            TEXT(beginproblem());
            $ShowPartialCorrectAnswers = 1;

            Context("Numeric");

            # instructions to be displayed:

            $instructions = "Evaluate the following:";

            # basic randomization:
            # $variable = random( low, high, interval );
            #
            # or just type static LaTeX:

            $problemTeX = "\int_0^1\pi\,dx";

            # your "$answer" must have the following format:
            #
            # $answer = Object("expression");
            #
            # Basic Object Options: Real, Point, Formula, Interval, Complex
            #
            # Lists of values are also possible: List(Object(""),Object(""),...);

            $answer = Real("pi");

            #
            # BEGIN problem display
            #
            # variables for display must be [$variable]
            # LaTeX math-mode: [\`\\LaTeX\`]
            # LaTeX displaystyle: [\`\`\\LaTeX\`\`]

            BEGIN_PGML

            [$instructions]

            [\`\`[$problemTeX]\`\`]

            Answer: [__________]{$answer}

            END_PGML
            ENDDOCUMENT();
        `
    });
    logger.info(JSON.stringify(getProblemResult, null, 2));
};
export default runRendererPlayground;
