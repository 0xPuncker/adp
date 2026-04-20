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

// Enter alternate screen buffer for fullscreen experience
const enterAltScreen = () => process.stdout.write("\x1b[?1049h\x1b[H");
const exitAltScreen = () => process.stdout.write("\x1b[?1049l");

enterAltScreen();

// Ensure we leave alt screen on any exit
process.on("exit", exitAltScreen);
process.on("SIGINT", () => { exitAltScreen(); process.exit(0); });
process.on("SIGTERM", () => { exitAltScreen(); process.exit(0); });

const instance = render(
  <App cwd={cwd} refreshInterval={refreshInterval} />,
  { exitOnCtrlC: false }
);

instance.waitUntilExit().then(() => {
  exitAltScreen();
  process.exit(0);
});
