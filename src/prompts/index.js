// 문서 종류별 프롬프트를 한 곳에서 모아 내보냅니다.
// 새 문서를 추가하려면 이 폴더에 파일 하나를 더 만들고 아래에 등록하면 됩니다.

import play from "./play.js";
import daily from "./daily.js";
import obs from "./obs.js";
import note from "./note.js";
import adapt from "./adapt.js";
import counsel from "./counsel.js";
import life from "./life.js";

export const PROMPTS = { play, daily, obs, note, adapt, counsel, life };

/** 문서 종류에 해당하는 프롬프트 설정 */
export const promptFor = (mode) => PROMPTS[mode];
