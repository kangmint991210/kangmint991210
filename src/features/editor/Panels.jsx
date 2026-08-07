// 문서 종류별 입력 폼.
// 공통 필드(ui/fields.jsx)를 조합만 하고, 무엇이 필수인지는 domain/documents.js 가 정합니다.

import React from "react";
import { AGES, PLACES, DURATIONS, COUNSEL_METHODS, ASSESS_AREAS, SAFETY_TOPICS } from "../../domain/documents.js";
import { Chips, DomainChips, DateField, Lbl } from "../../ui/fields.jsx";
import { monthsOld } from "../../lib/korean-date.js";
import { dayKey } from "../../domain/calendar.js";
import { styles } from "../../ui/styles.js";

/**
 * 생년월일 옆에 보여 줄 월령.
 * 기준은 관찰 월이고, 아직 안 골랐으면 오늘로 셉니다. 계산이 안 되면 아무것도 안 보여 줍니다.
 */
const ageSuffix = (birth, period) => {
  const months = monthsOld(birth, period || dayKey(new Date()));
  return months == null ? null : `${months}개월`;
};

export function PlayPanel({ form, setF, toggleDomain }) {
  return (
    <>
      <div style={styles.row}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      <div style={styles.row}><Lbl>🖍️ 영역</Lbl><DomainChips value={form.domains} toggle={toggleDomain} /></div>
      <div style={styles.rowSplit}>
        <div style={styles.miniRow}><Lbl>📍 장소</Lbl><Chips items={PLACES} value={form.place} onPick={(v) => setF("place", v)} /></div>
        <div style={styles.miniRow}><Lbl>⏰ 시간</Lbl><Chips items={DURATIONS} value={form.duration} onPick={(v) => setF("duration", v)} /></div>
      </div>
      {/* 위의 장소·시간과 같은 구조(라벨 밖 + 입력칸)로 둡니다.
          라벨을 입력칸 안에 두면 흰 칸이 시작하는 자리가 위아래로 어긋나 보입니다. */}
      <div style={styles.rowSplit}>
        <div style={styles.miniRow}><Lbl>🎈 주제</Lbl>
          <input value={form.theme} onChange={(e) => setF("theme", e.target.value)}
            placeholder="예: 봄, 공룡" style={styles.field} /></div>
        <div style={styles.miniRow}><Lbl>🧸 준비물</Lbl>
          <input value={form.materials} onChange={(e) => setF("materials", e.target.value)}
            placeholder="예: 색종이" style={styles.field} /></div>
      </div>
    </>
  );
}

export function DailyPanel({ form, setF }) {
  return (
    <>
      <div style={styles.rowSplit}>
        <DateField type="week" value={form.dailyWeek} onChange={(v) => setF("dailyWeek", v)} label="주차 선택" />
        <input value={form.klass} onChange={(e) => setF("klass", e.target.value)} placeholder="🏫 반 (예: 0세반)" style={styles.field} />
        <div style={styles.miniRow}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      </div>
      <div style={styles.rowSplit}>
        <input value={form.dailyTheme} onChange={(e) => setF("dailyTheme", e.target.value)} placeholder="🌱 주제 (예: 느끼며 놀이해요)" style={styles.field} />
        <input value={form.dailyNext} onChange={(e) => setF("dailyNext", e.target.value)} placeholder="🔜 다음 주제 (선택)" style={styles.field} />
      </div>
      <textarea value={form.dailyMemo} onChange={(e) => setF("dailyMemo", e.target.value)}
        placeholder="✍️ 이번 주 놀이·활동·있었던 일 — 요일별로 어떤 놀이를 했고 아이들이 어땠는지 적어주세요. 거칠어도 괜찮아요." style={styles.textarea} />
      <input value={form.dailySafety} onChange={(e) => setF("dailySafety", e.target.value)} placeholder="🛟 안전교육 주제 (예: 여름 감염병 예방)" style={{ ...styles.field, width: "100%" }} />
    </>
  );
}

