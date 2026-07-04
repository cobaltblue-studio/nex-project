import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db";

type UpdateRow = {
  id: number;
  trackId: number;
  title: string;
  body: string;
};

/** Seed posts (ids 4–28) linked to real NEX tracks */
const UPDATES: UpdateRow[] = [
  {
    id: 4,
    trackId: 18,
    title: "「Still Standing」왜 이 분위기로 갔는지",
    body:
      "관련 곡: Still Standing\n\nSuno에서 ‘late-night city pop, soft male vocal’로 시작했는데 처음엔 너무 밝게 나왔어요.\nStyle에서 bright/neon 계열 단어를 빼고 reverb를 키우니 훨씬 제 의도에 가까워졌습니다.\nNEX에 올린 이 곡, 들으시면서 ‘어떤 장면이 떠오르는지’ 댓글로 알려주시면 다음 버전 참고하겠습니다.",
  },
  {
    id: 5,
    trackId: 13,
    title: "「Midnight City, I'm Still Here」뮤비·오디오 버전 차이",
    body:
      "관련 곡: Midnight City, I'm Still Here\n\nYouTube용으로 만든 뒤 NEX 오디오 차트에도 올리려고 mix를 다시 맞췄습니다.\n영상용 mix는 컷 편집 타이밍에 맞춰져 있어서, 순수 청취용으로는 mid가 살짝 묻히더라고요.\n같은 곡이라도 ‘어디서 들었는지’에 따라 평가가 달라질 수 있다는 걸 이 트랙으로 체감했습니다.",
  },
  {
    id: 6,
    trackId: 143,
    title: "「서툰 고백」배틀 전 자가 체크 3가지",
    body:
      "관련 곡: 서툰 고백\n\n1) 첫 10초에 ‘왜 계속 들을 이유’가 있나\n2) 중간에 텍스처 변화가 한 번은 있나\n3) 마지막 15초가 기억에 남나\n\n이 곡을 배틀에 넣기 전에 위 세 가지를 기준으로 다시 들어봤습니다. chorus vocal tone이 제 의도와 맞는지도 댓글로 의견 주세요.",
  },
  {
    id: 7,
    trackId: 134,
    title: "「마음에 머무는 봄」프롬프트 20번 뽑을 때 고정 패턴",
    body:
      "관련 곡: 마음에 머무는 봄\n\n같은 seed 느낌으로 여러 번 생성하면 verse 멜로디 contour가 비슷하게 고정되는 경우가 많았습니다.\n이 곡은 BPM±5, vocal gender, instrumentation 한 줄만 바꿔서 20번째쯤에 원하는 봄 분위기가 잡혔어요.\n‘마음에 머무는 봄’ 들어보시고, verse vs chorus 중 어디가 더 설득력 있는지도 알려주세요.",
  },
  {
    id: 8,
    trackId: 63,
    title: "「MY RULES, NOT YOURS」사람 손이 들어간 구간",
    body:
      "관련 곡: MY RULES, NOT YOURS\n\n브릿지 8마디만 DAW에서 컷 편집하고 EQ 살짝 손봤습니다.\n‘완전 AI’보다 ‘AI draft + human finish’가 이 곡에는 더 맞았고, NEX에 올릴 때도 어디까지 AI인지 적어두니 피드백이 구체적이었습니다.\n브릿지 구간 들어보시고 AI 티가 남는지 솔직히 말씀해 주세요.",
  },
  {
    id: 9,
    trackId: 133,
    title: "「불안하지만 8살의 눈동자를 가지고 있습니다.」드롭 키워드 실험",
    body:
      "관련 곡: 불안하지만 8살의 눈동자를 가지고 있습니다.\n\n‘energetic drop’만 넣으면 뻗는 경우가 많아서,\n→ ‘sidechain bass, punchy kick, wide synth stack’처럼 구체화했습니다.\n제목처럼 감정이 불안한 곡이라 drop을 과하게 anthemic으로 만들지 않으려고 ‘festival’ 키워드는 빼뒀습니다.",
  },
  {
    id: 10,
    trackId: 19,
    title: "「Stay with me tonight」Style/Lyrics 분리 템플릿",
    body:
      "관련 곡: Stay with me tonight (min_soo)\n\n차트 상위곡을 분석하면서 Style/Lyrics 분리 템플릿을 정리했습니다.\nStyle: genre + tempo + vocal + 2 instruments + mood (5줄 이내)\nLyrics: verse1 / pre / chorus만 먼저\n\n이 곡 chorus 구조 참고해서 제 다음 트랙에도 적용해 볼 예정입니다.",
  },
  {
    id: 11,
    trackId: 13,
    title: "「Midnight City, I'm Still Here」보컬 톤 장르별 변형",
    body:
      "관련 곡: Midnight City, I'm Still Here\n\n팝/시티팝은 airy vocal이 잘 맞는데, 이 곡은 ‘dry, upfront’ 쪽이 더 어울렸습니다.\n같은 보컬 톤을 모든 장르에 넣으면 ‘내 sound’는 생기지만 배틀에서는 단조로워질 수 있어요.\nMidnight City 들으시고 vocal placement 어떻게 느껴지는지 궁금합니다.",
  },
  {
    id: 12,
    trackId: 143,
    title: "「서툰 고백」BPM 키워드 위치 실험",
    body:
      "관련 곡: 서툰 고백\n\nStyle 첫 줄 vs 중간 vs 끝 — BPM 키워드를 세 군데 넣어봤을 때 첫 줄이 가장 안정적이었습니다.\n‘128 BPM, four-on-the-floor’ 같이 리듬 정보를 붙이면 이 곡처럼 발라드+일렉트로닉 hybrid에서 템포 이탈이 줄어요.",
  },
  {
    id: 13,
    trackId: 63,
    title: "「MY RULES, NOT YOURS」프롬프트 짧게 vs 길게",
    body:
      "관련 곡: MY RULES, NOT YOURS\n\n짧게(3~4줄): 결과 편차 큼, happy accident 많음\n길게(10줄+): 재현성↑, 지루해질 위험↑\n\n이 곡은 긴 Style로 재현성을 잡고, bridge만 짧은 prompt로 실험했습니다.",
  },
  {
    id: 14,
    trackId: 18,
    title: "「Still Standing」실패 프롬프트 3개와 교훈",
    body:
      "관련 곡: Still Standing\n\n1) ‘cinematic orchestral EDM trap’ — 섞이긴 하는데 정체성 없음\n2) ‘whisper vocal + heavy metal’ — 보컬이 묻힘\n3) ‘exact copy of 80s hit’ — 피하기\n\n최종 Still Standing 나오기 전 버전들입니다. 같은 실패 겪으신 분 계신가요?",
  },
  {
    id: 15,
    trackId: 121,
    title: "「천국이라 말해줘」80s synth 한 줄 추가 효과",
    body:
      "관련 곡: 천국이라 말해줘 (kidpink003)\n\nelectro pop 베이스에 ‘80s synth, gated reverb snare’ 한 줄만 추가했을 때 snare tail과 synth brightness가 확 바뀌는 걸 이 곡에서 참고했습니다.\ndecade 키워드는 분위기 전체를 흔들 수 있어서, 마지막에 소량만 넣는 걸 추천합니다.",
  },
  {
    id: 16,
    trackId: 19,
    title: "「Stay with me tonight」훅 vs 편곡 — 배틀에서",
    body:
      "관련 곡: Stay with me tonight\n\n최근 배틀에서 멜로디는 A가 더 캐치했는데, 편곡 texture 변화로 B가 이긴 케이스가 있었습니다.\nStay with me tonight처럼 훅이 강한 곡은 ‘반복 청취 가치’가 댓글로 자주 언급되더라고요.\n이 곡 배틀 보신 분, 어떤 구간에서 투표하셨나요?",
  },
  {
    id: 17,
    trackId: 13,
    title: "「Midnight City, I'm Still Here」투표할 때 듣는 구간",
    body:
      "관련 곡: Midnight City, I'm Still Here\n\n저는 0:00~0:12만 먼저 듣고, 마음에 들면 0:30 전후 chorus로 넘어갑니다.\nMidnight City는 intro synth pad가 분위기를 잡아줘서 첫 12초가 특히 중요한 것 같아요.\n여러분은 이 곡 어느 구간에서 결정하시나요?",
  },
  {
    id: 18,
    trackId: 125,
    title: "「Lost in the Static」장르 mismatch 역전 케이스",
    body:
      "관련 곡: Lost in the Static (novaprotocol)\n\nlo-fi vs uptempo pop처럼 겉장르가 다를 때, ‘더 bold한 sound design’ 쪽이 이기는 경우를 봤습니다.\nLost in the Static은 texture가 강해서 mismatch 매치업에서도 역전 가능성이 있어 보였어요.",
  },
  {
    id: 19,
    trackId: 18,
    title: "「Still Standing」연승 곡에서 보는 공통점",
    body:
      "관련 곡: Still Standing\n\nintro가 길지 않고, 15초 안에 vocal이 들어오며, chorus hook이 한 번은 명확히 들리는 곡들이 연승하는 경향이 있습니다.\nStill Standing이 차트에 있는 동안 느낀 ‘느낌’인데, 비슷하게 보시는 분 있으신가요?",
  },
  {
    id: 20,
    trackId: 63,
    title: "「MY RULES, NOT YOURS」MV vs 오디오 only",
    body:
      "관련 곡: MY RULES, NOT YOURS\n\n영상이 있으면 ‘장면’이 보조되지만, 배틀 preview에서는 audio focus가 분산될 때도 있습니다.\n이 곡은 오디오 only로 들을 때 hook이 더 또렷하게 느껴졌습니다.\nMV vs audio, 어떤 쪽이 더 설득력 있었나요?",
  },
  {
    id: 21,
    trackId: 143,
    title: "「서툰 고백」배틀 참여 후기 — 차트 vs 피드백",
    body:
      "관련 곡: 서툰 고백\n\n처음엔 차트 올리려고 배틀에 넣었는데, 지금은 ‘낯선 리스너 반응’을 보는 목적이 더 큽니다.\n서툰 고백 배틀 직후에 ‘왜 이쪽에 투표했는지’ 남기면 더 배울 것 같아요.",
  },
  {
    id: 22,
    trackId: 13,
    title: "커뮤니티 카테고리 제안 — Midnight City 사례",
    body:
      "관련 곡 예시: Midnight City, I'm Still Here\n\n창작 노트 / 프롬프트 / 배틀 토크 외에 ‘곡별 제작 타임라인’처럼 특정 트랙을 따라가는 주제도 있으면 좋을까요?\nMidnight City처럼 차트에 있는 곡 기준으로 토론하면 더 구체적일 것 같습니다.",
  },
  {
    id: 23,
    trackId: 143,
    title: "신규 크리에이터 FAQ — 서툰 고백 올리면서 겪은 것",
    body:
      "관련 곡: 서툰 고백\n\n1) 트랙 제출 후 승인까지 얼마나 걸리나요?\n2) 배틀은 어떻게 참여하나요?\n3) MV 재생이 안 될 때는 어디서 확인하나요?\n\n서툰 고백 올릴 때 저도 같은 질문이 있었습니다. 비슷한 질문 댓글로 이어주세요.",
  },
  {
    id: 24,
    trackId: 63,
    title: "「MY RULES, NOT YOURS」프롬프트 공개 범위",
    body:
      "관련 곡: MY RULES, NOT YOURS\n\n전체 공개는 학습에 좋지만, ‘나만의 sound’를 숨기고 싶을 때도 있잖아요.\n이 곡은 Style만 공개하고 Lyrics seed는 비공개로 두는 방식을 썼습니다.\n어떤 수준이 적당하다고 보시나요?",
  },
  {
    id: 25,
    trackId: 19,
    title: "배틀 알림과 「Stay with me tonight」",
    body:
      "관련 곡: Stay with me tonight\n\n배틀 결과 메일 받고 다시 NEX 들어와서 Stay with me tonight 같은 상위곡도 비교 듣게 됩니다.\n알림 톤이나 빈도(weekly digest) 의견 있으면 알려주세요.",
  },
  {
    id: 26,
    trackId: 63,
    title: "「MY RULES, NOT YOURS」크레딧 표기 예시",
    body:
      "관련 곡: MY RULES, NOT YOURS\n\n예: Music by cobaltblue_studio_film · AI-assisted (Suno v4) · Human edit on bridge\n\n이 곡 기준으로 표기 예시를 남깁니다. 다른 형식 쓰시는 분 댓글로 공유해 주세요.",
  },
  {
    id: 27,
    trackId: 13,
    title: "뮤비 재생 체크리스트 — Midnight City 사례",
    body:
      "관련 곡: Midnight City, I'm Still Here\n\n1) YouTube ‘임베드 허용’\n2) 비공개/일부 공개 아님\n3) 지역 제한 없음\n\nMidnight City 올릴 때 체크한 항목입니다. 추가로 알고 계신 항목 있으면 댓글 부탁드립니다.",
  },
  {
    id: 28,
    trackId: 143,
    title: "「서툰 고백」배틀 직후 투표 이유 남기기",
    body:
      "관련 곡: 서툰 고백\n\n배틀 끝나고 ‘왜 이쪽에 투표했는지’를 커뮤니티에 남기면 학습 속도가 빨라질 것 같아요.\n서툰 고백 배틀 보신 분, 훅/믹스/독창성 중 뭐가 결정적이었는지 댓글로 적어주세요.",
  },
];

async function main() {
  let updated = 0;
  for (const row of UPDATES) {
    const result = await db.execute(sql`
      UPDATE community_posts
      SET
        title = ${row.title},
        body = ${row.body},
        attached_track_id = ${row.trackId}
      WHERE id = ${row.id}
    `);
    if ((result as { rowCount?: number }).rowCount !== 0) updated += 1;
  }

  const sample = await db.execute(sql`
    SELECT p.id, p.title, p.attached_track_id, t.title AS track_title
    FROM community_posts p
    LEFT JOIN tracks t ON t.id = p.attached_track_id
    WHERE p.id BETWEEN 4 AND 28
    ORDER BY p.id
    LIMIT 5
  `);

  console.log(JSON.stringify({ updated: UPDATES.length, sample: sample.rows }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
