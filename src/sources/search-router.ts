import { fetchBugsAlbumDetails, searchBugsAlbums } from "./bugs.js";
import { fetchMelonAlbumDetails, searchMelonAlbums } from "./melon.js";
import { fetchSpotifyAlbumDetails, searchSpotifyAlbums } from "./spotify.js";
import type { AlbumInput, AlbumSourceRecord, SearchCandidate } from "../types.js";

export async function resolveAlbumSource(input: AlbumInput, cacheDir: string): Promise<AlbumSourceRecord> {
  const candidates = await collectCandidates(input, cacheDir);

  if (candidates.length === 0) {
    throw new Error(`검색 결과 없음: ${input.albumName} / ${input.artistName}`);
  }

  const primary = candidates[0];
  const details = await fetchBySite(primary, cacheDir);

  if (details.albumIntro?.trim()) {
    return mergeMetadata(details, await enrichWithMetadata(primary, cacheDir));
  }

  const introFallback = candidates.find((candidate) => candidate.sourceSite === "melon" || candidate.sourceSite === "bugs");
  const metadataFallback = candidates.find((candidate) => candidate.sourceSite === "spotify");

  const introRecord = introFallback ? await fetchBySite(introFallback, cacheDir) : details;
  const metadataRecord = metadataFallback ? await fetchBySite(metadataFallback, cacheDir) : details;

  return mergeMetadata(introRecord, metadataRecord);
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
