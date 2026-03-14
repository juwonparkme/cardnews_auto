import { fetchBugsAlbumDetails, searchBugsAlbums } from "./bugs.js";
import { fetchMelonAlbumDetails, searchMelonAlbums } from "./melon.js";
import { fetchSpotifyAlbumDetails, searchSpotifyAlbums } from "./spotify.js";
import type { AlbumInput, AlbumSourceRecord, SearchCandidate } from "../types.js";

export async function resolveAlbumSource(input: AlbumInput, cacheDir: string): Promise<AlbumSourceRecord> {
  const [melonCandidates, bugsCandidates, spotifyCandidates] = await Promise.all([
    searchMelonAlbums({ ...input, cacheDir }),
    searchBugsAlbums({ ...input, cacheDir }),
    searchSpotifyAlbums({ ...input, cacheDir }),
  ]);
  const candidates = [...melonCandidates, ...bugsCandidates, ...spotifyCandidates].sort((left, right) => right.score - left.score);

  if (candidates.length === 0) {
    throw new Error(`검색 결과 없음: ${input.albumName} / ${input.artistName}`);
  }

  const introCandidate = melonCandidates[0] ?? bugsCandidates[0] ?? candidates[0];
  const metadataCandidate = spotifyCandidates[0] ?? melonCandidates[0] ?? bugsCandidates[0] ?? candidates[0];
  const introRecord = await fetchBySite(introCandidate, cacheDir);
  const metadataRecord = await fetchBySite(metadataCandidate, cacheDir);

  if (introRecord.albumIntro?.trim()) {
    return mergeMetadata(introRecord, metadataRecord);
  }

  const bugsRecord = bugsCandidates[0] ? await fetchBySite(bugsCandidates[0], cacheDir) : metadataRecord;
  return mergeMetadata(introRecord, bugsRecord);
}

export async function collectCandidates(input: AlbumInput, cacheDir: string): Promise<SearchCandidate[]> {
  const [melon, bugs, spotify] = await Promise.all([
    searchMelonAlbums({ ...input, cacheDir }),
    searchBugsAlbums({ ...input, cacheDir }),
    searchSpotifyAlbums({ ...input, cacheDir }),
  ]);

  return [...melon, ...bugs, ...spotify].sort((left, right) => right.score - left.score);
}

async function fetchBySite(candidate: SearchCandidate, cacheDir: string): Promise<AlbumSourceRecord> {
  switch (candidate.sourceSite) {
    case "melon":
      return fetchMelonAlbumDetails(candidate, cacheDir);
    case "bugs":
      return fetchBugsAlbumDetails(candidate, cacheDir);
    case "spotify":
      return fetchSpotifyAlbumDetails(candidate, cacheDir);
  }
}

async function enrichWithMetadata(candidate: SearchCandidate, cacheDir: string): Promise<AlbumSourceRecord> {
  const spotifyCandidate = (await searchSpotifyAlbums({
    albumName: candidate.albumTitle,
    artistName: candidate.artistName,
    cacheDir,
  }))[0];

  if (!spotifyCandidate) {
    return await fetchBySite(candidate, cacheDir);
  }

  return fetchSpotifyAlbumDetails(spotifyCandidate, cacheDir);
}

function mergeMetadata(primary: AlbumSourceRecord, metadata: AlbumSourceRecord): AlbumSourceRecord {
  return {
    ...primary,
    albumType: primary.albumType || metadata.albumType,
    coverImageUrl: primary.coverImageUrl || metadata.coverImageUrl,
    releaseDate: primary.releaseDate || metadata.releaseDate,
    label: primary.label || metadata.label,
    totalTracks: primary.totalTracks || metadata.totalTracks,
  };
}
