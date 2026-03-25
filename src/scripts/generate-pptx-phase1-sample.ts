import { instCardnewsSampleDeck } from "../pptx/inst-cardnews-layout.js";
import { renderInstCardnewsPptx } from "../pptx/inst-cardnews-renderer.js";

async function main(): Promise<void> {
  const { default: PptxGenJSImport } = await import("pptxgenjs");
  const PptxGenJS = PptxGenJSImport as unknown as new () => any;
  const outputPath = process.argv[2] ?? "/tmp/cardnews-phase1-sample.pptx";
  await renderInstCardnewsPptx(PptxGenJS, instCardnewsSampleDeck, outputPath);
  process.stdout.write(`${outputPath}\n`);
}

void main();
