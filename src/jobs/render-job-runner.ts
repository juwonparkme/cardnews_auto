import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { loadConfig } from "../config.js";
import { prepareAlbumCards } from "../cardnews/planner.js";
import { renderCardnewsDesign } from "../canva/autofill-service.js";
import { exportDesignToPdf } from "../canva/export-service.js";
import type { CardnewsInput } from "../types.js";

export async function runRenderJob(inputData: CardnewsInput): Promise<void> {
  const config = loadConfig();

  process.stdout.write("\n카드 준비 시작\n");
  const cards = await prepareAlbumCards([...inputData.albums], config.cacheDir);

  if (inputData.prepareOnly) {
    process.stdout.write("\n준비 완료\n");
    process.stdout.write(`${JSON.stringify({ title: inputData.title, cards }, null, 2)}\n`);
    return;
  }

  const brandTemplateId = inputData.templateId ?? config.brandTemplateId;

  if (!brandTemplateId) {
    throw new Error("Canva template id 없음. --template 또는 CANVA_BRAND_TEMPLATE_ID 필요.");
  }

  process.stdout.write("\nCanva 렌더 시작\n");
  const renderResult = await renderCardnewsDesign(brandTemplateId, inputData.title, cards);

  process.stdout.write(`designId: ${renderResult.designId}\n`);
  if (renderResult.editUrl) {
    process.stdout.write(`editUrl: ${renderResult.editUrl}\n`);
  }

  if (!inputData.skipCanvaEdit) {
    await waitForCanvaEdit();
  }

  process.stdout.write("\nPDF export 시작\n");
  const exportResult = await exportDesignToPdf(renderResult.designId, inputData.outputPath);

  process.stdout.write(`저장 완료: ${exportResult.pdfPath}\n`);
  process.stdout.write(`downloadUrl: ${exportResult.downloadUrl}\n`);
}

async function waitForCanvaEdit(): Promise<void> {
  if (!input.isTTY) {
    return;
  }

  const rl = createInterface({ input, output });

  try {
    await rl.question("Canva 편집 후 Enter: ");
  } finally {
    rl.close();
  }
}
