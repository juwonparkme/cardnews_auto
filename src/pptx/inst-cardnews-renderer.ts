import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { formatAlbumTitle, formatArtistName, formatCoverTitle, formatSummary } from "../cardnews/template-text.js";
import { instCardnewsDefaults, instCardnewsLayout, type CardSlideData, type InstCardnewsDeckInput } from "./inst-cardnews-layout.js";

type PptxCtor = new () => any;

export async function renderInstCardnewsPptx(
  PptxGenJS: PptxCtor,
  input: InstCardnewsDeckInput,
  outputPath: string,
): Promise<string> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({
    name: instCardnewsLayout.name,
    width: instCardnewsLayout.width,
    height: instCardnewsLayout.height,
  });
  pptx.layout = instCardnewsLayout.name;
  pptx.author = "Codex";
  pptx.company = "juwonparkme";
  pptx.subject = "cardnews_auto pptx render";
  pptx.title = input.coverTitle;
  pptx.lang = "ko-KR";
  pptx.theme = {
    headFontFace: "Apple SD Gothic Neo",
    bodyFontFace: "Apple SD Gothic Neo",
  };

  const baseDir = process.cwd();
  const prepared = prepareDeckInput(input, baseDir);
  const { coverPng, endPng } = ensureTemplatePageAssets();

  addCoverSlide(pptx, prepared.coverTitle, coverPng);
  for (const card of prepared.cards) {
    addCardSlide(pptx, card);
  }
  addEndSlide(pptx, prepared, endPng);

  await pptx.writeFile({ fileName: outputPath, compression: true });
  return outputPath;
}

function prepareDeckInput(input: InstCardnewsDeckInput, baseDir: string) {
  return {
    coverTitle: formatCoverTitle(input.coverTitle || instCardnewsDefaults.coverTitle),
    endLead: input.endLead || instCardnewsDefaults.endLead,
    endBody: input.endBody || instCardnewsDefaults.endBody,
    endHandle: input.endHandle || instCardnewsDefaults.endHandle,
    endEmail: input.endEmail || instCardnewsDefaults.endEmail,
    cards: input.cards.map((card) => ({
      title: formatAlbumTitle(card.title, card.title),
      artist: formatArtistName(card.artist),
      type: card.type,
      summary: formatSummary(card.summary),
      imagePath: resolveFilePath(card.imagePath, baseDir),
    })),
  };
}

function addCoverSlide(pptx: any, coverTitle: string, coverPng: string): void {
  const slide = pptx.addSlide();
  slide.background = { color: "4D4A49" };
  slide.addImage({
    path: coverPng,
    x: 0,
    y: 0,
    w: instCardnewsLayout.width,
    h: instCardnewsLayout.height,
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.56,
    y: 5.14,
    w: 8.08,
    h: 0.98,
    line: { color: "2B2928", width: 1.1 },
    fill: { color: "FFF5D7" },
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.56,
    y: 6.10,
    w: 8.08,
    h: 5.15,
    line: { color: "2B2928", width: 1.1 },
    fill: { color: "D9FFAC" },
  });

  slide.addShape(pptx.ShapeType.chevron, {
    x: 6.48,
    y: 5.52,
    w: 1.34,
    h: 1.55,
    rotate: 90,
    line: { color: "2B2928", width: 1.1 },
    fill: { color: "F6B4BF" },
  });

  slide.addText("내 맘대로 추천하는", {
    x: 1.12,
    y: 5.47,
    w: 3.9,
    h: 0.4,
    fontFace: "Apple SD Gothic Neo",
    bold: true,
    fontSize: 17,
    color: "111111",
    margin: 0,
  });

  slide.addText(coverTitle, {
    x: 1.0,
    y: 6.55,
    w: 4.35,
    h: 3.0,
    fontFace: "Apple SD Gothic Neo",
    bold: true,
    fontSize: 43,
    color: "111111",
    margin: 0,
    breakLine: true,
    fit: "shrink",
    valign: "mid",
  });
}

