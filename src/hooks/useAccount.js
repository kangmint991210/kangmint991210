// 로그인 계정에 관한 모든 것 — 세션, 요금제, 관리자 여부, 이번 달 사용량.
// "로그인이 끝난 뒤 무엇을 할지"는 화면마다 다르므로 onSignedIn 으로 바깥에 맡깁니다.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient.js";
import { storage, KEYS } from "../lib/storage.js";
import { DEFAULT_PLAN, normalizePlan, higherPlan, quotaOf } from "../domain/plans.js";
import { mapUser, profiles, isAdmin as fetchIsAdmin, usage as usageRepo } from "../services/repository.js";

export function useAccount({ onSignedIn } = {}) {
  const [user, setUser] = useState(null);
  const [plan, setPlan] = useState(DEFAULT_PLAN);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usage, setUsage] = useState(0);

  /** 서버에 저장된 요금제와, 랜딩에서 고른 대기 플랜 중 상위 등급을 적용합니다. */
  const syncProfile = useCallback(async (sessionUser) => {
    const pending = normalizePlan(storage.get(KEYS.pendingPlan, DEFAULT_PLAN));
    storage.remove(KEYS.pendingPlan);

    const saved = (await profiles.getPlan(sessionUser.id)) || DEFAULT_PLAN;
    const effective = higherPlan(pending, saved);
    setPlan(effective);
    await profiles.upsert(mapUser(sessionUser), effective);
  }, []);

  const reloadUsage = useCallback(async (userId) => {
    setUsage(await usageRepo.countThisMonth(userId));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        setUser(null);
        setIsAdmin(false);
        setUsage(0);
        return;
      }
      setUser(mapUser(session.user));
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
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

  /** 요금제 변경 — 화면에 즉시 반영하고 서버에도 남깁니다. */
  const changePlan = useCallback(async (next) => {
    setPlan(next);
    if (user) await profiles.setPlan(user.id, next);
  }, [user]);

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
    user, plan, isAdmin, usage, quota,
    isGuest: !user,
    quotaLeft: isAdmin ? Infinity : Math.max(0, quota - usage),
    changePlan, countUsage, logout, reloadUsage,
  };
}
