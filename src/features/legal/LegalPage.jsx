// 이용약관 · 개인정보처리방침 · 환불 정책 · 계정 삭제 안내.
//
// 회원가입을 받고 아이 관련 기록을 다루며 유료 구독을 파는 서비스라 네 문서 모두 있어야 합니다.
// 시행일·문의처·보호책임자는 config.js 에서 읽습니다 — 값을 바꿀 때 본문을 뒤질 필요가 없습니다.
//
// ⚠ 여기 적힌 내용은 실제 운영과 반드시 일치해야 합니다.
//    맞지 않는 문장(쓰지 않는 결제사, 없는 기능)을 적어 두면 그 자체가 분쟁거리가 됩니다.
//    아직 정하지 못한 값은 [ ] 로 비워 두고, 화면 아래 안내로 남겨 둡니다.

import React from "react";
import { contact, legalEffectiveDate, refund, business, BUSINESS_LABELS } from "../../config.js";
import { MODES } from "../../domain/documents.js";
import { PLANS, quotaOf } from "../../domain/plans.js";
import { Brand } from "../../ui/primitives.jsx";
import { styles } from "../../ui/styles.js";
import { css } from "../../ui/theme.js";

export const LEGAL_TABS = [
  ["terms", "이용약관"],
  ["privacy", "개인정보처리방침"],
  ["refund", "환불 정책"],
  ["delete", "계정 삭제 안내"],
];

const Mail = () => (
  <a style={styles.legalLink} href={`mailto:${contact.email}`}>{contact.email}</a>
);

/** 항목을 줄줄이 늘어놓는 자리 */
const List = ({ items }) => (
  <ul style={styles.legalList}>
    {items.map((t, i) => <li key={i} style={styles.legalLi}>{t}</li>)}
  </ul>
);

/** 이름 | 값 두 칸짜리 표 */
const Rows = ({ rows }) => (
  <div style={styles.legalTable}>
    {rows.map(([k, v], i) => (
      <div key={i} style={styles.legalRow}>
        <div style={styles.legalRowKey}>{k}</div>
        <div style={styles.legalRowVal}>{v}</div>
      </div>
    ))}
  </div>
);

/** 사업자 정보 중 실제로 값이 있는 것 */
const filledBusiness = () =>
  BUSINESS_LABELS.filter(([key]) => business[key]).map(([key, label]) => [label, business[key]]);

/** 아직 받지 못한 항목의 이름 */
const missingBusiness = () =>
  BUSINESS_LABELS.filter(([key]) => !business[key]).map(([, label]) => label);

/* ---------------- 이용약관 ---------------- */

