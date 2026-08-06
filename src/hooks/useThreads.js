// 문서 종류별 생성 기록(threads)과 그 수정·저장·즐겨찾기·삭제.
// 화면 상태와 DB 를 함께 움직여, 화면에서 지운 것이 다음 로그인에 되살아나지 않게 합니다.
//
// ── 수정은 "초안" 방식입니다 ────────────────────────────────
// 문장을 고치면 drafts 에만 쌓이고 DB 는 건드리지 않습니다.
// 사용자가 [저장] 을 눌러야 documents.payload 에 반영됩니다.
// 예전에는 고치는 즉시 DB 에 썼는데, 저장 여부를 알 수 없고 되돌릴 수도 없었습니다.
//
// 이 파일은 문서 종류를 모릅니다 — 문서를 새로 추가해도 여기는 손대지 않습니다.

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { uid, setPath } from "../lib/utils.js";
import { createEmptyThreads, MODE_KEYS } from "../domain/documents.js";
import { documents } from "../services/repository.js";
import { forgetPendingDoc, updatePendingDoc } from "../services/pending-docs.js";

/** 저장했다는 표시를 남겨 두는 시간 */
const SAVED_FLASH_MS = 2600;

/** DB 행 → 화면 메시지 두 개(요청, 결과) */
const rowToMessages = (row) => {
  const out = [];
  if (row.user_text) out.push({ role: "user", uid: uid(), text: row.user_text });
  out.push({
    role: "bot", uid: uid(), docId: row.id, kind: row.kind,
    text: row.payload?.reply || "완성했어요!", payload: row.payload,
    favorite: Boolean(row.is_favorite),
  });
  return out;
};

/** 객체에서 키 하나를 뺀 새 객체 (없으면 원본 그대로 — 헛돌지 않게) */
const without = (obj, key) => {
  if (!(key in obj)) return obj;
  const next = { ...obj };
  delete next[key];
  return next;
};

