import { existsSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import type { AppConfig } from "./types.js";

const ENV_PATH = path.resolve(".env");

loadDotEnv();

export function loadConfig(): AppConfig {
  return {
    canvaAccessToken: readEnv("CANVA_ACCESS_TOKEN"),
    canvaRefreshToken: readEnv("CANVA_REFRESH_TOKEN"),
    canvaClientId: readEnv("CANVA_CLIENT_ID"),
    canvaClientSecret: readEnv("CANVA_CLIENT_SECRET"),
    canvaRedirectUri: readEnv("CANVA_REDIRECT_URI"),
    brandTemplateId: readEnv("CANVA_BRAND_TEMPLATE_ID"),
    outputDir: readEnv("CARDNEWS_OUTPUT_DIR") ?? path.join(os.homedir(), "Desktop"),
    cacheDir: readEnv("CARDNEWS_CACHE_DIR") ?? path.join(os.homedir(), ".cache", "cardnews-auto"),
    spotifyClientId: readEnv("SPOTIFY_CLIENT_ID"),
    spotifyClientSecret: readEnv("SPOTIFY_CLIENT_SECRET"),
    openAiApiKey: readEnv("OPENAI_API_KEY"),
    openAiModel: readEnv("OPENAI_MODEL") ?? "gpt-5",
  };
}

export function resolveOutputPath(outputPath: string | undefined, title: string, outputDir: string): string {
  if (outputPath) {
    return path.resolve(outputPath);
  }

  const timestamp = new Date().toISOString().replace(/[:]/g, "-").replace(/\..+$/, "");
  const slug = slugify(title) || "cardnews";

  return path.join(outputDir, `${slug}-${timestamp}.pdf`);
}

export function updateDotEnv(updates: Record<string, string | undefined>): void {
  const lines = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8").split(/\r?\n/) : [];
  const remaining = new Map(
    Object.entries(updates).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line || line.trimStart().startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const nextValue = remaining.get(key);

    if (nextValue === undefined) {
      continue;
    }

    lines[index] = `${key}=${nextValue}`;
    remaining.delete(key);
  }

  for (const [key, value] of remaining) {
    lines.push(`${key}=${value}`);
  }

  const serialized = lines.join("\n").replace(/\n*$/, "\n");
  writeFileSync(ENV_PATH, serialized, "utf8");

  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === "string") {
      process.env[key] = value;
    } else {
      delete process.env[key];
    }
  }
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();

  return value ? value : undefined;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function loadDotEnv(): void {
  if (!existsSync(ENV_PATH)) {
    return;
  }

  const raw = readFileSync(ENV_PATH, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
