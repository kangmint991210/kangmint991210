// 로그인 / 회원가입 (Supabase 이메일 · 구글 · 카카오)

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase, supabaseReady } from "../../supabaseClient.js";
import { Brand, Mascot } from "../../ui/primitives.jsx";
import { styles } from "../../ui/styles.js";
import { css } from "../../ui/theme.js";

/* ---------- 로그인 / 회원가입 (Supabase) ---------- */
export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 256 256" aria-hidden>
      <path fill="#000000" d="M128 36C70.56 36 24 72.89 24 118.4c0 29.4 19.48 55.2 48.77 69.73-1.61 5.7-10.34 35.7-10.69 38.06 0 0-.21 1.79.95 2.47 1.16.68 2.52.15 2.52.15 3.3-.46 38.25-25.01 44.3-29.28 5.83.82 11.83 1.25 17.85 1.25 57.44 0 104-36.89 104-82.4S185.44 36 128 36z" />
    </svg>
  );
}

export function AuthPage({ mode, setMode, onHome, onLegal }) {
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const switchMode = (m) => { setErr(""); setInfo(""); setPw(""); setPw2(""); setMode(m); };

  async function submit(e) {
    e?.preventDefault?.();
    setErr(""); setInfo("");
    if (!supabaseReady) { setErr("Supabase 설정이 필요해요. .env 에 URL/anon 키를 넣어주세요."); return; }
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { setErr("올바른 이메일을 입력해 주세요."); return; }
    if (pw.length < 6) { setErr("비밀번호는 6자 이상이어야 해요."); return; }

    setBusy(true);
    try {
      if (isSignup) {
        if (!name.trim()) { setErr("이름(닉네임)을 입력해 주세요."); return; }
        if (pw !== pw2) { setErr("비밀번호가 서로 달라요."); return; }
        const { data, error } = await supabase.auth.signUp({
          email: mail,
          password: pw,
          options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin },
        });
        if (error) { setErr(translateAuthError(error.message)); return; }
        // 이메일 확인이 켜져 있으면 세션이 없음 → 안내. 꺼져 있으면 세션 생성 → 리스너가 앱으로 진입.
        if (!data.session) setInfo("확인 메일을 보냈어요. 메일의 링크를 눌러 가입을 완료해 주세요. 📩");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: mail, password: pw });
      if (error) { setErr(translateAuthError(error.message)); return; }
      // 성공 시 onAuthStateChange(SIGNED_IN) 가 앱 진입 처리
    } finally {
      setBusy(false);
    }
  }

  async function social(provider) {
    setErr(""); setInfo("");
    if (!supabaseReady) { setErr("Supabase 설정이 필요해요. .env 에 URL/anon 키를 넣어주세요."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) { setBusy(false); setErr(translateAuthError(error.message)); }
    // 정상 시 공급자 페이지로 리다이렉트됨
  }

  return (
    <div style={styles.landing}>
      <style>{css}</style>
      <nav style={styles.landNav}>
        <Brand onClick={onHome} title="홈으로 이동" />
      </nav>

      <section style={styles.authWrap}>
        <div style={styles.authCard}>
          <div style={styles.modalMascot}><Mascot size={54} /></div>
          <div style={styles.authTitle}>{isSignup ? "회원가입" : "로그인"}</div>
          <div style={styles.authSub}>
            {isSignup ? "간단히 가입하고 민트쌤을 시작해요 🌿" : "다시 오셨네요! 반가워요 🌿"}
          </div>

          {!supabaseReady && (
            <div style={styles.authError}>
              Supabase 설정이 아직 안 됐어요.<br />.env 에 URL과 anon 키를 넣고 다시 실행해 주세요.
            </div>
          )}

          <form style={styles.authForm} onSubmit={submit}>
            {isSignup && (
              <div style={styles.authField}>
                <label style={styles.authLabel}>이름 · 닉네임</label>
                <input style={styles.authInput} value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="민트쌤" autoComplete="name" />
              </div>
            )}
            <div style={styles.authField}>
              <label style={styles.authLabel}>이메일</label>
              <input style={styles.authInput} type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@example.com" autoComplete="email" />
            </div>
            <div style={styles.authField}>
              <label style={styles.authLabel}>비밀번호</label>
              <input style={styles.authInput} type="password" value={pw} onChange={(e) => setPw(e.target.value)}
                placeholder="6자 이상" autoComplete={isSignup ? "new-password" : "current-password"} />
            </div>
            {isSignup && (
              <div style={styles.authField}>
                <label style={styles.authLabel}>비밀번호 확인</label>
                <input style={styles.authInput} type="password" value={pw2} onChange={(e) => setPw2(e.target.value)}
                  placeholder="한 번 더 입력" autoComplete="new-password" />
              </div>
            )}

            {err && <div style={styles.authError}>{err}</div>}
            {info && <div style={styles.authInfo}>{info}</div>}

            <button type="submit" style={styles.authSubmit} disabled={busy}>
              {busy ? <Loader2 size={16} className="spin" /> : (isSignup ? "가입하고 시작하기" : "로그인")}
            </button>
          </form>

          {/* 소셜 간편 로그인 */}
          <div style={styles.orRow}>
            <span style={styles.orLine} /><span style={styles.orText}>또는 간편 로그인</span><span style={styles.orLine} />
          </div>
          <button style={styles.kakaoBtn} onClick={() => social("kakao")} disabled={busy}>
            <KakaoIcon /> 카카오로 시작하기
          </button>
          <button style={styles.googleBtn} onClick={() => social("google")} disabled={busy}>
            <GoogleIcon /> 구글로 시작하기
          </button>

          <div style={styles.authDivider}>
            {isSignup ? "이미 계정이 있으신가요?" : "아직 회원이 아니신가요?"}
          </div>
          <button style={styles.authToggle}
            onClick={() => switchMode(isSignup ? "login" : "signup")} disabled={busy}>
            {isSignup ? "로그인하러 가기" : "회원가입"}
          </button>

          {isSignup && (
            <div style={styles.authLegal}>
              가입하면 <button style={styles.authLegalLink} onClick={() => onLegal?.("terms")}>이용약관</button> 과{" "}
              <button style={styles.authLegalLink} onClick={() => onLegal?.("privacy")}>개인정보처리방침</button> 에 동의하는 것으로 봅니다.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// Supabase 인증 에러 메시지를 한국어로 순화
export function translateAuthError(msg = "") {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "이메일 또는 비밀번호가 올바르지 않아요.";
  if (m.includes("already registered") || m.includes("already exists")) return "이미 가입된 이메일이에요. 로그인해 주세요.";
  if (m.includes("email not confirmed")) return "이메일 확인이 필요해요. 받은 메일의 링크를 눌러주세요.";
  if (m.includes("password")) return "비밀번호를 확인해 주세요. (6자 이상)";
  if (m.includes("provider is not enabled")) return "이 소셜 로그인은 아직 Supabase에서 활성화되지 않았어요.";
  return msg || "문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
}
