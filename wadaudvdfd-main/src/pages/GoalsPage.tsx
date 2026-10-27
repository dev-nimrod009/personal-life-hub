import { useEffect, useState } from "react";
import { Target, Plus, Trash2, CheckCircle2, CalendarDays, CalendarRange, X } from "lucide-react";
import {
  listGoals,
  addNewGoal,
  deleteOldGoal,
  listAllGoalSteps,
  addGoalStep,
  toggleGoalStepDone,
  deleteGoalStep,
  setGoalTimeframe,
} from "../lib/data";
import type { Goal, GoalStep } from "../lib/types";
import { Button, EmptyState, Input, Label, Modal, SectionHeader, Textarea } from "../components/ui";
import { cn } from "../lib/utils";

const LIFE_AREAS = [
  { id: "Health", label: "Health & Wellbeing", emoji: "🥗" },
  { id: "Relationships", label: "Relationships", emoji: "🤍" },
  { id: "Money", label: "Money & Career", emoji: "💰" },
  { id: "Growth", label: "Personal Growth", emoji: "📚" },
  { id: "Fun", label: "Fun & Adventure", emoji: "🎨" },
  { id: "Contribution", label: "Contribution", emoji: "🌱" },
] as const;

interface GoalForm {
  title: string;
  description: string;
  timeframe: string;
  life_area: string;
}

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [steps, setSteps] = useState<GoalStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [newStepByGoal, setNewStepByGoal] = useState<Record<string, string>>({});
  const [form, setForm] = useState<GoalForm>({ title: "", description: "", timeframe: "yearly", life_area: "Growth" });
  const [saving, setSaving] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    try {
      const [goalsList, stepsList] = await Promise.all([listGoals(), listAllGoalSteps()]);
      setGoals(goalsList);
      setSteps(stepsList);
      setError("");
    } catch {
      setError("Could not read goals from this device.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await addNewGoal({
        title: `[${form.life_area}] ${form.title.trim()}`,
        description: form.description.trim(),
        target: 1,
        timeframe: form.timeframe,
      });
      setError("");
      setOpen(false);
      setForm({ title: "", description: "", timeframe: "yearly", life_area: "Growth" });
      await load();
    } catch {
      setError("Could not create the goal.");
    } finally {
      setSaving(false);
    }
  };

  const switchTimeframe = async (goal: Goal) => {
    const next = goal.timeframe === "yearly" ? "monthly" : "yearly";
    try {
      await setGoalTimeframe(goal, next);
    } catch {
      setError("Could not switch the timeframe.");
    }
    load();
  };

  const remove = async (id: string) => {
    try {
      await deleteOldGoal(id);
    } catch {
      setError("Could not delete the goal.");
    }
    load();
  };

  const addStep = async (goalId: string) => {
    const content = (newStepByGoal[goalId] ?? "").trim();
    if (!content) return;
    try {
      await addGoalStep(goalId, content);
      setNewStepByGoal((prev) => ({ ...prev, [goalId]: "" }));
    } catch {
      setError("Could not add the step.");
    }
    load();
  };

  const stepToggle = async (step: GoalStep) => {
    try {
      await toggleGoalStepDone(step);
    } catch {
      setError("Could not update the step.");
    }
    load();
  };

  const stepRemove = async (id: string) => {
    try {
      await deleteGoalStep(id);
    } catch {
      setError("Could not remove the step.");
    }
    load();
  };

  const stepsFor = (goalId: string) => steps.filter((s) => s.goal_id === goalId);
  const activeGoals = goals.filter((g) => !g.done);
  const filteredGoals = selectedArea === "all" ? activeGoals : activeGoals.filter((g) => g.title.startsWith(`[${selectedArea}]`));

  const renderGoal = (goal: Goal) => {
    const goalSteps = stepsFor(goal.id);
    const doneCount = goalSteps.filter((s) => s.done).length;
    const pct = goalSteps.length > 0 ? Math.round((doneCount / goalSteps.length) * 100) : 0;
    const isYearly = goal.timeframe === "yearly";

    // Extract area tag if present
    const areaMatch = goal.title.match(/^\[(.*?)\]\s*(.*)$/);
    const areaName = areaMatch ? areaMatch[1] : "Growth";
    const cleanTitle = areaMatch ? areaMatch[2] : goal.title;
    const areaObj = LIFE_AREAS.find((a) => a.id === areaName);

    return (
      <div key={goal.id} className="bg-white rounded-2xl border border-cream-200 p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-sage-50 text-sage-700 border border-sage-200">
                {areaObj?.emoji ?? "🌟"} {areaName}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full",
                  isYearly ? "bg-cream-100 text-ink-700" : "bg-clay-100 text-clay-700"
                )}
              >
                {isYearly ? <CalendarRange size={10} /> : <CalendarDays size={10} />}
                {isYearly ? "Yearly" : "Monthly"}
              </span>
            </div>
            <h4 className="font-display text-lg font-semibold text-ink-800">{cleanTitle}</h4>
            {goal.description && <p className="text-sm text-ink-500 mt-0.5 leading-relaxed">{goal.description}</p>}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => switchTimeframe(goal)}
              aria-label="Switch timeframe"
            >
              {isYearly ? "→ Monthly" : "→ Yearly"}
            </Button>
            <Button variant="danger" size="sm" onClick={() => remove(goal.id)} aria-label="Delete goal">
              <Trash2 size={13} />
            </Button>
          </div>
        </div>

        {pct > 0 && (
          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 h-2 rounded-full bg-cream-100 overflow-hidden">
              <div className="h-full rounded-full bg-sage-500 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-ink-600 shrink-0">
              {doneCount}/{goalSteps.length || 0}
            </span>
          </div>
        )}

        <ul className="mt-4 space-y-2">
          {goalSteps.map((step) => (
            <li key={step.id} className="group flex items-center gap-3 bg-cream-50/70 rounded-xl px-3 py-2">
              <button onClick={() => stepToggle(step)} aria-label="Toggle step done" className="shrink-0">
                {step.done ? (
                  <CheckCircle2 size={18} className="text-sage-500" />
                ) : (
                  <X size={16} className="text-ink-500/40" />
                )}
              </button>
              <span className={cn("flex-1 text-sm", step.done ? "line-through text-ink-500/70" : "text-ink-800")}>
                {step.title}
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={() => stepRemove(step.id)}
                className="opacity-0 group-hover:opacity-100"
                aria-label="Remove step"
              >
                <X size={12} />
              </Button>
            </li>
          ))}
        </ul>

        <div className="flex gap-2 mt-3">
          <Input
            placeholder="Break it into a tiny daily/weekly action..."
            value={newStepByGoal[goal.id] ?? ""}
            onChange={(e) => setNewStepByGoal((prev) => ({ ...prev, [goal.id]: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addStep(goal.id)}
          />
          <Button variant="secondary" onClick={() => addStep(goal.id)} disabled={!(newStepByGoal[goal.id] ?? "").trim()}>
            <Plus size={14} />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Goals &amp; Life Areas"
        subtitle="Align long-term objectives across Health, Relationships, Money, Growth, Fun &amp; Contribution"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> New goal
          </Button>
        }
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {/* Life Area Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedArea("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            selectedArea === "all" ? "bg-sage-600 text-white" : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
          }`}
        >
          All Areas
        </button>
        {LIFE_AREAS.map((area) => (
          <button
            key={area.id}
            onClick={() => setSelectedArea(area.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              selectedArea === area.id ? "bg-sage-600 text-white" : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
            }`}
          >
            <span>{area.emoji}</span> {area.id}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : filteredGoals.length === 0 ? (
        <EmptyState
          icon={<Target size={26} />}
          title="No goals in this area yet"
          hint="Create a goal, assign it to a life area, and break it into tiny daily or weekly actions."
        />
      ) : (
        <div className="space-y-6">
          <div className="space-y-6">{filteredGoals.map(renderGoal)}</div>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setForm({ title: "", description: "", timeframe: "yearly", life_area: "Growth" });
        }}
        title="New goal with soul"
      >
        <div className="space-y-4">
          <div>
            <Label>Life Area</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LIFE_AREAS.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setForm({ ...form, life_area: area.id })}
                  className={cn(
                    "p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center gap-2",
                    form.life_area === area.id ? "bg-sage-100 border-sage-500 text-sage-800 ring-1 ring-sage-500" : "bg-white border-cream-200 text-ink-700 hover:bg-cream-100"
                  )}
                >
                  <span className="text-base">{area.emoji}</span>
                  <span className="truncate">{area.id}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Goal Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Build an emergency savings fund"
            />
          </div>
          <div>
            <Label>Timeframe</Label>
            <div className="flex gap-2">
              {["monthly", "yearly"].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setForm({ ...form, timeframe: tf })}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                    form.timeframe === tf ? "bg-sage-600 text-white" : "bg-cream-100 text-ink-600 hover:bg-cream-200"
                  )}
                >
                  {tf === "monthly" ? "Monthly" : "Yearly"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Why it matters &amp; Tiny Actions</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What deeper value does this serve?"
            />
          </div>
          <Button onClick={add} disabled={saving || !form.title.trim()} className="w-full">
            {saving ? "Saving..." : "Create goal"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
