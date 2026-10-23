import { useEffect, useState } from "react";
import { ClipboardList, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { listDayPlanner, addDayPlannerTask, setDayPlannerDone, deleteDayPlanner } from "../lib/data";
import type { DayPlanTask } from "../lib/types";
import { Button, EmptyState, Input, SectionHeader } from "../components/ui";
import { formatDay, todayISO } from "../lib/utils";

export function DayPlansPage() {
  const [tasks, setTasks] = useState<DayPlanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState(todayISO());
  const [newTask, setNewTask] = useState("");

  const load = async () => {
    try {
      setTasks(await listDayPlanner());
      setError("");
    } catch {
      setError("Could not read plans from this device.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!newTask.trim()) return;
    try {
      await addDayPlannerTask(newTask.trim(), date);
      setError("");
    } catch {
      setError("Could not add the task.");
    }
    setNewTask("");
    load();
  };

  const toggle = async (task: DayPlanTask) => {
    try {
      await setDayPlannerDone(task.id, !task.done);
    } catch {
      setError("Could not update the task.");
    }
    load();
  };

  const remove = async (id: string) => {
    try {
      await deleteDayPlanner(id);
    } catch {
      setError("Could not delete the task.");
    }
    load();
  };

  const dayTasks = tasks.filter((t) => t.plan_date === date);
  const done = dayTasks.filter((t) => t.done).length;
  const progress = dayTasks.length ? Math.round((done / dayTasks.length) * 100) : 0;
  const upcomingDates = [...new Set(tasks.filter((t) => t.plan_date > todayISO()).map((t) => t.plan_date))].sort();

  return (
    <div className="animate-fade-up">
      <SectionHeader title="Day Plans" subtitle="Your to-do list for any day" />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      <div className="bg-white rounded-2xl border border-cream-200 p-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-cream-200 bg-white px-3.5 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
          />
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Add a task for this day..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <Button onClick={add} disabled={!newTask.trim()}>
              <Plus size={16} />
            </Button>
          </div>
        </div>

        {dayTasks.length > 0 && (
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-2 rounded-full bg-cream-100 overflow-hidden">
              <div className="h-full rounded-full bg-sage-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-semibold text-ink-600">
              {done}/{dayTasks.length} done
            </span>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-cream-100 animate-pulse" />
            ))}
          </div>
        ) : dayTasks.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={24} />}
            title="Nothing planned for this day"
            hint="Add your first task above and check it off as you go."
          />
        ) : (
          <ul className="space-y-2">
            {dayTasks.map((task) => (
              <li
                key={task.id}
                className="group flex items-center gap-3 bg-cream-50/70 rounded-xl px-4 py-3 hover:bg-cream-100 transition-colors"
              >
                <button onClick={() => toggle(task)} className="shrink-0" aria-label="Toggle done">
                  {task.done ? (
                    <CheckCircle2 size={20} className="text-sage-500" />
                  ) : (
                    <Circle size={20} className="text-ink-500/50 hover:text-sage-500 transition-colors" />
                  )}
                </button>
                <span className={`flex-1 text-sm ${task.done ? "line-through text-ink-500/70" : "text-ink-800"}`}>
                  {task.task}
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => remove(task.id)}
                  className="opacity-0 group-hover:opacity-100"
                  aria-label="Delete"
                >
                  <Trash2 size={13} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {upcomingDates.length > 0 && (
        <div className="mt-8">
          <h3 className="font-display text-lg font-semibold text-ink-700 mb-3">Coming up</h3>
          <div className="space-y-2">
            {upcomingDates.slice(0, 7).map((d) => {
              const items = tasks.filter((t) => t.plan_date === d);
              return (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  className="w-full text-left bg-white rounded-xl border border-cream-200 px-4 py-3 hover:border-sage-300 hover:shadow-sm transition-all duration-200"
                >
                  <p className="text-sm font-semibold text-ink-800">{formatDay(d)}</p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {items.length} task{items.length > 1 ? "s" : ""} · {items.filter((i) => i.done).length} done
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
