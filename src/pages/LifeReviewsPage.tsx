import { useEffect, useState } from "react";
import { Calendar, Award, CheckCircle2, Sparkles, Plus } from "lucide-react";
import {
  listHabits,
  listHabitLogs,
  listBudgetItems,
  listMoods,
  listGoals,
  upsertJournal,
} from "../lib/data";
import { Button, Input, Label, SectionHeader, Textarea } from "../components/ui";
import { todayISO } from "../lib/utils";

export function LifeReviewsPage() {
  const [activeTab, setActiveTab] = useState<"weekly" | "monthly">("weekly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // Stats pulled from app
  const [stats, setStats] = useState({
    habitsCount: 0,
    habitLogsCount: 0,
    expensesTotal: 0,
    incomeTotal: 0,
    avgMood: 0,
    goalsDone: 0,
    totalGoals: 0,
  });

  // Weekly review form
  const [weeklyForm, setWeeklyForm] = useState({
    wins: "",
    struggles: "",
    energy: "4",
    differently: "",
    gratitude: "",
  });

  // Monthly review form
  const [monthlyForm, setMonthlyForm] = useState({
    goalProgress: "",
    habitConsistency: "",
    moneyOverview: "",
    moodAverage: "",
    lessonLearned: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [habits, logs, budget, moods, goals] = await Promise.all([
        listHabits().catch(() => []),
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
        habitsCount: habits.length,
        habitLogsCount: logs.length,
        expensesTotal: exp,
        incomeTotal: inc,
        avgMood: avgM,
        goalsDone: doneGoals,
        totalGoals: goals.length,
      });
      setError("");
    } catch {
      setError("Could not gather insights for your review.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const saveWeeklyReview = async () => {
    setSaving(true);
    try {
      const content = `Weekly Life Review (${todayISO()})\n\n🌟 Wins:\n${weeklyForm.wins || "None noted"}\n\n🧗 Struggles & Growth:\n${weeklyForm.struggles || "None noted"}\n\n⚡ Energy Level: ${weeklyForm.energy}/5\n\n🔄 What to do differently next week:\n${weeklyForm.differently || "Keep going with grace"}\n\n🌻 Gratitude:\n${weeklyForm.gratitude || "Appreciating the small moments"}`;
      await upsertJournal({
        title: `Weekly Life Review — ${todayISO()}`,
        content,
        mood: "calm",
      });
      setSuccess("Weekly review saved successfully as a Journal entry!");
      window.setTimeout(() => setSuccess(""), 4000);
      setWeeklyForm({ wins: "", struggles: "", energy: "4", differently: "", gratitude: "" });
    } catch {
      setError("Could not save weekly review.");
    } finally {
      setSaving(false);
    }
  };

  const saveMonthlyReview = async () => {
    setSaving(true);
    try {
      const content = `Monthly Life Review (${todayISO()})\n\n🎯 Goal Progress:\n${monthlyForm.goalProgress || `${stats.goalsDone} of ${stats.totalGoals} goals completed`}\n\n🔥 Habit Consistency:\n${monthlyForm.habitConsistency || `${stats.habitLogsCount} habit logs recorded`}\n\n💰 Money Overview:\n${monthlyForm.moneyOverview || `Income: KES ${stats.incomeTotal.toLocaleString()} | Expenses: KES ${stats.expensesTotal.toLocaleString()}`}\n\n😊 Mood Average: ${stats.avgMood || monthlyForm.moodAverage}/5\n\n💡 One Key Lesson Learned:\n${monthlyForm.lessonLearned || "Consistency and gentleness are key."}`;
      await upsertJournal({
        title: `Monthly Life Review — ${todayISO()}`,
        content,
        mood: "inspired",
      });
      setSuccess("Monthly review saved successfully as a Journal entry!");
      window.setTimeout(() => setSuccess(""), 4000);
      setMonthlyForm({ goalProgress: "", habitConsistency: "", moneyOverview: "", moodAverage: "", lessonLearned: "" });
    } catch {
      setError("Could not save monthly review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-up pb-12">
      <SectionHeader
        title="Guided Life Reviews"
        subtitle="Review your weekly and monthly milestones, celebrate wins, and reflect on personal growth."
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}
      {success && (
        <div className="mb-4 rounded-xl bg-sage-100 text-sage-700 text-sm px-4 py-3 font-medium flex items-center gap-2">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("weekly")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "weekly" ? "bg-sage-600 text-white shadow-sm" : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
          }`}
        >
          Weekly Review (Sunday Reflection)
        </button>
        <button
          onClick={() => setActiveTab("monthly")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "monthly" ? "bg-sage-600 text-white shadow-sm" : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
          }`}
        >
          Monthly Review (Deep Assessment)
        </button>
      </div>

      {/* Activity metrics banner */}
      <section className="bg-cream-50 rounded-2xl border border-cream-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-sage-600" />
          <h3 className="font-display text-sm font-semibold text-ink-800">Your Activity Highlights</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white rounded-xl p-3 border border-cream-200">
            <p className="text-ink-500 font-medium">Habit Checks</p>
            <p className="font-display text-lg font-bold text-ink-800 mt-0.5">{stats.habitLogsCount}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-cream-200">
            <p className="text-ink-500 font-medium">Goals Completed</p>
            <p className="font-display text-lg font-bold text-ink-800 mt-0.5">{stats.goalsDone} / {stats.totalGoals}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-cream-200">
            <p className="text-ink-500 font-medium">Monthly Net Flow</p>
            <p className="font-display text-lg font-bold text-sage-600 mt-0.5">KES {(stats.incomeTotal - stats.expensesTotal).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-cream-200">
            <p className="text-ink-500 font-medium">Average Mood</p>
            <p className="font-display text-lg font-bold text-ink-800 mt-0.5">{stats.avgMood || "—"} / 5</p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="h-48 rounded-2xl bg-cream-100 animate-pulse" />
      ) : activeTab === "weekly" ? (
        <section className="bg-white rounded-2xl border border-cream-200 p-6 space-y-4">
          <h3 className="font-display text-base font-semibold text-ink-800 flex items-center gap-2">
            <Calendar size={18} className="text-sage-600" /> Weekly Reflection
          </h3>
          <div>
            <Label>What went well this week? (Wins)</Label>
            <Textarea
              rows={3}
              value={weeklyForm.wins}
              onChange={(e) => setWeeklyForm({ ...weeklyForm, wins: e.target.value })}
              placeholder="Small or big wins..."
            />
          </div>
          <div>
            <Label>What were your main struggles or friction points?</Label>
            <Textarea
              rows={3}
              value={weeklyForm.struggles}
              onChange={(e) => setWeeklyForm({ ...weeklyForm, struggles: e.target.value })}
              placeholder="What drained your energy or blocked flow..."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Energy Level (1 to 5)</Label>
              <select
                value={weeklyForm.energy}
                onChange={(e) => setWeeklyForm({ ...weeklyForm, energy: e.target.value })}
                className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-xs font-medium text-ink-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
              >
                <option value="5">5 - Vibrant &amp; Flowing</option>
                <option value="4">4 - Good &amp; Steady</option>
                <option value="3">3 - Moderate / Balanced</option>
                <option value="2">2 - Tired / Low Energy</option>
                <option value="1">1 - Exhausted / Overwhelmed</option>
              </select>
            </div>
            <div>
              <Label>What to do differently next week?</Label>
              <Input
                value={weeklyForm.differently}
                onChange={(e) => setWeeklyForm({ ...weeklyForm, differently: e.target.value })}
                placeholder="Adjustments or boundaries..."
              />
            </div>
          </div>
          <div>
            <Label>Weekly Gratitude</Label>
            <Textarea
              rows={2}
              value={weeklyForm.gratitude}
              onChange={(e) => setWeeklyForm({ ...weeklyForm, gratitude: e.target.value })}
              placeholder="People, places, or moments you are grateful for..."
            />
          </div>
          <Button onClick={() => void saveWeeklyReview()} disabled={saving} className="w-full">
            <Plus size={16} /> Save Weekly Review to Journal
          </Button>
        </section>
      ) : (
        <section className="bg-white rounded-2xl border border-cream-200 p-6 space-y-4">
          <h3 className="font-display text-base font-semibold text-ink-800 flex items-center gap-2">
            <Award size={18} className="text-sage-600" /> Monthly Deep Assessment
          </h3>
          <div>
            <Label>Progress on Goals</Label>
            <Textarea
              rows={3}
              value={monthlyForm.goalProgress}
              onChange={(e) => setMonthlyForm({ ...monthlyForm, goalProgress: e.target.value })}
              placeholder={`You completed ${stats.goalsDone} of ${stats.totalGoals} goals. How did you progress?`}
            />
          </div>
          <div>
            <Label>Habit Consistency &amp; Identity</Label>
            <Textarea
              rows={3}
              value={monthlyForm.habitConsistency}
              onChange={(e) => setMonthlyForm({ ...monthlyForm, habitConsistency: e.target.value })}
              placeholder="Which habits stuck? Which need a gentler approach?"
            />
          </div>
          <div>
            <Label>Money Overview &amp; Mindfulness</Label>
            <Textarea
              rows={3}
              value={monthlyForm.moneyOverview}
              onChange={(e) => setMonthlyForm({ ...monthlyForm, moneyOverview: e.target.value })}
              placeholder={`Income: KES ${stats.incomeTotal.toLocaleString()} | Spent: KES ${stats.expensesTotal.toLocaleString()}. How do you feel about your spending?`}
            />
          </div>
          <div>
            <Label>One Key Lesson Learned This Month</Label>
            <Input
              value={monthlyForm.lessonLearned}
              onChange={(e) => setMonthlyForm({ ...monthlyForm, lessonLearned: e.target.value })}
              placeholder="The most important realization..."
            />
          </div>
          <Button onClick={() => void saveMonthlyReview()} disabled={saving} className="w-full">
            <Plus size={16} /> Save Monthly Review to Journal
          </Button>
        </section>
      )}
    </div>
  );
}
