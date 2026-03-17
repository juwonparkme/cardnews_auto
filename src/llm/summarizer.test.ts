import test from "node:test";
import assert from "node:assert/strict";

import { fallbackSummary } from "./summarizer.js";

test("fallbackSummary는 날짜/데뷔 문단보다 음악 묘사 문단을 우선 선택함", () => {
  const intro = [
    "2022년 7월 22일 데뷔한 뉴진스(NewJeans)는 데뷔 EP로 단숨에 국내외 차트를 석권했다.",
    "",
    "UK Garage 리듬과 Jersey Club 리듬을 오가는 독특한 구성, 몽환적인 R&B 무드가 인상적인 앨범이다. 가볍게 튀는 퍼커션과 미끄러지듯 이어지는 멜로디가 청량한 긴장을 만든다.",
  ].join("\n");

  const summary = fallbackSummary(intro, "Get Up", "NewJeans");

  assert.match(summary, /UK Garage|Jersey Club|R&B/i);
  assert.doesNotMatch(summary, /\d{4}년|데뷔|차트/u);
  assert.ok(summary.length >= 52);
});

test("fallbackSummary는 발매/협업 공지보다 장르 설명 문단을 우선 선택함", () => {
  const intro = [
    "방탄소년단 뷔, 9월 8일 첫 솔로 앨범 발매",
    "데뷔 후 첫 솔로 앨범…어도어(ADOR) 민희진 총괄 프로듀서와 협업",
    "",
    "팝 R&B 장르 기반에 특색 있는 음색과 감성이 융합된 앨범이다. 자연스럽고 담백한 무드가 곡 전반을 감싸고, 잔잔한 리듬이 보컬의 결을 또렷하게 드러낸다.",
  ].join("\n");

  const summary = fallbackSummary(intro, "Layover", "V");

  assert.match(summary, /R&B|무드|감성/u);
  assert.doesNotMatch(summary, /발매|협업|9월/u);
  assert.ok(summary.length >= 52);
});
