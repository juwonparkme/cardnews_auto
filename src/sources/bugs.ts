import { readCache, writeCache } from "../utils/cache.js";
import { cleanText, decodeHtml, matchAllGroups } from "../utils/html.js";
import { fetchText } from "../utils/http.js";
import { scoreCandidate } from "../utils/text.js";
import type { AlbumSourceRecord, SearchCandidate } from "../types.js";
import type { FetchAlbumDetailsFn, SearchAlbumsFn } from "./shared.js";

const SEARCH_TTL_MS = 1000 * 60 * 60 * 24;

export const searchBugsAlbums: SearchAlbumsFn = async ({ albumName, artistName, cacheDir }) => {
  const url = `https://music.bugs.co.kr/search/album?q=${encodeURIComponent(albumName)}`;
  const cacheKey = `search:${albumName}:${artistName}`;
  const cached = await readCache<SearchCandidate[]>(cacheDir, "bugs", cacheKey);

  if (cached) {
    return cached;
  }

  const html = await fetchText(url);
  const blocks = matchAllGroups(
    html,
    /<figure class="albumInfo" albumId="(\d+)"[\s\S]*?<img src="([^"]+)"[\s\S]*?<div class="albumTitle">\s*<a [^>]*title="([^"]+)"[\s\S]*?<\/a>[\s\S]*?<a [^>]*class="artistTitle" title="([^"]+)"[\s\S]*?<\/a>[\s\S]*?<time datetime="">([^<]+)<\/time>\s*<span class="albumType">([^<]+)<\/span>/g,
  );

  const candidates = blocks
    .map(([albumId, coverImageUrl, title, artist, releaseDate, albumType]) => ({
      albumId,
      albumTitle: cleanText(title),
      artistName: cleanText(artist),
      albumType: cleanText(albumType),
      releaseDate: cleanText(releaseDate),
      coverImageUrl,
      sourceSite: "bugs" as const,
      sourceUrl: `https://music.bugs.co.kr/album/${albumId}`,
      score: scoreCandidate(albumName, artistName, cleanText(title), cleanText(artist)),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);

  await writeCache(cacheDir, "bugs", cacheKey, candidates, SEARCH_TTL_MS);

  return candidates;
};

export const fetchBugsAlbumDetails: FetchAlbumDetailsFn = async (candidate, cacheDir) => {
  const cacheKey = `album:${candidate.albumId}`;
  const cached = await readCache<AlbumSourceRecord>(cacheDir, "bugs", cacheKey);

  if (cached) {
    return cached;
  }

  const html = await fetchText(candidate.sourceUrl);
  const coverImageUrl = captureText(html, /<meta property="og:image" content="([^"]+)"/);
  const artistName = captureTableValue(html, "아티스트");
  const albumType = captureTableValue(html, "유형");
  const releaseDate = captureTableValue(html, "발매일");

  const record: AlbumSourceRecord = {
    albumId: candidate.albumId,
    albumTitle: candidate.albumTitle,
    artistName: cleanText(artistName || candidate.artistName),
    albumType: cleanText(albumType || candidate.albumType || ""),
    albumIntro: undefined,
    coverImageUrl: coverImageUrl || candidate.coverImageUrl,
    releaseDate: cleanText(releaseDate || candidate.releaseDate || ""),
    sourceSite: "bugs",
    sourceUrl: candidate.sourceUrl,
  };

  await writeCache(cacheDir, "bugs", cacheKey, record, SEARCH_TTL_MS);

  return record;
};

function captureText(html: string, pattern: RegExp): string | undefined {
  const match = html.match(pattern);

  return match ? decodeHtml(match[1]) : undefined;
}

function captureTableValue(html: string, header: string): string | undefined {
  return captureText(
    html,
    new RegExp(`<th scope="row">${header}<\\/th>[\\s\\S]*?<td>([\\s\\S]*?)<\\/td>`),
  );
}
