import test from "node:test";
import assert from "node:assert/strict";

import { formatAlbumTitle, formatArtistName, formatCoverTitle, formatSummary, formatTemplateCardText } from "./template-text.js";

test("긴 source album title 대신 요청 album title을 우선 사용함", () => {
  assert.equal(formatAlbumTitle("Get Up", "NewJeans 2nd EP 'Get Up'"), "Get Up");
});

test("공백 없는 ALL CAPS 제목은 더 공격적으로 줄임", () => {
  assert.equal(formatAlbumTitle(undefined, "UNFORGIVEN"), "UNFORGI…");
});

test("괄호형 artist 보조 표기를 제거함", () => {
  assert.equal(formatArtistName("LE SSERAFIM (르세라핌)"), "LE SSERAFIM");
  assert.equal(formatArtistName("IVE (아이브)"), "IVE");
});

test("cover title은 카드뉴스 접미사를 제거하고 두 줄 안으로 맞춤", () => {
  assert.equal(formatCoverTitle("2026 봄 앨범 카드뉴스"), "2026\n봄 앨범");
});

test("요약은 줄바꿈 제거 후 길이 예산 안으로 자름", () => {
  const summary = formatSummary(
    "레트로 디스코 펑크 타이틀로 그루비한 보컬과 관악·퍼커션이 에너지를 터뜨린다.\n사랑의 경쾌함에서 이별의 침잠으로 흐르는 R&B·UK 개러지·아프로팝 등 다채로운 사운드.",
  );

  assert.ok(summary.length <= 112);
  assert.ok(!summary.includes("\n"));
});

test("표시용 카드 텍스트를 한 번에 정규화함", () => {
  assert.deepEqual(
    formatTemplateCardText({
      requestedAlbumTitle: "Get Up",
      albumTitle: "NewJeans 2nd EP 'Get Up'",
      artistName: "LE SSERAFIM (르세라핌)",
      albumType: "정규",
      summary: "첫 문장입니다. 두 번째 문장도 아주 길게 이어져서 템플릿 영역을 쉽게 넘길 수 있는 예시 텍스트입니다.",
    }),
    {
      albumTitle: "Get Up",
      artistName: "LE SSERAFIM",
      albumType: "정규",
      summary: "첫 문장입니다. 두 번째 문장도 아주 길게 이어져서 템플릿 영역을 쉽게 넘길 수 있는 예시 텍스트입니다.",
    },
  );
});
