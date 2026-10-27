import { useEffect, useState } from "react";
import { ClipboardList, Plus, Trash2, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import {
  listDayPlanner,
  addDayPlannerTask,
  setDayPlannerDone,
  deleteDayPlanner,
  updateDayPlannerDate,
} from "../lib/data";
import type { DayPlanTask } from "../lib/types";
import { Button, EmptyState, Input, SectionHeader } from "../components/ui";
import { todayISO } from "../lib/utils";

export function DayPlansPage() {
  const [tasks, setTasks] = useState<DayPlanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState(todayISO());
  const [newTask, setNewTask] = useState("");
  const [rolling, setRolling] = useState(false);

  const today = todayISO();

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
      setNewTask("");
      await load();
    } catch {
      setError("Could not add the task.");
    }
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

  const rollOverUnfinished = async () => {
    setRolling(true);
    try {
      const pastUnfinished = tasks.filter((t) => t.plan_date < today && !t.done);
      for (const t of pastUnfinished) {
        await updateDayPlannerDate(t.id, today);
      }
      setDate(today);
      setError("");
      await load();
    } catch {
      setError("Could not roll over past tasks.");
    } finally {
      setRolling(false);
    }
  };

  const pastUnfinishedCount = tasks.filter((t) => t.plan_date < today && !t.done).length;
  const dayTasks = tasks.filter((t) => t.plan_date === date);
  const done = dayTasks.filter((t) => t.done).length;
  const progress = dayTasks.length ? Math.round((done / dayTasks.length) * 100) : 0;

  return (
    <div className="animate-fade-up">
      <SectionHeader title="Day Plans" subtitle="Your to-do list for any day" />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {/* Roll over banner if viewing today and past unfinished tasks exist */}
      {date === today && pastUnfinishedCount > 0 && (
        <div className="mb-6 rounded-2xl bg-honey-500/15 border border-amber-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-display font-semibold text-amber-900 text-sm">
              You have {pastUnfinishedCount} unfinished task{pastUnfinishedCount === 1 ? "" : "s"} from past days
            </p>
            <p className="text-xs text-amber-800/80 mt-0.5">Bring them forward to today's plan so you don't lose track.</p>
          </div>
          <Button size="sm" onClick={() => void rollOverUnfinished()} disabled={rolling}>
            <ArrowRight size={14} /> {rolling ? "Rolling over..." : "Roll over unfinished tasks to Today"}
          </Button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-cream-200 p-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-cream-200 bg-white px-3.5 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
            />
            {date !== today && (
              <Button size="sm" variant="secondary" onClick={() => setDate(today)}>
                Today
              </Button>
            )}
          </div>
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
            icon={<ClipboardList size={24} className="text-sage-600" />}
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
                <button
                  type="button"
                  onClick={() => toggle(task)}
                  className="text-sage-600 hover:text-sage-700 transition-colors shrink-0"
                  aria-label={task.done ? "Mark incomplete" : "Mark complete"}
                >
                  {task.done ? <CheckCircle2 size={20} className="text-sage-600" /> : <Circle size={20} className="text-ink-400" />}
                </button>
                <span
                  className={`flex-1 min-w-0 text-sm leading-relaxed ${
                    task.done ? "line-through text-ink-400 font-normal" : "text-ink-800 font-medium"
                  }`}
                >
                  {task.task}
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => remove(task.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  aria-label="Delete task"
                >
                  <Trash2 size={13} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
