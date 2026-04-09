import { readFileSync } from "node:fs";
import path from "node:path";

import { loadConfig } from "../config.js";

const promptCache = new Map<string, string>();

export function loadPrompt(relativePath: string): string {
  const config = loadConfig();
  const fullPath = path.resolve(config.promptsDir, relativePath);
  const cached = promptCache.get(fullPath);

  if (cached) {
    return cached;
  }

  const value = readFileSync(fullPath, "utf8").trim();
  promptCache.set(fullPath, value);

  return value;
}
