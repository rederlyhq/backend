import JiraApi = require('jira-client');
import { RederlyJiraTicketOptions, IssueType } from './support-types';

import configurations from '../../configurations';
import logger from '../../utilities/logger';
import WrappedError from '../../exceptions/wrapped-error';
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

    async createIssue({ summary = 'NO SUMMARY PROVIDED', projectKey = configurations.jira.projectKey, issueType = IssueType.STORY, description = 'NO DESCRIPTION PROVIDED' }: RederlyJiraTicketOptions): Promise<JiraApi.JsonResponse | null> {
        const newIssueOptions = {
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
        try {
            // https://developer.atlassian.com/server/jira/platform/jira-rest-api-examples/#:~:text=Creating%20an%20issue%20using%20the,ID%20of%20the%20issue%20type.
            return await this.jira.addNewIssue(newIssueOptions);
        } catch (e) {
            throw new WrappedError('Could not create support ticket', e);
        }
    }
}
const supportController = new SupportController();
export default supportController;