export function ObsPanel({ form, setF }) {
  return (
    <>
      <div style={styles.rowSplit}>
        <input value={form.child} onChange={(e) => setF("child", e.target.value)} placeholder="🧒 원아 (이니셜·별명)" style={styles.field} />
        <div style={styles.miniRow}><Lbl>성별</Lbl><Chips items={["여", "남"]} value={form.gender} onPick={(v) => setF("gender", v)} /></div>
      </div>
      <div style={styles.rowSplit}>
        {/* 월령은 받아 적지 않고 생년월일에서 계산합니다 — 손으로 세면 틀리고,
            관찰 월을 바꾸면 같이 어긋납니다. 기준은 관찰 월(없으면 오늘). */}
        <DateField type="date" text="생년월일" label="생년월일"
          value={form.birth} onChange={(v) => setF("birth", v)}
          suffix={ageSuffix(form.birth, form.obsPeriod)} />
        {/* 위아래 줄(성별·연령)과 같이 라벨을 밖에 둡니다 —
            그래야 오른쪽 칸의 흰 상자가 세 줄에서 같은 자리에서 시작합니다 */}
        <div style={styles.miniRow}><Lbl>✍️ 기록자</Lbl>
          <input value={form.recorder} onChange={(e) => setF("recorder", e.target.value)}
            placeholder="선택" style={styles.field} /></div>
      </div>
      <div style={styles.rowSplit}>
        <DateField type="month" value={form.obsPeriod} onChange={(v) => setF("obsPeriod", v)} label="관찰 월" />
        <div style={styles.miniRow}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      </div>
      <textarea value={form.memo} onChange={(e) => setF("memo", e.target.value)}
        placeholder="✍️ 관찰 메모 — 이번 기간에 아이가 한 말·행동을 영역 구분 없이 편하게 적어주세요. 앱이 발달 영역별로 정리해 드려요." style={styles.textarea} />
    </>
  );
}

export function NotePanel({ form, setF }) {
  return (
    <>
      <div style={styles.rowSplit}>
        <input value={form.child} onChange={(e) => setF("child", e.target.value)} placeholder="🧒 원아 (이니셜·별명)" style={styles.field} />
        <div style={styles.miniRow}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      </div>
      <textarea value={form.todayHi} onChange={(e) => setF("todayHi", e.target.value)}
        placeholder="🌟 오늘 활동·하이라이트 (예: 모래놀이에서 친구와 케이크 만들기)" style={styles.textarea} />
      <div style={styles.rowSplit}>
        <input value={form.mood} onChange={(e) => setF("mood", e.target.value)} placeholder="😊 아이 모습·기분" style={styles.field} />
        <input value={form.homeNote} onChange={(e) => setF("homeNote", e.target.value)} placeholder="🏠 가정 당부 (선택)" style={styles.field} />
      </div>
    </>
  );
}

export function AdaptPanel({ form, setF }) {
  return (
    <>
      <div style={styles.rowSplit}>
        <input value={form.child} onChange={(e) => setF("child", e.target.value)} placeholder="🧒 원아 (이니셜·별명)" style={styles.field} />
        <input value={form.klass} onChange={(e) => setF("klass", e.target.value)} placeholder="🏫 반" style={styles.field} />
      </div>
      <div style={styles.rowSplit}>
        <DateField type="date" text="생년월일" value={form.adaptBirth} onChange={(v) => setF("adaptBirth", v)} label="생년월일" />
        <div style={styles.miniRow}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      </div>
      <div style={styles.rowSplit}>
        <DateField text="적응 시작일" value={form.adaptStart} onChange={(v) => setF("adaptStart", v)} label="적응 시작일" />
        <DateField type="time" text="등원" value={form.arriveTime} onChange={(v) => setF("arriveTime", v)} label="등원 시간" />
        <DateField type="time" text="하원" value={form.leaveTime} onChange={(v) => setF("leaveTime", v)} label="하원 시간" />
      </div>
      <textarea value={form.adaptMemo} onChange={(e) => setF("adaptMemo", e.target.value)}
        placeholder="✍️ 적응 모습 메모 — 일차별로 등·하원, 분리, 놀이 참여, 식사·수면, 친구·교사와의 모습을 적어주세요." style={styles.textarea} />
    </>
  );
}

export function CounselPanel({ form, setF }) {
  return (
    <>
      <div style={styles.rowSplit}>
        <input value={form.child} onChange={(e) => setF("child", e.target.value)} placeholder="🧒 원아명" style={styles.field} />
        <input value={form.klass} onChange={(e) => setF("klass", e.target.value)} placeholder="🏫 반" style={styles.field} />
      </div>
      <div style={styles.rowSplit}>
        <DateField type="date" text="생년월일" value={form.counselBirth} onChange={(v) => setF("counselBirth", v)} label="생년월일" />
        <div style={styles.miniRow}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      </div>
      <div style={styles.rowSplit}>
        <input value={form.guardian} onChange={(e) => setF("guardian", e.target.value)} placeholder="👪 보호자명 (예: ○○ 모)" style={styles.field} />
        <input value={form.teacher} onChange={(e) => setF("teacher", e.target.value)} placeholder="✍️ 면담교사" style={styles.field} />
      </div>
      <div style={styles.rowSplit}>
        <DateField text="면담일" value={form.date} onChange={(v) => setF("date", v)} label="면담일" />
        <div style={styles.miniRow}><Lbl>💬 형태</Lbl><Chips items={COUNSEL_METHODS} value={form.counselMethod} onPick={(v) => setF("counselMethod", v)} /></div>
      </div>
      <textarea value={form.counselMemo} onChange={(e) => setF("counselMemo", e.target.value)}
        placeholder="✍️ 상담 메모 — 아이의 기본생활·놀이·친구관계·언어·신체 등 현재 모습과 학부모가 궁금해하는 점을 편하게 적어주세요." style={styles.textarea} />
    </>
  );
}

