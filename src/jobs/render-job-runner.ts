import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { loadConfig } from "../config.js";
import { prepareAlbumCards } from "../cardnews/planner.js";
import { renderCardnewsDesign } from "../canva/autofill-service.js";
import { exportDesignToPdf } from "../canva/export-service.js";
import { createRunReport, updateRunReport } from "./run-report.js";
import type { CardnewsInput } from "../types.js";

export async function runRenderJob(inputData: CardnewsInput): Promise<void> {
  const config = loadConfig();
  const { reportPath, report: initialReport } = await createRunReport(inputData, config);
  let report = initialReport;

  process.stdout.write(`runReport: ${reportPath}\n`);

  try {
    process.stdout.write("\n카드 준비 시작\n");
    const cards = await prepareAlbumCards([...inputData.albums], config.cacheDir);
    report = await updateRunReport(reportPath, report, {
      status: "prepared",
      cards,
    });

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
    report = await updateRunReport(reportPath, report, {
      status: "rendered",
      designId: renderResult.designId,
      editUrl: renderResult.editUrl,
      viewUrl: renderResult.viewUrl,
    });

    process.stdout.write(`designId: ${renderResult.designId}\n`);
    if (renderResult.editUrl) {
      process.stdout.write(`editUrl: ${renderResult.editUrl}\n`);
    }

    if (!inputData.skipCanvaEdit) {
      await waitForCanvaEdit();
    }

    process.stdout.write("\nPDF export 시작\n");
    const exportResult = await exportDesignToPdf(renderResult.designId, inputData.outputPath);
    report = await updateRunReport(reportPath, report, {
      status: "exported",
      pdfPath: exportResult.pdfPath,
    });

    process.stdout.write(`저장 완료: ${exportResult.pdfPath}\n`);
    process.stdout.write(`downloadUrl: ${exportResult.downloadUrl}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    await updateRunReport(reportPath, report, {
      status: "failed",
      error: message,
    });
    throw error;
  }
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
