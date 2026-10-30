import { useEffect, useState } from "react";
import { Target, Plus, Trash2, CheckCircle2, Circle, Calendar, Heart, Sparkles, Check } from "lucide-react";
import {
  listGoals,
  addNewGoal,
  deleteOldGoal,
  listAllGoalSteps,
  addGoalStep,
  toggleGoalStepDone,
  deleteGoalStep,
} from "../lib/data";
import type { Goal, GoalStep } from "../lib/types";
import { Button, EmptyState, Input, Label, Modal, SectionHeader, Textarea } from "../components/ui";
import { cn } from "../lib/utils";

interface GoalForm {
  title: string;
  why: string;
  when_target: string;
}

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [steps, setSteps] = useState<GoalStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [newStepByGoal, setNewStepByGoal] = useState<Record<string, string>>({});
  const [form, setForm] = useState<GoalForm>({ title: "", why: "", when_target: "" });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

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
      // Store description as JSON or clean text with Why and When
      const descPayload = JSON.stringify({
        why: form.why.trim(),
        when: form.when_target.trim(),
      });
      await addNewGoal({
        title: form.title.trim(),
        description: descPayload,
        target: 1,
        timeframe: form.when_target.trim() || "ongoing",
      });
      setError("");
      setOpen(false);
      setForm({ title: "", why: "", when_target: "" });
      await load();
    } catch {
      setError("Could not create the goal.");
    } finally {
      setSaving(false);
    }
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

  const stepDelete = async (id: string) => {
    try {
      await deleteGoalStep(id);
    } catch {
      setError("Could not delete the step.");
    }
    load();
  };

  const parseGoalDetails = (goal: Goal) => {
    try {
      const parsed = JSON.parse(goal.description);
      if (parsed && typeof parsed === "object") {
        return {
          why: parsed.why || "",
          when: parsed.when || goal.timeframe || "",
        };
      }
    } catch {
      // plain text fallback
    }
    return {
      why: goal.description || "",
      when: goal.timeframe || "",
    };
  };

  // Strip legacy brackets like [Health] if they existed in older entries
  const cleanTitle = (raw: string) => {
    return raw.replace(/^\[[^\]]+\]\s*/, "");
  };

  const filteredGoals = goals.filter((g) => {
    if (filter === "completed") return g.done;
    if (filter === "active") return !g.done;
    return true;
  });

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Goals & Vision"
        subtitle="Define what you want, why it matters, and when you will achieve it"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> New Goal
          </Button>
        }
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "active", "completed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`text-xs px-4 py-2 rounded-xl font-medium capitalize transition-all ${
              filter === tab
                ? "bg-sage-600 text-white shadow-xs"
                : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : filteredGoals.length === 0 ? (
        <EmptyState
          icon={<Target size={26} className="text-sage-600" />}
          title="No goals found"
          hint="Write down what you want to achieve. Tap '+ New Goal' to begin."
        />
      ) : (
        <div className="space-y-4">
          {filteredGoals.map((goal) => {
            const goalSteps = steps.filter((s) => s.goal_id === goal.id);
            const doneSteps = goalSteps.filter((s) => s.done).length;
            const progress = goalSteps.length > 0 ? Math.round((doneSteps / goalSteps.length) * 100) : goal.done ? 100 : 0;
            const details = parseGoalDetails(goal);

            return (
              <div
                key={goal.id}
                className={cn(
                  "bg-white rounded-2xl border p-5 sm:p-6 transition-all duration-200 hover:shadow-md",
                  goal.done ? "border-sage-200 bg-sage-50/20" : "border-cream-200"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className={cn("font-display text-lg font-semibold text-ink-800", goal.done && "line-through text-ink-400")}>
                      {cleanTitle(goal.title)}
                    </h3>

                    {details.why && (
                      <p className="text-sm text-ink-600 mt-1 flex items-start gap-1.5">
                        <Heart size={14} className="text-rose-soft-500 shrink-0 mt-0.5" />
                        <span className="italic">{details.why}</span>
                      </p>
                    )}

                    {details.when && (
                      <p className="text-xs text-sage-700 font-medium mt-1 flex items-center gap-1.5">
                        <Calendar size={13} className="shrink-0" />
                        <span>Target: {details.when}</span>
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => remove(goal.id)}
                    className="p-1.5 text-ink-400 hover:text-rose-soft-600 transition-colors shrink-0"
                    title="Delete goal"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Progress bar */}
                {goalSteps.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-ink-500 mb-1.5">
                      <span>{doneSteps} of {goalSteps.length} milestones complete</span>
                      <span className="font-semibold text-sage-600">{progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-cream-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sage-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Milestones / Action steps */}
                <div className="mt-4 pt-3 border-t border-cream-100 space-y-2">
                  <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Milestones & Steps</p>
                  {goalSteps.map((step) => (
                    <div key={step.id} className="flex items-center justify-between gap-2 text-sm group/step py-1">
                      <button
                        onClick={() => stepToggle(step)}
                        className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                      >
                        {step.done ? (
                          <CheckCircle2 size={16} className="text-sage-600 shrink-0" />
                        ) : (
                          <Circle size={16} className="text-ink-400 shrink-0 hover:text-sage-600" />
                        )}
                        <span className={cn("truncate text-ink-800", step.done && "line-through text-ink-400")}>
                          {step.title}
                        </span>
                      </button>
                      <button
                        onClick={() => stepDelete(step.id)}
                        className="text-ink-400 hover:text-rose-soft-600 opacity-0 group-hover/step:opacity-100 transition-opacity p-1"
                        title="Delete milestone"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  {/* Add milestone inline input */}
                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="Add a milestone or next step..."
                      value={newStepByGoal[goal.id] ?? ""}
                      onChange={(e) => setNewStepByGoal((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void addStep(goal.id);
                      }}
                      className="text-xs py-1.5"
                    />
                    <Button size="sm" variant="secondary" onClick={() => addStep(goal.id)}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Goal Modal - Simple, Free-Form, No forced templates */}
      <Modal open={open} onClose={() => setOpen(false)} title="New Goal">
        <div className="space-y-4">
          <div>
            <Label>What is your goal?</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Save KES 100,000 for emergency fund"
              autoFocus
            />
          </div>

          <div>
            <Label>Why do you want to accomplish this?</Label>
            <Textarea
              value={form.why}
              onChange={(e) => setForm({ ...form, why: e.target.value })}
              placeholder="e.g. For financial freedom, peace of mind, and security for my family"
              rows={3}
            />
          </div>

          <div>
            <Label>When do you want to achieve it by?</Label>
            <Input
              value={form.when_target}
              onChange={(e) => setForm({ ...form, when_target: e.target.value })}
              placeholder="e.g. By end of December 2026 or Next 6 months"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-cream-100">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={add} disabled={saving || !form.title.trim()}>
              {saving ? "Saving..." : "Create Goal"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
