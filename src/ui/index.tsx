import React from "react";
import { render } from "ink";
import { App } from "./app.js";

const args = process.argv.slice(2);
let cwd = process.cwd();

// Parse --cwd flag
const cwdIdx = args.indexOf("--cwd");
if (cwdIdx !== -1 && args[cwdIdx + 1]) {
  cwd = args[cwdIdx + 1];
}

// Parse --refresh flag (in ms)
let refreshInterval = 3000;
const refIdx = args.indexOf("--refresh");
if (refIdx !== -1 && args[refIdx + 1]) {
  refreshInterval = parseInt(args[refIdx + 1], 10) || 3000;
}

// Fullscreen (alt screen) — disabled by default on MSYS/mintty, enable with --fullscreen
const isMsys = !!process.env.MSYSTEM || !!process.env.TERM_PROGRAM?.match(/mintty/i);
const forceFullscreen = args.includes("--fullscreen");
const forceNoFullscreen = args.includes("--no-fullscreen");
const useAltScreen = forceFullscreen || (!forceNoFullscreen && !isMsys);

if (useAltScreen) {
  process.stdout.write("\x1b[?1049h\x1b[H");
  const exitAltScreen = () => process.stdout.write("\x1b[?1049l");
  process.on("exit", exitAltScreen);
  process.on("SIGINT", () => { exitAltScreen(); process.exit(0); });
  process.on("SIGTERM", () => { exitAltScreen(); process.exit(0); });
}

const instance = render(
  <App cwd={cwd} refreshInterval={refreshInterval} />,
  { exitOnCtrlC: false }
);

instance.waitUntilExit().then(() => {
  if (useAltScreen) {
    process.stdout.write("\x1b[?1049l");
  }
  process.exit(0);
});
