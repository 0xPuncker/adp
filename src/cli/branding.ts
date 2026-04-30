/**
 * Shared CLI branding for non-TUI commands (update, uninstall, help, etc.).
 *
 * Mirrors the Ink TUI's visual language — rounded panels, theme colors, status icons —
 * but renders directly to stdout via ANSI escapes so we don't pull a full Ink runtime
 * into one-shot commands. Keep this in sync with `src/ui/theme.ts` colors.
 */

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const ITALIC = "\x1b[3m";

// ANSI 256-color approximations of the TUI theme.
// Source HEX values are in src/ui/theme.ts — when those move, mirror here.
const C = {
  brand: 173, // #d77757 warm orange
  accent: 147, // #b1b9f9 soft blue
  success: 41, // green
  error: 167, // red
  warning: 178, // amber
  info: 75, // blue
  text: 252, // light grey
  dim: 244, // mid grey
  subtle: 240, // dark grey
  border: 240,
} as const;

type ColorName = keyof typeof C;

const fg = (n: number): string => `\x1b[38;5;${n}m`;

export const palette = {
  brand: fg(C.brand),
  accent: fg(C.accent),
  success: fg(C.success),
  error: fg(C.error),
  warning: fg(C.warning),
  info: fg(C.info),
  text: fg(C.text),
  dim: fg(C.dim),
  subtle: fg(C.subtle),
  border: fg(C.border),
  reset: RESET,
  bold: BOLD,
  dimMod: DIM,
  italic: ITALIC,
} as const;

const ICON = {
  ok: `${palette.success}✓${RESET}`,
  fail: `${palette.error}✗${RESET}`,
  warn: `${palette.warning}!${RESET}`,
  info: `${palette.info}·${RESET}`,
  arrow: `${palette.accent}▸${RESET}`,
  bullet: `${palette.dim}•${RESET}`,
};

function termWidth(): number {
  const w = process.stdout.columns ?? 80;
  return Math.max(40, Math.min(w, 100));
}

function visibleLength(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}

function padVisible(s: string, target: number): string {
  const pad = target - visibleLength(s);
  return pad > 0 ? s + " ".repeat(pad) : s;
}

export interface BoxOptions {
  title?: string;
  titleColor?: ColorName;
  borderColor?: ColorName;
  width?: number;
}

/**
 * Render a rounded-border panel matching the Ink TUI's `<Panel/>` component.
 * Body lines are clipped to the inner width.
 */
export function box(lines: string[], opts: BoxOptions = {}): string {
  const width = opts.width ?? termWidth();
  const innerWidth = width - 4; // 2 borders + 2 spaces of padding
  const border = palette[opts.borderColor ?? "border"];
  const titleColor = palette[opts.titleColor ?? "brand"];

  const top = `${border}╭${"─".repeat(width - 2)}╮${RESET}`;
  const bottom = `${border}╰${"─".repeat(width - 2)}╯${RESET}`;
  const empty = `${border}│${RESET} ${" ".repeat(innerWidth)} ${border}│${RESET}`;

  const out: string[] = [top];
  if (opts.title) {
    const title = `${BOLD}${titleColor}${opts.title}${RESET}`;
    out.push(`${border}│${RESET} ${padVisible(title, innerWidth)} ${border}│${RESET}`);
    out.push(empty);
  }
  // Caller may pass a single multi-line string per array slot — flatten on \n
  // so the rendered box has one frame row per logical line.
  const flat = lines.flatMap((l) => l.split("\n"));
  for (const line of flat) {
    // Clip if too wide — preserve ANSI codes that occur before the visible cut point.
    let body = line;
    if (visibleLength(body) > innerWidth) {
      const plain = body.replace(/\x1b\[[0-9;]*m/g, "");
      body = plain.slice(0, innerWidth - 1) + "…";
    }
    out.push(`${border}│${RESET} ${padVisible(body, innerWidth)} ${border}│${RESET}`);
  }
  out.push(bottom);
  return out.join("\n");
}

export function banner(title: string, subtitle?: string): string {
  const width = termWidth();
  const lines = [`${BOLD}${palette.brand}${title}${RESET}`];
  if (subtitle) {
    lines.push(`${palette.dim}${subtitle}${RESET}`);
  }
  return box(lines, { width, borderColor: "brand" });
}

export function divider(label?: string): string {
  const width = termWidth();
  if (!label) return `${palette.subtle}${"─".repeat(width)}${RESET}`;
  const dash = "─".repeat(Math.max(0, width - visibleLength(label) - 4));
  return `${palette.subtle}── ${RESET}${BOLD}${palette.accent}${label}${RESET} ${palette.subtle}${dash}${RESET}`;
}

export function ok(msg: string): string {
  return `  ${ICON.ok} ${msg}`;
}
export function fail(msg: string): string {
  return `  ${ICON.fail} ${msg}`;
}
export function warn(msg: string): string {
  return `  ${ICON.warn} ${msg}`;
}
export function info(msg: string): string {
  return `  ${ICON.info} ${palette.dim}${msg}${RESET}`;
}
export function bullet(msg: string): string {
  return `  ${ICON.bullet} ${msg}`;
}

/**
 * Two-column key/value list with consistent alignment, matching the TUI's
 * Sprint detail / Status panel rows.
 */
export function kv(rows: Array<[string, string]>, keyColor: ColorName = "accent"): string {
  const keyW = Math.max(...rows.map(([k]) => visibleLength(k))) + 2;
  return rows
    .map(([k, v]) => `  ${palette[keyColor]}${BOLD}${k.padEnd(keyW)}${RESET}${palette.text}${v}${RESET}`)
    .join("\n");
}

/**
 * Render a section block: divider with label, then content.
 */
export function section(label: string, content: string): string {
  return `${divider(label)}\n${content}\n`;
}

/** Plain newline-separated print, with leading + trailing blank line. */
export function print(...blocks: string[]): void {
  process.stdout.write("\n" + blocks.join("\n") + "\n\n");
}