function Terms() {
  const paid = PLANS.filter((p) => p.key !== "free");
  return (
    <>
      <h2 style={styles.legalH}>이용약관</h2>
      <p style={styles.legalMeta}>시행일: {legalEffectiveDate}</p>

      <h3 style={styles.legalH3}>제1조 (목적)</h3>
      <p style={styles.legalP}>
        이 약관은 민트쌤(이하 “회사”)이 운영하는 보육 문서 작성 보조 서비스(이하 “서비스”)의 이용에 관한
        회사와 회원의 권리·의무 및 책임사항을 정합니다.
      </p>

      <h3 style={styles.legalH3}>제2조 (서비스의 내용)</h3>
      <p style={styles.legalP}>
        회사는 회원이 입력한 메모를 바탕으로 아래 {MODES.length}종 문서의 <b>초안</b>을 생성하는 기능을 제공합니다.
        요금제에 따라 이용할 수 있는 범위가 다르며, 자세한 내용은 요금제 안내를 참고해 주세요.
      </p>
      <List items={[MODES.map((m) => m.label).join(" · ")]} />
      <List items={[
        "생성한 문서의 보관·검색·즐겨찾기",
        "결과물 직접 수정 및 저장",
        "표 서식 그대로 복사, 워드·한글 파일 내려받기(유료 플랜)",
      ]} />

      <h3 style={styles.legalH3}>제3조 (가입 및 탈퇴)</h3>
      <List items={[
        "이메일 또는 소셜 계정(구글 · 카카오)으로 가입합니다.",
        "가입하지 않아도 놀이 활동 1건을 체험할 수 있으나, 보관·불러오기는 회원에게만 제공됩니다.",
        <>계정 삭제는 <Mail /> 로 요청하시면 처리해 드립니다. 자세한 내용은 “계정 삭제 안내”를 참고해 주세요.</>,
        "탈퇴 시 회원이 만든 문서를 포함한 모든 데이터가 즉시 삭제되며 복구할 수 없습니다.",
      ]} />

      <h3 style={styles.legalH3}>제4조 (요금 및 결제)</h3>
      <p style={styles.legalP}>
        서비스는 무료 플랜과 유료 플랜({paid.map((p) => `${p.name} ${p.price}${p.period}`).join(" / ")}, 부가세 포함)으로
        구성되며, 플랜별로 이용 가능한 문서 종류와 월 생성 횟수(무료 {quotaOf("free")}회 /
        {" "}{paid.map((p) => `${p.name} ${quotaOf(p.key).toLocaleString()}회`).join(" / ")})가 다릅니다.
        월 생성 횟수는 매월 1일 초기화됩니다.
        {refund.live
          ? " 환불에 관한 사항은 “환불 정책”을 따릅니다."
          : " 현재는 베타 기간으로 결제를 받지 않으며, 정식 결제 도입 시 사전에 공지합니다."}
      </p>

      <h3 style={styles.legalH3}>제5조 (회원의 의무)</h3>
      <List items={[
        "아이의 실명 대신 이니셜·별명을 사용해 주세요. 타인의 개인정보를 무단으로 입력해서는 안 됩니다.",
        "자동화된 방법으로 과도하게 호출하는 등 서비스의 정상적인 운영을 방해하는 행위를 해서는 안 됩니다.",
        "생성된 결과물을 사실과 다르게 변조하여 외부에 제출해서는 안 됩니다.",
        "서비스를 무단으로 재판매하거나 상업적으로 이용해서는 안 됩니다.",
      ]} />
      <p style={styles.legalP}>회사는 위 사항을 어긴 경우 이용을 제한할 수 있습니다.</p>

      <h3 style={styles.legalH3}>제6조 (AI 생성 결과에 대한 책임)</h3>
      <List items={[
        "서비스가 만든 문서는 AI가 작성한 초안이며, 사실과 다를 수 있습니다.",
        "회원은 제출 전 아이의 정보·날짜·관찰 내용이 사실과 맞는지 직접 확인하고 고칠 책임이 있습니다.",
        "회사는 회원이 확인 없이 제출하여 발생한 결과에 대해 책임지지 않습니다.",
      ]} />

      <h3 style={styles.legalH3}>제7조 (서비스의 변경 및 중단)</h3>
      <p style={styles.legalP}>
        회사는 사전 고지 후 기능을 변경하거나 서비스를 일시 중단할 수 있으며,
        불가피한 경우 사후에 고지할 수 있습니다.
      </p>

      <h3 style={styles.legalH3}>제8조 (저작권)</h3>
      <List items={[
        "회원이 입력한 메모의 권리는 회원에게 있습니다.",
        "생성된 결과물은 회원이 자유롭게 사용·수정·배포할 수 있습니다.",
        "회사는 서비스 제공과 품질 개선 목적 외에 회원의 문서를 이용하지 않습니다.",
      ]} />

      <h3 style={styles.legalH3}>제9조 (분쟁 해결)</h3>
      <p style={styles.legalP}>
        회사와 회원은 성실한 협의를 원칙으로 하며, 협의가 이루어지지 않을 경우 관련 법령을 따릅니다.
      </p>

      <h3 style={styles.legalH3}>제10조 (사업자 정보)</h3>
      {/* 채운 항목만 보여 줍니다 — 빈 칸을 표에 남기면 값이 없는 건지 빠뜨린 건지 알 수 없습니다 */}
      {filledBusiness().length > 0 && <Rows rows={filledBusiness()} />}
      <Rows rows={[["문의", <Mail key="mail" />]]} />

      {missingBusiness().length > 0 && (
        <div style={styles.legalTodo}>
          ※ 정식 공개 전 아래 항목을 채워 주세요 — <b>{missingBusiness().join(" · ")}</b>
          <br />
          (src/config.js 의 <b>business</b> 에 적으면 이 표에 바로 나옵니다)
        </div>
      )}
    </>
  );
}

/* ---------------- 개인정보처리방침 ---------------- */

