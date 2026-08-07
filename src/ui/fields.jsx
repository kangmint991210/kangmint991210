// 입력 폼을 이루는 공통 필드.
// 어떤 문서의 폼이든 이 조각들을 조합해 만듭니다.

import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Eye, EyeOff } from "lucide-react";
import { DOMAINS, DOMAIN_COLOR, domainEmoji as dEmoji } from "../domain/documents.js";
import { styles } from "./styles.js";

/* ---------- 입력 공통 (드롭다운) ---------- */

export function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return { open, setOpen, ref };
}

export function Chips({ items, value, onPick, placeholder }) {
  const { open, setOpen, ref } = useDropdown();
  return (
    <div ref={ref} style={styles.selWrap}>
      <div style={{ position: "relative" }}>
        <button type="button" style={styles.selBtn} onClick={() => setOpen((o) => !o)}>
          <span style={styles.selValue(!!value)}>{value || placeholder || "선택"}</span>
          <ChevronDown size={16} style={{ flexShrink: 0, transition: "transform .15s", transform: open ? "rotate(180deg)" : "none", color: "#7A9A90" }} />
        </button>
        {open && (
          <div style={styles.selMenu}>
            {items.map((it) => (
              <button type="button" key={it} onClick={() => { onPick(it); setOpen(false); }}
                style={{ ...styles.selItem, ...(value === it ? styles.selItemOn : {}) }}>
                <span>{it}</span>
                {value === it && <Check size={14} style={{ marginLeft: "auto", color: "#2E9E86" }} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function DomainChips({ value, toggle }) {
  const { open, setOpen, ref } = useDropdown();
  const label = value.length ? `${value.length}개 영역 선택됨` : "영역 선택 (여러 개 가능)";
  return (
    <div ref={ref} style={styles.selWrap}>
      <div style={{ position: "relative" }}>
        <button type="button" style={styles.selBtn} onClick={() => setOpen((o) => !o)}>
          <span style={styles.selValue(value.length > 0)}>{label}</span>
          <ChevronDown size={16} style={{ flexShrink: 0, transition: "transform .15s", transform: open ? "rotate(180deg)" : "none", color: "#7A9A90" }} />
        </button>
        {open && (
          <div style={styles.selMenu}>
            {DOMAINS.map((d) => {
              const on = value.includes(d.key);
              return (
                <button type="button" key={d.key} onClick={() => toggle(d.key)}
                  style={{ ...styles.selItem, ...(on ? styles.selItemOn : {}) }}>
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: d.color, display: "inline-block", transform: "rotate(12deg)", flexShrink: 0 }} />
                  <span>{d.emoji} {d.key}</span>
                  {on && <Check size={14} style={{ marginLeft: "auto", color: "#2E9E86" }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {value.length > 0 && (
        <div style={styles.selChips}>
          {value.map((k) => (
            <span key={k} style={{ ...styles.selChip, background: (DOMAIN_COLOR[k] || "#ccc") + "33", color: "#5c6b64" }}>{dEmoji(k)} {k}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export const Lbl = ({ children }) => <span style={styles.rowLabel}>{children}</span>;

// suffix — 고른 날짜에서 계산해 나오는 값을 옆에 보여 줍니다(월령 등).
// 선생님이 직접 세지 않아도 되고, 생년월일과 어긋날 수도 없습니다.
export function DateField({ value, onChange, label, type = "date", text, suffix }) {
  const emoji = type === "week" ? "🗓️" : type === "month" ? "📆" : type === "time" ? "🕘" : "📅";
  return (
    <div style={styles.dateWrap}>
      <span style={{ fontSize: 13, flexShrink: 0 }}>{emoji}</span>
      {text && <span style={styles.dateText}>{text}</span>}
      <input type={type} aria-label={label} value={value || ""}
        onChange={(e) => onChange(e.target.value)} style={styles.dateInput} />
      {suffix && <span style={styles.dateSuffix}>{suffix}</span>}
    </div>
  );
}

/* ---------- 비밀번호 ---------- */
// 가려진 글자만 보이면 오타를 확인할 방법이 없어, 눈 아이콘으로 잠시 드러냅니다.
// ⚠ type="button" 이어야 합니다 — 폼 안에서 기본값(submit)이면 눈을 누를 때 로그인이 시도됩니다.

export function PasswordField({ label, value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  // 칸이 둘(비밀번호·비밀번호 확인)이라 이름에 칸 이름을 넣습니다 —
  // 그러지 않으면 화면을 못 보는 사용자가 어느 칸의 눈인지 구분할 수 없습니다.
  const title = `${label} ${show ? "숨기기" : "보기"}`;

  return (
    <div style={styles.authField}>
      <label style={styles.authLabel}>{label}</label>
      <div style={styles.pwWrap}>
        <input
          style={{ ...styles.authInput, ...styles.pwInput }}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button type="button" style={styles.pwToggle} onClick={() => setShow((s) => !s)}
          title={title} aria-label={title} aria-pressed={show}>
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}
