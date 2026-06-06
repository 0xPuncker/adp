import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LinearClientWrapper } from "./client.js";
import { AuthenticationLinearError, RatelimitedLinearError } from "@linear/sdk";

function makeTeam(id: string, name: string) {
  return { id, name };
}

function makeState(id: string, name: string) {
  return { id, name };
}

function mockSdk(overrides: Record<string, unknown> = {}) {
  return {
    createIssue: vi.fn().mockResolvedValue({
      issue: Promise.resolve({ id: "issue-1", url: "https://linear.app/i/1", identifier: "ENG-1" }),
    }),
    updateIssue: vi.fn().mockResolvedValue({}),
    createComment: vi.fn().mockResolvedValue({}),
    teams: vi.fn().mockResolvedValue({ nodes: [makeTeam("team-1", "Engineering")] }),
    workflowStates: vi.fn().mockResolvedValue({ nodes: [makeState("state-1", "In Progress")] }),
    ...overrides,
  };
}

function makeWrapper(sdkOverrides: Record<string, unknown> = {}): {
  wrapper: LinearClientWrapper;
  sdk: ReturnType<typeof mockSdk>;
} {
  const sdk = mockSdk(sdkOverrides);
  const wrapper = new LinearClientWrapper("test-key");
  (wrapper as unknown as { sdk: unknown }).sdk = sdk;
  return { wrapper, sdk };
}

describe("LinearClientWrapper — createIssue", () => {
  it("returns id, url, identifier on success (REQ-02.1)", async () => {
    const { wrapper } = makeWrapper();
    const result = await wrapper.createIssue({ teamId: "team-1", title: "[ADP] feature" });
    expect(result).toEqual({ id: "issue-1", url: "https://linear.app/i/1", identifier: "ENG-1" });
  });
});

describe("LinearClientWrapper — updateIssue", () => {
  it("calls sdk.updateIssue with correct args (REQ-02.2)", async () => {
    const { wrapper, sdk } = makeWrapper();
    await wrapper.updateIssue("issue-1", { stateId: "done-state" });
    expect(sdk.updateIssue).toHaveBeenCalledWith("issue-1", { stateId: "done-state" });
  });
});

describe("LinearClientWrapper — createComment", () => {
  it("calls sdk.createComment with issueId and body (REQ-02.3)", async () => {
    const { wrapper, sdk } = makeWrapper();
    await wrapper.createComment("issue-1", "✓ Sprint 1 — score 92/100");
    expect(sdk.createComment).toHaveBeenCalledWith({ issueId: "issue-1", body: "✓ Sprint 1 — score 92/100" });
  });
});

describe("LinearClientWrapper — resolveTeamId (REQ-02.6)", () => {
  it("returns first team id when no name given", async () => {
    const { wrapper } = makeWrapper();
    expect(await wrapper.resolveTeamId()).toBe("team-1");
  });

  it("matches by name (case-insensitive)", async () => {
    const { wrapper } = makeWrapper({
      teams: vi.fn().mockResolvedValue({
        nodes: [makeTeam("team-1", "Engineering"), makeTeam("team-2", "Design")],
      }),
    });
    expect(await wrapper.resolveTeamId("design")).toBe("team-2");
  });

  it("throws when team name not found", async () => {
    const { wrapper } = makeWrapper();
    await expect(wrapper.resolveTeamId("nonexistent")).rejects.toThrow('Linear team "nonexistent" not found');
  });
});

describe("LinearClientWrapper — resolveStateId (REQ-02.7)", () => {
  it("returns matching state id", async () => {
    const { wrapper } = makeWrapper();
    expect(await wrapper.resolveStateId("team-1", "In Progress")).toBe("state-1");
  });

  it("throws when state not found", async () => {
    const { wrapper } = makeWrapper({
      workflowStates: vi.fn().mockResolvedValue({ nodes: [] }),
    });
    await expect(wrapper.resolveStateId("team-1", "Unknown")).rejects.toThrow("not found");
  });
});

describe("LinearClientWrapper — error handling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("surfaces AuthenticationError as human-readable message without raw stack (REQ-02.5)", async () => {
    const authErr = new AuthenticationLinearError({ message: "auth failed" }, []);
    const { wrapper } = makeWrapper({
      createIssue: vi.fn().mockRejectedValue(authErr),
    });
    const err = await wrapper.createIssue({ teamId: "t", title: "x" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Linear authentication failed");
    expect((err as Error).message).not.toContain("auth failed");
  });

  it("retries once after 2s on RatelimitedError (REQ-02.4)", async () => {
    const rateErr = new RatelimitedLinearError({ message: "rate limited" }, []);
    const createIssueMock = vi
      .fn()
      .mockRejectedValueOnce(rateErr)
      .mockResolvedValue({
        issue: Promise.resolve({ id: "i-2", url: "https://linear.app/i/2", identifier: "ENG-2" }),
      });

    const { wrapper } = makeWrapper({ createIssue: createIssueMock });

    const promise = wrapper.createIssue({ teamId: "team-1", title: "test" });
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;
    expect(createIssueMock).toHaveBeenCalledTimes(2);
    expect(result.id).toBe("i-2");
  });
});
