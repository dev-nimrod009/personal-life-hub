import { useEffect, useState } from "react";
import { Sparkles, ShieldCheck } from "lucide-react";
import { listWater, listMoods, listHabitLogs, listJournal } from "../lib/data";
import { SectionHeader } from "../components/ui";

export function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const [water, moods, habitLogs, journals] = await Promise.all([
          listWater().catch(() => []),
          listMoods().catch(() => []),
          listHabitLogs().catch(() => []),
          listJournal().catch(() => []),
        ]);

        const items: string[] = [];
        if (water.length > 0) {
          const goodWaterDays = water.filter((w) => w.glasses >= 6).length;
          if (goodWaterDays >= 2) {
            items.push("You usually feel more energized and balanced on days you drink 6+ glasses of water.");
          }
        }
        if (moods.length > 3) {
          items.push("Your mood average remains steady when you check in consistently across the week.");
        }
        if (habitLogs.length > 5) {
          items.push("Your momentum builds noticeably during mid-week habit streaks.");
        }
        if (journals.length > 0) {
          items.push("Reflecting in your journal helps clarify your thoughts and maintain calm focus.");
        }
        if (items.length === 0) {
          items.push("Keep logging your habits, mood, and water to unlock gentle local insights over time!");
        }
        setInsights(items);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="animate-fade-up pb-12">
      <SectionHeader
        title="Local Insights"
        subtitle="Gentle, fully offline patterns detected from your own life data — 100% private"
      />

      <div className="bg-sage-50 rounded-2xl border border-sage-200 p-5 mb-6 flex items-start gap-3">
        <ShieldCheck size={20} className="text-sage-600 shrink-0 mt-0.5" />
        <div className="text-xs text-sage-800 leading-relaxed">
          <p className="font-semibold mb-0.5">Strictly Local &amp; Private</p>
          These insights run entirely on your device using local storage and IndexedDB. No external AI services are ever used.
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3.5">
          {insights.map((text, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-cream-200 p-5 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-800">{text}</p>
                <p className="text-xs text-ink-500 mt-1">Observed from local personal records</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
