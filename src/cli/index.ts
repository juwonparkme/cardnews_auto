#!/usr/bin/env node

import process from "node:process";

import { collectRenderInput } from "./prompts.js";
import { loadConfig, resolveOutputPath } from "../config.js";
import type { RenderOptions } from "../types.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  switch (command) {
    case "render":
      await runRender(args.slice(1));
      return;
    default:
      fail(`알 수 없는 명령: ${command}`);
  }
}

async function runRender(args: string[]): Promise<void> {
  const config = loadConfig();
  const options = parseRenderOptions(args);

  const defaults = {
    outputPath: resolveOutputPath(options.outputPath, "cardnews", config.outputDir),
    templateId: config.brandTemplateId,
  };

  const input = await collectRenderInput(options, defaults);
  const outputPath = resolveOutputPath(options.outputPath, input.title, config.outputDir);
  const finalInput = { ...input, outputPath };

  process.stdout.write("\n수집 완료\n");
  process.stdout.write(`${JSON.stringify(finalInput, null, 2)}\n\n`);
  process.stdout.write("다음 단계는 5번 검색/스크래핑 구현임.\n");
}

function parseRenderOptions(args: string[]): RenderOptions {
  const options: RenderOptions = {
    skipCanvaEdit: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case "--output":
        options.outputPath = readNextValue(args, index, arg);
        index += 1;
        break;
      case "--template":
        options.templateId = readNextValue(args, index, arg);
        index += 1;
        break;
      case "--skip-canva-edit":
        options.skipCanvaEdit = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        fail(`알 수 없는 옵션: ${arg}`);
    }
  }

  return options;
}

function readNextValue(args: string[], index: number, option: string): string {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    fail(`${option} 값이 필요함.`);
  }

  return value;
}

function printHelp(): void {
  process.stdout.write(`cardnews CLI

사용법:
  cardnews render [--output <path>] [--template <id>] [--skip-canva-edit]

명령:
  render              카드뉴스 입력 수집

옵션:
  --output            PDF 저장 경로
  --template          Canva Brand Template ID
  --skip-canva-edit   Canva 편집 단계 건너뜀
  -h, --help          도움말
`);
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "알 수 없는 오류";
  fail(message);
});
