// 문서 종류별 입력 폼.
// 공통 필드(ui/fields.jsx)를 조합만 하고, 무엇이 필수인지는 domain/documents.js 가 정합니다.

import React from "react";
import { AGES, PLACES, DURATIONS, COUNSEL_METHODS } from "../../domain/documents.js";
import { Chips, DomainChips, DateField, Lbl } from "../../ui/fields.jsx";
import { styles } from "../../ui/styles.js";

export function PlayPanel({ form, setF, toggleDomain }) {
  return (
    <>
      <div style={styles.row}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      <div style={styles.row}><Lbl>🖍️ 영역</Lbl><DomainChips value={form.domains} toggle={toggleDomain} /></div>
      <div style={styles.rowSplit}>
        <div style={styles.miniRow}><Lbl>📍 장소</Lbl><Chips items={PLACES} value={form.place} onPick={(v) => setF("place", v)} /></div>
        <div style={styles.miniRow}><Lbl>⏰ 시간</Lbl><Chips items={DURATIONS} value={form.duration} onPick={(v) => setF("duration", v)} /></div>
      </div>
      <div style={styles.rowSplit}>
        <input value={form.theme} onChange={(e) => setF("theme", e.target.value)} placeholder="🎈 주제 (예: 봄, 공룡)" style={styles.field} />
        <input value={form.materials} onChange={(e) => setF("materials", e.target.value)} placeholder="🧸 준비물 (예: 색종이)" style={styles.field} />
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
        <input value={form.child} onChange={(e) => setF("child", e.target.value)} placeholder="🧒 아동 (이니셜·별명)" style={styles.field} />
        <div style={styles.miniRow}><Lbl>성별</Lbl><Chips items={["여", "남"]} value={form.gender} onPick={(v) => setF("gender", v)} /></div>
      </div>
      <div style={styles.rowSplit}>
        <input value={form.birth} onChange={(e) => setF("birth", e.target.value)} placeholder="🎂 생년월일·월령 (예: 2020.2.20 / 23개월)" style={styles.field} />
        <input value={form.recorder} onChange={(e) => setF("recorder", e.target.value)} placeholder="✍️ 기록자 (선택)" style={styles.field} />
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
        <input value={form.child} onChange={(e) => setF("child", e.target.value)} placeholder="🧒 아동 (이니셜·별명)" style={styles.field} />
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
        <input value={form.child} onChange={(e) => setF("child", e.target.value)} placeholder="🧒 아동 (이니셜·별명)" style={styles.field} />
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
// 아동명·반·기록일은 나중에 보관함에서 찾을 때만 쓰이므로 비워 둬도 만들어집니다.
export function LifePanel({ form, setF }) {
  return (
    <>
      <div style={styles.row}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      <textarea value={form.lifeMemo} onChange={(e) => setF("lifeMemo", e.target.value)}
        placeholder="✍️ 아이의 특징 — 관찰한 내용을 자유롭게 적어주세요. (예: “물”, “안아” 같은 한 단어로 요구를 표현함 / 낮잠은 교사가 등을 토닥여 주면 잠듦)" style={styles.textarea} />
      <div style={styles.rowSplit}>
        <input value={form.child} onChange={(e) => setF("child", e.target.value)} placeholder="🧒 아동 (이니셜·별명, 선택)" style={styles.field} />
        <input value={form.klass} onChange={(e) => setF("klass", e.target.value)} placeholder="🏫 반 (선택)" style={styles.field} />
        <DateField text="기록일" value={form.lifeDate} onChange={(v) => setF("lifeDate", v)} label="기록일 (선택)" />
      </div>
    </>
  );
}

/** 문서 종류 → 입력 폼. 화면은 이 표만 보고 폼을 고릅니다. */
export const PANELS = {
  play: PlayPanel, daily: DailyPanel, obs: ObsPanel,
  note: NotePanel, adapt: AdaptPanel, counsel: CounselPanel, life: LifePanel,
};
