// 문서 종류 고르기.
// 잠긴 문서는 여기서 곧바로 안내를 띄웁니다 — 폼을 다 채운 뒤에 막으면 노동이 버려집니다.

import React, { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { MODES } from "../../domain/documents.js";
import { planName, minPlanFor } from "../../domain/plans.js";
import { styles } from "../../ui/styles.js";

export function ModeSelect({ app }) {
  const [open, setOpen] = useState(false);
  const { mode, current, isGuest, isLocked, explainLock } = app;

  const choose = (key) => {
    setOpen(false);
    if (isLocked(key)) return explainLock(key);
    app.setMode(key);
    app.setQuery("");
  };

  return (
    <div style={styles.modeBar}>
      {open && <button style={styles.backdrop} onClick={() => setOpen(false)} aria-label="닫기" />}
      <div style={{ position: "relative", zIndex: 30 }}>
        <button style={styles.dropdown} onClick={() => setOpen((o) => !o)}>
          <span style={styles.dropLabel}>
            <span style={{ fontSize: 16 }}>{current.emoji}</span> {current.label}
          </span>
          <ChevronDown size={18} style={{
            transition: "transform .15s", transform: open ? "rotate(180deg)" : "none", color: "#7A9A90",
          }} />
        </button>

        {open && (
          <div style={styles.menu}>
            {MODES.map((m) => {
              const selected = mode === m.key;
              const locked = isLocked(m.key);
              return (
                <button key={m.key} onClick={() => choose(m.key)}
                  style={{
                    ...styles.menuItem,
                    ...(selected ? styles.menuItemOn : {}),
                    ...(locked ? { color: "#A9C3B9" } : {}),
                  }}>
                  <span style={{ fontSize: 15, opacity: locked ? 0.5 : 1 }}>{m.emoji}</span>
                  <span>{m.label}</span>
                  {locked
                    ? <span style={styles.lockTag}>🔒 {isGuest ? "가입" : planName(minPlanFor(m.key))}</span>
                    : selected ? <Check size={15} style={{ marginLeft: "auto", color: "#2E9E86" }} /> : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
