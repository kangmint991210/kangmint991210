// 결과 목록과 그 주변 상태 화면(생성 중·빈 화면·잠긴 문서).

import React from "react";
import { ChevronDown, Trash2, RefreshCw, Lock } from "lucide-react";
import { EMPTY_COPY, STARTERS, MODES } from "../../domain/documents.js";
import { docTitle } from "../../domain/threads.js";
import { planName, upgradeCopy } from "../../domain/plans.js";
import { Mascot } from "../../ui/primitives.jsx";
import { styles } from "../../ui/styles.js";
import { Card } from "./Card.jsx";
import { SaveBar } from "./SaveBar.jsx";
import { FavoriteButton } from "./FavoriteButton.jsx";

/* ---------- 잠긴 문서 안내 ---------- */
// 폼 대신 이 화면을 보여줘서, 다 적고 나서 막히는 일이 아예 생기지 않게 합니다.

export function LockedPanel({ label, guest, need, onOpen, onFallback }) {
  return (
    <div style={styles.lockPanel}>
      <span style={styles.lockIcon}><Lock size={22} /></span>
      <div style={styles.lockTitle}>
        {guest ? `${label}는 가입 후에 열려요` : `${label}는 ${planName(need)} 플랜부터예요`}
      </div>
      <div style={styles.lockDesc}>
        {guest
          ? "지금은 놀이 활동을 가입 없이 만들어 보실 수 있어요."
          : `${planName(need)} 플랜을 쓰면 ${upgradeCopy(need)}`}
      </div>
      <button style={styles.lockCta} onClick={onOpen}>
        {guest ? "가입하고 열기" : "요금제 보기"}
      </button>
      <button style={styles.lockGhost} onClick={onFallback}>
        {MODES[0].label} 만들러 가기
      </button>
    </div>
  );
}

export function Generating({ eta, elapsed }) {
  const pct = Math.min(96, Math.round((elapsed / eta) * 100));
  const late = elapsed > eta;
  return (
    <div style={styles.genWrap}>
      <div style={styles.loading}>
        <span style={styles.botFace}><Mascot size={30} /></span>
        <span style={styles.bubbleLoad}>
          만드는 중<span className="dot d1">.</span><span className="dot d2">.</span><span className="dot d3">.</span>
          <span style={styles.genTime}>
            {late ? "조금만 더요! 거의 다 됐어요" : `약 ${eta}초 정도 걸려요 · ${elapsed}초`}
          </span>
        </span>
      </div>
      <div style={styles.genTrack}><div style={{ ...styles.genFill, width: `${pct}%` }} /></div>
    </div>
  );
}

/**
 * 문서 한 건. 결과 카드에 더해 즐겨찾기·저장 줄을 함께 붙입니다.
 * 문서 종류를 모르므로, 문서가 새로 추가돼도 이 컴포넌트는 손대지 않습니다.
 *
 * @param {object} payload 화면에 그릴 내용 — 고치는 중이면 저장 전 초안
 */
export function DocTurn({
  turn, no, open, guest, canExport, payload,
  dirty, saving, saved, failed,
  onToggle, onEdit, onSave, onRevert, onToggleFav, onDelete, onRetry, onNeedSignup, onNeedPlan,
}) {
  const { user, bot } = turn;

  // 생성이 실패한 자리 — 결과 대신 재시도 버튼을 둡니다(입력값은 폼에 그대로 남아 있음)
  if (bot.error) {
    return (
      <div style={styles.errorBlock}>
        <div style={styles.botRow}>
          <span style={styles.botFace}><Mascot size={30} /></span>
          <div style={styles.botText}>{bot.text}</div>
        </div>
        <button style={styles.retryBtn} onClick={onRetry}>
          <RefreshCw size={14} /> 다시 시도하기
        </button>
      </div>
    );
  }

  return (
    <div style={styles.turnItem}>
      <div style={{ ...styles.turnHead, ...(open ? styles.turnHeadOpen : {}) }}>
        <button style={styles.turnHeadMain} onClick={onToggle} aria-expanded={open}>
          <span style={styles.turnNo}>{no}</span>
          <span style={styles.turnTitle}>{docTitle(bot)}</span>
          {dirty && <span style={styles.dirtyDot} title="저장하지 않은 수정이 있어요" />}
          <ChevronDown size={17} style={{
            marginLeft: "auto", flexShrink: 0, color: "#7A9A90",
            transition: "transform .15s", transform: open ? "rotate(180deg)" : "none",
          }} />
        </button>
        <FavoriteButton
          on={Boolean(bot.favorite)} stored={Boolean(bot.docId)} guest={guest}
          onToggle={onToggleFav} onNeedSignup={onNeedSignup} />
        <button style={styles.iconBtn} title="이 문서 삭제"
          onClick={() => { if (window.confirm("이 문서를 삭제할까요? 되돌릴 수 없어요.")) onDelete(); }}>
          <Trash2 size={14} />
        </button>
      </div>
      {open && (
        <div style={styles.turnBody}>
          {/* 계정에 못 넣은 문서 — 브라우저에 보관해 두고 다음 접속에 다시 시도합니다 */}
          {!guest && !bot.docId && (
            <div style={styles.docWarn}>
              ⏳ 아직 계정에 저장되지 않았어요. <b>브라우저에 보관해 두었으니 새로고침해도 사라지지 않고</b>,
              다음에 들어오실 때 자동으로 다시 저장을 시도해요.
            </div>
          )}
          {user && <div style={styles.userBubble}>{user.text}</div>}
          <div style={styles.botBlock}>
            <div style={styles.botRow}>
              <span style={styles.botFace}><Mascot size={30} /></span>
              <div style={styles.botText}>{bot.text}</div>
            </div>
            {payload && (
              <Card kind={bot.kind} p={payload}
                guest={guest} canExport={canExport} onEdit={onEdit}
                onNeedSignup={onNeedSignup} onNeedPlan={onNeedPlan} />
            )}
            <SaveBar
              dirty={dirty} saving={saving} saved={saved} failed={failed}
              guest={guest} stored={Boolean(bot.docId)}
              onSave={onSave} onRevert={onRevert} onNeedSignup={onNeedSignup} />
          </div>
        </div>
      )}
    </div>
  );
}

export function EmptyState({ mode, onPick, disabled }) {
  const copy = EMPTY_COPY[mode];
  return (
    <div style={styles.empty}>
      <div style={styles.emptyMascot}><Mascot size={88} /></div>
      <div style={styles.emptyTitle}>{copy.title}</div>
      <div style={styles.emptyDesc}>{copy.desc.split("\n").map((l, i) => <div key={i}>{l}</div>)}</div>
      {mode === "play" && (
        <div style={styles.starters}>
          {STARTERS.play.map((s) => (
            <button key={s} style={styles.starter} disabled={disabled}
              onClick={() => onPick(s.replace(/^[^\s]+\s/, ""))}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
