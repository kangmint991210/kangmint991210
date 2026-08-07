// 문서 종류별 프롬프트를 한 곳에서 모아 내보냅니다.
// 새 문서를 추가하려면 이 폴더에 파일 하나를 더 만들고 아래에 등록하면 됩니다.

import play from "./play.js";
import daily from "./daily.js";
import obs from "./obs.js";
import note from "./note.js";
import adapt from "./adapt.js";
import counsel from "./counsel.js";
import life from "./life.js";
import assess from "./assess.js";
import monthly from "./monthly.js";
import safety from "./safety.js";
import trip from "./trip.js";
import event from "./event.js";

export const PROMPTS = {
  play, daily, obs, note, adapt, counsel, life, assess,
  monthly, safety, trip, event,
};

/**
 * 모든 문서에 똑같이 적용되는 규칙.
 *
 * 문서마다 적어 두면 새 문서를 만들 때 빠집니다 — 실제로 그랬습니다.
 * '해석 및 평가'에만 줄바꿈 규칙이 있어서 '가정-기관 연계 방안'은 목록이
 * 한 줄에 뭉쳐 나왔고, 아이를 부르는 말도 문서마다 제각각이었습니다.
 * 그래서 여기 한 곳에 두고 모든 system 프롬프트 뒤에 붙입니다.
 */
export const COMMON_RULES = `━━ 모든 문서에 공통으로 적용되는 규칙 ━━

① 아이를 부르는 말 — 본문에서는 이름 대신 "원아"라고만 씁니다.
   ✗ "민준 어린이는 ~함" / "민준 아동은 ~함" / "민준이는 ~함" / "○○ 아동은 ~함"
   ○ "원아는 ~함" / "원아가 ~함"
   설정에 이름이 주어져도 본문에 그대로 옮겨 적지 않습니다.
   "원아"가 여러 번 반복돼도 괜찮습니다 — 지루하다고 이름으로 바꾸지 마세요.
   ⚠ 예외는 둘뿐입니다.
     · JSON 의 child(원아명) 필드 — 서식 머리말의 이름 칸이라 본문이 아닙니다.
     · 부모나 아이에게 건네는 말을 큰따옴표로 옮긴 예시 — 실제로 부를 말이라
       이름을 그대로 씁니다. 예) "민준아, 오늘도 씩씩했구나."
       (따옴표 밖의 설명 문장은 그대로 "원아" 입니다)

② 목록의 줄바꿈 — 줄머리에 "· " 를 붙인 항목은 반드시 한 줄에 하나씩 씁니다.
   항목과 항목 사이는 줄바꿈 문자(JSON 문자열 안의 \\n)로 나눕니다.
   ✗ "· 첫째 항목임 · 둘째 항목임 · 셋째 항목임"   (한 줄에 "· " 가 여러 번)
   ○ "· 첫째 항목임\\n· 둘째 항목임\\n· 셋째 항목임"
   이 규칙은 관찰내용·해석·배움읽기·가정 연계 등 "· " 를 쓰는 모든 항목에 적용됩니다.
   한 항목 안에서 "· " 가 두 번 나오는데 그 사이에 \\n 이 없으면 잘못 쓴 것입니다.

━━ 이제 아래의 문서별 지시를 따릅니다 ━━

`;

// ⚠ 공통 규칙은 "앞"에 붙입니다. 뒤에 붙이면 각 문서의 JSON 스키마가 더 이상
//    시스템 프롬프트의 마지막이 아니게 되는데, 실제로 그렇게 했을 때 모델이
//    area 안에 들어가야 할 항목(배움읽기·가정 연계)을 바깥으로 빼고 summary 를
//    비운 결과가 나왔습니다. 스키마는 마지막에 두는 편이 안전합니다.
//
// ⚠ 부를 때마다 합치면 안 됩니다 — 돌려주는 객체가 매번 달라져서,
//    이 값을 의존성으로 쓰는 화면(useMintApp)이 렌더마다 통째로 다시 계산됩니다.
//    한 번만 합쳐 두고 같은 객체를 돌려줍니다.
const WITH_RULES = Object.fromEntries(
  Object.entries(PROMPTS).map(([key, cfg]) => [key, { ...cfg, system: COMMON_RULES + cfg.system }])
);

/** 문서 종류에 해당하는 프롬프트 설정 (공통 규칙이 붙어 있습니다) */
export const promptFor = (mode) => WITH_RULES[mode];
