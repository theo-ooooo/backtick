"use client";

import { useState } from "react";
import type { DayCount } from "@/lib/queries/stats";

const LEVELS = ["bg-paper", "bg-acc/25", "bg-acc/50", "bg-acc/75", "bg-acc"];
const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

function level(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

function kstKey(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

interface Tip {
  x: number;
  y: number;
  text: string;
}

/** 깃헙 스타일 글쓰기 잔디 — 최근 53주, 컨테이너 폭에 맞춰 늘어나고 호버 시 개수 툴팁. */
export function ContributionCalendar({ days }: { days: DayCount[] }) {
  const byDay = new Map(days.map((d) => [d.date, d.count]));
  const [tip, setTip] = useState<Tip | null>(null);

  const end = new Date();
  const endDow = end.getDay();
  const start = new Date(end);
  start.setDate(end.getDate() - (52 * 7 + endDow)); // 53주 전 일요일

  const weeks: { date: string; count: number; future: boolean }[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 53; w++) {
    const col: { date: string; count: number; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      col.push({ date: kstKey(cursor), count: byDay.get(kstKey(cursor)) ?? 0, future: cursor > end });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(col);
  }

  // 월 라벨 — 열 첫날 기준으로 달이 바뀌는 지점
  const labels: { col: number; text: string }[] = [];
  let prevMonth = -1;
  weeks.forEach((col, i) => {
    const m = Number(col[0].date.slice(5, 7)) - 1;
    if (m !== prevMonth) {
      labels.push({ col: i, text: MONTHS[m] });
      prevMonth = m;
    }
  });

  function showTip(e: React.MouseEvent<HTMLSpanElement>, date: string, count: number) {
    const r = e.currentTarget.getBoundingClientRect();
    const [, m, d] = date.split("-");
    setTip({
      x: r.left + r.width / 2,
      y: r.top - 8,
      text: `${Number(m)}월 ${Number(d)}일 · ${count > 0 ? `글 ${count}개` : "글 없음"}`,
    });
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="relative mb-1.5 h-4 font-mono text-[10px] text-faint">
          {labels.map((l, i) =>
            i === 0 && labels.length > 1 && labels[1].col - l.col < 3 ? null : (
              <span
                key={l.col}
                className="absolute whitespace-nowrap"
                // 끝자락 라벨은 잘리지 않게 오른쪽 기준으로 붙인다
                style={l.col / 53 > 0.93 ? { right: 0 } : { left: `${(l.col / 53) * 100}%` }}
              >
                {l.text}
              </span>
            ),
          )}
        </div>
        <div className="grid w-full grid-flow-col grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: "repeat(53, minmax(0, 1fr))" }}>
          {weeks.flat().length > 0 &&
            weeks.map((col, w) =>
              col.map((day, d) =>
                day.future ? (
                  <span key={day.date} style={{ gridColumn: w + 1, gridRow: d + 1 }} />
                ) : (
                  <span
                    key={day.date}
                    style={{ gridColumn: w + 1, gridRow: d + 1 }}
                    onMouseEnter={(e) => showTip(e, day.date, day.count)}
                    onMouseLeave={() => setTip(null)}
                    className={`aspect-square w-full rounded-[3px] ${LEVELS[level(day.count)]} ${day.count === 0 ? "border border-line/70" : ""}`}
                  />
                ),
              ),
            )}
        </div>
        <div className="mt-2.5 flex items-center justify-end gap-1.5 font-mono text-[10px] text-faint">
          적게
          {LEVELS.map((c, i) => (
            <span key={i} className={`h-[10px] w-[10px] rounded-[3px] ${c} ${i === 0 ? "border border-line/70" : ""}`} />
          ))}
          많이
        </div>
      </div>

      {tip && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 font-mono text-[11px] font-semibold text-bg shadow-lg"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}
