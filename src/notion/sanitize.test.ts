import { describe, it, expect } from "vitest";
import { sanitizeForNotion } from "./sanitize.js";

describe("sanitizeForNotion", () => {
  it("replaces Windows absolute paths", () => {
    expect(sanitizeForNotion("See C:\\Users\\User\\Documents\\Claude\\adp\\src\\foo.ts for details"))
      .toBe("See <path> for details");
  });

  it("replaces Unix absolute paths", () => {
    expect(sanitizeForNotion("Found at /home/user/project/src/bar.ts"))
      .toBe("Found at <path>");
  });

  it("replaces /c/Users style WSL paths", () => {
    expect(sanitizeForNotion("path: /c/Users/User/project/file.ts"))
      .toBe("path: <path>");
  });

  it("replaces file:line references", () => {
    expect(sanitizeForNotion("see src/harness/engine.ts:42 and config.ts:10"))
      .toBe("see <file:line> and <file:line>");
  });

  it("leaves plain text unchanged", () => {
    const plain = "Use critical-only clarification mode for this project";
    expect(sanitizeForNotion(plain)).toBe(plain);
  });

  it("handles empty string", () => {
    expect(sanitizeForNotion("")).toBe("");
  });

  it("strips multiple occurrences in one pass", () => {
    const input = "From C:\\Users\\foo\\a.ts:1 and /home/bar/b.ts:99 — done";
    const out = sanitizeForNotion(input);
    expect(out).not.toMatch(/C:\\|\/home/);
    expect(out).not.toMatch(/:\d+/);
  });
});
