export const REDERLY_SUPPORT_PROJECT_KEY = 'RS';
export enum IssueType {
    BUG = "Bug",
    STORY = "Story"
}

export interface RederlyJiraTicketOptions {
    projectKey?: string;
    summary?: string;
    issueType?: IssueType;
    description?: string;
}