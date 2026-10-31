import { useEffect, useState } from "react";
import { CheckCircle2, Plus, Trash2, Heart } from "lucide-react";
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

const GENTLE_RECOVERY_QUOTES = [
  "A gentle pause — every day is a fresh beginning.",
  "Habits ebb and flow like the tides. You are welcome here.",
  "No failures, only feedback. Ready when you are.",
  "Progress isn't linear. Take a deep breath and begin again.",
];

export function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", identity: "", icon: "💧", color: "sage" });
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
      const fullName = form.identity.trim() ? `${form.name.trim()} ||| I am someone who ${form.identity.trim()}` : form.name.trim();
      await createHabit({ name: fullName, icon: form.icon, color: form.color });
      setError("");
      setOpen(false);
      setForm({ name: "", identity: "", icon: "💧", color: "sage" });
      await load();
    } catch {
      setError("Could not create the habit.");
    } finally {
      setSaving(false);
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
    if (date > todayISO()) return;
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
        title="Habits with Soul"
        subtitle="Build positive daily routines with identity-based affirmations, gentle recovery, and consistency tracking."
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
            <div key={i} className="h-24 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={26} />}
          title="No habits yet"
          hint="Start small — drink water, read 10 pages, stretch. Small dots add up."
        />
      ) : (
        <div className="space-y-3.5">
          {habits.map((habit) => {
            const c = colorClasses[habit.color] ?? colorClasses.sage;
            const habitLogs = logs.filter((l) => l.habit_id === habit.id);
            
            // Parse name and identity statement if stored with delimiter
            const parts = habit.name.split(" ||| ");
            const habitName = parts[0];
            const identity = parts[1] ?? "";

            const streak = (() => {
              const today = todayISO();
              const d = new Date();
              const todayDone = habitLogs.some((l) => l.log_date === today);
              if (!todayDone) {
                d.setDate(d.getDate() - 1);
              }
              let count = 0;
              for (let i = 0; i < 365; i++) {
                const cur = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i);
                const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
                if (habitLogs.some((l) => l.log_date === iso)) {
                  count++;
                } else {
                  break;
                }
              }
              return count;
            })();

            const yesterdayISO = (() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            })();
            const missedYesterday = !habitLogs.some((l) => l.log_date === yesterdayISO) && !habitLogs.some((l) => l.log_date === todayISO());

            return (
              <div
                key={habit.id}
                className="group bg-white rounded-2xl border border-cream-200 p-4 sm:p-5 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 mt-0.5", c.bg)}>
                    {habit.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-800 truncate">{habitName}</p>
                    {identity && (
                      <p className="text-xs text-sage-700 italic mt-0.5 flex items-center gap-1">
                        <Heart size={12} className="text-sage-500" /> &ldquo;{identity}&rdquo;
                      </p>
                    )}
                    <p className={cn("text-xs mt-1", streak > 0 ? "text-sage-600 font-medium" : "text-ink-500")}>
                      {streak > 0 ? `🔥 ${streak}-day streak` : "Starting fresh today"}
                    </p>
                    {missedYesterday && streak === 0 && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1 mt-1.5 border border-amber-200 inline-block">
                        🌿 {GENTLE_RECOVERY_QUOTES[Math.floor(Math.random() * GENTLE_RECOVERY_QUOTES.length)]}
                      </p>
                    )}
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
                    const isFuture = date > todayISO();
                    return (
                      <div key={date} className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => !isFuture && toggle(habit, date)}
                        disabled={isFuture}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-all duration-200 active:scale-90",
                          doneToday ? `${c.bg} ${c.ring} ring-2` : "bg-white border-cream-200 hover:border-ink-500/30",
                          isToday && "ring-offset-2 ring-offset-white",
                          isFuture && "opacity-25 cursor-not-allowed border-dashed hover:border-cream-200"
                        )}
                        title={isFuture ? "Cannot log future days" : `${doneToday ? "Uncheck" : "Check"} on ${date}`}
                        aria-label={`${doneToday ? "Uncheck" : "Check"} ${habitName} on ${date}`}
                      />
                      <span className={cn("text-[10px] leading-none", isToday ? "font-semibold text-sage-700" : isFuture ? "text-ink-300" : "text-ink-400")}>
                        {isToday ? "Today" : new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "narrow" })}
                      </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setForm({ name: "", identity: "", icon: "💧", color: "sage" });
        }}
        title="New habit with soul"
      >
        <div className="space-y-4">
          <div>
            <Label>Habit Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Morning meditation or 10 min walk"
            />
          </div>
          <div>
            <Label>Identity Statement ("I am someone who...")</Label>
            <Input
              value={form.identity}
              onChange={(e) => setForm({ ...form, identity: e.target.value })}
              placeholder="e.g. prioritizes inner peace and clear focus"
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
