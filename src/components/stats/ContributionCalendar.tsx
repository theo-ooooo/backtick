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

/** 깃헙 스타일 글쓰기 잔디 — 최근 53주, 일요일 시작 열 단위. 서버 렌더. */
export function ContributionCalendar({ days }: { days: DayCount[] }) {
  const byDay = new Map(days.map((d) => [d.date, d.count]));

  // 오늘이 속한 주의 토요일까지 53주 그리드
  const end = new Date();
  const endDow = end.getDay();
  const weeks: { date: string; count: number; future: boolean }[][] = [];
  const start = new Date(end);
  start.setDate(end.getDate() - (52 * 7 + endDow)); // 53주 전 일요일

  const cursor = new Date(start);
  for (let w = 0; w < 53; w++) {
    const col: { date: string; count: number; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const key = kstKey(cursor);
      col.push({
        date: key,
        count: byDay.get(key) ?? 0,
        future: cursor > end,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(col);
  }

  // 월 라벨 — 각 열 첫날이 새 달로 바뀌는 지점
  const labels: { col: number; text: string }[] = [];
  let prevMonth = -1;
  weeks.forEach((col, i) => {
    const m = Number(col[0].date.slice(5, 7)) - 1;
    if (m !== prevMonth) {
      labels.push({ col: i, text: MONTHS[m] });
      prevMonth = m;
    }
  });

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="relative mb-1.5 h-4 font-mono text-[10px] text-faint">
          {labels.map((l, i) =>
            // 너무 촘촘한 첫 라벨은 생략
            i === 0 && labels.length > 1 && labels[1].col - l.col < 3 ? null : (
              <span key={l.col} className="absolute" style={{ left: `${l.col * 13}px` }}>
                {l.text}
              </span>
            ),
          )}
        </div>
        <div className="flex gap-[3px]">
          {weeks.map((col, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {col.map((day) =>
                day.future ? (
                  <span key={day.date} className="h-[10px] w-[10px]" />
                ) : (
                  <span
                    key={day.date}
                    title={`${day.date} · 글 ${day.count}개`}
                    className={`h-[10px] w-[10px] rounded-[3px] ${LEVELS[level(day.count)]} ${day.count === 0 ? "border border-line/70" : ""}`}
                  />
                ),
              )}
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex items-center justify-end gap-1.5 font-mono text-[10px] text-faint">
          적게
          {LEVELS.map((c, i) => (
            <span key={i} className={`h-[10px] w-[10px] rounded-[3px] ${c} ${i === 0 ? "border border-line/70" : ""}`} />
          ))}
          많이
        </div>
      </div>
    </div>
  );
}
