import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { CanvaClient } from "./client.js";
import type { CanvaExportResult } from "../types.js";

export async function exportDesignToPdf(designId: string, outputPath: string): Promise<CanvaExportResult> {
  const client = new CanvaClient();
  const result = await client.createPdfExportJob(designId);

  await mkdir(path.dirname(outputPath), { recursive: true });

  const response = await fetch(result.downloadUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) cardnews-auto/0.1.0",
    },
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(`PDF 다운로드 실패: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await writeFile(outputPath, Buffer.from(arrayBuffer));

  return {
    ...result,
    pdfPath: outputPath,
  };
}
