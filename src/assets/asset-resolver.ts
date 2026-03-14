import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import type { AlbumInput, AlbumSourceRecord } from "../types.js";
import { downloadImage } from "./image-fetcher.js";

export async function resolveCoverAssetPath(inputAlbum: AlbumInput, sourceRecord: AlbumSourceRecord): Promise<string | undefined> {
  if (inputAlbum.imagePath) {
    await assertFileExists(inputAlbum.imagePath);
    return inputAlbum.imagePath;
  }

  if (sourceRecord.coverImageUrl) {
    try {
      return await downloadImage(sourceRecord.coverImageUrl);
    } catch {
      // fallback below
    }
  }

  if (!input.isTTY) {
    return undefined;
  }

  const rl = createInterface({ input, output });

  try {
    const answer = (await rl.question(
      `커버 이미지를 찾지 못함 - ${sourceRecord.albumTitle} / ${sourceRecord.artistName} 파일 경로 입력 (없으면 Enter): `,
    )).trim();

    if (!answer) {
      return undefined;
    }

    await assertFileExists(answer);
    return answer;
  } finally {
    rl.close();
  }
}

async function assertFileExists(filePath: string): Promise<void> {
  await access(filePath, constants.R_OK);
}
