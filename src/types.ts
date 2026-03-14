export type AlbumInput = {
  albumName: string;
  artistName: string;
  imagePath?: string;
};

export type SourceSite = "melon" | "bugs" | "spotify";

export type SearchCandidate = {
  albumId: string;
  albumTitle: string;
  artistName: string;
  albumType?: string;
  releaseDate?: string;
  coverImageUrl?: string;
  sourceSite: SourceSite;
  sourceUrl: string;
  score: number;
};

export type AlbumSourceRecord = {
  albumId: string;
  albumTitle: string;
  artistName: string;
  albumType?: string;
  albumIntro?: string;
  coverImageUrl?: string;
  releaseDate?: string;
  label?: string;
  totalTracks?: number;
  sourceSite: SourceSite;
  sourceUrl: string;
};

export type PreparedAlbumCard = {
  albumTitle: string;
  artistName: string;
  albumType?: string;
  summary: string;
  coverAssetPath?: string;
  sourceSite: SourceSite;
  sourceUrl: string;
};

export type CanvaDatasetValue =
  | { type: "text"; text: string }
  | { type: "image"; asset_id: string };

export type CanvaAutofillData = Record<string, CanvaDatasetValue>;

export type CanvaRenderResult = {
  designId: string;
  designTitle?: string;
  editUrl?: string;
  viewUrl?: string;
  designUrl?: string;
  thumbnailUrl?: string;
  jobId: string;
};

export type RenderOptions = {
  outputPath?: string;
  templateId?: string;
  skipCanvaEdit: boolean;
};

export type CardnewsInput = {
  title: string;
  albums: [
    AlbumInput,
    AlbumInput,
    AlbumInput,
    AlbumInput,
    AlbumInput,
    AlbumInput,
    AlbumInput,
  ];
  outputPath: string;
  templateId?: string;
  skipCanvaEdit: boolean;
};

export type AppConfig = {
  canvaAccessToken?: string;
  canvaRefreshToken?: string;
  canvaClientId?: string;
  canvaClientSecret?: string;
  canvaRedirectUri?: string;
  brandTemplateId?: string;
  outputDir: string;
  cacheDir: string;
  spotifyClientId?: string;
  spotifyClientSecret?: string;
  openAiApiKey?: string;
  openAiModel: string;
};
