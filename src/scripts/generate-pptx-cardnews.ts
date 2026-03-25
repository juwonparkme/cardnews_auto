import fs from "node:fs";
import path from "node:path";

import { renderInstCardnewsPptx } from "../pptx/inst-cardnews-renderer.js";
import type { InstCardnewsDeckInput } from "../pptx/inst-cardnews-layout.js";

async function main(): Promise<void> {
  const { default: PptxGenJSImport } = await import("pptxgenjs");
  const PptxGenJS = PptxGenJSImport as unknown as new () => any;

  const inputPath = process.argv[2];
  const outputPath = process.argv[3] ?? "/tmp/cardnews-rendered.pptx";

  if (!inputPath) {
    throw new Error("usage: node dist/scripts/generate-pptx-cardnews.js <input.json> [output.pptx]");
  }

  const jsonPath = path.resolve(process.cwd(), inputPath);
  const input = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as InstCardnewsDeckInput;
  const finalOutputPath = path.resolve(process.cwd(), outputPath);

  await renderInstCardnewsPptx(PptxGenJS, input, finalOutputPath);
  process.stdout.write(`${finalOutputPath}\n`);
}

void main();
