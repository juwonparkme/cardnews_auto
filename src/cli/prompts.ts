import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import type { AlbumInput, CardnewsInput, RenderOptions } from "../types.js";

const ALBUM_COUNT = 7;

export async function collectRenderInput(
  options: RenderOptions,
  defaults: { outputPath: string; templateId?: string },
): Promise<CardnewsInput> {
  if (!input.isTTY) {
    return collectRenderInputFromPipe(options, defaults);
  }

  const rl = createInterface({ input, output });

  try {
    const title = await askRequired(rl, "카드뉴스 제목");
    const albums: AlbumInput[] = [];

    for (let index = 0; index < ALBUM_COUNT; index += 1) {
      output.write(`\n[앨범 ${index + 1}/${ALBUM_COUNT}]\n`);

      const albumName = await askRequired(rl, "앨범명");
      const artistName = await askRequired(rl, "가수명");

      albums.push({ albumName, artistName });
    }

    const outputPath = await askOptional(rl, "PDF 저장 경로", defaults.outputPath);
    const templateId = await askOptional(rl, "Canva template id", options.templateId ?? defaults.templateId ?? "");

    return {
      title,
      albums: albums as CardnewsInput["albums"],
      outputPath,
      templateId: templateId || undefined,
      skipCanvaEdit: options.skipCanvaEdit,
      prepareOnly: options.prepareOnly,
    };
  } finally {
    rl.close();
  }
}

async function collectRenderInputFromPipe(
  options: RenderOptions,
  defaults: { outputPath: string; templateId?: string },
): Promise<CardnewsInput> {
  const lines = (await readAllStdin())
    .split(/\r?\n/)
    .map((line) => line.trim());
  let cursor = 0;

  const title = readRequiredLine(lines, cursor++, "카드뉴스 제목");
  const albums: AlbumInput[] = [];

  for (let index = 0; index < ALBUM_COUNT; index += 1) {
    const albumName = readRequiredLine(lines, cursor++, `앨범 ${index + 1} 앨범명`);
    const artistName = readRequiredLine(lines, cursor++, `앨범 ${index + 1} 가수명`);

    albums.push({ albumName, artistName });
  }

  const outputPath = lines[cursor++] || defaults.outputPath;
  const templateId = lines[cursor++] || options.templateId || defaults.templateId || "";

  return {
    title,
    albums: albums as CardnewsInput["albums"],
    outputPath,
    templateId: templateId || undefined,
    skipCanvaEdit: options.skipCanvaEdit,
    prepareOnly: options.prepareOnly,
  };
}

async function askRequired(rl: ReturnType<typeof createInterface>, label: string): Promise<string> {
  while (true) {
    const answer = (await rl.question(`${label}: `)).trim();

    if (answer) {
      return answer;
    }

    output.write(`${label}은(는) 비울 수 없음.\n`);
  }
}

async function askOptional(
  rl: ReturnType<typeof createInterface>,
  label: string,
  defaultValue: string,
): Promise<string> {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = (await rl.question(`${label}${suffix}: `)).trim();

  return answer || defaultValue;
}

async function readAllStdin(): Promise<string> {
  const chunks: string[] = [];

  for await (const chunk of input) {
    chunks.push(String(chunk));
  }

  return chunks.join("");
}

function readRequiredLine(lines: string[], index: number, label: string): string {
  const value = lines[index];

  if (!value) {
    throw new Error(`${label} 입력이 부족함.`);
  }

  return value;
}
