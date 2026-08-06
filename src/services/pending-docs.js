// 계정에 넣지 못한 문서를 브라우저에 보관했다가, 다음 접속 때 다시 저장합니다.
//
// 흐름
//   생성 → documents.create 실패 → remember() 로 브라우저에 보관
//   다음 접속 → flush() 가 하나씩 다시 시도 → 성공하면 보관분에서 제거
//              → 그래도 못 넣은 것은 화면에 되살려, 새로고침해도 사라지지 않게 함
//
// "무엇을 얼마나 들고 있을지" 규칙은 domain/pending-docs.js 에 있습니다.

import { storage, KEYS } from "../lib/storage.js";
import { uid } from "../lib/utils.js";
import { addPending, removePending, pendingFor, withoutUser } from "../domain/pending-docs.js";
import { documents } from "./repository.js";

const read = () => storage.getJSON(KEYS.pendingDocs) || [];
const write = (list) => storage.setJSON(KEYS.pendingDocs, list);

/**
 * 저장에 실패한 문서를 보관합니다.
 * @returns {string} 보관 id — 나중에 성공하면 이 id 로 빼냅니다.
 */
export function rememberFailedDoc({ userId, kind, userText, form, payload }) {
  const id = uid();
  write(addPending(read(), { id, userId, kind, userText, form, payload, at: Date.now() }));
  return id;
}

/**
 * 보관분의 내용을 고칩니다.
 * 계정에 못 넣은 문서를 고쳤을 때, 이걸 하지 않으면 다음 접속에 고치기 전 내용이 되살아납니다.
 * @returns {boolean} 보관분을 찾아 고쳤는가
 */
export function updatePendingDoc(id, payload) {
  if (!id) return false;
  const list = read();
  const found = list.find((d) => d?.id === id);
  if (!found) return false;
  write(list.map((d) => (d?.id === id ? { ...d, payload } : d)));
  return true;
}

/** 사용자가 문서를 지웠을 때처럼, 더 들고 있을 이유가 없어진 경우 */
export function forgetPendingDoc(id) {
  if (id) write(removePending(read(), id));
}

/** 이 회원이 아직 못 넣은 문서 수 (화면 안내에 씁니다) */
export const countPendingDocs = (userId) => pendingFor(read(), userId).length;

/**
 * 보관해 둔 문서를 다시 저장해 봅니다.
 * @returns {Promise<Array>} 이번에도 넣지 못한 문서들 (화면에 되살릴 것)
 */
export async function flushPendingDocs(userId) {
  const mine = pendingFor(read(), userId);
  if (!mine.length) return [];

  const left = [];
  for (const doc of mine) {
    const docId = await documents.create(doc);
    if (!docId) left.push(doc);
  }

  // 다른 회원의 보관분은 건드리지 않고, 내 것만 "아직 못 넣은 것"으로 갈아 끼웁니다.
  write([...withoutUser(read(), userId), ...left]);
  return left;
}
