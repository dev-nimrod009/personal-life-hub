import { useEffect, useState } from "react";
import { Award, CheckCircle2, Sparkles, Plus } from "lucide-react";
import {
  listHabitLogs,
  listBudgetItems,
  listMoods,
  listGoals,
  listJournal,
  upsertJournal,
} from "../lib/data";
import { Button, Input, Label, SectionHeader, Textarea } from "../components/ui";

export function YearlyReviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const [stats, setStats] = useState({
    totalJournals: 0,
    habitLogsCount: 0,
    expensesTotal: 0,
    incomeTotal: 0,
    avgMood: 0,
    goalsDone: 0,
    totalGoals: 0,
  });

  const [form, setForm] = useState({
    highlights: "",
    struggles: "",
    goalProgress: "",
    lessons: "",
    feelNextYear: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [journals, logs, budget, moods, goals] = await Promise.all([
        listJournal().catch(() => []),
        listHabitLogs().catch(() => []),
        listBudgetItems().catch(() => []),
        listMoods().catch(() => []),
        listGoals().catch(() => []),
      ]);

      const exp = budget.filter((b) => b.kind === "expense").reduce((s, i) => s + i.amount, 0);
      const inc = budget.filter((b) => b.kind === "income").reduce((s, i) => s + i.amount, 0);
      const avgM = moods.length > 0 ? Math.round((moods.reduce((s, m) => s + m.score, 0) / moods.length) * 10) / 10 : 0;
      const doneGoals = goals.filter((g) => g.done).length;

      setStats({
        totalJournals: journals.length,
        habitLogsCount: logs.length,
        expensesTotal: exp,
        incomeTotal: inc,
        avgMood: avgM,
        goalsDone: doneGoals,
        totalGoals: goals.length,
      });
      setError("");
    } catch {
      setError("Could not load year-end insights.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveYearlyReview = async () => {
    setSaving(true);
    try {
      const year = new Date().getFullYear();
      const content = `Yearly Life Review — ${year}\n\n🌟 Highlights & Wins:\n${form.highlights || "A year of quiet growth and steady presence."}\n\n🧗 Struggles & Resilience:\n${form.struggles || "Navigated challenges with patience."}\n\n🎯 Major Goal Progress:\n${form.goalProgress || `Completed ${stats.goalsDone} of ${stats.totalGoals} goals.`}\n\n💡 Key Lessons Learned:\n${form.lessons || "Simplicity, consistency, and kindness matter most."}\n\n✨ What I want next year to feel like:\n${form.feelNextYear || "Calm, purposeful, and deeply connected."}`;
      await upsertJournal({
        title: `Yearly Life Review (${year})`,
        content,
        mood: "inspired",
      });
      setSuccess("Yearly review saved successfully as a special Journal entry!");
      window.setTimeout(() => setSuccess(""), 4000);
      setForm({ highlights: "", struggles: "", goalProgress: "", lessons: "", feelNextYear: "" });
    } catch {
      setError("Could not save yearly review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-up pb-12">
      <SectionHeader
        title="Guided Yearly Review"
        subtitle="Reflect on the entire year, celebrate your growth, and set a peaceful vision for the year ahead"
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}
      {success && (
        <div className="mb-4 rounded-xl bg-sage-100 text-sage-700 text-sm px-4 py-3 font-medium flex items-center gap-2">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {/* Auto-pulled year metrics */}
      <section className="bg-cream-50 rounded-2xl border border-cream-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-sage-600" />
          <h3 className="font-display text-sm font-semibold text-ink-800">Your Year in Numbers (Auto-Pulled)</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white rounded-xl p-3 border border-cream-200">
            <p className="text-ink-500 font-medium">Journal Entries</p>
            <p className="font-display text-lg font-bold text-ink-800 mt-0.5">{stats.totalJournals}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-cream-200">
            <p className="text-ink-500 font-medium">Habit Checks</p>
            <p className="font-display text-lg font-bold text-ink-800 mt-0.5">{stats.habitLogsCount}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-cream-200">
            <p className="text-ink-500 font-medium">Goals Completed</p>
            <p className="font-display text-lg font-bold text-ink-800 mt-0.5">{stats.goalsDone} / {stats.totalGoals}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-cream-200">
            <p className="text-ink-500 font-medium">Average Mood</p>
            <p className="font-display text-lg font-bold text-ink-800 mt-0.5">{stats.avgMood || "—"} / 5</p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="h-64 rounded-2xl bg-cream-100 animate-pulse" />
      ) : (
        <section className="bg-white rounded-2xl border border-cream-200 p-6 space-y-4">
          <h3 className="font-display text-base font-semibold text-ink-800 flex items-center gap-2">
            <Award size={18} className="text-sage-600" /> Yearly Reflection Prompts
          </h3>
          <div>
            <Label>Looking back: What were your biggest highlights and wins?</Label>
            <Textarea
              rows={3}
              value={form.highlights}
              onChange={(e) => setForm({ ...form, highlights: e.target.value })}
              placeholder="Memorable moments, breakthroughs, and proud milestones..."
            />
          </div>
          <div>
            <Label>What were your biggest struggles and how did you grow?</Label>
            <Textarea
              rows={3}
              value={form.struggles}
              onChange={(e) => setForm({ ...form, struggles: e.target.value })}
              placeholder="Challenges faced and lessons extracted..."
            />
          </div>
          <div>
            <Label>Progress on Major Goals</Label>
            <Textarea
              rows={3}
              value={form.goalProgress}
              onChange={(e) => setForm({ ...form, goalProgress: e.target.value })}
              placeholder={`You completed ${stats.goalsDone} of ${stats.totalGoals} goals. Which ones shaped your year?`}
            />
          </div>
          <div>
            <Label>Key Lessons Learned</Label>
            <Input
              value={form.lessons}
              onChange={(e) => setForm({ ...form, lessons: e.target.value })}
              placeholder="What did this year teach you about yourself?"
            />
          </div>
          <div>
            <Label>What do you want the next year to feel like?</Label>
            <Textarea
              rows={3}
              value={form.feelNextYear}
              onChange={(e) => setForm({ ...form, feelNextYear: e.target.value })}
              placeholder="Choose a guiding word or feeling (e.g. Spaciousness, focus, joy)..."
            />
          </div>
          <Button onClick={() => void saveYearlyReview()} disabled={saving} className="w-full">
            <Plus size={16} /> Save Yearly Review to Journal
          </Button>
        </section>
      )}
    </div>
  );
}
