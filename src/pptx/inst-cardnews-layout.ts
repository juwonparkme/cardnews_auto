export type CardSlideData = {
  title: string;
  artist: string;
  type: "싱글" | "EP" | "정규";
  summary: string;
  imagePath: string;
};

export type InstCardnewsDeckInput = {
  coverTitle: string;
  cards: CardSlideData[];
  endLead?: string;
  endBody?: string;
  endHandle?: string;
  endEmail?: string;
};

const POINTS_PER_INCH = 72;

function pt(value: number): number {
  return Number((value / POINTS_PER_INCH).toFixed(4));
}

export const instCardnewsLayout = {
  name: "INST_CARDNEWS",
  width: pt(810),
  height: pt(1012.5),
  imageRect: { x: pt(0), y: pt(348.5), w: pt(810), h: pt(664) },
  headerRect: { x: pt(0), y: pt(0), w: pt(810), h: pt(200.5) },
  summaryBoxRect: { x: pt(30), y: pt(192.5), w: pt(750), h: pt(156) },
  titleRect: { x: pt(58), y: pt(79.5), w: pt(560), h: pt(48) },
  artistRect: { x: pt(58), y: pt(153.5), w: pt(430), h: pt(38) },
  summaryRect: { x: pt(50), y: pt(210.5), w: pt(700), h: pt(112) },
  divider: { x: pt(49), y: pt(155.5), w: pt(700), h: 0 },
  stickerRect: { x: pt(675), y: pt(84.5), w: pt(92), h: pt(82) },
} as const;

export const instCardnewsSampleCard: CardSlideData = {
  title: "작전명 청-춘!",
  artist: "잔나비",
  type: "EP",
  summary:
    "빈티지한 밴드 사운드와 경쾌한 리듬, 힘을 빼고 뻗는 보컬이 자유롭게 흐른다. 들뜬 질주감과 풋풋한 낭만이 한데 섞이며, 청춘의 한복판을 달리는 듯한 무드가 난다.",
  imagePath: "/Users/bagjuwon/Projects/cardnews_auto/images/2.jpg",
};

export const instCardnewsDefaults = {
  coverTitle: "인디 추천곡",
  endLead: "인디음악의 취향을",
  endBody: "정리한 카드뉴스를 계속 발행합니다.",
  endHandle: "https://www.youtube.com/@inst_taw",
  endEmail: "hello@reallygreatsite.com",
} as const;

export const instCardnewsSampleDeck: InstCardnewsDeckInput = {
  coverTitle: instCardnewsDefaults.coverTitle,
  cards: [instCardnewsSampleCard],
  endLead: instCardnewsDefaults.endLead,
  endBody: instCardnewsDefaults.endBody,
  endHandle: instCardnewsDefaults.endHandle,
  endEmail: instCardnewsDefaults.endEmail,
};