function Privacy() {
  return (
    <>
      <h2 style={styles.legalH}>개인정보처리방침</h2>
      <p style={styles.legalMeta}>시행일: {legalEffectiveDate}</p>

      <h3 style={styles.legalH3}>1. 수집하는 개인정보</h3>
      <List items={[
        "이메일, 비밀번호 (이메일로 가입한 경우)",
        "이름 또는 닉네임, 프로필 사진, 가입 경로 (구글 · 카카오로 가입한 경우 해당 서비스에서 제공)",
        "회원이 입력한 메모와 그로부터 생성된 문서",
        "서비스 이용 기록, 접속 로그 (자동 수집)",
      ]} />

      <div style={styles.legalNote}>
        🔒 <b>아이에 관한 정보</b> — 관찰 메모·상담 메모 등에는 아이에 관한 내용이 담길 수 있습니다.
        회사는 실명 대신 <b>이니셜·별명</b> 사용을 권장하며, 회원이 입력한 내용은
        본인 계정으로만 열람할 수 있도록 접근을 제한하고 있습니다.
        회사 직원이 회원의 문서를 열람하지 않습니다.
      </div>

      <h3 style={styles.legalH3}>2. 수집 목적</h3>
      <List items={[
        "회원 가입, 로그인, 본인 확인",
        "문서 생성 서비스 제공과 결과물 보관·불러오기",
        "요금제와 월 생성 횟수 관리",
        "서비스 개선 및 통계 분석 (개인을 식별할 수 없는 형태)",
      ]} />

      <h3 style={styles.legalH3}>3. 처리 위탁 및 국외 이전</h3>
      <p style={styles.legalP}>회사는 서비스 제공을 위해 아래 사업자에 개인정보 처리를 위탁하고 있습니다.</p>
      <Rows rows={[
        ["Supabase", "미국 · 데이터베이스 및 로그인 인증"],
        ["Google Gemini API", "문서 생성 (입력한 메모가 전달되며, 이름·연락처 등 식별정보는 넣지 않기를 권장합니다)"],
        ["Vercel", "미국 · 웹 호스팅"],
        ["Paddle.com Market Limited", "영국·미국 · 결제 처리 및 세금 신고 (Merchant of Record). 결제에 필요한 이메일·청구 정보가 전달되며, 카드 번호는 회사 서버에 저장되지 않습니다."],
      ]} />

      <h3 style={styles.legalH3}>4. 보관 및 파기</h3>
      <List items={[
        "회원 탈퇴 시까지 보관하며, 탈퇴 즉시 파기합니다.",
        // 결제를 받기 시작하면 "탈퇴 즉시 전부 파기" 가 사실과 달라집니다.
        // 실제로 남는 것을 그대로 밝혀 둡니다 (전자상거래법 제6조).
        "다만 결제 기록(결제 일시·금액·영수증)은 전자상거래법에 따라 5년간 보관한 뒤 파기합니다.",
        "그 밖에 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관한 뒤 파기합니다.",
      ]} />

      <h3 style={styles.legalH3}>5. 이용자의 권리</h3>
      <p style={styles.legalP}>
        회원은 언제든 본인의 개인정보를 열람·수정할 수 있고, 계정 삭제를 요청할 수 있습니다.
        생성한 문서는 서비스 안에서 직접 수정하거나 삭제할 수 있습니다.
      </p>

      <h3 style={styles.legalH3}>6. 개인정보 보호책임자</h3>
      <Rows rows={[
        ["책임자", contact.privacyOfficer],
        ["연락처", <Mail />],
      ]} />
    </>
  );
}

/* ---------------- 환불 정책 ---------------- */

