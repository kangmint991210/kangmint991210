// 어느 화면에서나 쓰는 가장 작은 조각들.
// 여기 있는 것들은 도메인(요금제·문서 종류)을 몰라야 합니다 — 순수 표현 요소만.

import React, { useState, useRef, useEffect } from "react";
import { Check, Pencil } from "lucide-react";
import { brand } from "../config.js";
import { styles } from "./styles.js";
import { css } from "./theme.js";

// 브랜드 (로고 + 이름 + 한 줄 소개)
// 화면마다 다르게 보이면 같은 서비스인지 헷갈리므로 한 곳에서만 정의해 재사용합니다.

export function Brand({ onClick, title }) {
  const inner = (
    <>
      <span style={styles.logoMark}><Mascot size={38} /></span>
      <div style={{ textAlign: "left" }}>
        <div style={styles.title}>{brand.name}</div>
        <div style={styles.subtitle}>{brand.tagline}</div>
      </div>
    </>
  );
  return onClick
    ? <button style={styles.brandBtn} onClick={onClick} title={title}>{inner}</button>
    : <div style={styles.brandBtn}>{inner}</div>;
}

export function Mascot({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <ellipse cx="50" cy="92" rx="26" ry="5" fill="#000" opacity="0.06" />
      <path d="M50 8 L58 30 L82 30 L63 45 L70 70 L50 55 L30 70 L37 45 L18 30 L42 30 Z"
        fill="#7FD8C4" stroke="#4FBFA3" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="42" cy="44" r="3.4" fill="#2E4A42" />
      <circle cx="58" cy="44" r="3.4" fill="#2E4A42" />
      <circle cx="43.2" cy="42.8" r="1.1" fill="#fff" />
      <circle cx="59.2" cy="42.8" r="1.1" fill="#fff" />
      <circle cx="36" cy="50" r="3.6" fill="#FF9AA2" opacity="0.65" />
      <circle cx="64" cy="50" r="3.6" fill="#FF9AA2" opacity="0.65" />
      <path d="M45 51 Q50 56 55 51" stroke="#2E4A42" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Editable({ value, path, onEdit, style, multiline = true, placeholder = "내용을 적어주세요" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const ref = useRef(null);

  useEffect(() => { if (!editing) setDraft(value ?? ""); }, [value, editing]);
  useEffect(() => {
    if (!editing || !ref.current) return;
    ref.current.focus();
    ref.current.style.height = "auto";
    ref.current.style.height = ref.current.scrollHeight + "px";
  }, [editing]);

  // 편집 기능이 연결되지 않은 곳(랜딩 샘플 등)에서는 그냥 글자로만 보여줍니다
  if (!onEdit) return <p style={style}>{value}</p>;

  const commit = () => { setEditing(false); if (draft !== value) onEdit(path, draft); };

  if (editing) {
    return (
      <div style={styles.editWrap}>
        <textarea ref={ref} value={draft} rows={multiline ? undefined : 1}
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); }
            // 줄바꿈이 필요한 본문이라 Enter 는 살리고, 저장은 ⌘/Ctrl+Enter 로
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
          }}
          style={styles.editArea} placeholder={placeholder} />
        <div style={styles.editBtns}>
          <button style={styles.editSave} onClick={commit}><Check size={13} /> 저장</button>
          <button style={styles.editCancel} onClick={() => { setDraft(value ?? ""); setEditing(false); }}>취소</button>
        </div>
      </div>
    );
  }

  return (
    <p style={{ ...style, ...styles.editable }} onClick={() => setEditing(true)}
      title="눌러서 고치기" className="editable">
      {value || <span style={{ color: "#A9C3B9" }}>{placeholder}</span>}
      <Pencil size={11} className="pen" style={styles.editPen} />
    </p>
  );
}

export function ModalShell({ children, onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <style>{css}</style>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.modalClose} onClick={onClose} aria-label="닫기">✕</button>
        {children}
      </div>
    </div>
  );
}

export function Sec({ icon, label, children, tint }) {
  return (
    <div style={styles.section}>
      <div style={{ ...styles.sectionHead, background: tint }}>{icon} {label}</div>
      <div style={{ paddingLeft: 2 }}>{children}</div>
    </div>
  );
}
