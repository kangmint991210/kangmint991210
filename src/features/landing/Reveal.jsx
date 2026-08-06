// 화면에 들어올 때 한 번만 나타나는 껍데기.
//
// 스크롤할 때마다 다시 사라졌다 나타나면 어지럽고 성가십니다. 한 번 보이면 그대로 둡니다.
// 실제 나타나는 방식(투명도·이동)은 theme.js 의 .reveal 에 있습니다.

import React, { useEffect, useRef, useState } from "react";

export function Reveal({ delay = 0, children }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    // 아주 오래된 브라우저에는 IntersectionObserver 가 없습니다 — 그럴 땐 그냥 보여 줍니다.
    if (!el || typeof IntersectionObserver === "undefined") { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      setOn(true);
      io.disconnect();          // 한 번 보이면 더 볼 일이 없습니다
    }, { rootMargin: "0px 0px -12% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal${on ? " on" : ""}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
