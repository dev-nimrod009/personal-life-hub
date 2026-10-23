import { useEffect, useState } from "react";
import { Bell, ClipboardList, CloudOff, RefreshCw, CupSoda, Smile, Sparkles } from "lucide-react";
import { listDayPlanner, listReminders, listHabits, listHabitLogs, listMoods, listWater, onSyncStatus, toggleHabitLog, upsertWater, getProfile } from "../lib/data";
import type { DayPlanTask, Habit, HabitLog, Mood, Reminder, WaterIntake, Profile } from "../lib/types";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui";
import { formatDay, todayISO } from "../lib/utils";

export function DashboardPage({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { user } = useAuth();
  const [sync, setSync] = useState<{ active: boolean; pending: number }>({ active: false, pending: 0 });
  const [tasks, setTasks] = useState<DayPlanTask[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [intakes, setIntakes] = useState<WaterIntake[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const today = todayISO();

  const load = async () => {
    setLoading(true);
    try {
      const [allTasks, allReminders, habitsList, logsList, latestMoods, latestWater, profileData] = await Promise.all([
        listDayPlanner(),
        listReminders(),
        listHabits(),
        listHabitLogs(),
        listMoods(),
        listWater(),
        user ? getProfile(user.id) : Promise.resolve(null),
      ]);
      setTasks(allTasks.filter((t) => t.plan_date === today));
      setReminders(allReminders.filter((x) => !x.done).slice(0, 5));
      setHabits(habitsList);
      setLogs(logsList);
      if (latestMoods[0]) setMoods([latestMoods[0]]);
      if (latestWater[0]) setIntakes([latestWater[0]]);
      if (profileData) setProfile(profileData);
    } catch {
      // dashboard stays empty on read failure
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => onSyncStatus((active, pending) => setSync({ active, pending })), []);

  const doneCount = tasks.filter((t) => t.done).length;
  const todayMood = moods.find((m) => m.mood_date === today);
  const water = intakes.find((i) => i.intake_date === today);
  const glasses = water?.glasses ?? 0;
  const goal = water?.goal ?? 8;

  const checkHabit = async (habit: Habit) => {
    try {
      await toggleHabitLog(habit.id, today);
    } finally {
      load();
    }
  };

  const quickWater = async () => {
    const next = glasses + 1;
    setIntakes([{ id: "today", intake_date: today, glasses: next, goal } as WaterIntake]);
    try {
      await upsertWater(today, next, goal);
    } catch {
      // revert handled by next load
    } finally {
      load();
    }
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = (profile?.full_name ?? "").trim().split(/\s+/)[0];
  const greetingText = firstName ? `${greeting}, ${firstName}` : greeting;

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <p className="text-sm text-ink-500">{formatDay(today)}</p>
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink-800 mt-1 flex items-center gap-3">
          {greetingText} <Sparkles size={26} className="text-honey-500" />
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(!sync.active || sync.pending > 0) && (
            <div
              className={`sm:col-span-2 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ${
                sync.pending > 0 ? "bg-honey-500/15 text-amber-700" : "bg-cream-100 text-ink-500"
              }`}
            >
              {sync.pending > 0 ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Working offline — {sync.pending} pending item
                  {sync.pending === 1 ? "" : "s"} will sync when internet returns
                </>
              ) : (
                <>
                  <CloudOff size={15} /> Offline — entries are saved on this phone and will sync automatically
                </>
              )}
            </div>
          )}
          <section className="bg-white rounded-2xl border border-cream-200 p-6 hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => onNavigate("dayplans")}>
            <div className="flex items-center gap-2 text-ink-500 mb-3">
              <ClipboardList size={16} />
              <h3 className="text-xs font-semibold uppercase tracking-widest">Today's plan</h3>
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm text-ink-500">Nothing planned yet. Tap to add tasks.</p>
            ) : (
              <>
                <p className="font-display text-3xl font-semibold text-ink-800">
                  {doneCount}/{tasks.length}
                </p>
                <p className="text-sm text-ink-500 mt-1">
                  {doneCount === tasks.length ? "All done — nice work!" : `${tasks.length - doneCount} left to go`}
                </p>
              </>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-cream-200 p-6 hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => onNavigate("reminders")}>
            <div className="flex items-center gap-2 text-ink-500 mb-3">
              <Bell size={16} />
              <h3 className="text-xs font-semibold uppercase tracking-widest">Upcoming reminders</h3>
            </div>
            {reminders.length === 0 ? (
              <p className="text-sm text-ink-500">Nothing pending. Tap to add a reminder.</p>
            ) : (
              <ul className="space-y-1.5">
                {reminders.slice(0, 3).map((r) => (
                  <li key={r.id} className="text-sm text-ink-800 truncate">
                    • {r.title}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-cream-200 p-6 hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => onNavigate("habits")}>
            <div className="flex items-center gap-2 text-ink-500 mb-3">
              <Smile size={16} />
              <h3 className="text-xs font-semibold uppercase tracking-widest">Habits today</h3>
            </div>
            {habits.length === 0 ? (
              <p className="text-sm text-ink-500">No habits yet. Tap to create one.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {habits.map((habit) => {
                  const doneToday = logs.some((l) => l.habit_id === habit.id && l.log_date === today);
                  return (
                    <button
                      key={habit.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        checkHabit(habit);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                        doneToday ? "bg-sage-500 text-white" : "bg-cream-100 text-ink-600 hover:bg-cream-200"
                      }`}
                    >
                      {habit.icon} {habit.name}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-cream-200 p-6 hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => onNavigate("water")}>
            <div className="flex items-center gap-2 text-ink-500 mb-3">
              <CupSoda size={16} />
              <h3 className="text-xs font-semibold uppercase tracking-widest">Water</h3>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-display text-3xl font-semibold text-ink-800">{glasses}</p>
              <p className="text-sm text-ink-500 flex-1">of {goal} glasses</p>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  quickWater();
                }}
              >
                +1 glass
              </Button>
            </div>
          </section>
        </div>
      )}

      <section className="mt-3 bg-white rounded-2xl border border-cream-200 p-6 hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => onNavigate("mood")}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-2">How are you feeling?</h3>
            {todayMood ? (
              <p className="text-sm text-ink-800">
                You logged a mood of {todayMood.score}/5 today.
                {todayMood.note && <span className="text-ink-500"> "{todayMood.note}"</span>}
              </p>
            ) : (
              <p className="text-sm text-ink-500">Tap to check in with your mood.</p>
            )}
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <span
                key={s}
                className={`w-3.5 h-3.5 rounded-full transition-all ${
                  todayMood && s <= todayMood.score ? "bg-sage-500" : "bg-cream-200"
                }`}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
