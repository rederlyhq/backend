import JiraApi = require('jira-client');
import { RederlyJiraTicketOptions, IssueType } from './support-types';

import configurations from '../../configurations';
import logger from '../../utilities/logger';
class SupportController {
    // Initialize
    jira: JiraApi = new JiraApi({
        protocol: configurations.jira.protocol,
        host: configurations.jira.host,
        username: configurations.jira.email,
        password: configurations.jira.apiKey,
        apiVersion: configurations.jira.apiVersion,
        strictSSL: configurations.jira.strictSSL
    });

    createIssue({ summary = 'NO SUMMARY PROVIDED', projectKey = configurations.jira.projectKey, issueType = IssueType.STORY, description = 'NO DESCRIPTION PROVIDED' }: RederlyJiraTicketOptions): unknown {
        // https://developer.atlassian.com/server/jira/platform/jira-rest-api-examples/#:~:text=Creating%20an%20issue%20using%20the,ID%20of%20the%20issue%20type.
        return this.jira.addNewIssue({
            fields: {
                project:
                {
                    key: projectKey
                },
                summary: summary,
                description: description,
                issuetype: {
                    name: issueType
                }
            }
        };
        if (!configurations.jira.enabled) {
            logger.info(JSON.stringify(newIssueOptions, null, 2));
            return null;
        }
    }
}
const supportController = new SupportController();
export default supportController;
