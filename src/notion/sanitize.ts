// Matches Windows absolute paths: C:\..., D:\..., etc.
const WIN_PATH_RE = /[A-Za-z]:\\[^\s,;)'"]+/g;
// Matches Unix absolute paths: /home/..., /c/Users/..., /usr/..., etc.
const UNIX_PATH_RE = /\/(?:home|c|users?|usr|etc|opt|var|tmp)[^\s,;)'"]+/gi;
// Matches file:line references like src/foo/bar.ts:42 or path/to/file.go:123
const FILE_LINE_RE = /\S+\.\w{1,6}:\d+/g;

/**
 * Strips absolute file paths and file:line references from memory body text
 * before syncing to external services like Notion. Prevents leaking internal
 * codebase structure to third-party storage.
 */
export function sanitizeForNotion(text: string): string {
  return text
    .replace(WIN_PATH_RE, "<path>")
    .replace(UNIX_PATH_RE, "<path>")
    .replace(FILE_LINE_RE, "<file:line>");
}
