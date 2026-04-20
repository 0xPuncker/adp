/** ADP color theme — inspired by openclaude's warm palette */
export const theme = {
  brand: "#d77757",
  accent: "#b1b9f9",
  success: "#4eba65",
  error: "#ff6b80",
  warning: "#ffc107",
  info: "#61afef",
  dim: "#666666",
  subtle: "#505050",
  border: "#555555",
  text: "#cccccc",
  bright: "#ffffff",
} as const;

/** Sprint status visual config */
export const sprintStyle: Record<string, { icon: string; color: string }> = {
  contract: { icon: "◇", color: theme.dim },
  build: { icon: "●", color: theme.info },
  qa: { icon: "◉", color: theme.warning },
  done: { icon: "✓", color: theme.success },
  failed: { icon: "✗", color: theme.error },
};

/** Activity type visual config — fallback for any unknown type */
export const activityStyle: Record<string, { icon: string; color: string }> = {
  sprint_start: { icon: "▶", color: theme.info },
  sprint_end: { icon: "■", color: theme.success },
  sensor_pass: { icon: "✓", color: theme.success },
  sensor_fail: { icon: "✗", color: theme.error },
  commit: { icon: "⊙", color: theme.accent },
  error: { icon: "!", color: theme.error },
  info: { icon: "·", color: theme.dim },
  // Extended types from SKILL.md sessions
  init: { icon: "◆", color: theme.brand },
  run_start: { icon: "▶", color: theme.success },
  run_end: { icon: "■", color: theme.success },
  phase_start: { icon: "→", color: theme.info },
  phase_end: { icon: "✓", color: theme.success },
  pause: { icon: "⏸", color: theme.warning },
  resume: { icon: "▶", color: theme.success },
  blocked: { icon: "⊘", color: theme.error },
};

/** Fallback for unknown activity types */
export const defaultActivityStyle = { icon: "·", color: theme.dim };

/** Pipeline status visual config — handles any status string */
export const statusStyle: Record<string, { label: string; color: string }> = {
  idle: { label: "IDLE", color: theme.dim },
  running: { label: "RUNNING", color: theme.success },
  paused: { label: "PAUSED", color: theme.warning },
  blocked: { label: "BLOCKED", color: theme.error },
  awaiting_user: { label: "AWAITING", color: theme.warning },
  completed: { label: "COMPLETED", color: theme.success },
};

/** Fallback for unknown statuses */
export const defaultStatusStyle = { label: "UNKNOWN", color: theme.dim };

/** Unicode block characters for progress bars */
const BLOCKS = [" ", "▏", "▎", "▍", "▌", "▋", "▊", "▉", "█"];

export function progressBar(ratio: number, width: number): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  const filled = clamped * width;
  const full = Math.floor(filled);
  const partial = Math.round((filled - full) * 8);
  const empty = width - full - (partial > 0 ? 1 : 0);
  return BLOCKS[8].repeat(full) + (partial > 0 ? BLOCKS[partial] : "") + " ".repeat(Math.max(0, empty));
}
