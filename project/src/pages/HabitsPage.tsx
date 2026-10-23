import { useEffect, useState } from "react";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { listHabits, listHabitLogs, createHabit, deleteHabit, toggleHabitLog } from "../lib/data";
import type { Habit, HabitLog } from "../lib/types";
import { Button, EmptyState, Input, Label, Modal, SectionHeader } from "../components/ui";
import { cn, todayISO } from "../lib/utils";

const ICONS = ["💧", "🏃", "📖", "🧘", "🥗", "😴", "🎸", "🧹", "💊", "☀️"];
const COLORS = ["sage", "clay", "honey", "sky-soft", "rose-soft"] as const;

const colorClasses: Record<string, { bg: string; text: string; ring: string }> = {
  sage: { bg: "bg-sage-100", text: "text-sage-600", ring: "ring-sage-300" },
  clay: { bg: "bg-clay-100", text: "text-clay-600", ring: "ring-clay-300" },
  honey: { bg: "bg-honey-100", text: "text-honey-600", ring: "ring-honey-300" },
  "sky-soft": { bg: "bg-sky-soft-100", text: "text-sky-soft-600", ring: "ring-sky-soft-300" },
  "rose-soft": { bg: "bg-rose-soft-100", text: "text-rose-soft-600", ring: "ring-rose-soft-300" },
};

function last7Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return days;
}

export function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", icon: "💧", color: "sage" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [habitsList, logsList] = await Promise.all([listHabits(), listHabitLogs()]);
      setHabits(habitsList);
      setLogs(logsList);
      setError("");
    } catch {
      setError("Could not read habits from this device.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createHabit(form);
      setError("");
    } catch {
      setError("Could not create the habit.");
    } finally {
      setSaving(false);
      setOpen(false);
      setForm({ name: "", icon: "💧", color: "sage" });
      load();
    }
  };

  const remove = async (habit: Habit) => {
    try {
      await deleteHabit(habit.id);
    } catch {
      setError("Could not delete the habit.");
    }
    load();
  };

  const toggle = async (habit: Habit, date: string) => {
    try {
      await toggleHabitLog(habit.id, date);
    } catch {
      setError("Could not update the habit.");
    }
    load();
  };

  const week = last7Days();

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Habits"
        subtitle="Tap a dot to check off a day · last 7 days"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> New habit
          </Button>
        }
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={26} />}
          title="No habits yet"
          hint="Start small — drink water, read 10 pages, stretch. Small dots add up."
        />
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => {
            const c = colorClasses[habit.color] ?? colorClasses.sage;
            const habitLogs = logs.filter((l) => l.habit_id === habit.id);
            const streak = (() => {
              let count = 0;
              for (let i = 0; i < 365; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                if (habitLogs.some((l) => l.log_date === iso)) count++;
                else if (i > 0) break;
              }
              return count;
            })();
            return (
              <div
                key={habit.id}
                className="group bg-white rounded-2xl border border-cream-200 p-4 sm:p-5 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0", c.bg)}>{habit.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-800 truncate">{habit.name}</p>
                    <p className={cn("text-xs mt-0.5", streak > 0 ? "text-sage-600 font-medium" : "text-ink-500")}>
                      {streak > 0 ? `🔥 ${streak}-day streak` : "No streak yet"}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => remove(habit)}
                    className="opacity-60 shrink-0"
                    aria-label="Delete habit"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 mt-3 ml-[52px]">
                  {week.map((date) => {
                    const doneToday = habitLogs.some((l) => l.log_date === date);
                    const isToday = date === todayISO();
                    return (
                      <button
                        key={date}
                        onClick={() => toggle(habit, date)}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-all duration-200 active:scale-90",
                          doneToday ? `${c.bg} ${c.ring} ring-2` : "bg-white border-cream-200 hover:border-ink-500/30",
                          isToday && "ring-offset-2 ring-offset-white"
                        )}
                        aria-label={`${doneToday ? "Uncheck" : "Check"} ${habit.name} on ${date}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New habit">
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Morning stretch"
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </div>
          <div>
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setForm({ ...form, icon })}
                  className={cn(
                    "w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all",
                    form.icon === icon ? "bg-sage-100 ring-2 ring-sage-300" : "bg-cream-100 hover:bg-cream-200"
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setForm({ ...form, color })}
                  className={cn(
                    "w-9 h-9 rounded-full transition-all",
                    colorClasses[color].bg,
                    form.color === color ? "ring-2 ring-offset-2 ring-ink-500/40" : "opacity-60 hover:opacity-100"
                  )}
                />
              ))}
            </div>
          </div>
          <Button onClick={add} disabled={saving || !form.name.trim()} className="w-full">
            {saving ? "Saving..." : "Create habit"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
