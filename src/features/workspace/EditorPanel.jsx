// 입력 영역 — 잠긴 문서면 폼 대신 안내를, 아니면 문서에 맞는 폼을 보여 줍니다.
//
// 필수 입력을 비워 둔 채 만들면 AI 가 날짜·아이 정보를 지어내므로,
// 버튼을 막고 "무엇이 왜 필요한지"까지 함께 알려 줍니다.

import React from "react";
import { Loader2 } from "lucide-react";
import { DEFAULT_MODE } from "../../domain/documents.js";
import { minPlanFor } from "../../domain/plans.js";
import { PANELS } from "../editor/Panels.jsx";
import { LockedPanel } from "../results/DocList.jsx";
import { styles } from "../../ui/styles.js";

export function EditorPanel({ app }) {
  const { mode, form, current, missing, canGenerate, loading, prompt } = app;
  const Panel = PANELS[mode];

  if (app.isLocked(mode)) {
    return (
      <section style={styles.panel}>
        <LockedPanel
          label={current.label}
          guest={app.isGuest}
          need={minPlanFor(mode)}
          onOpen={() => app.explainLock(mode)}
          onFallback={() => app.setMode(DEFAULT_MODE)}
        />
      </section>
    );
  }

  return (
    <section style={styles.panel}>
      <div style={styles.privacyNote}>
        🔒 아이 <b>실명 대신 이니셜·별명</b>을 권해요. 입력하신 내용은 문서를 만드는 데에만 쓰이고, 본인만 볼 수 있어요.
      </div>

      <Panel form={form} setF={app.setField} toggleDomain={app.toggleDomain} />

      <button
        style={{ ...styles.genBtn, ...(canGenerate ? {} : styles.genBtnOff) }}
        onClick={() => app.send("")}
        disabled={!canGenerate}
        title={missing.length ? `${missing.join(", ")}을(를) 먼저 채워주세요` : prompt.btn}>
        {loading ? <Loader2 size={16} className="spin" /> : <span>✏️</span>} {prompt.btn}
      </button>

      {missing.length > 0 && (
        <div style={styles.needHint}>
          ✏️ <b>{missing.join(" · ")}</b> 을(를) 채우면 만들 수 있어요.
          <span style={styles.needWhy}> 비워 두면 날짜·아이 정보를 지어내서 다시 써야 해요.</span>
        </div>
      )}
    </section>
  );
}
