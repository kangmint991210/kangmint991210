// 가입 없는 체험 상태.
//
// 체험으로 만든 결과는 브라우저에 임시 보관했다가,
//  · 새로고침하면 되살리고
//  · 로그인하면 계정으로 옮겨 담습니다.
// 애써 만든 결과가 로그인 한 번에 사라지면 가입할 이유도 함께 사라지기 때문입니다.

import { useState, useCallback } from "react";
import { storage, KEYS } from "../lib/storage.js";
import { trial } from "../config.js";
import { documents } from "../services/repository.js";

export function useGuestTrial() {
  const [used, setUsed] = useState(() => storage.getNumber(KEYS.guestUsed, 0));

  /** 체험 1건 사용 — 횟수를 올리고 결과를 보관합니다. */
  const consume = useCallback((doc) => {
    setUsed((n) => {
      const next = n + 1;
      storage.set(KEYS.guestUsed, String(next));
      return next;
    });
    storage.setJSON(KEYS.guestDoc, doc);
  }, []);

  /** 보관해 둔 체험 결과 (없으면 null) */
  const savedDoc = useCallback(() => storage.getJSON(KEYS.guestDoc), []);

  /** 로그인한 계정으로 옮겨 담기. 성공/실패와 무관하게 보관본은 비웁니다. */
  const claimTo = useCallback(async (userId) => {
    const doc = storage.getJSON(KEYS.guestDoc);
    storage.remove(KEYS.guestDoc);
    if (!doc) return false;
    await documents.create({
      userId, kind: doc.kind, userText: doc.userText, form: doc.form, payload: doc.payload,
    });
    return true;
  }, []);

  return {
    used,
    left: Math.max(0, trial.limit - used),
    isOver: used >= trial.limit,
    consume,
    savedDoc,
    claimTo,
  };
}
