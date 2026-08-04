// 입력 폼을 이루는 공통 필드.
// 어떤 문서의 폼이든 이 조각들을 조합해 만듭니다.

import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
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

export function DateField({ value, onChange, label, type = "date", text }) {
  const emoji = type === "week" ? "🗓️" : type === "month" ? "📆" : type === "time" ? "🕘" : "📅";
  return (
    <div style={styles.dateWrap}>
      <span style={{ fontSize: 13, flexShrink: 0 }}>{emoji}</span>
      {text && <span style={styles.dateText}>{text}</span>}
      <input type={type} aria-label={label} value={value || ""}
        onChange={(e) => onChange(e.target.value)} style={styles.dateInput} />
    </div>
  );
}