// 생활기록부는 필수 입력이 연령·특징 둘뿐입니다.
// 원아명·반·기록일은 나중에 보관함에서 찾을 때만 쓰이므로 비워 둬도 만들어집니다.
export function LifePanel({ form, setF }) {
  return (
    <>
      <div style={styles.row}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      <textarea value={form.lifeMemo} onChange={(e) => setF("lifeMemo", e.target.value)}
        placeholder="✍️ 아이의 특징 — 관찰한 내용을 자유롭게 적어주세요. (예: “물”, “안아” 같은 한 단어로 요구를 표현함 / 낮잠은 교사가 등을 토닥여 주면 잠듦)" style={styles.textarea} />
      <div style={styles.rowSplit}>
        <input value={form.child} onChange={(e) => setF("child", e.target.value)} placeholder="🧒 원아 (이니셜·별명, 선택)" style={styles.field} />
        <input value={form.klass} onChange={(e) => setF("klass", e.target.value)} placeholder="🏫 반 (선택)" style={styles.field} />
        <DateField text="기록일" value={form.lifeDate} onChange={(v) => setF("lifeDate", v)} label="기록일 (선택)" />
      </div>
    </>
  );
}

// 발달평가 총평은 영역 여섯 칸을 모두 받습니다.
// 칸을 나눠 두면 결과 문단과 1:1 로 맞아, 비어 있는 영역을 AI 가 지어내지 않습니다.
export function AssessPanel({ form, setF }) {
  return (
    <>
      <div style={styles.row}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      {ASSESS_AREAS.map((a) => (
        <div key={a.key} style={styles.assessField}>
          <span style={styles.assessLabel}>{a.emoji} {a.input}</span>
          <textarea
            value={form[a.form]}
            onChange={(e) => setF(a.form, e.target.value)}
            placeholder={a.hint}
            style={styles.assessArea}
          />
        </div>
      ))}
      <div style={styles.rowSplit}>
        <input value={form.child} onChange={(e) => setF("child", e.target.value)} placeholder="🧒 원아명 (이니셜, 선택)" style={styles.field} />
        <input value={form.klass} onChange={(e) => setF("klass", e.target.value)} placeholder="🏫 반 (선택)" style={styles.field} />
        <input value={form.assessPeriod} onChange={(e) => setF("assessPeriod", e.target.value)} placeholder="🗓️ 평가기간 (예: 3~8월, 선택)" style={styles.field} />
      </div>
    </>
  );
}


// 여러 칸을 세로로 쌓는 폼에서 되풀이되는 조각 (발달평가·월간평가가 함께 씁니다)
function Memo({ label, value, onChange, placeholder }) {
  return (
    <div style={styles.assessField}>
      <span style={styles.assessLabel}>{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} style={styles.assessArea} />
    </div>
  );
}

export function MonthlyPanel({ form, setF }) {
  return (
    <>
      <div style={styles.rowSplit}>
        <input value={form.monTheme} onChange={(e) => setF("monTheme", e.target.value)}
          placeholder="🌱 이번 달 보육 주제 (예: 여름과 물놀이)" style={styles.field} />
        <DateField type="month" value={form.monMonth} onChange={(v) => setF("monMonth", v)} label="평가 월 (선택)" />
        <div style={styles.miniRow}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      </div>
      <Memo label="🎨 중심 놀이" value={form.monPlay} onChange={(v) => setF("monPlay", v)}
        placeholder="이번 달 중심적으로 이루어진 놀이 (예: 물감 물놀이, 물총 놀이, 바다생물 탐색)" />
      <Memo label="✨ 자발적으로 확장된 놀이" value={form.monExpand} onChange={(v) => setF("monExpand", v)}
        placeholder="아이들이 스스로 이어 간 놀이 (예: 바다생물 흉내 내기)" />
      <Memo label="🤝 교사 지원 내용" value={form.monSupport} onChange={(v) => setF("monSupport", v)}
        placeholder="어떤 환경과 재료를 제공했는지 (예: 다양한 물놀이 도구와 그림자료 제공)" />
      <Memo label="👪 부모면담 내용" value={form.monParent} onChange={(v) => setF("monParent", v)}
        placeholder="면담에서 나온 이야기 (예: 집에서도 바다생물 책을 자주 본다고 함)" />
      <Memo label="🔜 다음 달 확장 놀이" value={form.monNext} onChange={(v) => setF("monNext", v)}
        placeholder="다음 달에 이어 갈 놀이 흐름 (예: 다양한 감각을 활용한 여름 탐색 놀이)" />
    </>
  );
}

