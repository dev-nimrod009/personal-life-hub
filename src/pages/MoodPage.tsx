import { useEffect, useState } from "react";
import { Smile, Calendar, Plus, Heart, Sparkles, TrendingUp } from "lucide-react";
import { listMoods, upsertMood } from "../lib/data";
import type { Mood } from "../lib/types";
import { Button, EmptyState, Input, Label, SectionHeader, Textarea } from "../components/ui";
import { todayISO, formatDay } from "../lib/utils";

const MOOD_LEVELS = [
  { score: 1, label: "Rough", emoji: "🌧️", desc: "Difficult day, heavy feelings", color: "bg-rose-soft-100 text-rose-soft-700 border-rose-soft-200" },
  { score: 2, label: "Low", emoji: "☁️", desc: "Low energy, a bit drained", color: "bg-clay-100 text-clay-700 border-clay-200" },
  { score: 3, label: "Okay", emoji: "⛅", desc: "Steady, balanced, calm", color: "bg-honey-100 text-honey-700 border-honey-200" },
  { score: 4, label: "Good", emoji: "🌱", desc: "Positive, focused, peaceful", color: "bg-sage-100 text-sage-700 border-sage-200" },
  { score: 5, label: "Radiant", emoji: "☀️", desc: "Joyful, energized, inspired", color: "bg-sky-soft-100 text-sky-soft-700 border-sky-soft-200" },
];

export function MoodPage() {
  const [moods, setMoods] = useState<Mood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const today = todayISO();
  const [selectedScore, setSelectedScore] = useState<number>(4);
  const [note, setNote] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);

  const load = async () => {
    try {
      const data = await listMoods();
      setMoods(data);
      const todayMood = data.find((m) => m.mood_date === today);
      if (todayMood) {
        setSelectedScore(todayMood.score);
        setNote(todayMood.note || "");
      }
      setError("");
    } catch {
      setError("Could not load mood history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertMood(selectedDate, selectedScore, note.trim());
      await load();
      setError("");
    } catch {
      setError("Could not save mood.");
    } finally {
      setSaving(false);
    }
  };

  const avgMood = moods.length > 0
    ? (moods.reduce((acc, m) => acc + m.score, 0) / moods.length).toFixed(1)
    : "—";

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Mood Tracking"
        subtitle="Check in with your feelings daily, log emotional triggers, and observe patterns over time."
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {/* Today's Check-in Card */}
      <div className="bg-white rounded-3xl border border-cream-200 p-6 sm:p-8 mb-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-display font-semibold text-xl text-ink-800">
              {selectedDate === today ? "How are you feeling today?" : `Check-in for ${formatDay(selectedDate)}`}
            </h3>
            <p className="text-xs text-ink-500 mt-1">Take a gentle pause and notice your inner climate.</p>
          </div>
          <div className="flex items-center gap-2">
            <Label>Date:</Label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                const existing = moods.find((m) => m.mood_date === e.target.value);
                if (existing) {
                  setSelectedScore(existing.score);
                  setNote(existing.note || "");
                } else {
                  setNote("");
                }
              }}
              className="text-xs rounded-xl border border-cream-200 px-3 py-1.5 bg-cream-50"
            />
          </div>
        </div>

        {/* Mood Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {MOOD_LEVELS.map((level) => {
            const isSelected = selectedScore === level.score;
            return (
              <button
                key={level.score}
                type="button"
                onClick={() => setSelectedScore(level.score)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                  isSelected
                    ? "border-sage-500 bg-sage-50/60 ring-2 ring-sage-300 scale-[1.02]"
                    : "border-cream-200 bg-white hover:bg-cream-50"
                }`}
              >
                <span className="text-3xl mb-2">{level.emoji}</span>
                <span className="text-sm font-semibold text-ink-800">{level.label}</span>
                <span className="text-[11px] text-ink-500 mt-1 line-clamp-2 leading-tight">{level.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Reflection Note */}
        <div className="space-y-2 mb-6">
          <Label>What is contributing to how you feel? (Optional)</Label>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Sleep, relationships, workload, weather, little moments..."
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving..." : "Log Check-in"}
          </Button>
        </div>
      </div>

      {/* Mood History & Insights */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-xl text-ink-800">Check-in History</h3>
          <div className="flex items-center gap-2 text-xs text-ink-600 bg-cream-100 px-3 py-1.5 rounded-xl font-medium">
            <TrendingUp size={14} className="text-sage-600" />
            <span>Average: {avgMood} / 5</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-cream-100 animate-pulse" />
            ))}
          </div>
        ) : moods.length === 0 ? (
          <EmptyState
            icon={<Smile size={26} className="text-sage-600" />}
            title="No check-ins logged yet"
            hint="Log your first mood check-in above to start tracking your wellbeing."
          />
        ) : (
          <div className="space-y-3">
            {moods.map((m) => {
              const info = MOOD_LEVELS.find((l) => l.score === m.score) || MOOD_LEVELS[2];
              return (
                <div
                  key={m.id || m.mood_date}
                  className="bg-white rounded-2xl border border-cream-200 p-4 sm:p-5 flex items-center justify-between gap-4 hover:shadow-xs transition-shadow"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-2xl p-2 rounded-xl bg-cream-100 flex items-center justify-center shrink-0">
                      {info.emoji}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold text-ink-800 text-sm sm:text-base">
                          {info.label} ({m.score}/5)
                        </span>
                        <span className="text-xs text-ink-500">· {formatDay(m.mood_date)}</span>
                      </div>
                      {m.note && <p className="text-xs text-ink-600 mt-1 leading-relaxed">"{m.note}"</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
