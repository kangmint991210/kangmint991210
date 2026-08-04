// 만들어진 문서 목록(= 보관함)과 생성 중 표시.

import React from "react";
import { Search, RotateCcw, Send, Loader2 } from "lucide-react";
import { minPlanFor } from "../../domain/plans.js";
import { DocTurn, Generating, EmptyState } from "../results/DocList.jsx";
import { styles } from "../../ui/styles.js";

/** 검색창은 문서가 쌓이기 시작할 때만 (한두 건일 땐 방해가 됩니다) */
function ArchiveTools({ app }) {
  const { query, docCount } = app;
  return (
    <div style={styles.searchRow}>
      {docCount >= 3 ? (
        <>
          <Search size={15} style={{ color: "#A9C3B9", flexShrink: 0 }} />
          <input value={query} onChange={(e) => app.setQuery(e.target.value)}
            placeholder="저장된 문서 검색 (아이 이름·주차·내용)" style={styles.searchInput} />
          {query && <button style={styles.searchClear} onClick={() => app.setQuery("")}>지우기</button>}
        </>
      ) : (
        <span style={styles.searchCount}>📄 {docCount}건</span>
      )}
      <button style={styles.searchClear} onClick={app.clearCurrentMode} title="이 메뉴의 문서 모두 삭제">
        <RotateCcw size={13} /> 비우기
      </button>
    </div>
  );
}

export function ResultList({ app }) {
  const { mode, messages, allTurns, turns, query, openIdx, loading } = app;

  return (
    <main ref={app.scroller} style={styles.thread}>
      {messages.length === 0 && !app.isLocked(mode) && (
        <EmptyState mode={mode} onPick={app.send} disabled={!app.canGenerate} />
      )}

      {allTurns.some((t) => t.bot) && <ArchiveTools app={app} />}
      {query && turns.length === 0 && (
        <div style={styles.emptySearch}>‘{query}’ 와 맞는 문서가 없어요.</div>
      )}

      {turns.map((t) =>
        // 아직 결과가 안 온 요청(생성 중)은 접지 않고 그대로 노출
        !t.bot ? (
          <div key={t.user.uid} style={styles.userBubble}>{t.user.text}</div>
        ) : (
          <DocTurn
            key={t.bot.uid}
            turn={t}
            no={t.no + 1}
            open={openIdx === t.no}
            guest={app.isGuest}
            canExport={app.canExport}
            onToggle={() => app.threads.toggleOpen(mode, t.no, openIdx)}
            onEdit={(path, value) => app.threads.editField(mode, t.bot.uid, t.bot.docId, path, value)}
            onDelete={() => app.threads.removeTurn(mode, t)}
            onRetry={() => app.send("", t.bot.uid)}
            onNeedSignup={(kind) => app.setSignupWall({ kind })}
            onNeedPlan={() => app.setPaywall({ need: minPlanFor("daily"), reason: "export" })}
          />
        )
      )}

      {loading && <Generating eta={app.eta} elapsed={app.elapsed} />}
    </main>
  );
}

/** 이어 말하기 입력창 — 결과가 있어야 의미가 있어서, 그전에는 안내만 보여줍니다. */
export function ComposeBar({ app }) {
  const { mode, messages, loading, prompt } = app;
  if (app.isLocked(mode)) return null;

  if (messages.length === 0) {
    return (
      <footer style={styles.inputHintBar}>
        👆 먼저 위에서 <b>{prompt.btn}</b> 를 눌러 만들어 보세요. 결과가 나오면 여기서 “더 짧게”처럼 다듬을 수 있어요.
      </footer>
    );
  }

  return (
    <footer style={styles.inputBar}>
      <input value={app.input} onChange={(e) => app.setInput(e.target.value)}
        // 한글 입력은 Enter 로 조합을 확정하므로, 조합 중 Enter 를 전송으로 삼으면 두 번 보내집니다
        onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) app.send(); }}
        placeholder={prompt.free} style={styles.input} />
      <button style={styles.sendBtn} onClick={() => app.send()} disabled={loading}>
        {loading ? <Loader2 size={19} className="spin" /> : <Send size={19} />}
      </button>
    </footer>
  );
}
