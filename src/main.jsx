// ⚠ 가장 먼저 불러야 합니다. Supabase 클라이언트가 URL 해시를 소비하기 전에
//    소셜 로그인 실패 정보를 붙잡아 두는 모듈입니다.
import "./lib/auth-redirect.js";
import React from "react";
import ReactDOM from "react-dom/client";
import MintSsaem from "../민트쌤.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MintSsaem />
  </React.StrictMode>
);
