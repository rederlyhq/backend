import logger from '../utilities/logger';
import WebWorkDef from '@rederly/webwork-def-parser';

const v1ProblemListDefFileContent = `
openDate          = 08/05/2020 at 12:00pm EDT
dueDate           = 09/20/2020 at 10:00pm EDT
answerDate        = 10/17/2020 at 12:59am EDT
paperHeaderFile   = paperSetHeader-130-Fall-20.pg
screenHeaderFile  = paperSetHeader-130-Fall-20.pg
    problemList       =
   Library/CollegeOfIdaho/setAlgebra_01_01_AlgebraicExpressions/11IntAlg_03_AlgebraicExpressions.pg, 1, 10
        Library/CollegeOfIdaho/setAlgebra_01_02_OperationsWithRealNumbers/12IntAlg_12_OperationsWithReals.pg, 1, 10
`;

const v2ProblemListDefFileContent = `
assignmentType      = default
openDate          = 01/01/2020 at 12:35am EST
reducedScoringDate = 08/15/2012 at 06:11pm EDT
dueDate           = 04/01/2020 at 12:35am EDT
answerDate        = 04/01/2020 at 12:35am EDT
enableReducedScoring = N
paperHeaderFile   = 
screenHeaderFile  = 
description       = 
restrictProbProgression = 0
emailInstructor   = 0

problemListV2 
problem_start
problem_id = 1
source_file = Library/WHFreeman/Rogawski_Calculus_Early_Transcendentals_Second_Edition/4_Applications_of_the_Derivative/4.5_L'Hopital's_Rule/4.5.19.pg
value = 1
max_attempts = -1
showMeAnother = 0
prPeriod = 0
counts_parent_grade = 0
att_to_open_children = 0 
problem_end
problem_start
problem_id = 2
source_file = Library/WHFreeman/Rogawski_Calculus_Early_Transcendentals_Second_Edition/4_Applications_of_the_Derivative/4.5_L'Hopital's_Rule/4.5.22.pg
value = 1
max_attempts = -1
showMeAnother = 0
prPeriod = 0
counts_parent_grade = 0
att_to_open_children = 0 
problem_end
problem_start
problem_id = 3
source_file = Library/WHFreeman/Rogawski_Calculus_Early_Transcendentals_Second_Edition/4_Applications_of_the_Derivative/4.5_L'Hopital's_Rule/4.5.23.pg
value = 1
max_attempts = -1
showMeAnother = 0
prPeriod = 0
counts_parent_grade = 0
att_to_open_children = 0 
problem_end
`;

export const v1ProbList = (): void => {
    const result = new WebWorkDef(v1ProblemListDefFileContent);
    logger.info(JSON.stringify(result, null, 2));
};

export const v2ProbList = (): void => {
    const result = new WebWorkDef(v2ProblemListDefFileContent);
    logger.info(JSON.stringify(result, null, 2));
};
