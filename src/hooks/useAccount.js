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
        syncProfile(session.user);
        fetchIsAdmin(session.user.id).then(setIsAdmin);
        reloadUsage(session.user.id);
        onSignedIn?.(session.user, { isFirstSignIn: event === "SIGNED_IN" });
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
