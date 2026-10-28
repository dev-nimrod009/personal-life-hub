import { useEffect, useState } from "react";
import { Sparkles, ShieldCheck, Droplets, Smile, CheckCircle2, Wallet, BookOpen, Heart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { listWater, listMoods, listHabitLogs, listJournal, listDiary, listBudgetItems, listGratitude } from "../lib/data";
import { EmptyState, SectionHeader } from "../components/ui";
import { todayISO } from "../lib/utils";

interface Insight {
  icon: LucideIcon;
  title: string;
  detail: string;
}

const WEEKDAYS = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekdayOf(iso: string): number {
  return new Date(`${iso}T12:00:00`).getDay();
}

export function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [water, moods, habitLogs, journals, diary, budget, gratitude] = await Promise.all([
          listWater().catch(() => []),
          listMoods().catch(() => []),
          listHabitLogs().catch(() => []),
          listJournal().catch(() => []),
          listDiary().catch(() => []),
          listBudgetItems().catch(() => []),
          listGratitude().catch(() => []),
        ]);

        const items: Insight[] = [];
        const moodByDate = new Map(moods.map((m) => [m.mood_date, m.score]));

        // Water vs mood
        const hydrated: number[] = [];
        const notHydrated: number[] = [];
        for (const w of water) {
          const mood = moodByDate.get(w.intake_date);
          if (mood == null) continue;
          (w.glasses >= (w.goal || 8) ? hydrated : notHydrated).push(mood);
        }
        if (hydrated.length >= 2 && notHydrated.length >= 2) {
          const diff = avg(hydrated) - avg(notHydrated);
          if (Math.abs(diff) >= 0.3) {
            items.push({
              icon: Droplets,
              title: diff > 0 ? "Your mood tends to be higher on days you reach your water goal" : "Water goal days haven't lifted your mood so far",
              detail: `Average mood ${avg(hydrated).toFixed(1)} on ${hydrated.length} goal days vs ${avg(notHydrated).toFixed(1)} on ${notHydrated.length} other days.`,
            });
          }
        }

        // Habits vs mood
        const habitDays = new Set(habitLogs.filter((l) => l.done !== false).map((l) => l.log_date));
        const withHabits: number[] = [];
        const withoutHabits: number[] = [];
        for (const m of moods) (habitDays.has(m.mood_date) ? withHabits : withoutHabits).push(m.score);
        if (withHabits.length >= 2 && withoutHabits.length >= 2) {
          const diff = avg(withHabits) - avg(withoutHabits);
          if (Math.abs(diff) >= 0.3) {
            items.push({
              icon: CheckCircle2,
              title: diff > 0 ? "Days with at least one habit done feel better" : "Your mood is steady whether or not you log habits",
              detail: `Average mood ${avg(withHabits).toFixed(1)} on habit days vs ${avg(withoutHabits).toFixed(1)} on rest days.`,
            });
          }
        }

        // Best habit weekday
        if (habitDays.size >= 5) {
          const counts = new Array(7).fill(0);
          for (const day of habitDays) counts[weekdayOf(day)]++;
          const best = counts.indexOf(Math.max(...counts));
          items.push({
            icon: CheckCircle2,
            title: `${WEEKDAYS[best]} are your most consistent habit days`,
            detail: `${counts[best]} of your ${habitDays.size} active habit days fell on ${WEEKDAYS[best]}.`,
          });
        }

        // Mood trend
        const last7 = moods.filter((m) => m.mood_date > daysAgoISO(7)).map((m) => m.score);
        const prev7 = moods.filter((m) => m.mood_date > daysAgoISO(14) && m.mood_date <= daysAgoISO(7)).map((m) => m.score);
        if (last7.length >= 2 && prev7.length >= 2) {
          const diff = avg(last7) - avg(prev7);
          items.push({
            icon: Smile,
            title:
              diff >= 0.3
                ? "Your mood has lifted compared with last week"
                : diff <= -0.3
                  ? "This week has felt heavier than last week — be gentle with yourself"
                  : "Your mood has been steady over the last two weeks",
            detail: `This week ${avg(last7).toFixed(1)}/5 vs last week ${avg(prev7).toFixed(1)}/5.`,
          });
        }

        // Writing rhythm
        const since30 = daysAgoISO(30);
        const writingDays = new Set([
          ...journals.map((j) => (j.created_at ?? "").slice(0, 10)).filter((d) => d >= since30),
          ...diary.map((d) => d.entry_date).filter((d) => d >= since30),
        ]);
        if (writingDays.size > 0) {
          items.push({
            icon: BookOpen,
            title: `You wrote on ${writingDays.size} of the last 30 days`,
            detail: writingDays.size >= 12 ? "Writing is becoming a steady part of your rhythm." : "Even a few lines count — every entry is a small return to yourself.",
          });
        }

        // Spending
        const thisMonth = todayISO().slice(0, 7);
        const lastMonthDate = new Date();
        lastMonthDate.setDate(1);
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
        const spent = (month: string) =>
          budget.filter((b) => b.kind === "expense" && (b.item_date ?? "").startsWith(month)).reduce((s, b) => s + b.amount, 0);
        const spentNow = spent(thisMonth);
        const spentBefore = spent(lastMonth);
        if (spentNow > 0) {
          const byCat = new Map<string, number>();
          for (const b of budget) {
            if (b.kind === "expense" && (b.item_date ?? "").startsWith(thisMonth)) byCat.set(b.category, (byCat.get(b.category) ?? 0) + b.amount);
          }
          const [topCat, topAmt] = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1])[0];
          items.push({
            icon: Wallet,
            title: `${topCat} is your biggest spending area this month`,
            detail:
              `KES ${topAmt.toLocaleString()} of KES ${spentNow.toLocaleString()} spent so far` +
              (spentBefore > 0 ? ` (last month: KES ${spentBefore.toLocaleString()}).` : "."),
          });
        }

        // Gratitude
        const gratitudeWeek = new Set(gratitude.filter((g) => g.entry_date > daysAgoISO(7)).map((g) => g.entry_date));
        if (gratitudeWeek.size > 0) {
          items.push({
            icon: Heart,
            title: `You noted gratitude on ${gratitudeWeek.size} day${gratitudeWeek.size === 1 ? "" : "s"} this week`,
            detail: "Noticing small good things is a quiet way to steady the mind.",
          });
        }

        setInsights(items);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="animate-fade-up pb-12">
      <SectionHeader title="Local Insights" subtitle="Gentle patterns found in your own entries — calculated on this device only" />

      <div className="bg-sage-100/60 rounded-2xl border border-sage-300/60 p-5 mb-6 flex items-start gap-3">
        <ShieldCheck size={20} className="text-sage-600 shrink-0 mt-0.5" />
        <div className="text-xs text-ink-700 leading-relaxed">
          <p className="font-semibold mb-0.5 text-ink-800">Strictly local &amp; private</p>
          Insights are calculated in your browser from your own data. Nothing is sent to any AI or analytics service.
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={24} />}
          title="No patterns yet"
          hint="Log your mood, water, habits and spending for a week or two and gentle patterns will appear here."
        />
      ) : (
        <div className="space-y-3.5">
          {insights.map((insight, idx) => {
            const Icon = insight.icon;
            return (
              <div key={idx} className="bg-white rounded-2xl border border-cream-200 p-5 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-800">{insight.title}</p>
                  <p className="text-xs text-ink-500 mt-1">{insight.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
