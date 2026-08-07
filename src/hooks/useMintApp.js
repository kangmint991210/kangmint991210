// 앱 전체 상태를 한 덩어리로 묶습니다.
// 계정·체험·문서 기록은 각자의 훅이 맡고, 여기서는 그것들을 "화면의 흐름"으로 엮습니다.
//
// 화면 컴포넌트는 이 훅이 돌려주는 객체 하나만 받으면 되므로,
// props 를 수십 개 내려보내지 않아도 됩니다.

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "../supabaseClient.js";
import { storage, KEYS, restoreView, isRestorableView } from "../lib/storage.js";
import { readAuthRedirectError } from "../lib/auth-redirect.js";
import { uid } from "../lib/utils.js";
import { ai } from "../config.js";
import {
  MODES, MODE_KEYS, DEFAULT_MODE, modeOf, labelOf,
  createEmptyForm, missingFields, restoreMode,
} from "../domain/documents.js";
import {
  DEFAULT_PLAN, isDocLocked, minPlanFor, canExportFiles, PLAN_KEYS,
} from "../domain/plans.js";
import { toTurns, filterTurns, toHistory, shouldFollowNewest, docTitle } from "../domain/threads.js";
import { promptFor } from "../prompts/index.js";
import { generateDocument, QuotaExceededError } from "../services/gemini.js";
import { documents } from "../services/repository.js";
import { rememberFailedDoc, flushPendingDocs } from "../services/pending-docs.js";
import { useAccount } from "./useAccount.js";
import { useGuestTrial } from "./useGuestTrial.js";
import { useThreads } from "./useThreads.js";

/** 한도 초과 시 권해야 할 상위 플랜 */
const nextPlanAfter = (plan) => PLAN_KEYS[Math.min(PLAN_KEYS.indexOf(plan) + 1, PLAN_KEYS.length - 1)];

