import logger from '../utilities/logger';
import rendererHelper from '../utilities/renderer-helper';

const isPathAccessibleToRenderer = async () => {
    let path = 'abc';
    logger.info(`isPathAccessibleToRenderer path:${path}; result:${await rendererHelper.isPathAccessibleToRenderer({ problemPath: path })}`);
    path = 'private/templates/barebones.pg';
    logger.info(`isPathAccessibleToRenderer path:${path}; result:${await rendererHelper.isPathAccessibleToRenderer({ problemPath: path })}`);
    path = 'private/our/CUNY/Statistics/BCC/Stats/qwerqwer.pg';
    logger.info(`isPathAccessibleToRenderer path:${path}; result:${await rendererHelper.isPathAccessibleToRenderer({ problemPath: path })}`);
    path = 'private/our/CUNY/Statistics/BCC/Stats/standard_normal1.pg';
    logger.info(`isPathAccessibleToRenderer path:${path}; result:${await rendererHelper.isPathAccessibleToRenderer({ problemPath: path })}`);
    path = 'Contrib/CUNY/CityTech/Calculus/setDerivatives_-_Limit_Definition/diff-quotient-intro.pg';
    logger.info(`isPathAccessibleToRenderer path:${path}; result:${await rendererHelper.isPathAccessibleToRenderer({ problemPath: path })}`);
    path = 'Contrib/CUNY/CityTech/Calculus/setDerivatives_-_Limit_Definition';
    logger.info(`isPathAccessibleToRenderer path:${path}; result:${await rendererHelper.isPathAccessibleToRenderer({ problemPath: path })}`);
    path = 'Contrib/CUNY/CityTech/Calculus/setDerivatives_-_Limit_Definition/';
    logger.info(`isPathAccessibleToRenderer path:${path}; result:${await rendererHelper.isPathAccessibleToRenderer({ problemPath: path })}`);
    path = 'Library/NAU/setProbability/samplespace.pg';
    logger.info(`isPathAccessibleToRenderer path:${path}; result:${await rendererHelper.isPathAccessibleToRenderer({ problemPath: path })}`);
};

const runRendererPlayground = async (): Promise<void> => {
    const date = new Date();

    const catResult = await rendererHelper.catalog({
        basePath: 'private/my',
        maxDepth: 100
    });
    logger.info(JSON.stringify(catResult, null, 2));

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

    await isPathAccessibleToRenderer();
};
export const run = runRendererPlayground;
export default runRendererPlayground;
