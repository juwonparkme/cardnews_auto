import { readCache, writeCache } from "../utils/cache.js";
import { cleanText, decodeHtml, matchAllGroups } from "../utils/html.js";
import { fetchText } from "../utils/http.js";
import { scoreCandidate } from "../utils/text.js";
import type { AlbumSourceRecord, SearchCandidate } from "../types.js";
import type { FetchAlbumDetailsFn, SearchAlbumsFn } from "./shared.js";

const SEARCH_TTL_MS = 1000 * 60 * 60 * 24;

export const searchMelonAlbums: SearchAlbumsFn = async ({ albumName, artistName, cacheDir }) => {
  const url = `https://www.melon.com/search/album/index.htm?q=${encodeURIComponent(albumName)}`;
  const cacheKey = `search:${albumName}:${artistName}`;
  const cached = await readCache<SearchCandidate[]>(cacheDir, "melon", cacheKey);

  if (cached) {
    return cached;
  }

  const html = await fetchText(url);
  const blocks = matchAllGroups(
    html,
    /<li class="album11_li">[\s\S]*?goAlbumDetail\('(\d+)'\);[\s\S]*?<img [^>]*src="([^"]+)"[\s\S]*?<span class="vdo_name">\[([^\]]+)\]<\/span>[\s\S]*?<a [^>]*class="ellipsis" title="([^"]+) - 페이지 이동"[\s\S]*?<\/a>[\s\S]*?<dd class="atistname">[\s\S]*?<div class="ellipsis">([\s\S]*?)<\/div>[\s\S]*?<span class="cnt_view">([^<]+)<\/span>/g,
  );

  const candidates = blocks
    .map(([albumId, coverImageUrl, albumType, title, artistHtml, releaseDate]) => {
      const artist = normalizeArtist(artistHtml);

      return {
        albumId,
        albumTitle: cleanText(title),
        artistName: artist,
        albumType: cleanText(albumType),
        releaseDate: cleanText(releaseDate),
        coverImageUrl,
        sourceSite: "melon" as const,
        sourceUrl: `https://www.melon.com/album/detail.htm?albumId=${albumId}`,
        score: scoreCandidate(albumName, artistName, cleanText(title), artist),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);

  await writeCache(cacheDir, "melon", cacheKey, candidates, SEARCH_TTL_MS);

  return candidates;
};

export const fetchMelonAlbumDetails: FetchAlbumDetailsFn = async (candidate, cacheDir) => {
  const cacheKey = `album:${candidate.albumId}`;
  const cached = await readCache<AlbumSourceRecord>(cacheDir, "melon", cacheKey);

  if (cached) {
    return cached;
  }

  const html = await fetchText(candidate.sourceUrl);
  const albumTitle = captureText(html, /<div class="song_name">[\s\S]*?<\/strong>\s*([\s\S]*?)\s*<\/div>/);
  const artistName = captureText(html, /<div class="artist">[\s\S]*?<span>([\s\S]*?)<\/span>/);
  const albumType = cleanText(captureText(html, /<span class="gubun">([\s\S]*?)<\/span>/));
  const releaseDate = captureText(html, /<dt>발매일<\/dt>\s*<dd>([^<]+)<\/dd>/);
  const coverImageUrl = captureAttribute(html, /<div class="thumb">[\s\S]*?<img [^>]*src="([^"]+)"/);
  const albumIntroHtml = captureText(html, /<div class="dtl_albuminfo" id="d_video_summary">\s*<div>([\s\S]*?)<\/div>/);

  const record: AlbumSourceRecord = {
    albumId: candidate.albumId,
    albumTitle: cleanText(albumTitle || candidate.albumTitle),
        artistName: normalizeArtist(artistName || candidate.artistName),
    albumType: cleanText(albumType || candidate.albumType || ""),
    albumIntro: cleanText(albumIntroHtml),
    coverImageUrl,
    releaseDate: cleanText(releaseDate || candidate.releaseDate || ""),
    sourceSite: "melon",
    sourceUrl: candidate.sourceUrl,
  };

  await writeCache(cacheDir, "melon", cacheKey, record, SEARCH_TTL_MS);

  return record;
};

function captureText(html: string, pattern: RegExp): string {
  const match = html.match(pattern);

  return match ? decodeHtml(match[1]) : "";
}

function captureAttribute(html: string, pattern: RegExp): string | undefined {
  const match = html.match(pattern);

  return match?.[1];
}

function normalizeArtist(value: string): string {
  const anchors = [...value.matchAll(/>([^<]+)</g)]
    .map((match) => cleanText(match[1]))
    .filter(Boolean);

  if (anchors.length === 0) {
    return cleanText(value);
  }

  return [...new Set(anchors)].join(", ");
}
