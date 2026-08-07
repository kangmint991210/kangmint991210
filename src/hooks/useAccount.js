// 로그인 계정에 관한 모든 것 — 세션, 요금제, 관리자 여부, 이번 달 사용량.
// "로그인이 끝난 뒤 무엇을 할지"는 화면마다 다르므로 onSignedIn 으로 바깥에 맡깁니다.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient.js";
import { DEFAULT_PLAN, quotaOf, canJudgePlan } from "../domain/plans.js";
import { mapUser, profiles, isAdmin as fetchIsAdmin, usage as usageRepo } from "../services/repository.js";

export function useAccount({ onSignedIn } = {}) {
  const [user, setUser] = useState(null);
  const [plan, setPlan] = useState(DEFAULT_PLAN);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usage, setUsage] = useState(0);
  // 저장된 세션을 확인하기 전까지는 "로그인 안 한 상태"와 구분되지 않습니다.
  // 이 값을 보지 않으면, 새로고침 직후 잠깐 게스트로 취급돼 잠금 화면이 번쩍입니다.
  const [authReady, setAuthReady] = useState(!supabase);
  // 요금제를 서버에서 받아왔는가. 세션 복원과 시점이 달라 따로 둡니다 — plans.js 의 canJudgePlan 참고.
  const [planLoaded, setPlanLoaded] = useState(false);

  /**
   * 요금제는 "서버에 저장된 값"만 씁니다.
   *
   * ⚠ 예전에는 랜딩에서 고른 플랜(localStorage 의 pendingPlan)과 저장된 값 중
   *    상위 등급을 적용했습니다. localStorage 에 "pro" 를 적어 넣고 로그인하면
   *    그대로 Pro 가 되는, 돈을 내지 않고 올라가는 길이었습니다.
   *    이제 고른 플랜은 "로그인 뒤 결제창을 열 대상"으로만 씁니다(useMintApp).
   */
  const syncProfile = useCallback(async (sessionUser) => {
    try {
      setPlan((await profiles.getPlan(sessionUser.id)) || DEFAULT_PLAN);
      await profiles.upsert(mapUser(sessionUser));
    } finally {
      // 조회에 실패하더라도 준비됨으로 넘깁니다 — 아니면 화면이 영영 멈춰 있습니다.
      setPlanLoaded(true);
    }
  }, []);

  /** 결제가 끝난 뒤 서버에 반영된 요금제를 다시 읽어 옵니다. */
  const reloadPlan = useCallback(async (userId) => {
    if (!userId) return null;
    const next = (await profiles.getPlan(userId)) || DEFAULT_PLAN;
    setPlan(next);
    return next;
  }, []);

  const reloadUsage = useCallback(async (userId) => {
    setUsage(await usageRepo.countThisMonth(userId));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthReady(true);
      if (!session?.user) {
        setUser(null);
        setIsAdmin(false);
        setUsage(0);
        setPlanLoaded(true);   // 로그인하지 않았으면 기다릴 요금제가 없습니다
        return;
      }
      setUser(mapUser(session.user));
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        // ⚠ 요금제를 다시 불러오는 이 경로에서만 planLoaded 를 내립니다.
        //    토큰 갱신(TOKEN_REFRESHED)에서도 내리면 syncProfile 이 뒤따르지 않아
        //    planLoaded 가 영영 false 로 남고, 그때부터 생성이 조용히 막힙니다.
        setPlanLoaded(false);
        // ⚠ 이 콜백은 Supabase 가 내부 auth 락을 잡은 채로 호출합니다.
        //    여기서 곧바로 supabase 를 다시 호출하면 서로 락을 기다리다 멈춰,
        //    profiles 저장이 조용히 실패합니다(구글·카카오처럼 리다이렉트로 돌아오는
        //    로그인에서 특히 잘 걸립니다 — SNS 가입자가 DB 에 안 남던 원인).
        //    상태 업데이트만 여기서 하고, 서버 호출은 다음 틱으로 미룹니다.
        const signedUser = session.user;
        setTimeout(() => {
          syncProfile(signedUser);
          fetchIsAdmin(signedUser.id).then(setIsAdmin);
          reloadUsage(signedUser.id);
          onSignedIn?.(signedUser, { isFirstSignIn: event === "SIGNED_IN" });
        }, 0);
      }
    });
    return () => sub.subscription.unsubscribe();
    // onSignedIn 은 최초 구독 시점의 것을 씁니다(리스너를 다시 붙이면 중복 호출됨)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 생성 1건 반영. 서버가 이미 기록했으면 화면 숫자만 올립니다. */
  const countUsage = useCallback(async ({ recordedByServer }) => {
    if (user && !recordedByServer) await usageRepo.record(user.id, "doc");
    setUsage((n) => n + 1);
  }, [user]);

  const logout = useCallback(async () => {
    try { await supabase?.auth.signOut(); } catch { /* 이미 만료된 세션 */ }
    setUser(null);
    setIsAdmin(false);
    setUsage(0);
    setPlan(DEFAULT_PLAN);
  }, []);

  const quota = quotaOf(plan);
  return {
    user, plan, isAdmin, usage, quota, authReady,
    // 요금제로 무언가를 막아도 되는 시점인지 (세션 확인 + 요금제 조회가 모두 끝남)
    planReady: canJudgePlan({ authReady, signedIn: Boolean(user), planLoaded }),
    isGuest: !user,
    quotaLeft: isAdmin ? Infinity : Math.max(0, quota - usage),
    reloadPlan, countUsage, logout, reloadUsage,
  };
}
