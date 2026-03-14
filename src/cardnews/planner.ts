import type { AlbumInput, PreparedAlbumCard } from "../types.js";
import { resolveAlbumSource } from "../sources/search-router.js";
import { summarizeAlbumIntro } from "../llm/summarizer.js";
import { resolveCoverAssetPath } from "../assets/asset-resolver.js";

export async function prepareAlbumCards(albums: AlbumInput[], cacheDir: string): Promise<PreparedAlbumCard[]> {
  const cards: PreparedAlbumCard[] = [];

  for (let index = 0; index < albums.length; index += 1) {
    const input = albums[index];
    process.stdout.write(`[${index + 1}/${albums.length}] 검색: ${input.albumName} / ${input.artistName}\n`);

    const sourceRecord = await resolveAlbumSource(input, cacheDir);
    const summary = await summarizeAlbumIntro(
      sourceRecord.albumIntro ?? "",
      sourceRecord.albumTitle,
      sourceRecord.artistName,
    );
    const coverAssetPath = await resolveCoverAssetPath(input, sourceRecord);

    cards.push({
      albumTitle: sourceRecord.albumTitle,
      artistName: sourceRecord.artistName,
      albumType: normalizeAlbumType(sourceRecord.albumType),
      summary,
      coverAssetPath,
      sourceSite: sourceRecord.sourceSite,
      sourceUrl: sourceRecord.sourceUrl,
    });
  }

  return cards;
}

function normalizeAlbumType(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.replace(/^\[|\]$/g, "").trim() || undefined;
}
