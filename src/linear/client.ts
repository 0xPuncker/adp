import { LinearClient, LinearError, LinearErrorType } from "@linear/sdk";

const RATE_LIMIT_RETRY_MS = 2000;

export interface IssueResult {
  id: string;
  url: string;
  identifier: string;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof LinearError) {
      if (err.type === LinearErrorType.Ratelimited) {
        await new Promise((r) => setTimeout(r, RATE_LIMIT_RETRY_MS));
        return fn();
      }
      if (err.type === LinearErrorType.AuthenticationError) {
        throw new Error(
          "[adp] Linear authentication failed. Check that LINEAR_API_KEY is valid."
        );
      }
    }
    throw err;
  }
}

export class LinearClientWrapper {
  private readonly sdk: LinearClient;

  constructor(apiKey: string) {
    this.sdk = new LinearClient({ apiKey });
  }

  async createIssue(params: {
    teamId: string;
    title: string;
    stateId?: string;
  }): Promise<IssueResult> {
    return withRetry(async () => {
      const payload = await this.sdk.createIssue({
        teamId: params.teamId,
        title: params.title,
        ...(params.stateId ? { stateId: params.stateId } : {}),
      });
      const issue = await payload.issue;
      if (!issue) throw new Error("[adp] Linear createIssue returned no issue");
      return { id: issue.id, url: issue.url, identifier: issue.identifier };
    });
  }

  async updateIssue(
    id: string,
    patch: { stateId?: string; [key: string]: unknown }
  ): Promise<void> {
    return withRetry(async () => {
      await this.sdk.updateIssue(id, patch as Parameters<LinearClient["updateIssue"]>[1]);
    });
  }

  async createComment(issueId: string, body: string): Promise<void> {
    return withRetry(async () => {
      await this.sdk.createComment({ issueId, body });
    });
  }

  async resolveTeamId(name?: string): Promise<string> {
    return withRetry(async () => {
      const teams = await this.sdk.teams();
      if (!teams.nodes.length) throw new Error("[adp] No Linear teams found");
      if (name) {
        const match = teams.nodes.find(
          (t) => t.name.toLowerCase() === name.toLowerCase()
        );
        if (!match)
          throw new Error(`[adp] Linear team "${name}" not found`);
        return match.id;
      }
      return teams.nodes[0].id;
    });
  }

  async resolveStateId(teamId: string, stateName: string): Promise<string> {
    return withRetry(async () => {
      const states = await this.sdk.workflowStates({
        filter: { team: { id: { eq: teamId } }, name: { eq: stateName } },
      });
      if (!states.nodes.length)
        throw new Error(
          `[adp] Linear workflow state "${stateName}" not found for team ${teamId}`
        );
      return states.nodes[0].id;
    });
  }
}