export function useMintApp() {
  /* ── 화면 전환 ────────────────────────────────── */
  // 새로고침해도 하던 자리로 돌아옵니다 (규칙은 lib/storage.js 의 restoreView)
  const [view, setView] = useState(() => restoreView(storage.get(KEYS.lastView)));
                                                   // landing | auth | app | legal
  const [authMode, setAuthMode] = useState("login"); // login | signup
  const [legalTab, setLegalTab] = useState("terms");  // terms | privacy
  // 소셜 로그인이 실패해 되돌아온 경우의 안내 (주소창에 실려 옵니다)
  const [authError, setAuthError] = useState(() => readAuthRedirectError());
  const legalFrom = useRef("landing");               // 약관을 열기 직전 화면

  /* ── 모달 ────────────────────────────────────── */
  const [showPricing, setShowPricing] = useState(false);
  const [paywall, setPaywall] = useState(null);       // 회원에게 보여 줄 벽
  const [signupWall, setSignupWall] = useState(null); // 게스트에게 보여 줄 벽

  /* ── 입력 ────────────────────────────────────── */
  const [mode, setMode] = useState(() => restoreMode(storage.get(KEYS.lastMode)));
  const [form, setForm] = useState(createEmptyForm);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [favOnly, setFavOnly] = useState(false);   // 보관함에서 즐겨찾기만 보기
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const threads = useThreads();
  const guest = useGuestTrial();
  const account = useAccount({
    onSignedIn: (sessionUser, { isFirstSignIn }) => {
      // 순서가 중요합니다.
      //  ① 체험 결과를 계정으로 옮기고
      //  ② 지난번에 못 넣은 문서를 다시 저장해 본 뒤
      //  ③ 목록을 불러오고
      //  ④ 그래도 못 넣은 것은 화면에 되살립니다 (새로고침해도 사라지지 않게)
      (async () => {
        try { await guest.claimTo(sessionUser.id); } catch { /* 체험 이관 실패가 진입을 막지 않게 */ }
        const left = await flushPendingDocs(sessionUser.id);
        await threads.loadAll(sessionUser.id);
        threads.restorePending(left);
      })();
      // OAuth 는 페이지를 떠났다 돌아오므로 state 가 초기화됩니다.
      // 로그인 전에 고른 문서를 여기서 되살려, 엉뚱한 화면으로 떨어지지 않게 합니다.
      const want = storage.get(KEYS.pendingMode);
      storage.remove(KEYS.pendingMode);
      if (want && MODE_KEYS.includes(want)) setMode(want);
      // 로그인 직후에는 언제나 메인 화면(랜딩)으로 갑니다.
      // 로그아웃 전에 보던 작업 화면으로 되돌리면, 로그인하자마자 문서 목록 한가운데에
      // 떨어져 "지금 어디에 있는지" 알기 어렵습니다. 메인에서 이 달의 작업을 보고
      // 무엇을 이어서 할지 고르는 편이 자연스럽습니다.
      if (isFirstSignIn) setView("landing");
    },
  });

  const { user, plan, isAdmin, isGuest, quotaLeft, planReady } = account;

  /* ── 파생 값 ─────────────────────────────────── */
  const messages = threads.messagesOf(mode);
  const allTurns = useMemo(() => toTurns(messages), [messages]);
  const turns = useMemo(() => filterTurns(allTurns, query, favOnly), [allTurns, query, favOnly]);
  const docCount = allTurns.filter((t) => t.bot && !t.bot.error).length;
  const favCount = allTurns.filter((t) => t.bot?.favorite).length;
  const lastDocIdx = allTurns.reduce((acc, t, i) => (t.bot ? i : acc), -1);
  const openIdx = threads.openDoc[mode] === undefined ? lastDocIdx : threads.openDoc[mode];

  /** 달력이 쓸 "만든 문서 전체" — 종류를 가리지 않고 한 줄로 폅니다 */
  const allDocs = useMemo(() =>
    MODE_KEYS.flatMap((key) =>
      toTurns(threads.threads[key] || [])
        .filter((t) => t.bot && !t.bot.error)
        .map((t) => ({
          mode: key, no: t.no, uid: t.bot.uid,
          createdAt: t.bot.createdAt,
          title: docTitle(t.bot),
          favorite: Boolean(t.bot.favorite),
        }))
    ), [threads.threads]);

  const current = modeOf(mode);
  const prompt = promptFor(mode);
  const missing = missingFields(mode, form);
  const canGenerate = !loading && missing.length === 0;

  /** 게스트 체험은 첫 문서만, 회원은 요금제가 정한 문서만 열립니다. */
  const isLocked = useCallback((key) => {
    // 세션과 요금제를 모두 확인하기 전에는 잠그지 않습니다.
    // 새로고침하면 세션은 즉시 되살아나지만 요금제 조회는 한 박자 뒤라, 그 사이에 판단하면
    // Pro 회원에게 "이 문서는 Basic 플랜부터예요" 가 뜹니다. (plans.js 의 canJudgePlan)
    if (!planReady) return false;
    return isDocLocked({ signedIn: !isGuest, isAdmin, plan, mode: key });
  }, [planReady, isGuest, isAdmin, plan]);

  /** 잠긴 문서를 만나면 상대에 맞는 안내를 띄웁니다. */
  const explainLock = useCallback((key) => {
    const label = labelOf(key);
    if (isGuest) setSignupWall({ kind: "lockedDoc", modeLabel: label });
    else setPaywall({ need: minPlanFor(key), reason: "lock", modeLabel: label });
  }, [isGuest]);

  useEffect(() => {
    if (authError) { setAuthMode("login"); setView("auth"); }
  }, [authError]);

  /* ── 부수 효과 ───────────────────────────────── */

  // 화면을 옮기면 맨 위부터 보여 줍니다.
  // 같은 문서 안에서 화면만 바뀌므로, 이렇게 하지 않으면 랜딩에서 스크롤해 둔 위치가
  // 그대로 남아 작업 화면의 중간·아래가 먼저 보입니다.
  useEffect(() => { window.scrollTo(0, 0); }, [view, mode]);

  // 결과 영역이 페이지 흐름으로 늘어나므로, 새 결과를 페이지 스크롤로 보이게 함.
  // 단 "방금 보냈을 때"만 따라갑니다 — 규칙은 domain/threads.js 의 shouldFollowNewest.
  const scroller = useRef(null);
  const seen = useRef({ mode: null, count: 0 });
  useEffect(() => {
    const next = { mode, count: messages.length };
    const follow = shouldFollowNewest(seen.current, next);
    seen.current = next;
    if (follow) scroller.current?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [mode, messages]);

  // 생성 중 경과 시간 — "얼마나 더 기다려야 하는지" 보여주면 이탈이 크게 줄어듭니다
  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  // 새로고침 뒤 돌아올 자리를 기억해 둡니다.
  useEffect(() => { storage.set(KEYS.lastMode, mode); }, [mode]);
  useEffect(() => {
    if (isRestorableView(view)) storage.set(KEYS.lastView, view);
  }, [view]);

  // 저장하지 않은 수정을 안고 창을 닫으면 그대로 사라집니다.
  // 브라우저에게 확인창을 맡깁니다(문구는 브라우저가 정하므로 우리가 바꿀 수 없습니다).
  useEffect(() => {
    if (!threads.draftCount) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [threads.draftCount]);

  // 체험 결과는 새로고침해도 남아 있어야 합니다(로그인 전에는 DB 에 못 넣으므로)
  useEffect(() => {
    if (user) return;
    threads.restoreGuestDoc(guest.savedDoc());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ※ 예전에는 "로그인 상태로 처음 들어오면 작업 화면으로" 보냈습니다.
  //    그때는 랜딩이 로그인 전과 똑같은 홍보 화면이라 보여 줄 이유가 없었기 때문입니다.
  //    지금은 랜딩이 회원의 메인 화면(환영 인사 · 문서 고르기 · 이 달의 작업)이 되었으므로
  //    그 규칙을 걷어냈습니다. 화면은 아래 세 가지로만 정해집니다.
  //      새로고침 → 보던 화면 복원  |  로그인 직후 → 메인  |  기록 없음 → 메인

  // 로그인 후 첫 진입에서 잠긴 문서를 고른 상태라면 입력하기 "전에" 알려 줍니다.
  const greeted = useRef(false);
  useEffect(() => {
    // planReady 를 기다리지 않으면 요금제를 알기 전에 판단해 엉뚱한 안내를 띄웁니다.
    if (view !== "app" || !user || !planReady || greeted.current) return;
    greeted.current = true;
    if (isLocked(mode)) explainLock(mode);
  }, [view, user, planReady, mode, isLocked, explainLock]);

  /* ── 입력 조작 ───────────────────────────────── */
  const setField = useCallback((key, value) => setForm((f) => ({ ...f, [key]: value })), []);
  const toggleDomain = useCallback((key) => setForm((f) => ({
    ...f,
    domains: f.domains.includes(key) ? f.domains.filter((d) => d !== key) : [...f.domains, key],
  })), []);

  /* ── 생성 ────────────────────────────────────── */

  /**
   * @param {string} [rawText] 이어 말한 요청 (없으면 하단 입력창 값)
   * @param {string} [retryOf] 실패한 말풍선의 uid — 그것만 걷어내고 다시 보냅니다
   */
  const send = useCallback(async (rawText, retryOf) => {
    if (loading) return;
    // isLocked 가 확인 전에는 잠그지 않으므로, 그 틈에 생성이 새지 않게 여기서 막습니다.
    if (!planReady) return;
    if (isLocked(mode)) return explainLock(mode);
    if (isGuest && guest.isOver) return setSignupWall({ kind: "guestOver" });
    if (!isGuest && quotaLeft <= 0) {
      return setPaywall({ need: nextPlanAfter(plan), reason: "quota" });
    }
    if (missingFields(mode, form).length) return; // 버튼이 이미 비활성 — 방어용

    const extra = (rawText ?? input).trim();
    const display = extra || prompt.label();
    const base = retryOf ? messages.filter((m) => m.uid !== retryOf) : messages;
    const asked = [...base, { role: "user", uid: uid(), text: display }];

    threads.setMessages(mode, asked);
    setInput("");
    setLoading(true);

    try {
      // 로그인 상태면 액세스 토큰을 함께 보내 서버가 요금제 한도를 검증하게 합니다.
      const accessToken = (await supabase?.auth.getSession())?.data?.session?.access_token;
      const { payload, usageCounted } = await generateDocument({
        mode, form, extra, history: toHistory(asked), accessToken,
      });

      const botUid = uid();
      threads.setMessages(mode, (list) => [
        ...list,
        { role: "bot", uid: botUid, kind: mode, text: payload.reply || "완성했어요!", payload,
          createdAt: new Date().toISOString() },
      ]);

      if (user) {
        const docId = await documents.create({
          userId: user.id, kind: mode, userText: display, form, payload,
        });
        // 저장에 실패하면 브라우저에 보관해 둡니다.
        // 그래야 새로고침해도 사라지지 않고, 다음 접속 때 자동으로 다시 시도합니다.
        const pendingId = docId
          ? null
          : rememberFailedDoc({ userId: user.id, kind: mode, userText: display, form, payload });
        threads.setMessages(mode, (list) =>
          list.map((m) => (m.uid === botUid ? { ...m, docId, pendingId } : m))
        );
        await account.countUsage({ recordedByServer: usageCounted });
      } else {
        guest.consume({ kind: mode, userText: display, form, payload });
      }
    } catch (e) {
      // 한도 초과는 "실패"가 아니라 안내 — 말풍선 대신 요금제 화면으로 보냅니다
      if (e instanceof QuotaExceededError) {
        threads.setMessages(mode, base);
        if (isGuest) setSignupWall({ kind: "guestOver" });
        else setPaywall({ need: nextPlanAfter(plan), reason: "quota", msg: e.message });
        return;
      }
      threads.setMessages(mode, (list) => [...list, {
        role: "bot", uid: uid(), kind: mode, error: true,
        text: "결과를 받아오지 못했어요. 입력하신 내용은 그대로 있으니 다시 시도해 주세요. 🥲",
      }]);
    } finally {
      setLoading(false);
      threads.resetOpen(mode);
    }
  }, [loading, mode, form, input, messages, isGuest, plan, quotaLeft, user, planReady,
      isLocked, explainLock, prompt, threads, guest, account]);

  /* ── 보관함 ──────────────────────────────────── */

  // 예전에는 화면만 지우고 DB 는 남아 다음 로그인 때 되살아났습니다.
  // 저장본까지 함께 지우되, 되돌릴 수 없으므로 먼저 확인을 받습니다.
  const clearCurrentMode = useCallback(async () => {
    if (!messages.length) return;
    const saved = messages.filter((m) => m.docId).length;
    const ok = window.confirm(
      saved > 0
        ? `이 메뉴에 저장된 문서 ${saved}건이 영구 삭제됩니다. 계속할까요?`
        : "이 메뉴의 결과를 모두 지울까요?"
    );
    if (!ok) return;
    setQuery("");
    setFavOnly(false);
    await threads.clearMode(mode, messages);
  }, [messages, mode, threads]);

  /* ── 화면 이동 ───────────────────────────────── */

  const openLegal = useCallback((tab) => {
    setLegalTab(tab);
    legalFrom.current = view;
    setView("legal");
  }, [view]);

  const closeLegal = useCallback(() => {
    setView(legalFrom.current === "legal" ? "landing" : legalFrom.current);
  }, []);

  const goAuth = useCallback((planKey = DEFAULT_PLAN, which = "login") => {
    storage.set(KEYS.pendingPlan, planKey);
    storage.set(KEYS.pendingMode, mode); // OAuth 로 페이지를 떠나도 고른 문서를 잃지 않게
    setShowPricing(false); setPaywall(null); setSignupWall(null);
    if (user) { account.changePlan(planKey); setView("app"); return; }
    setAuthMode(which); setView("auth");
  }, [mode, user, account]);

  // 랜딩의 "무료로 체험해보세요".
  // 체험을 이미 다 썼더라도 여기서 가입을 청하지 않습니다 — 먼저 만들어 둔 결과를 보게 두고,
  // "한 번 더 만들려 할 때" 청해야 가입할 이유가 생깁니다.
  const startTrial = useCallback(() => {
    setShowPricing(false);
    if (!user) setMode(DEFAULT_MODE);
    setView("app");
  }, [user]);

  // 달력에서 그날의 문서를 눌렀을 때 — 그 문서를 펼친 채로 작업 화면으로.
  const openDocFromCalendar = useCallback(({ mode: key, no }) => {
    setMode(key);
    setFavOnly(false);
    setQuery("");
    threads.openAt(key, no);
    setView("app");
  }, [threads]);

  // 랜딩의 문서 카드 → 그 문서를 고른 채로 앱으로.
  const pickDoc = useCallback((key) => {
    setMode(key);
    setFavOnly(false); // 거르기는 메뉴마다 새로 (ModeSelect 와 같은 규칙)
    storage.set(KEYS.pendingMode, key);
    setShowPricing(false);
    setView("app");
    if (isLocked(key)) explainLock(key);
  }, [isLocked, explainLock]);

  const choosePlan = useCallback((key) => {
    account.changePlan(key);
    setShowPricing(false);
    setPaywall(null);
    setView("app");
  }, [account]);

  const logout = useCallback(async () => {
    // 저장하지 않은 수정은 화면에만 있어서, 로그아웃하면 그대로 사라집니다.
    if (threads.draftCount &&
        !window.confirm(`저장하지 않은 수정이 ${threads.draftCount}건 있어요. 로그아웃하면 사라집니다. 계속할까요?`)) {
      return;
    }
    await account.logout();
    threads.clearAll();
    setFavOnly(false);
    setView("landing");
  }, [account, threads]);

  const openAuth = useCallback((which) => { setAuthMode(which); setView("auth"); }, []);

  return {
    // 화면 상태
    view, setView, authMode, setAuthMode, legalTab, setLegalTab, authError, setAuthError,
    showPricing, setShowPricing, paywall, setPaywall, signupWall, setSignupWall,
    // 계정 / 체험
    ...account, guest,
    canExport: isAdmin || canExportFiles(plan),
    // 입력
    mode, setMode, form, setField, toggleDomain, input, setInput,
    query, setQuery, favOnly, setFavOnly, loading, elapsed, scroller,
    // 파생
    current, prompt, missing, canGenerate, isLocked, explainLock,
    messages, allTurns, turns, docCount, favCount, openIdx, allDocs, eta: prompt?.eta || ai.defaultEta,
    // 동작
    send, threads, clearCurrentMode,
    openLegal, closeLegal, goAuth, startTrial, pickDoc, choosePlan, logout, openAuth,
    openDocFromCalendar,
    MODES,
  };
}
