// 문서를 만드는 작업 화면. 네 부분을 위에서 아래로 쌓기만 합니다.
//   머리(계정·남은 횟수) → 문서 고르기 → 입력 → 결과 목록 → 이어 말하기

import React from "react";
import { styles } from "../../ui/styles.js";
import { css } from "../../ui/theme.js";
import { WorkspaceHeader } from "./WorkspaceHeader.jsx";
import { ModeSelect } from "./ModeSelect.jsx";
import { EditorPanel } from "./EditorPanel.jsx";
import { ResultList, ComposeBar } from "./ResultList.jsx";

export function Workspace({ app }) {
  return (
    <div style={styles.wrap}>
      <style>{css}</style>
      <WorkspaceHeader app={app} />
      <ModeSelect app={app} />
      <EditorPanel app={app} />
      <ResultList app={app} />
      <ComposeBar app={app} />
    </div>
  );
}