function Refund() {
  return (
    <>
      <h2 style={styles.legalH}>환불 정책</h2>
      <p style={styles.legalMeta}>시행일: {legalEffectiveDate}</p>

      {!refund.live && (
        <div style={styles.legalNote}>
          💡 <b>현재는 베타 기간으로 결제를 받지 않습니다.</b> 유료 플랜도 결제 없이 이용 상태로 전환됩니다.
          아래 내용은 정식 결제가 시작된 뒤에 적용됩니다.
        </div>
      )}

      <h3 style={styles.legalH3}>{refund.fullDays}일 이내 전액 환불</h3>
      <p style={styles.legalP}>
        결제일로부터 {refund.fullDays}일 이내에 서비스를 이용하지 않으셨다면 전액 환불해 드립니다.
      </p>

      <h3 style={styles.legalH3}>기간별 정책</h3>
      <Rows rows={[
        [`결제 후 ${refund.fullDays}일 이내`, "미사용 시 100% 전액 환불"],
        [`${refund.fullDays}~${refund.partialDays}일`, "서비스 장애, 중대한 기능 미제공 등 정당한 사유가 있는 경우 환불"],
        [`${refund.partialDays}일 초과`, "환불 불가. 다만 구독 해지는 언제든 가능합니다."],
      ]} />

      <h3 style={styles.legalH3}>구독과 해지</h3>
      <Rows rows={[
        ["구독 방식", refund.cycle],
        ["해지", "서비스 안에서 언제든 가능"],
        ["해지 후", "이미 결제한 기간이 끝날 때까지 그대로 이용할 수 있고, 다음 결제일부터 과금되지 않습니다."],
        ["환불 처리", "요청 후 영업일 기준 7일 이내, 원래 결제하신 수단으로 환급"],
        ["환불 수수료", "없음"],
        ["환불 요청", <Mail />],
        ["결제 처리사", refund.processor || "[ 정식 결제 도입 시 기재 ]"],
      ]} />

      <h3 style={styles.legalH3}>서비스 제공 시점</h3>
      <p style={styles.legalP}>
        결제가 완료되면 즉시 서비스가 시작됩니다. 이용을 시작하신 뒤에는 관련 법령이 허용하는 범위에서
        청약철회가 제한될 수 있습니다.
      </p>

      {!refund.processor && (
        <div style={styles.legalTodo}>
          ※ 정식 결제를 붙일 때 결제 처리사(예: 토스페이먼츠 · Paddle 등)를 config.js 의
          <b> refund.processor </b>에 적고, <b>refund.live</b> 를 true 로 바꿔 주세요.
          쓰지 않는 결제사를 미리 적어 두면 그 자체가 분쟁거리가 됩니다.
        </div>
      )}
    </>
  );
}

/* ---------------- 계정 삭제 안내 ---------------- */

function DeleteAccount() {
  return (
    <>
      <h2 style={styles.legalH}>계정 삭제 안내</h2>
      <p style={styles.legalMeta}>시행일: {legalEffectiveDate}</p>
      <p style={styles.legalMeta}>계정을 삭제하면 아래 데이터가 즉시 영구 삭제됩니다.</p>

      <h3 style={styles.legalH3}>삭제되는 데이터</h3>
      <List items={[
        "계정 정보 (이메일, 이름·닉네임, 프로필 사진, 가입 경로)",
        `생성한 문서 전체 (${MODES.map((m) => m.label).join(" · ")})`,
        "문서에 함께 저장된 입력 내용과 즐겨찾기 표시",
        "요금제 정보와 월 생성 기록",
      ]} />

      <h3 style={styles.legalH3}>삭제 방법</h3>
      <p style={styles.legalP}>
        가입하신 이메일 주소로 <Mail /> 에 계정 삭제를 요청해 주세요.
        본인 확인 후 처리해 드립니다.
      </p>

      <h3 style={styles.legalH3}>유료 요금제를 쓰고 계신 경우</h3>
      <p style={styles.legalP}>
        계정 삭제 요청과 함께 <b>구독도 해지</b>해 드립니다. 해지 후에는 다음 결제일부터 청구되지 않으며,
        이미 결제하신 기간에 대한 환불은 <b>환불 정책</b>을 따릅니다.
      </p>
      <div style={styles.legalNote}>
        ⚠ 결제 기록(결제 일시·금액·영수증)은 <b>전자상거래법에 따라 5년간 보관</b>해야 하므로,
        계정을 삭제해도 이 기록만은 남습니다. 문서와 계정 정보는 즉시 삭제됩니다.
      </div>

      <div style={styles.legalNote}>
        ⚠ <b>삭제된 데이터는 복구할 수 없습니다.</b> 필요한 문서가 있다면 삭제를 요청하시기 전에
        각 문서의 <b>표로 복사</b> 또는 <b>파일 저장</b>으로 미리 내려받아 주세요.
      </div>
    </>
  );
}

const PAGES = { terms: Terms, privacy: Privacy, refund: Refund, delete: DeleteAccount };

export function LegalPage({ tab, setTab, onHome }) {
  const Body = PAGES[tab] || Terms;
  return (
    <div style={styles.landing}>
      <style>{css}</style>
      <nav style={styles.landNav}>
        <Brand onClick={onHome} title="돌아가기" />
        <button style={styles.navGhost} onClick={onHome}>돌아가기</button>
      </nav>

      <section style={styles.legalWrap}>
        <div style={styles.legalTabs}>
          {LEGAL_TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ ...styles.legalTab, ...(tab === k ? styles.legalTabOn : {}) }}>{label}</button>
          ))}
        </div>
        <div style={styles.legalCard}><Body /></div>
      </section>
    </div>
  );
}
