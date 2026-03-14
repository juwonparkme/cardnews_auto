import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function downloadImage(url: string, directory?: string): Promise<string> {
  const outputDir = directory ?? path.join(os.tmpdir(), "cardnews-auto-assets");
  const extension = detectExtension(url);
  const filePath = path.join(outputDir, `cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`);

  await mkdir(outputDir, { recursive: true });

  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) cardnews-auto/0.1.0",
      accept: "image/*,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`이미지 다운로드 실패: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await writeFile(filePath, Buffer.from(arrayBuffer));

  return filePath;
}

function detectExtension(url: string): string {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = match?.[1]?.toLowerCase();

  if (ext && ["jpg", "jpeg", "png", "webp", "gif", "heic", "tiff"].includes(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }

  return "jpg";
}
