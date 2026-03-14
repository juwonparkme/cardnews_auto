export type AlbumInput = {
  albumName: string;
  artistName: string;
  imagePath?: string;
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
  brandTemplateId?: string;
  outputDir: string;
};
