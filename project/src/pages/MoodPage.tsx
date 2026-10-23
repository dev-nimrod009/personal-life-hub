import { useEffect, useState } from "react";

import { listMoods, upsertMood } from "../lib/data";
import type { Mood } from "../lib/types";
import { Button, SectionHeader, Textarea } from "../components/ui";
import { formatDay, todayISO } from "../lib/utils";

const MOOD_OPTIONS = [
  { score: 1, emoji: "😞", label: "Rough" },
  { score: 2, emoji: "🙁", label: "Low" },
  { score: 3, emoji: "😐", label: "Okay" },
  { score: 4, emoji: "🙂", label: "Good" },
  { score: 5, emoji: "😄", label: "Great" },
];

const scoreColor: Record<number, string> = {
  1: "bg-clay-300",
  2: "bg-honey-300",
  3: "bg-cream-200",
  4: "bg-sage-300",
  5: "bg-sage-500",
};

export function MoodPage() {
  const [moods, setMoods] = useState<Mood[]>([]);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [score, setScore] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const load = async () => {
    try {
      setMoods(await listMoods());
      setError("");
    } catch {
      setError("Could not read moods from this device.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const existing = moods.find((m) => m.mood_date === selectedDate);
    setScore(existing?.score ?? 0);
    setNote(existing?.note ?? "");
  }, [moods, selectedDate]);

  const save = async () => {
    if (!score) return;
    setSaving(true);
    try {
      await upsertMood(selectedDate, score, note);
      setError("");
    } catch {
      setError("Could not save the mood.");
    } finally {
      setSaving(false);
      setSavedMsg("Saved!");
      setTimeout(() => setSavedMsg(""), 2000);
      load();
    }
  };

  const recent = moods.slice(0, 30);
  const avg = recent.length ? (recent.reduce((s, m) => s + m.score, 0) / recent.length).toFixed(1) : "–";

  return (
    <div className="animate-fade-up">
      <SectionHeader title="Mood" subtitle="How are you feeling, day by day?" />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      <div className="bg-white rounded-2xl border border-cream-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="font-display text-lg font-semibold text-ink-800">{formatDay(selectedDate)}</p>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
          />
        </div>

        <div className="flex justify-center gap-3 mb-6">
          {MOOD_OPTIONS.map((option) => (
            <button
              key={option.score}
              onClick={() => setScore(option.score)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl px-3 py-3 transition-all duration-200 active:scale-95 ${
                score === option.score ? "bg-sage-100 ring-2 ring-sage-300" : "hover:bg-cream-100"
              }`}
            >
              <span className="text-3xl">{option.emoji}</span>
              <span className={`text-[10px] font-semibold ${score === option.score ? "text-sage-700" : "text-ink-500"}`}>
                {option.label}
              </span>
            </button>
          ))}
        </div>

        <Textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything worth noting about today's mood?"
        />

        <div className="flex items-center justify-end gap-3 mt-3">
          {savedMsg && <span className="text-xs font-semibold text-sage-600">{savedMsg}</span>}
          <Button onClick={save} disabled={saving || !score}>
            {saving ? "Saving..." : "Save mood"}
          </Button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-cream-200 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">Recent average</p>
          <p className="font-display text-3xl font-semibold text-ink-800 mt-2">{avg} / 5</p>
          <p className="text-xs text-ink-500 mt-1">over the last {recent.length || 0} entries</p>
        </div>
        <div className="bg-white rounded-2xl border border-cream-200 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">Last 14 days</p>
          <div className="flex items-end gap-1.5 h-10 mt-3">
            {Array.from({ length: 14 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (13 - i));
              const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              const mood = moods.find((m) => m.mood_date === iso);
              return (
                <div
                  key={iso}
                  title={mood ? `${shortLabel(mood.score)} on ${iso}` : "No entry"}
                  className={`flex-1 rounded-t-md transition-all duration-300 ${mood ? scoreColor[mood.score] : "bg-cream-100"}`}
                  style={{ height: mood ? `${mood.score * 20}%` : "15%" }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function shortLabel(score: number): string {
  return MOOD_OPTIONS.find((o) => o.score === score)?.emoji ?? "•";
}
