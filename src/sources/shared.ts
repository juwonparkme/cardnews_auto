import type { AlbumSourceRecord, SearchCandidate } from "../types.js";

export type SearchAlbumsInput = {
  albumName: string;
  artistName: string;
  cacheDir: string;
};

export type SearchAlbumsFn = (input: SearchAlbumsInput) => Promise<SearchCandidate[]>;

export type FetchAlbumDetailsFn = (
  candidate: SearchCandidate,
  cacheDir: string,
) => Promise<AlbumSourceRecord>;
