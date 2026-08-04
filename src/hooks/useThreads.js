// 문서 종류별 생성 기록(threads)과 그 편집·삭제.
// 화면 상태와 DB 를 함께 움직여, 화면에서 지운 것이 다음 로그인에 되살아나지 않게 합니다.

import { useState, useCallback } from "react";
import { uid, setPath } from "../lib/utils.js";
import { createEmptyThreads, MODE_KEYS } from "../domain/documents.js";
import { documents } from "../services/repository.js";

/** DB 행 → 화면 메시지 두 개(요청, 결과) */
const rowToMessages = (row) => {
  const out = [];
  if (row.user_text) out.push({ role: "user", uid: uid(), text: row.user_text });
  out.push({
    role: "bot", uid: uid(), docId: row.id, kind: row.kind,
    text: row.payload?.reply || "완성했어요!", payload: row.payload,
  });
  return out;
};

export function useThreads() {
  const [threads, setThreads] = useState(createEmptyThreads);
  // 문서 종류별로 "펼쳐 둔" 항목. undefined 면 가장 최근 것을 펼칩니다.
  const [openDoc, setOpenDoc] = useState({});

  const messagesOf = useCallback((mode) => threads[mode] || [], [threads]);

  /** 저장된 문서를 모두 불러와 화면에 복원 */
  const loadAll = useCallback(async (userId) => {
    const rows = await documents.listAll(userId);
    const next = createEmptyThreads();
    for (const row of rows) {
      if (!MODE_KEYS.includes(row.kind)) continue;
      next[row.kind].push(...rowToMessages(row));
    }
    setThreads(next);
    setOpenDoc({});
  }, []);

  const clearAll = useCallback(() => {
    setThreads(createEmptyThreads());
    setOpenDoc({});
  }, []);

  /** 아직 로그인 전이라 DB 에 없는 체험 결과를 화면에만 올려 둡니다. */
  const restoreGuestDoc = useCallback((doc) => {
    if (!doc || !MODE_KEYS.includes(doc.kind)) return;
    setThreads((t) => (t[doc.kind].length ? t : {
      ...t,
      [doc.kind]: [
        { role: "user", uid: uid(), text: doc.userText },
        { role: "bot", uid: uid(), kind: doc.kind, text: doc.payload?.reply || "완성했어요!", payload: doc.payload },
      ],
    }));
  }, []);

  const setMessages = useCallback((mode, updater) => {
    setThreads((t) => ({ ...t, [mode]: typeof updater === "function" ? updater(t[mode]) : updater }));
  }, []);

  /** 새로 만든 문서가 펼쳐진 상태로 보이도록 이 종류의 선택을 초기화 */
  const resetOpen = useCallback((mode) => {
    setOpenDoc((o) => { const n = { ...o }; delete n[mode]; return n; });
  }, []);

  const toggleOpen = useCallback((mode, index, currentOpen) => {
    setOpenDoc((o) => ({ ...o, [mode]: currentOpen === index ? null : index }));
  }, []);

  /** 결과 문장을 직접 고친 내용 반영 (화면 + DB) */
  const editField = useCallback(async (mode, msgUid, docId, path, value) => {
    let updated = null;
    setThreads((t) => ({
      ...t,
      [mode]: t[mode].map((m) => {
        if (m.uid !== msgUid) return m;
        updated = setPath(m.payload, path, value);
        return { ...m, payload: updated };
      }),
    }));
    if (docId && updated) await documents.updatePayload(docId, updated);
  }, []);

  /** 문서 한 건 삭제 */
  const removeTurn = useCallback(async (mode, turn) => {
    const uids = [turn.user?.uid, turn.bot?.uid].filter(Boolean);
    setThreads((t) => ({ ...t, [mode]: t[mode].filter((m) => !uids.includes(m.uid)) }));
    resetOpen(mode);
    await documents.remove(turn.bot?.docId);
  }, [resetOpen]);

  /** 이 종류의 문서를 전부 비웁니다 (저장본까지) */
  const clearMode = useCallback(async (mode, messages) => {
    const ids = messages.map((m) => m.docId).filter(Boolean);
    setThreads((t) => ({ ...t, [mode]: [] }));
    resetOpen(mode);
    await documents.removeMany(ids);
  }, [resetOpen]);

  return {
    threads, messagesOf, openDoc,
    loadAll, clearAll, restoreGuestDoc,
    setMessages, resetOpen, toggleOpen,
    editField, removeTurn, clearMode,
  };
}
