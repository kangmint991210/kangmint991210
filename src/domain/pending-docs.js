// 아직 계정에 넣지 못한 문서의 대기줄.
//
// 서버가 잠시 말썽이거나 설정이 어긋나면 방금 만든 문서가 DB 에 들어가지 못합니다.
// 예전에는 그런 문서가 화면에만 남아 있다가 새로고침 한 번에 사라졌습니다.
// 여기서는 "무엇을 얼마나 들고 있을지"만 정하고, 실제 보관과 재시도는
// services/pending-docs.js 가 맡습니다. (이 파일은 브라우저를 모릅니다)

import { arr } from "../lib/utils.js";

/**
 * 들고 있을 최대 개수.
 * 문서 하나가 수 KB~수십 KB 라 무한정 쌓으면 브라우저 저장소가 가득 차
 * 다른 저장(체험 기록·로그인 정보)까지 함께 실패합니다. 오래된 것부터 버립니다.
 */
export const MAX_PENDING = 20;

/** 대기줄에 넣기 (같은 id 가 있으면 갈아 끼웁니다) */
export const addPending = (list, doc) =>
  [...arr(list).filter((d) => d?.id !== doc.id), doc].slice(-MAX_PENDING);

/** 저장에 성공했거나 사용자가 지운 문서를 빼기 */
export const removePending = (list, id) => arr(list).filter((d) => d?.id !== id);

/**
 * 이 회원의 것만 고르기.
 * 한 브라우저를 여러 계정이 나눠 쓰면 남의 문서를 내 계정에 넣게 됩니다.
 */
export const pendingFor = (list, userId) =>
  arr(list).filter((d) => d?.userId && d.userId === userId);

/** 다른 회원의 것은 남겨 두고, 이 회원의 것만 걷어낸 나머지 */
export const withoutUser = (list, userId) =>
  arr(list).filter((d) => d?.userId !== userId);