function addCardSlide(pptx: any, card: CardSlideData): void {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFDF7" };

  slide.addImage({
    path: card.imagePath,
    x: instCardnewsLayout.imageRect.x,
    y: instCardnewsLayout.imageRect.y,
    w: instCardnewsLayout.imageRect.w,
    h: instCardnewsLayout.imageRect.h,
    sizing: {
      type: "cover",
      w: instCardnewsLayout.imageRect.w,
      h: instCardnewsLayout.imageRect.h,
    },
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: instCardnewsLayout.headerRect.x,
    y: instCardnewsLayout.headerRect.y,
    w: instCardnewsLayout.headerRect.w,
    h: instCardnewsLayout.headerRect.h,
    line: { color: "FFFFFF", transparency: 100 },
    fill: { color: "FFFFFF" },
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: instCardnewsLayout.summaryBoxRect.x,
    y: instCardnewsLayout.summaryBoxRect.y,
    w: instCardnewsLayout.summaryBoxRect.w,
    h: instCardnewsLayout.summaryBoxRect.h,
    rectRadius: 0.08,
    line: { color: "FFFFFF", transparency: 100 },
    fill: { color: "FFFFFF" },
  });

  slide.addShape(pptx.ShapeType.line, {
    x: instCardnewsLayout.divider.x,
    y: instCardnewsLayout.divider.y,
    w: instCardnewsLayout.divider.w,
    h: 0,
    line: { color: "111111", width: 1.3 },
  });

  slide.addShape(pptx.ShapeType.star12, {
    x: instCardnewsLayout.stickerRect.x,
    y: instCardnewsLayout.stickerRect.y,
    w: instCardnewsLayout.stickerRect.w,
    h: instCardnewsLayout.stickerRect.h,
    line: { color: "FFF6D9", transparency: 100 },
    fill: { color: "FFF6D9" },
  });

  slide.addText(card.title, {
    x: instCardnewsLayout.titleRect.x,
    y: instCardnewsLayout.titleRect.y,
    w: instCardnewsLayout.titleRect.w,
    h: instCardnewsLayout.titleRect.h,
    fontFace: "Apple SD Gothic Neo",
    bold: true,
    fontSize: 24,
    color: "111111",
    margin: 0,
    fit: "shrink",
    breakLine: false,
    valign: "mid",
  });

  slide.addText(card.artist, {
    x: instCardnewsLayout.artistRect.x,
    y: instCardnewsLayout.artistRect.y,
    w: instCardnewsLayout.artistRect.w,
    h: instCardnewsLayout.artistRect.h,
    fontFace: "Apple SD Gothic Neo",
    bold: true,
    fontSize: 17,
    color: "111111",
    margin: 0,
    fit: "shrink",
    breakLine: false,
    valign: "mid",
  });

  slide.addText(card.summary, {
    x: instCardnewsLayout.summaryRect.x,
    y: instCardnewsLayout.summaryRect.y,
    w: instCardnewsLayout.summaryRect.w,
    h: instCardnewsLayout.summaryRect.h,
    fontFace: "Apple SD Gothic Neo",
    bold: true,
    fontSize: 11.5,
    color: "111111",
    margin: 0,
    fit: "shrink",
    breakLine: true,
    valign: "top",
    lineSpacingMultiple: 1.1,
  });

  slide.addText(card.type, {
    x: instCardnewsLayout.stickerRect.x + 0.15,
    y: instCardnewsLayout.stickerRect.y + 0.24,
    w: instCardnewsLayout.stickerRect.w - 0.3,
    h: instCardnewsLayout.stickerRect.h - 0.3,
    fontFace: "Apple SD Gothic Neo",
    bold: true,
    fontSize: 15,
    color: "111111",
    margin: 0,
    rotate: -12,
    align: "center",
    valign: "mid",
    fit: "shrink",
  });
}

function addEndSlide(
  pptx: any,
  prepared: ReturnType<typeof prepareDeckInput>,
  endPng: string,
): void {
  const slide = pptx.addSlide();
  slide.background = { color: "4D4A49" };
  slide.addImage({
    path: endPng,
    x: 0,
    y: 0,
    w: instCardnewsLayout.width,
    h: instCardnewsLayout.height,
  });

  slide.addText("END", {
    x: 3.75,
    y: 1.58,
    w: 2.0,
    h: 0.48,
    fontFace: "Apple SD Gothic Neo",
    bold: true,
    fontSize: 28,
    color: "FFF5D7",
    align: "center",
    margin: 0,
  });

  slide.addText(`${prepared.endLead}\n${prepared.endBody}`, {
    x: 1.72,
    y: 2.52,
    w: 5.8,
    h: 1.0,
    fontFace: "Apple SD Gothic Neo",
    bold: true,
    fontSize: 16,
    color: "FFF5D7",
    align: "center",
    margin: 0,
    breakLine: true,
    lineSpacingMultiple: 1.1,
  });

  slide.addText(`${prepared.endHandle}\n${prepared.endEmail}`, {
    x: 1.4,
    y: 8.6,
    w: 6.2,
    h: 0.7,
    fontFace: "Apple SD Gothic Neo",
    bold: true,
    fontSize: 13,
    color: "FFF5D7",
    align: "center",
    margin: 0,
    breakLine: true,
  });
}

function resolveFilePath(filePath: string, baseDir: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(baseDir, filePath);
}

function ensureTemplatePageAssets(): { coverPng: string; endPng: string } {
  const outDir = path.join(os.tmpdir(), "cardnews-pptx-template-pages");
  const coverPng = path.join(outDir, "page-01.png");
  const endPng = path.join(outDir, "page-08.png");

  if (fs.existsSync(coverPng) && fs.existsSync(endPng)) {
    return { coverPng, endPng };
  }

  fs.mkdirSync(outDir, { recursive: true });
  const templatePdf = path.join(process.cwd(), "src", "inst_cardnews.pdf");
  const scriptPath = path.join(process.cwd(), "scripts", "render-pdf-pages.swift");
  const result = spawnSync("swift", [scriptPath, templatePdf, outDir, "1", "8"], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "template page render failed");
  }

  if (!fs.existsSync(coverPng) || !fs.existsSync(endPng)) {
    throw new Error("template page pngs missing");
  }

  return { coverPng, endPng };
}
