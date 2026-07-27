import type { UserProfile } from "@online-judge/shared";

const WEEKS = 53;
const DAYS_PER_WEEK = 7;

// Four steps up the sage ramp rather than GitHub's greens: same idea, but
// in this palette rather than one borrowed from another product.
function colorClass(count: number): string {
  if (count === 0) return "bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]";
  if (count <= 2) return "bg-sage-300";
  if (count <= 5) return "bg-sage-500";
  return "bg-sage-700";
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

  const activeDays = days.filter((d) => d.count > 0).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.count} submission${day.count === 1 ? "" : "s"}`}
                  className={`size-2.5 rounded-full ${colorClass(day.count)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-[var(--ink-muted)]">
        <span>{activeDays} active days</span>
        <span className="ml-auto flex items-center gap-1">
          less
          <span className="size-2.5 rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]" />
          <span className="bg-sage-300 size-2.5 rounded-full" />
          <span className="bg-sage-500 size-2.5 rounded-full" />
          <span className="bg-sage-700 size-2.5 rounded-full" />
          more
        </span>
      </div>
    </div>
  );
}
