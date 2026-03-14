import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type CacheRecord = {
  expiresAt: number;
  value: unknown;
};

export async function readCache<T>(cacheDir: string, namespace: string, key: string): Promise<T | undefined> {
  const filePath = getCachePath(cacheDir, namespace, key);

  try {
    const raw = await readFile(filePath, "utf8");
    const record = JSON.parse(raw) as CacheRecord;

    if (Date.now() > record.expiresAt) {
      return undefined;
    }

    return record.value as T;
  } catch {
    return undefined;
  }
}

export async function writeCache(
  cacheDir: string,
  namespace: string,
  key: string,
  value: unknown,
  ttlMs: number,
): Promise<void> {
  const filePath = getCachePath(cacheDir, namespace, key);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    JSON.stringify({
      expiresAt: Date.now() + ttlMs,
      value,
    }),
    "utf8",
  );
}

function getCachePath(cacheDir: string, namespace: string, key: string): string {
  const digest = createHash("sha1").update(key).digest("hex");

  return path.join(cacheDir, namespace, `${digest}.json`);
}
