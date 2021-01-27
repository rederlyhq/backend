import { imageInPGFileRegex } from '../utilities/webwork-utilities/importer';
import logger from '../utilities/logger';
import { getAllMatches } from '../utilities/string-helper';

const test = `
Match success cases
1. QCC/MA336/sec_2.2_prob4.pg:\{ image("Ref_1_7.gif" , height=>400, width=>500, tex_size => 500)\}
2. image("ab'c'");image("ab'c'");
3. image
("a")
4. image("a")
comma
5. image("abc\" as,df");
6. image('abc\' as,df');
7. image ( ' ' , ) ;
8. image ( " " , )
9. image ( ' ' )
10. image ( " " )
11. Variables
@pictID = (
"1-55141.gif",
'1-79226.gif',
q(1-75352.gif),
qw(1-65474.gif),
qq(2-96187.gif),
"2-11287.jpg",
"2-68382.png",
"2-63428.jpeg",
"2-63428.gif",
# Remember to remove escape if using regexr
\`q.png\`
);
12. ".png"
13. "TOMTOMhttps://tomtom.png"
14. "\(r = -0.74\)", "Ch04Scatter3.gif"
15. '\(r = -0.74\)', 'Ch04Scatter3.gif'
16. "\(r = -0.74\)", "Ch04Sc'atter3.gif"
17. '\(r = -0.74\)', 'Ch04Sc"atter3.gif'


Ignore success cases
# Ignores the second one
1. image('hi.png') # image('test.png')
2. #image('a.jpeg')
3. # # image('q.png')
4. "https://tom.png"
5. "http://tom.png"
6. image(qw   (   http://tom.png))


Failed case
# Capture group fails if there is \" followed by white space and a 
1. image("abc\", asdf");
# With the generic string matching is this a failed case?
2. print('image("hello.png")')
3. "\(r = -0.74\)", "Ch04Sc\\"atter3.gif"
4. '\(r = -0.74\)', 'Ch04Sc\\'atter3.gif' # Should be 'Ch04Sc\\'atter3.gif' but is 'Ch04Sc\\'atter3.gif'
`;

const testExpectedResults = [
    '"Ref_1_7.gif"', // Match success cases.1
    '"ab\'c\'"', // Match success cases.2.1
    '"ab\'c\'"', // Match success cases.2.2
    '"a"', // Match success cases.3
    '"a"', // Match success cases.4
    '"abc" as,df"', // Match success cases.5
    '\'abc\' as,df\'', // Match success cases.6
    '\' \'', // Match success cases.7
    '" "', // match success cases.8
    '\' \'', // match success cases.9
    '" "', // Match success cases.10
    '"1-55141.gif"', // Match success cases.11.1
    '\'1-79226.gif\'', // Match success cases.11.2
    'q(1-75352.gif)', // Match success cases.11.3
    'qw(1-65474.gif)', // Match success cases.11.4
    'qq(2-96187.gif)', // Match success cases.11.5
    '"2-11287.jpg"', // Match success cases.11.6
    '"2-68382.png"', // Match success cases.11.7
    '"2-63428.jpeg"', // Match success cases.11.8
    '"2-63428.gif"', // Match success case.11.9
    '`q.png`', // Match success cases.11.10
    '".png"', // Match success cases.12
    '"TOMTOMhttps://tomtom.png"', // Match success cases.13
    '"Ch04Scatter3.gif"', // Match success cases.14
    '\'Ch04Scatter3.gif\'', // Match success cases.15
    '"Ch04Sc\'atter3.gif"', // Match success cases.16
    '\'Ch04Sc"atter3.gif\'', // Match success cases.17

    '\'hi.png\'', // Ignore success cases.1
    
    '"abc"', // Failed cases.1
    '"hello.png"', // Failed cases.1
    '"atter3.gif"', // Failed cases.3
    '\'atter3.gif\'', // Failed cases.4
];

export const printRegex = (): unknown => logger.info(imageInPGFileRegex);
export const testRegex = (): void => {
    const results = getAllMatches(imageInPGFileRegex, test);
    logger.info(`results.length: ${results.length}`);
    if (results.length !== testExpectedResults.length) {
        logger.error(`Length mismatch: Expected ${testExpectedResults.length} but got ${results.length}`)
    }
    for(let i = 0; i < results.length; i++) {
        const expectedResult = testExpectedResults[i];
        const result = results[i];
        const match = result[1] ?? result[2];
        // logger.info(match);
        if (match !== expectedResult) {
            logger.error(`Expected result ${i} failed: Result [${match}] !== Expected Result [${expectedResult}]`);
        }
    }
};
