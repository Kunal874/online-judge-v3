import type { UserProfile } from "@online-judge/shared";

const WEEKS = 53;
const DAYS_PER_WEEK = 7;

function colorClass(count: number): string {
  if (count === 0) return "bg-slate-100 dark:bg-slate-800";
  if (count <= 2) return "bg-green-200 dark:bg-green-900";
  if (count <= 5) return "bg-green-400 dark:bg-green-700";
  return "bg-green-600 dark:bg-green-500";
}

export default function Heatmap({ entries }: { entries: UserProfile["heatmap"] }) {
  const countByDate = new Map(entries.map((e) => [e.date, e.count]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalDays = WEEKS * DAYS_PER_WEEK;
  // Start on a Sunday so weeks line up into clean columns.
  const start = new Date(today);
  start.setDate(start.getDate() - totalDays + 1);
  start.setDate(start.getDate() - start.getDay());

  const days: { date: string; count: number }[] = [];
  const cursor = new Date(start);
  while (days.length < totalDays + 7) {
    const date = cursor.toISOString().slice(0, 10);
    days.push({ date, count: countByDate.get(date) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < days.length; i += DAYS_PER_WEEK) {
    weeks.push(days.slice(i, i + DAYS_PER_WEEK));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} submission${day.count === 1 ? "" : "s"}`}
                className={`h-3 w-3 rounded-sm ${colorClass(day.count)}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
