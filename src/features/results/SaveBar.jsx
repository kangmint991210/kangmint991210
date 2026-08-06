// 고친 내용을 저장하는 줄.
//
// 문서 종류를 모릅니다 — 어떤 문서든 결과 아래에 그대로 붙습니다.
// 고친 게 없을 때는 나타나지 않습니다(평소 화면을 어지럽히지 않으려고).
// 저장한 직후에만 "저장했어요"를 잠깐 보여 주고 사라집니다.

import React from "react";
import { Save, Check, Undo2, Loader2, AlertCircle } from "lucide-react";
import { styles } from "../../ui/styles.js";

/**
 * @param {boolean} stored 이 문서가 계정(DB)에 들어가 있는가.
 *   체험 중이거나 생성 직후 저장이 실패한 문서는 고쳐도 담을 곳이 없어, 저장 대신 이유를 알려 줍니다.
 */
export function SaveBar({ dirty, saving, saved, failed, guest, stored, onSave, onRevert, onNeedSignup }) {
  if (!dirty && !saved) return null;

  if (!dirty) {
    return (
      <div style={{ ...styles.saveBar, ...styles.saveBarDone }}>
        <Check size={14} style={{ flexShrink: 0 }} />
        <span style={styles.saveMsg}>저장했어요</span>
      </div>
    );
  }

  const message = failed
    ? "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요."
    : !stored && guest
      ? "가입하시면 고친 내용을 저장할 수 있어요."
      : "저장하지 않은 수정이 있어요.";

  return (
    <div style={{ ...styles.saveBar, ...(failed ? styles.saveBarFail : {}) }}>
      {failed
        ? <AlertCircle size={14} style={{ flexShrink: 0 }} />
        : <span style={{ flexShrink: 0 }}>✏️</span>}
      <span style={styles.saveMsg}>{message}</span>
      <button style={styles.saveGhost} onClick={onRevert} disabled={saving}>
        <Undo2 size={13} /> 되돌리기
      </button>
      {/* 담을 곳이 없는 문서에 저장 버튼을 두면 눌러도 계속 실패합니다 — 게스트는 가입으로 안내합니다. */}
      {guest && !stored ? (
        <button style={styles.saveBtn} onClick={() => onNeedSignup?.("save")}>
          <Save size={13} /> 가입하고 저장
        </button>
      ) : (
        // 계정에 아직 못 넣은 문서도 저장할 수 있습니다 — 브라우저 보관분에 반영되고,
        // 다음 접속 때 고친 내용 그대로 계정에 올라갑니다.
        <button
          style={{ ...styles.saveBtn, ...(saving ? styles.saveBtnOff : {}) }}
          onClick={onSave}
          disabled={saving}>
          {saving ? <Loader2 size={13} className="spin" /> : <Save size={13} />} 저장
        </button>
      )}
    </div>
  );
}