export function useThreads() {
  const [threads, setThreads] = useState(createEmptyThreads);
  // 문서 종류별로 "펼쳐 둔" 항목. undefined 면 가장 최근 것을 펼칩니다.
  const [openDoc, setOpenDoc] = useState({});

  // 저장하지 않은 수정 — { [메시지 uid]: payload }
  const [drafts, setDrafts] = useState({});
  const [savingUid, setSavingUid] = useState(null);
  const [savedUid, setSavedUid] = useState(null);   // 방금 저장했다는 표시
  const [failedUid, setFailedUid] = useState(null); // 저장에 실패한 문서
  const flashTimer = useRef(null);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const messagesOf = useCallback((mode) => threads[mode] || [], [threads]);

  /** 화면에 그릴 내용 — 고치는 중이면 초안이 우선입니다 */
  const payloadOf = useCallback((msg) => (msg ? drafts[msg.uid] ?? msg.payload : null), [drafts]);
  const isDirty = useCallback((msgUid) => msgUid in drafts, [drafts]);
  const draftCount = useMemo(() => Object.keys(drafts).length, [drafts]);

  const dropDraft = useCallback((msgUid) => {
    setDrafts((d) => without(d, msgUid));
    setFailedUid((f) => (f === msgUid ? null : f));
  }, []);

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
    setDrafts({});
  }, []);

  const clearAll = useCallback(() => {
    setThreads(createEmptyThreads());
    setOpenDoc({});
    setDrafts({});
  }, []);

  /**
   * 계정에 넣지 못해 브라우저에 보관해 둔 문서를 화면에 되살립니다.
   * loadAll 뒤에 부릅니다 — 그래야 저장된 문서 아래에 이어 붙습니다.
   */
  const restorePending = useCallback((docs) => {
    if (!docs?.length) return;
    setThreads((t) => {
      const next = { ...t };
      for (const d of docs) {
        if (!MODE_KEYS.includes(d.kind)) continue;
        next[d.kind] = [
          ...(next[d.kind] || []),
          ...(d.userText ? [{ role: "user", uid: uid(), text: d.userText }] : []),
          { role: "bot", uid: uid(), kind: d.kind, pendingId: d.id,
            text: d.payload?.reply || "완성했어요!", payload: d.payload },
        ];
      }
      return next;
    });
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

  /* ── 수정 · 저장 ─────────────────────────────── */

  /**
   * 문장 하나를 고칩니다 — 초안에만 반영하고 DB 는 건드리지 않습니다.
   * @param {string} msgUid  고치는 결과 메시지
   * @param {object} shown   지금 화면에 그려진 내용 (초안이 있으면 초안)
   */
  const editField = useCallback((msgUid, shown, path, value) => {
    setDrafts((d) => ({ ...d, [msgUid]: setPath(shown, path, value) }));
    setFailedUid((f) => (f === msgUid ? null : f));
    setSavedUid((s) => (s === msgUid ? null : s));
  }, []);

  /**
   * 초안을 DB 에 반영합니다.
   * @returns {Promise<boolean>} 저장 성공 여부. 실패하면 초안을 그대로 두어 고친 내용을 잃지 않습니다.
   */
  const saveDoc = useCallback(async (mode, msg) => {
    const msgUid = msg?.uid;
    const draft = drafts[msgUid];
    if (!draft) return true;              // 고친 게 없으면 저장할 것도 없음

    // 아직 계정에 못 넣은 문서라면, 브라우저 보관분의 내용을 고쳐 둡니다.
    // 이걸 하지 않으면 다음 접속에 고치기 전 내용이 되살아납니다.
    if (!msg.docId) {
      if (!updatePendingDoc(msg.pendingId, draft)) { setFailedUid(msgUid); return false; }
      setThreads((t) => ({
        ...t,
        [mode]: t[mode].map((m) => (m.uid === msgUid ? { ...m, payload: draft } : m)),
      }));
      setDrafts((d) => without(d, msgUid));
      setSavedUid(msgUid);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setSavedUid(null), SAVED_FLASH_MS);
      return true;
    }

    setSavingUid(msgUid);
    const ok = await documents.updatePayload(msg.docId, draft);
    setSavingUid(null);

    if (!ok) { setFailedUid(msgUid); return false; }

    setThreads((t) => ({
      ...t,
      [mode]: t[mode].map((m) => (m.uid === msgUid ? { ...m, payload: draft } : m)),
    }));
    setDrafts((d) => without(d, msgUid));
    setFailedUid((f) => (f === msgUid ? null : f));
    setSavedUid(msgUid);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedUid(null), SAVED_FLASH_MS);
    return true;
  }, [drafts]);

  /* ── 즐겨찾기 ────────────────────────────────── */

  /** 화면을 먼저 바꾸고 DB 에 반영합니다. 실패하면 되돌려 거짓말을 남기지 않습니다. */
  const toggleFavorite = useCallback(async (mode, msgUid, docId) => {
    if (!docId) return false;
    let next = false;
    setThreads((t) => ({
      ...t,
      [mode]: t[mode].map((m) => {
        if (m.uid !== msgUid) return m;
        next = !m.favorite;
        return { ...m, favorite: next };
      }),
    }));
    const ok = await documents.setFavorite(docId, next);
    if (!ok) {
      setThreads((t) => ({
        ...t,
        [mode]: t[mode].map((m) => (m.uid === msgUid ? { ...m, favorite: !next } : m)),
      }));
    }
    return ok;
  }, []);

  /* ── 삭제 ────────────────────────────────────── */

  /** 문서 한 건 삭제 */
  const removeTurn = useCallback(async (mode, turn) => {
    const uids = [turn.user?.uid, turn.bot?.uid].filter(Boolean);
    setThreads((t) => ({ ...t, [mode]: t[mode].filter((m) => !uids.includes(m.uid)) }));
    setDrafts((d) => uids.reduce((acc, u) => without(acc, u), d));
    resetOpen(mode);
    // 아직 계정에 못 넣은 문서라면 보관분도 함께 버립니다 — 아니면 다음 접속에 되살아납니다.
    forgetPendingDoc(turn.bot?.pendingId);
    await documents.remove(turn.bot?.docId);
  }, [resetOpen]);

  /** 이 종류의 문서를 전부 비웁니다 (저장본까지) */
  const clearMode = useCallback(async (mode, messages) => {
    const ids = messages.map((m) => m.docId).filter(Boolean);
    messages.forEach((m) => forgetPendingDoc(m.pendingId));
    setThreads((t) => ({ ...t, [mode]: [] }));
    setDrafts((d) => messages.reduce((acc, m) => without(acc, m.uid), d));
    resetOpen(mode);
    await documents.removeMany(ids);
  }, [resetOpen]);

  return {
    threads, messagesOf, openDoc,
    loadAll, clearAll, restoreGuestDoc,
    setMessages, resetOpen, toggleOpen, restorePending,
    // 수정·저장
    payloadOf, isDirty, draftCount, editField, saveDoc, dropDraft,
    savingUid, savedUid, failedUid,
    // 즐겨찾기·삭제
    toggleFavorite, removeTurn, clearMode,
  };
}