export function SafetyPanel({ form, setF }) {
  return (
    <>
      <div style={styles.row}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      <div style={styles.row}><Lbl>🛟 주제</Lbl><Chips items={SAFETY_TOPICS} value={form.safetyTopic} onPick={(v) => setF("safetyTopic", v)} /></div>
      <input value={form.safetyTopic} onChange={(e) => setF("safetyTopic", e.target.value)}
        placeholder="🛟 주제를 직접 적어도 돼요" style={{ ...styles.field, width: "100%", marginBottom: 10 }} />
      <textarea value={form.safetySub} onChange={(e) => setF("safetySub", e.target.value)}
        placeholder="✍️ 소주제 및 활동내용 (예: 횡단보도 안전하게 건너기)" style={styles.textarea} />
    </>
  );
}

export function TripPanel({ form, setF }) {
  return (
    <>
      <div style={styles.rowSplit}>
        <input value={form.tripPlace} onChange={(e) => setF("tripPlace", e.target.value)}
          placeholder="📍 장소 (예: 서울상상나라)" style={styles.field} />
        <input value={form.tripCount} onChange={(e) => setF("tripCount", e.target.value)}
          placeholder="👥 아동 수 (예: 20명)" style={styles.field} />
        <div style={styles.miniRow}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      </div>
      <textarea value={form.tripContent} onChange={(e) => setF("tripContent", e.target.value)}
        placeholder="✍️ 견학 내용 — 무엇을 보고 체험할지 적어주세요 (예: 전시 체험, 신체놀이·역할놀이 공간 이용)" style={styles.textarea} />
      <div style={styles.rowSplit}>
        <input value={form.tripTransport} onChange={(e) => setF("tripTransport", e.target.value)}
          placeholder="🚌 이동 수단 (선택 — 비우면 언급하지 않아요)" style={styles.field} />
        <DateField text="견학일" value={form.tripDate} onChange={(v) => setF("tripDate", v)} label="견학일 (선택)" />
      </div>
      <div style={styles.needHint}>
        🔎 <b>전시 이름은 지어내지 않아요.</b>
        <span style={styles.needWhy}> 실제와 다를 수 있어 “신체놀이 공간”처럼 공간 유형으로만 씁니다.
        정확한 전시명은 공식 홈페이지에서 확인해 주세요.</span>
      </div>
    </>
  );
}

export function EventPanel({ form, setF }) {
  return (
    <>
      <div style={styles.rowSplit}>
        <input value={form.evName} onChange={(e) => setF("evName", e.target.value)}
          placeholder="🎪 행사명 (예: 여름 물놀이 축제)" style={styles.field} />
        <DateField text="행사일" value={form.evDate} onChange={(v) => setF("evDate", v)} label="행사일 (선택)" />
      </div>
      <div style={styles.rowSplit}>
        <input value={form.evChildren} onChange={(e) => setF("evChildren", e.target.value)}
          placeholder="👶 연령 및 인원 (예: 영아 18명, 유아 22명)" style={styles.field} />
        <input value={form.evTeachers} onChange={(e) => setF("evTeachers", e.target.value)}
          placeholder="🧑‍🏫 교사 수 (예: 8)" style={styles.field} />
      </div>
      <div style={styles.rowSplit}>
        <input value={form.evBudget} onChange={(e) => setF("evBudget", e.target.value)}
          placeholder="💰 예산 (예: 500,000원)" style={styles.field} />
        <div style={styles.miniRow}><Lbl>👪 부모</Lbl><Chips items={["참여", "미참여"]} value={form.evParents} onPick={(v) => setF("evParents", v)} /></div>
      </div>
      <textarea value={form.evContent} onChange={(e) => setF("evContent", e.target.value)}
        placeholder="✍️ 행사 내용 (예: 물놀이 체험 및 물총 놀이)" style={styles.textarea} />
    </>
  );
}

/** 문서 종류 → 입력 폼. 화면은 이 표만 보고 폼을 고릅니다. */
export const PANELS = {
  play: PlayPanel, daily: DailyPanel, obs: ObsPanel,
  note: NotePanel, adapt: AdaptPanel, counsel: CounselPanel, life: LifePanel,
  assess: AssessPanel, monthly: MonthlyPanel, safety: SafetyPanel,
  trip: TripPanel, event: EventPanel,
};
