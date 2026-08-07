// 작업 달력 — 이번 달에 며칠에 무엇을 만들었는지.
//
// 로그인한 선생님에게는 "이 서비스가 무엇인지" 설명하는 샘플·요금제보다
// "내가 뭘 해뒀는지"가 훨씬 쓸모 있습니다. 랜딩의 그 자리를 대신합니다.
//
// 규칙(날짜 계산)은 domain/calendar.js 에 있고, 여기서는 그리기만 합니다.

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { modeOf } from "../../domain/documents.js";
import {
  WEEKDAYS, dayKey, monthOf, monthGrid, monthLabel, shiftMonth, groupByDay, countInMonth,
} from "../../domain/calendar.js";
import { holidayOf, holidaysInMonth } from "../../domain/holidays.js";
import { useHolidays } from "../../hooks/useHolidays.js";
import { styles } from "../../ui/styles.js";

export function WorkCalendar({ docs, onOpenDoc }) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => monthOf(today));
  const [picked, setPicked] = useState(null);

  const byDay = useMemo(() => groupByDay(docs), [docs]);
  const cells = useMemo(() => monthGrid(cursor), [cursor]);
  const total = countInMonth(byDay, cursor);
  // 공휴일은 바깥 달력에서 받아 옵니다 (못 받으면 내장 표) — domain/holidays.js 참고
  const holidayTable = useHolidays(cursor.year);
  const holidays = useMemo(() => holidaysInMonth(cursor, holidayTable), [cursor, holidayTable]);
  const todayKey = dayKey(today);
  const pickedDocs = picked ? byDay[picked] || [] : [];

  const move = (step) => { setCursor((c) => shiftMonth(c, step)); setPicked(null); };

  return (
    <section style={styles.calWrap}>
      <div style={styles.calHead}>
        <button style={styles.calNav} onClick={() => move(-1)} aria-label="이전 달"><ChevronLeft size={18} /></button>
        <div style={styles.calTitle}>
          {monthLabel(cursor)}
          <span style={styles.calCount}>{total > 0 ? `${total}건 작업` : "기록 없음"}</span>
        </div>
        <button style={styles.calNav} onClick={() => move(1)} aria-label="다음 달"><ChevronRight size={18} /></button>
      </div>

      <div style={styles.calGrid}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} style={{ ...styles.calWeekday, ...(i === 0 ? styles.calSun : {}) }}>{w}</div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={`b${i}`} />;
          const list = byDay[cell.key] || [];
          const holiday = holidayOf(cell.key, holidayTable);
          const isToday = cell.key === todayKey;
          const isPicked = cell.key === picked;
          // 일요일과 공휴일은 같은 빨간색으로 — 쉬는 날이라는 뜻이 같습니다
          const rest = i % 7 === 0 || Boolean(holiday);
          const label = [`${cell.day}일`, holiday, list.length ? `${list.length}건` : null]
            .filter(Boolean).join(" · ");
          return (
            <button
              key={cell.key}
              style={{
                ...styles.calDay,
                ...(rest ? styles.calSun : {}),
                ...(isToday ? styles.calToday : {}),
                ...(isPicked ? styles.calPicked : {}),
              }}
              onClick={() => setPicked(list.length ? (isPicked ? null : cell.key) : null)}
              disabled={!list.length}
              title={label}
              aria-label={label}
              aria-pressed={isPicked}>
              <span>{cell.day}</span>
              {list.length > 0 && <span style={styles.calDot}>{list.length}</span>}
              {holiday && !list.length && <span style={styles.calHolidayMark} aria-hidden />}
            </button>
          );
        })}
      </div>

      {holidays.length > 0 && (
        <div style={styles.calHolidays}>
          {holidays.map((h) => (
            <span key={h.day} style={styles.calHolidayTag}>
              <b>{h.day}일</b> {h.name}
            </span>
          ))}
        </div>
      )}

      {picked ? (
        <div style={styles.calDetail}>
          <div style={styles.calDetailHead}>
            {Number(picked.slice(-2))}일에 만든 문서 {pickedDocs.length}건
          </div>
          {pickedDocs.map((d) => (
            <button key={d.uid} style={styles.calDocRow} onClick={() => onOpenDoc?.(d)}
              title={`${d.title} 열기`}>
              <span style={styles.calDocEmoji}>{modeOf(d.mode)?.emoji}</span>
              <span style={styles.calDocLabel}>{modeOf(d.mode)?.label}</span>
              <span style={styles.calDocTitle}>{d.title}</span>
              {d.favorite && <Star size={13} fill="currentColor" style={{ color: "#EFB100", flexShrink: 0 }} />}
            </button>
          ))}
        </div>
      ) : (
        <div style={styles.calHint}>
          {total > 0
            ? "📌 숫자가 있는 날을 누르면 그날 만든 문서를 볼 수 있어요."
            : "이 달에는 아직 만든 문서가 없어요. 위에서 문서를 골라 시작해 보세요."}
        </div>
      )}
    </section>
  );
}
