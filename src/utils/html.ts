export function decodeHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

export function cleanText(value: string): string {
  return decodeHtml(stripTags(value))
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ ]+\n/g, "\n")
    .replace(/\n[ ]+/g, "\n")
    .trim();
}

export function matchAllGroups(html: string, pattern: RegExp): string[][] {
  const matches: string[][] = [];

  for (const match of html.matchAll(pattern)) {
    matches.push(match.slice(1));
  }

  return matches;
}
