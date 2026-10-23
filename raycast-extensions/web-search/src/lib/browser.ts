import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { promisify } from "node:util";
import type { Intent } from "./classify";

const execFileAsync = promisify(execFile);
const OPEN_BINARY = "/usr/bin/open";
export const DEFAULT_BROWSER_PATH = "/Applications/Helium.app";

export function resolveBrowserPath(configured: string | undefined, home = homedir()): string {
  const path = configured?.trim() || DEFAULT_BROWSER_PATH;
  return path === "~" || path.startsWith("~/") ? home + path.slice(1) : path;
}

/** Arguments for `open`; every value is its own argv entry, so nothing passes through a shell. */
export function buildOpenArgs(browserPath: string, intent: Intent): string[] {
  const args = ["-na", browserPath, "--args", "--new-window"];
  if (intent.kind !== "blank") args.push(intent.url);
  return args;
}

export async function openInBrowser(browserPath: string, intent: Intent): Promise<void> {
  await execFileAsync(OPEN_BINARY, buildOpenArgs(browserPath, intent), { timeout: 10_000 });
}
