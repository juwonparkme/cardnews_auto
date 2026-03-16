import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import type { AppConfig } from "./types.js";

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
  const envPath = path.resolve(".env");

  if (!existsSync(envPath)) {
    return;
  }

  const raw = readFileSync(envPath, "utf8");

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
