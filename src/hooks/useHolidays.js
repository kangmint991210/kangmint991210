// 달력이 보고 있는 해의 공휴일.
//
// 처음에는 내장 표로 그리고, 받아 온 값이 도착하면 그 해만 갈아 끼웁니다.
// 그래서 달력이 비었다가 채워지는 깜빡임 없이, 늘 뭔가는 보입니다.
//
// 달을 넘겨 다른 해로 가면 그 해를 받아 와 표에 더합니다 — 한 번 받은 해는 다시 받지 않습니다.

import { useEffect, useState } from "react";
import { BUILTIN_HOLIDAYS, withYear } from "../domain/holidays.js";
import { loadHolidays } from "../services/holidays.js";

export function useHolidays(year) {
  const [table, setTable] = useState(BUILTIN_HOLIDAYS);

  useEffect(() => {
    let alive = true;
    loadHolidays(year).then((days) => {
      // 못 받아 왔으면 그냥 둡니다 — 내장 표가 계속 쓰입니다
      if (alive && days) setTable((prev) => withYear(prev, year, days));
    });
    return () => { alive = false; };
  }, [year]);

  return table;
}
