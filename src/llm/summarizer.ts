import { loadConfig } from "../config.js";

const SUMMARY_PROMPT = [
  "아래 앨범 소개를 읽고 어떤 음악일지 카드뉴스용으로 2문장 이내로 요약해.",
  "조건:",
  "- 한국어",
  "- 2문장 이내",
  "- 장르, 무드, 정서, 사운드 인상 중심",
  "- 소개글에 없는 사실 추가 금지",
  "- 홍보성 과장 금지",
  "- 90자 안팎",
].join("\n");

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

  if (!cleaned) {
    return "";
  }

  if (!config.openAiApiKey) {
    return fallbackSummary(cleaned);
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
                text: `앨범명: ${albumTitle}\n가수명: ${artistName}\n\n[앨범 소개]\n${cleaned}`,
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
    return fallbackSummary(cleaned);
  }

  if (!response.ok) {
    return fallbackSummary(cleaned);
  }

  const payload = (await response.json()) as ResponsesApiResponse;
  const text = extractResponseText(payload).trim();

  return text || fallbackSummary(cleaned);
}

function extractResponseText(payload: ResponsesApiResponse): string {
  return (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" || item.type === "text")
    .map((item) => item.text ?? "")
    .join("\n")
    .trim();
}

function fallbackSummary(intro: string): string {
  const stripped = intro
    .replace(/\[Credit\][\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = stripped.split(/(?<=[.!?다요])\s+/).filter(Boolean);
  const picked = sentences.slice(0, 2).join(" ");

  return picked.length > 90 ? `${picked.slice(0, 87).trim()}...` : picked;
}
