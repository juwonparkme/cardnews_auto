import { CanvaClient } from "./client.js";
import type { CanvaAutofillData, CanvaRenderResult, PreparedAlbumCard } from "../types.js";
import { formatCoverTitle } from "../cardnews/template-text.js";

export async function renderCardnewsDesign(
  brandTemplateId: string,
  title: string,
  cards: PreparedAlbumCard[],
): Promise<CanvaRenderResult> {
  const client = new CanvaClient();
  const dataset = await client.getBrandTemplateDataset(brandTemplateId);
  const cardsWithAssets = await uploadCardCoverAssets(cards);
  let data = buildAutofillData(title, cardsWithAssets);
  data = injectCoverAssets(data, cardsWithAssets);

  validateDatasetKeys(dataset, data);

  return client.createAutofillJob(brandTemplateId, title, data);
}

export function buildAutofillData(title: string, cards: PreparedAlbumCard[]): CanvaAutofillData {
  const data: CanvaAutofillData = {
    cover_title: {
      type: "text",
      text: formatCoverTitle(title),
    },
  };

  cards.forEach((card, index) => {
    const key = `card_0${index + 1}`;

    data[`${key}_album`] = {
      type: "text",
      text: card.albumTitle,
    };
    data[`${key}_artist`] = {
      type: "text",
      text: card.artistName,
    };
    data[`${key}_type`] = {
      type: "text",
      text: card.albumType ?? "",
    };
    data[`${key}_summary`] = {
      type: "text",
      text: card.summary,
    };
  });

  return data;
}

export async function uploadCardCoverAssets(cards: PreparedAlbumCard[]): Promise<PreparedAlbumCard[]> {
  const client = new CanvaClient();
  const nextCards: Array<PreparedAlbumCard & { canvaAssetId?: string; canvaCoverField?: string }> = [];

  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    const nextCard = { ...card };

    if (card.coverAssetPath) {
      const assetId = await client.uploadAsset(card.coverAssetPath);
      const key = `card_0${index + 1}_cover`;
      (nextCard as PreparedAlbumCard & { canvaAssetId?: string; canvaCoverField?: string }).canvaAssetId = assetId;
      (nextCard as PreparedAlbumCard & { canvaAssetId?: string; canvaCoverField?: string }).canvaCoverField = key;
    }

    nextCards.push(nextCard);
  }

  return nextCards;
}

export function injectCoverAssets(
  data: CanvaAutofillData,
  cards: Array<PreparedAlbumCard & { canvaAssetId?: string; canvaCoverField?: string }>,
): CanvaAutofillData {
  const next = { ...data };

  for (const card of cards) {
    if (card.canvaAssetId && card.canvaCoverField) {
      next[card.canvaCoverField] = {
        type: "image",
        asset_id: card.canvaAssetId,
      };
    }
  }

  return next;
}

function validateDatasetKeys(dataset: Record<string, { type: string }>, data: CanvaAutofillData): void {
  if (Object.keys(dataset).length === 0) {
    throw new Error("Canva dataset 비어 있음. Brand Template에 Data Autofill 필드가 설정되지 않았거나 비어 있음.");
  }

  const missing = Object.keys(data).filter((key) => !(key in dataset));

  if (missing.length > 0) {
    throw new Error(`Canva dataset field 누락: ${missing.join(", ")}`);
  }
}
