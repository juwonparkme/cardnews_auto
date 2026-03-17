import type { PreparedAlbumCard } from "../types.js";

const MAX_DISPLAY_UNITS = {
  coverTitle: 16.5,
  albumTitle: 10.4,
  artistName: 13.2,
};

const MAX_SUMMARY_LENGTH = 112;
const ELLIPSIS = "…";

export function formatCoverTitle(title: string): string {
  const normalized = normalizeWhitespace(title).replace(/\s*카드뉴스$/u, "").trim();
  const lines = splitCoverTitleLines(normalized || "카드뉴스");
  return lines
    .map((line) => truncateByDisplayUnits(line, MAX_DISPLAY_UNITS.coverTitle))
    .slice(0, 2)
    .join("\n");
}

export function formatTemplateCardText(
  input: Pick<PreparedAlbumCard, "albumTitle" | "artistName" | "albumType" | "summary"> & {
    requestedAlbumTitle?: string;
  },
): Pick<PreparedAlbumCard, "albumTitle" | "artistName" | "albumType" | "summary"> {
  const albumTitle = formatAlbumTitle(input.requestedAlbumTitle, input.albumTitle);
  const artistName = formatArtistName(input.artistName);
  const albumType = input.albumType ? truncatePlain(normalizeWhitespace(input.albumType), 10) : undefined;
  const summary = formatSummary(input.summary);

  return {
    albumTitle,
    artistName,
    albumType,
    summary,
  };
}

export function formatAlbumTitle(requestedAlbumTitle: string | undefined, resolvedAlbumTitle: string): string {
  const preferred = pickPreferredAlbumTitle(requestedAlbumTitle, resolvedAlbumTitle);
  const maxUnits = isCompactUppercaseTitle(preferred) ? 8.6 : MAX_DISPLAY_UNITS.albumTitle;
  return truncateByDisplayUnits(preferred, maxUnits);
}

export function formatArtistName(artistName: string): string {
  const normalized = normalizeWhitespace(artistName);
  const withoutTrailingParen = normalized.replace(/\s*\([^)]*\)\s*$/u, "").trim();
  const preferred = withoutTrailingParen || normalized;
  return truncateByDisplayUnits(preferred, MAX_DISPLAY_UNITS.artistName);
}

export function formatSummary(summary: string): string {
  const singleLine = normalizeWhitespace(summary);

  if (singleLine.length <= MAX_SUMMARY_LENGTH) {
    return singleLine;
  }

  const sentences = singleLine.split(/(?<=[.!?])\s+/u).filter(Boolean);

  if (sentences.length > 1) {
    const limited = joinWithinLimit(sentences, MAX_SUMMARY_LENGTH);
    if (limited) {
      return limited;
    }
  }

  const clause = pickClauseWithinLimit(singleLine, MAX_SUMMARY_LENGTH);
  if (clause) {
    return clause;
  }

  return truncatePlain(singleLine, MAX_SUMMARY_LENGTH);
}

function pickPreferredAlbumTitle(requestedAlbumTitle: string | undefined, resolvedAlbumTitle: string): string {
  const normalizedRequested = normalizeWhitespace(requestedAlbumTitle ?? "");
  const normalizedResolved = normalizeWhitespace(resolvedAlbumTitle);

  if (!normalizedRequested) {
    return normalizedResolved;
  }

  const requestedAscii = normalizeComparableText(normalizedRequested);
  const resolvedAscii = normalizeComparableText(normalizedResolved);

  if (requestedAscii && resolvedAscii.includes(requestedAscii) && normalizedRequested.length <= normalizedResolved.length) {
    return normalizedRequested;
  }

  return normalizedResolved;
}

function joinWithinLimit(parts: string[], maxLength: number): string | undefined {
  let current = "";

  for (const part of parts) {
    const next = current ? `${current} ${part}` : part;
    if (next.length > maxLength) {
      break;
    }
    current = next;
  }

  return current || undefined;
}

function pickClauseWithinLimit(value: string, maxLength: number): string | undefined {
  const clauses = value.split(/[,:;·]/u).map((part) => part.trim()).filter(Boolean);
  let current = "";

  for (const clause of clauses) {
    const next = current ? `${current}, ${clause}` : clause;
    if (next.length > maxLength) {
      break;
    }
    current = next;
  }

  return current || undefined;
}

function truncatePlain(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const sliced = value.slice(0, Math.max(1, maxLength - ELLIPSIS.length)).trimEnd();
  const boundary = sliced.lastIndexOf(" ");
  const base = boundary >= Math.floor(maxLength * 0.6) ? sliced.slice(0, boundary) : sliced;

  return `${base}${ELLIPSIS}`;
}

function truncateByDisplayUnits(value: string, maxUnits: number): string {
  if (estimateDisplayUnits(value) <= maxUnits) {
    return value;
  }

  let current = "";

  for (const char of value) {
    const next = `${current}${char}`;
    if (estimateDisplayUnits(`${next}${ELLIPSIS}`) > maxUnits) {
      break;
    }
    current = next;
  }

  const trimmed = current.trimEnd();
  return `${trimmed}${ELLIPSIS}`;
}

function estimateDisplayUnits(value: string): number {
  let total = 0;

  for (const char of value) {
    if (/\s/u.test(char)) {
      total += 0.45;
      continue;
    }

    if (/[A-Z]/u.test(char)) {
      total += 1.1;
      continue;
    }

    if (/[a-z0-9]/u.test(char)) {
      total += 0.95;
      continue;
    }

    if (/[가-힣]/u.test(char)) {
      total += 1.2;
      continue;
    }

    total += 0.85;
  }

  return total;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function normalizeComparableText(value: string): string {
  return value.replace(/[^a-z0-9가-힣]/giu, "").toLowerCase();
}

function isCompactUppercaseTitle(value: string): boolean {
  return !value.includes(" ") && /^[A-Z0-9'’!?.-]+$/u.test(value);
}

function splitCoverTitleLines(value: string): string[] {
  const words = value.split(/\s+/u).filter(Boolean);

  if (words.length <= 1) {
    return [value];
  }

  if (words.length === 2) {
    return [words[0], words[1]];
  }

  let bestIndex = 1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 1; index < words.length; index += 1) {
    const left = words.slice(0, index).join(" ");
    const right = words.slice(index).join(" ");
    const score = Math.abs(estimateDisplayUnits(left) - estimateDisplayUnits(right));

    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return [words.slice(0, bestIndex).join(" "), words.slice(bestIndex).join(" ")];
}
