// 이용약관 · 개인정보처리방침.
//
// 회원가입과 아이 관련 기록을 받는 서비스라 반드시 있어야 하는 문서입니다.
// 시행일과 문의처는 config.js 에서 읽으므로, 값을 바꿀 때 본문을 뒤질 필요가 없습니다.

import React from "react";
import { contact, legalEffectiveDate } from "../../config.js";
import { Brand } from "../../ui/primitives.jsx";
import { styles } from "../../ui/styles.js";
import { css } from "../../ui/theme.js";

/* ---------- 이용약관 · 개인정보처리방침 ---------- */
// 회원가입과 아이 관련 기록을 받는 서비스라 반드시 있어야 하는 문서입니다.
// 실제 사업자 정보(상호·대표자·주소·사업자번호)는 아래 [ ] 자리를 채워 주세요.

export function LegalPage({ tab, setTab, onHome }) {
  const TABS = [["terms", "이용약관"], ["privacy", "개인정보처리방침"]];
  return (
    <div style={styles.landing}>
      <style>{css}</style>
      <nav style={styles.landNav}>
        <Brand onClick={onHome} title="돌아가기" />
        <button style={styles.navGhost} onClick={onHome}>돌아가기</button>
      </nav>

      <section style={styles.legalWrap}>
        <div style={styles.legalTabs}>
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ ...styles.legalTab, ...(tab === k ? styles.legalTabOn : {}) }}>{label}</button>
          ))}
        </div>

        <div style={styles.legalCard}>
          {tab === "terms" ? (
            <>
              <h2 style={styles.legalH}>이용약관</h2>
              <p style={styles.legalP}>시행일: {legalEffectiveDate}</p>

              <h3 style={styles.legalH3}>제1조 (목적)</h3>
              <p style={styles.legalP}>이 약관은 민트쌤(이하 “회사”)이 제공하는 보육 문서 작성 보조 서비스(이하 “서비스”)의 이용과 관련하여 회사와 회원의 권리·의무 및 책임사항을 정함을 목적으로 합니다.</p>

              <h3 style={styles.legalH3}>제2조 (서비스의 내용)</h3>
              <p style={styles.legalP}>회사는 회원이 입력한 메모를 바탕으로 놀이활동안, 보육일지, 관찰일지, 알림장, 적응일지, 상담일지 등의 초안을 생성하는 기능을 제공합니다. 생성된 결과물은 <b>초안</b>이며, 회원은 제출 전 내용의 사실 여부와 적절성을 직접 확인·수정할 책임이 있습니다.</p>

              <h3 style={styles.legalH3}>제3조 (회원가입)</h3>
              <p style={styles.legalP}>회원가입은 이메일 또는 소셜 계정 (구글 · 카카오) 으로 할 수 있습니다. 회원은 가입 없이도 일부 기능을 체험할 수 있으나, 결과물 보관 · 불러오기는 회원에게만 제공됩니다.</p>

              <h3 style={styles.legalH3}>제4조 (요금 및 결제)</h3>
              <p style={styles.legalP}>서비스는 무료 플랜과 유료 플랜 (Basic 월 9,900원 / Pro 월 19,900원, 부가세 포함) 으로 구성되며, 플랜별로 이용 가능한 문서 종류와 월 생성 횟수가 다릅니다. 월 생성 횟수는 매월 1일 초기화됩니다. 베타 기간에는 결제 없이 유료 플랜 기능을 제공할 수 있으며, 정식 결제 도입 시 사전에 공지합니다.</p>

              <h3 style={styles.legalH3}>제5조 (회원의 의무)</h3>
              <p style={styles.legalP}>회원은 타인의 개인정보를 무단으로 입력하거나, 서비스를 자동화된 방법으로 과도하게 호출하는 등 정상적인 운영을 방해하는 행위를 해서는 안 됩니다. 회사는 이러한 경우 이용을 제한할 수 있습니다.</p>

              <h3 style={styles.legalH3}>제6조 (생성 결과물의 권리)</h3>
              <p style={styles.legalP}>회원이 입력한 내용과 생성된 결과물에 대한 권리는 회원에게 있습니다. 회사는 서비스 제공·품질 개선 목적 외에 결과물을 이용하지 않습니다.</p>

              <h3 style={styles.legalH3}>제7조 (책임의 제한)</h3>
              <p style={styles.legalP}>서비스가 생성한 문서는 AI가 작성한 초안으로 사실과 다를 수 있습니다. 회사는 회원이 결과물을 확인 없이 제출하여 발생한 결과에 대해 책임지지 않습니다.</p>

              <h3 style={styles.legalH3}>제8조 (문의)</h3>
              <p style={styles.legalP}>서비스 이용 관련 문의: <a style={styles.legalLink} href={`mailto:${contact.email}`}>{contact.email}</a></p>

              <div style={styles.legalTodo}>
                ※ 정식 공개 전 사업자 정보(상호 · 대표자 · 사업자등록번호 · 주소 · 통신판매업 신고번호)와
                실제 문의 이메일을 채워 주세요. 유료 결제를 붙일 때는 청약철회·환불 조항도 함께 넣어야 합니다.
              </div>
            </>
          ) : (
            <>
              <h2 style={styles.legalH}>개인정보처리방침</h2>
              <p style={styles.legalP}>시행일: {legalEffectiveDate}</p>

              <h3 style={styles.legalH3}>1. 수집하는 항목</h3>
              <p style={styles.legalP}>
                · 회원가입: 이메일, 이름 (닉네임), 가입 경로 (이메일 · 구글 · 카카오), 프로필 이미지<br />
                · 서비스 이용: 요금제, 가입일, 마지막 접속일, 생성 횟수<br />
                · 회원이 입력한 문서 내용 및 생성된 결과물
              </p>

              <h3 style={styles.legalH3}>2. 이용 목적</h3>
              <p style={styles.legalP}>회원 식별과 로그인, 문서 생성·보관 기능 제공, 요금제별 이용 한도 관리, 서비스 개선 및 문의 응대에 이용합니다.</p>

              <h3 style={styles.legalH3}>3. 아동 관련 정보에 대한 안내</h3>
              <p style={styles.legalP}>
                본 서비스는 보육교사가 업무 목적으로 작성하는 기록을 다룹니다. 회사는 영유아의 <b>실명 대신 이니셜·별명</b>을 사용할 것을 권고하며,
                입력 화면에도 이를 안내하고 있습니다. 회원이 입력한 내용은 <b>본인 계정으로만</b> 조회할 수 있도록 접근이 제한되어 있습니다(행 수준 보안).
              </p>

              <h3 style={styles.legalH3}>4. 제3자 제공 및 처리위탁</h3>
              <p style={styles.legalP}>
                회사는 개인정보를 제3자에게 판매하지 않습니다. 다만 서비스 제공을 위해 아래 업체에 처리를 위탁합니다.<br />
                · Supabase Inc. — 회원 인증 및 데이터 보관<br />
                · Google LLC (Gemini API) — 문서 생성. 회원이 입력한 메모가 생성 요청에 포함되어 전송됩니다.<br />
                · Vercel Inc. — 서비스 호스팅
              </p>

              <h3 style={styles.legalH3}>5. 보유 및 파기</h3>
              <p style={styles.legalP}>회원 탈퇴 시 회원 정보와 생성된 문서는 지체 없이 삭제됩니다. 회원은 서비스 내에서 문서를 개별 또는 일괄 삭제할 수 있습니다.</p>

              <h3 style={styles.legalH3}>6. 이용자의 권리</h3>
              <p style={styles.legalP}>회원은 언제든지 자신의 개인정보 열람 · 정정 · 삭제 · 처리정지를 요청할 수 있으며, 아래 연락처로 요청하시면 지체 없이 조치합니다.</p>

              <h3 style={styles.legalH3}>7. 개인정보 보호책임자</h3>
              <p style={styles.legalP}>문의: <a style={styles.legalLink} href={`mailto:${contact.email}`}>{contact.email}</a></p>

              <div style={styles.legalTodo}>
                ※ 정식 공개 전 개인정보 보호책임자의 성명 · 직위 · 연락처와 사업자 정보를 채워 주세요.
                Gemini API 로 입력 내용이 전송되는 점은 반드시 고지해야 하므로 4항을 지우지 마세요.
              </div>
            </>
          )}
        </div>

        <button style={styles.ctaGhost} onClick={onHome}>돌아가기</button>
      </section>
    </div>
  );
}
