import { useState } from "react";
import { useLiveLoad } from "../lib/useLiveLoad";
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

interface GoalForm {
  title: string;
  description: string;
  timeframe: string;
}

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [steps, setSteps] = useState<GoalStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [newStepByGoal, setNewStepByGoal] = useState<Record<string, string>>({});
  const [form, setForm] = useState<GoalForm>({ title: "", description: "", timeframe: "yearly" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
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

  useLiveLoad(load);

  const add = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await addNewGoal({
        title: form.title.trim(),
        description: form.description.trim(),
        target: 1,
        timeframe: form.timeframe,
      });
      setError("");
      setOpen(false);
      setForm({ title: "", description: "", timeframe: "yearly" });
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

  const renderGoal = (goal: Goal) => {
    const goalSteps = stepsFor(goal.id);
    const doneCount = goalSteps.filter((s) => s.done).length;
    const pct = goalSteps.length > 0 ? Math.round((doneCount / goalSteps.length) * 100) : 0;
    const isYearly = goal.timeframe === "yearly";
    return (
      <div key={goal.id} className="bg-white rounded-2xl border border-cream-200 p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full mb-2",
                isYearly ? "bg-sage-100 text-sage-700" : "bg-clay-100 text-clay-700"
              )}
            >
              {isYearly ? <CalendarRange size={10} /> : <CalendarDays size={10} />}
              {isYearly ? "Yearly" : "Monthly"}
            </span>
            <h4 className="font-display text-lg font-semibold text-ink-800">{goal.title}</h4>
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
            placeholder="Break it into a step..."
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
        title="Goals"
        subtitle="Long-term objectives, broken into steps"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> New goal
          </Button>
        }
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={<Target size={26} />}
          title="No goals yet"
          hint="Name something bigger than today — a yearly or monthly goal, then break it into steps."
        />
      ) : (
        <div className="space-y-6">
          <div className="space-y-6">{activeGoals.map(renderGoal)}</div>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setForm({ title: "", description: "", timeframe: "yearly" });
        }}
        title="New goal"
      >
        <div className="space-y-4">
          <div>
            <Label>Goal</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Run a half marathon"
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
            <Label>Why it matters</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional motivation..."
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
