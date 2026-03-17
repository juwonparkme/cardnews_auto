import { loadConfig } from "../config.js";

const SUMMARY_PROMPT = [
  "아래 정보를 바탕으로 카드뉴스용 앨범 소개문을 써.",
  "조건:",
  "- 한국어",
  "- 2문장",
  "- 카드뉴스 본문 3줄 분량",
  "- 총 70~110자 안팎",
  "- 첫 문장: 장르, 사운드, 리듬, 보컬 중심",
  "- 둘째 문장: 무드, 정서, 전개 중심",
  "- 소개글이 있으면 우선 참고",
  "- 소개글이 부족하면 앨범명과 가수명에서 읽히는 분위기를 인상 묘사로만 보완 가능",
  "- 홍보성 과장 금지",
  "- 발매일, 데뷔 시기, 차트, 성과, 협업, 팬덤 언급 금지",
  "- 사실 단정이 어렵다면 '~처럼 들린다', '~무드가 난다'처럼 표현",
  "- 앨범명/가수명 반복 최소화",
].join("\n");

const MIN_SUMMARY_LENGTH = 68;
const MAX_SUMMARY_LENGTH = 130;

const MUSIC_HINTS = [
  /리듬/u,
  /사운드/u,
  /보컬/u,
  /멜로디/u,
  /무드/u,
  /감성/u,
  /그루브/u,
  /신스/u,
  /퍼커션/u,
  /베이스/u,
  /브라스/u,
  /하모니/u,
  /Harmony/i,
  /가성/u,
  /몽환/u,
  /세련/u,
  /상큼/u,
  /질주감/u,
  /코러스/u,
  /하우스/u,
  /재즈/u,
  /소울/u,
  /록/u,
  /팝/u,
  /R&B/i,
  /UK Garage/i,
  /Jersey Club/i,
  /Breakbeat/i,
  /Euro Pop/i,
];

const BANNED_HINTS = [
  /\d{4}년/u,
  /\d{1,2}월/u,
  /\d{1,2}일/u,
  /데뷔/u,
  /차트/u,
  /기록/u,
  /발매/u,
  /협업/u,
  /선주문/u,
  /밀리언셀러/u,
  /스트리밍/u,
  /뮤직비디오/u,
  /팬송/u,
  /성과/u,
  /인기/u,
];

type ResponsesApiResponse = {
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

export async function summarizeAlbumIntro(intro: string, albumTitle: string, artistName: string): Promise<string> {
  const config = loadConfig();
  const cleaned = intro.trim();

  if (!cleaned && !config.openAiApiKey) {
    return "";
  }

  if (!config.openAiApiKey) {
    return fallbackSummary(cleaned, albumTitle, artistName);
  }

  let response: Response;

  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.openAiApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.openAiModel,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: SUMMARY_PROMPT }],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: cleaned
                  ? `앨범명: ${albumTitle}\n가수명: ${artistName}\n\n[앨범 소개]\n${cleaned}`
                  : `앨범명: ${albumTitle}\n가수명: ${artistName}\n\n[앨범 소개]\n없음`,
              },
            ],
          },
        ],
        text: {
          format: {
            type: "text",
          },
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return cleaned ? fallbackSummary(cleaned, albumTitle, artistName) : "";
  }

  if (!response.ok) {
    return cleaned ? fallbackSummary(cleaned, albumTitle, artistName) : "";
  }

  const payload = (await response.json()) as ResponsesApiResponse;
  const text = extractResponseText(payload).trim();
  const fallback = cleaned ? fallbackSummary(cleaned, albumTitle, artistName) : "";

  return finalizeSummary(text || fallback, cleaned, albumTitle, artistName);
}

