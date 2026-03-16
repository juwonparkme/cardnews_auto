import { readCache, writeCache } from "../utils/cache.js";
import { fetchJson } from "../utils/http.js";
import { scoreCandidate } from "../utils/text.js";
import type { AlbumSourceRecord, SearchCandidate } from "../types.js";
import type { FetchAlbumDetailsFn, SearchAlbumsFn } from "./shared.js";

const TOKEN_TTL_MS = 1000 * 60 * 50;
const SEARCH_TTL_MS = 1000 * 60 * 60 * 24;

type SpotifySearchResponse = {
  albums?: {
    items: SpotifyAlbum[];
  };
};

type SpotifyAlbum = {
  id: string;
  name: string;
  album_type?: string;
  release_date?: string;
  total_tracks?: number;
  label?: string;
  external_urls?: {
    spotify?: string;
  };
  images?: Array<{ url: string }>;
  artists?: Array<{ name: string }>;
};

export const searchSpotifyAlbums: SearchAlbumsFn = async ({ albumName, artistName, cacheDir }) => {
  const config = await import("../config.js");
  const { spotifyClientId, spotifyClientSecret } = config.loadConfig();

  if (!spotifyClientId || !spotifyClientSecret) {
    return [];
  }

  const cacheKey = `search:${albumName}:${artistName}`;
  const cached = await readCache<SearchCandidate[]>(cacheDir, "spotify", cacheKey);

  if (cached) {
    return cached;
  }

  const token = await getSpotifyToken(cacheDir, spotifyClientId, spotifyClientSecret);
  const query = `album:${albumName} artist:${artistName}`;
  let response: SpotifySearchResponse;

  try {
    response = await fetchSpotifyJson<SpotifySearchResponse>(
      [
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=5&market=KR`,
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=5`,
      ],
      token,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("HTTP 403")) {
      return [];
    }

    throw error;
  }

  const candidates = (response.albums?.items ?? [])
    .map((album) => {
      const artist = album.artists?.map((item) => item.name).join(", ") ?? "";

      return {
        albumId: album.id,
        albumTitle: album.name,
        artistName: artist,
        albumType: album.album_type,
        releaseDate: album.release_date,
        coverImageUrl: album.images?.[0]?.url,
        sourceSite: "spotify" as const,
        sourceUrl: album.external_urls?.spotify ?? `https://open.spotify.com/album/${album.id}`,
        score: scoreCandidate(albumName, artistName, album.name, artist),
      };
    })
    .sort((left, right) => right.score - left.score);

  await writeCache(cacheDir, "spotify", cacheKey, candidates, SEARCH_TTL_MS);

  return candidates;
};

export const fetchSpotifyAlbumDetails: FetchAlbumDetailsFn = async (candidate, cacheDir) => {
  const config = await import("../config.js");
  const { spotifyClientId, spotifyClientSecret } = config.loadConfig();

  if (!spotifyClientId || !spotifyClientSecret) {
    return {
      albumId: candidate.albumId,
      albumTitle: candidate.albumTitle,
      artistName: candidate.artistName,
      albumType: candidate.albumType,
      coverImageUrl: candidate.coverImageUrl,
      releaseDate: candidate.releaseDate,
      sourceSite: "spotify",
      sourceUrl: candidate.sourceUrl,
    };
  }

  const cacheKey = `album:${candidate.albumId}`;
  const cached = await readCache<AlbumSourceRecord>(cacheDir, "spotify", cacheKey);

  if (cached) {
    return cached;
  }

  const token = await getSpotifyToken(cacheDir, spotifyClientId, spotifyClientSecret);
  let album: SpotifyAlbum;

  try {
    album = await fetchSpotifyJson<SpotifyAlbum>(
      [
        `https://api.spotify.com/v1/albums/${candidate.albumId}?market=KR`,
        `https://api.spotify.com/v1/albums/${candidate.albumId}`,
      ],
      token,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("HTTP 403")) {
      return {
        albumId: candidate.albumId,
        albumTitle: candidate.albumTitle,
        artistName: candidate.artistName,
        albumType: candidate.albumType,
        albumIntro: undefined,
        coverImageUrl: candidate.coverImageUrl,
        releaseDate: candidate.releaseDate,
        sourceSite: "spotify",
        sourceUrl: candidate.sourceUrl,
      };
    }

    throw error;
  }

  const record: AlbumSourceRecord = {
    albumId: album.id,
    albumTitle: album.name,
    artistName: album.artists?.map((item) => item.name).join(", ") ?? candidate.artistName,
    albumType: album.album_type ?? candidate.albumType,
    albumIntro: undefined,
    coverImageUrl: album.images?.[0]?.url ?? candidate.coverImageUrl,
    releaseDate: album.release_date ?? candidate.releaseDate,
    label: album.label,
    totalTracks: album.total_tracks,
    sourceSite: "spotify",
    sourceUrl: album.external_urls?.spotify ?? candidate.sourceUrl,
  };

  await writeCache(cacheDir, "spotify", cacheKey, record, SEARCH_TTL_MS);

  return record;
};

async function getSpotifyToken(cacheDir: string, clientId: string, clientSecret: string): Promise<string> {
  const cached = await readCache<string>(cacheDir, "spotify-token", clientId);

  if (cached) {
    return cached;
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Spotify token 발급 실패: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as { access_token: string };
  await writeCache(cacheDir, "spotify-token", clientId, json.access_token, TOKEN_TTL_MS);

  return json.access_token;
}

async function fetchSpotifyJson<T>(urls: string[], token: string): Promise<T> {
  let lastError: Error | undefined;

  for (const url of urls) {
    try {
      return await fetchJson<T>(url, {
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/json",
        },
      });
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("HTTP 403")) {
        throw error;
      }

      lastError = error;
    }
  }

  throw lastError ?? new Error("Spotify 요청 실패");
}
