import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolveRunDir } from "../config.js";
import type { AppConfig, CardnewsInput, RenderRunReport } from "../types.js";

export async function createRunReport(
  input: CardnewsInput,
  config: AppConfig,
): Promise<{ report: RenderRunReport; reportPath: string }> {
  const reportDir = resolveRunDir(input.title, config.runsDir);
  const reportPath = path.join(reportDir, "run-summary.json");
  const now = new Date().toISOString();

  const report: RenderRunReport = {
    runId: path.basename(reportDir),
    title: input.title,
    requestedAlbums: [...input.albums],
    outputPath: input.outputPath,
    templateId: input.templateId,
    prepareOnly: input.prepareOnly,
    skipCanvaEdit: input.skipCanvaEdit,
    status: "started",
    startedAt: now,
    updatedAt: now,
  };

  await writeRunReport(reportPath, report);

  return { report, reportPath };
}

export async function updateRunReport(
  reportPath: string,
  report: RenderRunReport,
  patch: Partial<RenderRunReport>,
): Promise<RenderRunReport> {
  const next: RenderRunReport = {
    ...report,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await writeRunReport(reportPath, next);

  return next;
}

async function writeRunReport(reportPath: string, report: RenderRunReport): Promise<void> {
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}