function extractResponseText(payload: ResponsesApiResponse): string {
  return (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" || item.type === "text")
    .map((item) => item.text ?? "")
    .join("\n")
    .trim();
}

export function fallbackSummary(intro: string, albumTitle: string, artistName: string): string {
  const prepared = preprocessIntro(intro);
  const paragraphs = prepared.split(/\n{2,}/).map(normalizeWhitespace).filter(Boolean);
  const ranked = paragraphs
    .map((paragraph) => ({
      paragraph,
      score: scoreParagraph(paragraph, albumTitle, artistName),
    }))
    .sort((left, right) => right.score - left.score);

  for (const { paragraph } of ranked) {
    const candidate = buildSummaryCandidate(paragraph, albumTitle, artistName);
    if (isUsableSummaryCandidate(candidate, albumTitle, artistName)) {
      return normalizeWhitespace(candidate);
    }
  }

  const stripped = normalizeWhitespace(prepared);
  const sentences = stripped.split(/(?<=[.!?다요])\s+/u).filter(Boolean);
  const picked = sentences.filter((sentence) => !hasBannedHints(sentence)).slice(0, 2).join(" ") || sentences.slice(0, 1).join(" ");

  return clipSummaryLength(normalizeWhitespace(picked.length > MAX_SUMMARY_LENGTH ? `${picked.slice(0, MAX_SUMMARY_LENGTH - 1).trim()}…` : picked));
}

function finalizeSummary(text: string, intro: string, albumTitle: string, artistName: string): string {
  const normalized = clipSummaryLength(normalizeWhitespace(text).replace(/^["'“”‘’]+|["'“”‘’]+$/gu, ""));

  if (isUsableSummaryCandidate(normalized, albumTitle, artistName)) {
    return normalized;
  }

  return fallbackSummary(intro, albumTitle, artistName);
}

function preprocessIntro(intro: string): string {
  return intro
    .replace(/\[Credit\][\s\S]*$/i, "")
    .replace(/^Composition:.*$/gim, "")
    .replace(/^Lyrics:.*$/gim, "")
    .replace(/^Instrumental and Programming:.*$/gim, "")
    .replace(/^TRACK LIST.*$/gim, "")
    .replace(/^\d+\.\s+[^\n]+$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildSummaryCandidate(paragraph: string, albumTitle: string, artistName: string): string {
  const sentences = paragraph.split(/(?<=[.!?다요])\s+/u).map(normalizeWhitespace).filter(Boolean);
  const usable = sentences.filter((sentence) => !hasBannedHints(sentence));
  const preferred = usable.filter((sentence) => hasMusicHints(sentence));
  const primaryPool = preferred.length > 0 ? preferred : usable;
  const picked: string[] = [];

  for (const sentence of primaryPool) {
    const next = normalizeWhitespace([...picked, sentence].join(" "));
    if (next.length > MAX_SUMMARY_LENGTH) {
      break;
    }

    picked.push(sentence);

    if (next.length >= MIN_SUMMARY_LENGTH || picked.length >= 2) {
      break;
    }
  }

  if (normalizeWhitespace(picked.join(" ")).length < MIN_SUMMARY_LENGTH) {
    for (const sentence of usable) {
      if (picked.includes(sentence)) {
        continue;
      }

      const next = normalizeWhitespace([...picked, sentence].join(" "));
      if (next.length > MAX_SUMMARY_LENGTH) {
        continue;
      }

      picked.push(sentence);

      if (next.length >= MIN_SUMMARY_LENGTH || picked.length >= 2) {
        break;
      }
    }
  }

  return tightenSummaryWording(picked.join(" "), albumTitle, artistName);
}

function scoreParagraph(paragraph: string, albumTitle: string, artistName: string): number {
  const normalized = normalizeWhitespace(paragraph);
  let score = countMatches(normalized, MUSIC_HINTS) * 3 - countMatches(normalized, BANNED_HINTS) * 4;

  if (normalized.length < 18) {
    score -= 6;
  }

  if (containsComparable(normalized, albumTitle) || containsComparable(normalized, artistName)) {
    score -= 1;
  }

  return score;
}

function isUsableSummaryCandidate(value: string, albumTitle: string, artistName: string): boolean {
  const normalized = normalizeWhitespace(value);

  if (!normalized || normalized.length < 36) {
    return false;
  }

  if (hasBannedHints(normalized)) {
    return false;
  }

  if (!hasMusicHints(normalized)) {
    return false;
  }

  const comparable = normalizeComparable(normalized);
  if (!comparable) {
    return false;
  }

  if (comparable === normalizeComparable(albumTitle) || comparable === normalizeComparable(artistName)) {
    return false;
  }

  return true;
}

function hasMusicHints(value: string): boolean {
  return MUSIC_HINTS.some((pattern) => pattern.test(value));
}

function hasBannedHints(value: string): boolean {
  return BANNED_HINTS.some((pattern) => pattern.test(value));
}

function countMatches(value: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => count + (pattern.test(value) ? 1 : 0), 0);
}

function containsComparable(value: string, needle: string): boolean {
  const comparableValue = normalizeComparable(value);
  const comparableNeedle = normalizeComparable(needle);
  return Boolean(comparableNeedle) && comparableValue.includes(comparableNeedle);
}

function normalizeComparable(value: string): string {
  return value.replace(/[^a-z0-9가-힣]/giu, "").toLowerCase();
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function tightenSummaryWording(value: string, albumTitle: string, artistName: string): string {
  let next = clipSummaryLength(normalizeWhitespace(value));

  for (const name of [artistName, albumTitle]) {
    if (!name) {
      continue;
    }

    const escaped = escapeRegExp(name);
    next = next.replace(new RegExp(`^${escaped}\\s+특유의\\s+`, "iu"), "");
    next = next.replace(new RegExp(`^${escaped}\\s+멤버들의\\s+`, "iu"), "");
    next = next.replace(new RegExp(`^${escaped}\\s+`, "iu"), "");
  }

  next = next
    .replace(/인상적인 곡이다\.?$/u, "이 인상적이다.")
    .replace(/인상적인 앨범이다\.?$/u, "이 인상적이다.")
    .replace(/곡이다\.?$/u, "곡.")
    .replace(/앨범이다\.?$/u, "앨범.");

  return next;
}

function clipSummaryLength(value: string): string {
  if (value.length <= MAX_SUMMARY_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_SUMMARY_LENGTH - 1).trimEnd()}…`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
