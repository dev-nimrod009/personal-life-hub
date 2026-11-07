import { useEffect, useState } from "react";
import {
  Bell,
  ClipboardList,
  CloudOff,
  RefreshCw,
  CupSoda,
  Smile,
  Sparkles,
  UtensilsCrossed,
  Check,
} from "lucide-react";
import {
  listDayPlanner,
  listReminders,
  listQuotes,
  listHabits,
  listHabitLogs,
  listMoods,
  listWater,
  listMeals,
  updateMeal,
  onSyncStatus,
  toggleHabitLog,
  upsertWater,
  getProfile,
  checkBackendConnectivity,
} from "../lib/data";
import type { DayPlanTask, Habit, HabitLog, Mood, Reminder, WaterIntake, Profile, Meal } from "../lib/types";
import { useAuth } from "../lib/auth";
import { isSupabaseConfigured } from "../lib/supabase";
import type { SavedQuote } from "../lib/types";
import { useEnabledModules } from "../components/nav";
import { dateKeyOf, formatDay, todayISO } from "../lib/utils";
import { MOOD_LEVELS } from "./MoodPage";

export function DashboardPage({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { user } = useAuth();
  const [sync, setSync] = useState<{ pending: number }>({ pending: 0 });
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [tasks, setTasks] = useState<DayPlanTask[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [quote, setQuote] = useState<SavedQuote | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [intakes, setIntakes] = useState<WaterIntake[]>([]);
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const modules = useEnabledModules();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [waterSaving, setWaterSaving] = useState(false);
  const [waterError, setWaterError] = useState("");

  const today = todayISO();

  useEffect(() => {
    listQuotes()
      .then((qs) => setQuote(qs.length ? qs[Math.floor(Math.random() * qs.length)] : null))
      .catch(() => setQuote(null));
  }, []);

  const load = async (withSkeleton = true) => {
    if (withSkeleton) setLoading(true);
    try {
      const [allTasks, allReminders, habitsList, logsList, latestMoods, latestWater, allMeals, profileData] =
        await Promise.all([
          listDayPlanner(),
          listReminders(),
          listHabits(),
          listHabitLogs(),
          listMoods(),
          listWater(),
          listMeals(),
          user ? getProfile(user.id, user.email ?? undefined) : Promise.resolve(null),
        ]);
      setTasks(allTasks.filter((t) => t.plan_date === today));
      setReminders(allReminders.filter((x) => !x.done && x.due_at && dateKeyOf(x.due_at) <= today).slice(0, 5));
      setHabits(habitsList);
      setLogs(logsList);
      if (latestMoods[0]) setMoods([latestMoods[0]]);
      if (latestWater[0]) setIntakes([latestWater[0]]);
      setTodayMeals(allMeals.filter((m) => m.meal_date === today));
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

  useEffect(() => onSyncStatus((_active, pending) => setSync({ pending })), []);

  useEffect(() => {
    const updateConnectivity = () => {
      if (!navigator.onLine) {
        setApiOnline(false);
        return;
      }
      void checkBackendConnectivity().then(setApiOnline);
    };
    updateConnectivity();
    window.addEventListener("online", updateConnectivity);
    window.addEventListener("offline", updateConnectivity);
    const interval = window.setInterval(updateConnectivity, 20_000);
    return () => {
      window.removeEventListener("online", updateConnectivity);
      window.removeEventListener("offline", updateConnectivity);
      window.clearInterval(interval);
    };
  }, []);

  const doneCount = tasks.filter((t) => t.done).length;
  const todayMood = moods.find((m) => m.mood_date === today);
  const water = intakes.find((i) => i.intake_date === today);
  const glasses = water?.glasses ?? 0;
  const goal = water?.goal ?? 8;

  const checkHabit = async (habit: Habit) => {
    try {
      await toggleHabitLog(habit.id, today);
    } finally {
      load(false);
    }
  };

  const quickWater = async () => {
    if (waterSaving) return;
    setWaterSaving(true);
    const next = glasses + 1;
    setIntakes([{ id: "today", intake_date: today, glasses: next, goal } as WaterIntake]);
    try {
      await upsertWater(today, next, goal);
      setWaterError("");
    } catch {
      setWaterError("Could not update water intake. Please try again.");
    } finally {
      await load(false);
      setWaterSaving(false);
    }
  };

  const isMealEaten = (meal: Meal): boolean => {
    return Boolean(meal.notes && meal.notes.includes("[Eaten]"));
  };

  const toggleMealEaten = async (meal: Meal) => {
    const eaten = isMealEaten(meal);
    const updatedNotes = eaten
      ? meal.notes.replace(/\[Eaten\]\s*/g, "").trim()
      : meal.notes ? `${meal.notes} [Eaten]` : "[Eaten]";

    // Optimistic update
    setTodayMeals((prev) =>
      prev.map((m) => (m.id === meal.id ? { ...m, notes: updatedNotes } : m))
    );

    try {
      await updateMeal(meal.id, { notes: updatedNotes });
    } finally {
      load(false);
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
      {/* Compact Bento Header Card */}
      <div className="bg-sage-800 text-white rounded-3xl p-5 sm:p-6 mb-3 relative overflow-hidden shadow-sm">
        <div className="flex items-start justify-between relative z-10 gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-sage-200/80 font-medium">{formatDay(today)}</p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold mt-0.5 tracking-tight truncate">
              {greetingText}
            </h2>
            {modules.dayplans !== false && (
              <div
                onClick={() => onNavigate("dayplans")}
                className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-sage-900/50 hover:bg-sage-900/70 border border-sage-700/60 text-sage-100 text-[11px] font-medium cursor-pointer transition-colors"
                title="View your day plan"
              >
                <ClipboardList size={12} className="text-sage-300 shrink-0" />
                {tasks.length > 0 ? (
                  <span>{tasks.length - doneCount} tasks remaining today</span>
                ) : (
                  <span>No tasks scheduled today</span>
                )}
              </div>
            )}
          </div>

          {/* Date Badge Card matching screenshot */}
          <div className="bg-white text-ink-900 rounded-2xl px-3.5 py-2 shadow-sm text-center min-w-[68px] shrink-0 border border-cream-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-sage-600 leading-none">
              {new Date().toLocaleDateString(undefined, { month: "short" })}
            </p>
            <p className="font-display text-2xl font-bold leading-none my-1 text-ink-900">
              {new Date().getDate()}
            </p>
            <p className="text-[10px] font-medium text-ink-500 leading-none">
              {new Date().toLocaleDateString(undefined, { weekday: "short" })}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {typeof navigator !== "undefined" && !navigator.onLine && (
            <div className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium bg-cream-200/80 text-ink-600">
              <CloudOff size={14} /> Offline mode — changes saved locally
            </div>
          )}

          {/* Random Daily Quote from Quote Vault */}
          {quote && (
            <section
              onClick={() => onNavigate("quotes")}
              className="bg-cream-100/70 hover:bg-cream-100 rounded-2xl p-3.5 transition-colors cursor-pointer"
            >
              <p className="font-serif italic text-ink-800 text-sm leading-snug">&ldquo;{quote.text}&rdquo;</p>
              <p className="text-[11px] text-ink-500 mt-1.5 font-medium">— {quote.author || "Anonymous"}</p>
            </section>
          )}

          {/* Bento 2-column Compact Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Water Tracker */}
            {modules.water !== false && (
              <section
                className="bg-cream-50/70 rounded-2xl p-3.5 hover:bg-cream-100/60 transition-all cursor-pointer flex flex-col justify-between"
                onClick={() => onNavigate("water")}
              >
                <div>
                  <div className="flex items-center gap-1.5 text-ink-500 mb-1">
                    <CupSoda size={14} className="text-sage-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Water</span>
                  </div>
                  <p className="font-display text-xl font-bold text-ink-800 leading-tight">
                    {glasses} <span className="text-xs font-normal text-ink-500">/ {goal}</span>
                  </p>
                </div>
                <div className="mt-2.5">
                  <button
                    type="button"
                    disabled={waterSaving}
                    onClick={(e) => {
                      e.stopPropagation();
                      void quickWater();
                    }}
                    className="w-full py-1 rounded-lg text-xs font-semibold bg-white hover:bg-cream-200/80 text-ink-700 shadow-2xs border border-cream-200 transition-colors"
                  >
                    {waterSaving ? "..." : "+1 Glass"}
                  </button>
                </div>
              </section>
            )}

            {/* Habits Today */}
            {modules.habits !== false && (
              <section
                className="bg-cream-50/70 rounded-2xl p-3.5 hover:bg-cream-100/60 transition-all cursor-pointer flex flex-col justify-between"
                onClick={() => onNavigate("habits")}
              >
                <div>
                  <div className="flex items-center gap-1.5 text-ink-500 mb-1">
                    <Smile size={14} className="text-sage-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Habits</span>
                  </div>
                  <p className="font-display text-xl font-bold text-ink-800 leading-tight">
                    {habits.filter((h) => logs.some((l) => l.habit_id === h.id && l.log_date === today)).length}
                    <span className="text-xs font-normal text-ink-500"> / {habits.length}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {habits.slice(0, 3).map((h) => {
                    const done = logs.some((l) => l.habit_id === h.id && l.log_date === today);
                    return (
                      <span
                        key={h.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          done ? "bg-sage-600 text-white" : "bg-white text-ink-600 border border-cream-200"
                        }`}
                      >
                        {h.icon || "✓"}
                      </span>
                    );
                  })}
                  {habits.length === 0 && <span className="text-[11px] text-ink-400">None set</span>}
                </div>
              </section>
            )}
          </div>

          {/* Upcoming Reminders Card */}
          {modules.reminders !== false && (
            <section
              className="bg-cream-50/70 rounded-2xl p-3.5 hover:bg-cream-100/60 transition-all cursor-pointer"
              onClick={() => onNavigate("reminders")}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-ink-500">
                  <Bell size={14} className="text-sage-600" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Upcoming Reminders</span>
                </div>
                <span className="text-[11px] text-sage-700 font-medium">View all</span>
              </div>
              {reminders.length === 0 ? (
                <p className="text-xs text-ink-400 italic">No reminders due today.</p>
              ) : (
                <ul className="space-y-1">
                  {reminders.slice(0, 2).map((r) => (
                    <li key={r.id} className="text-xs text-ink-800 truncate flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-sage-500 shrink-0" />
                      <span className="truncate">{r.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Today's Meals Card */}
          {modules.meals !== false && (
            <section
              className="bg-cream-50/70 rounded-2xl p-3.5 hover:bg-cream-100/60 transition-all cursor-pointer"
              onClick={() => onNavigate("meals")}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-ink-500">
                  <UtensilsCrossed size={14} className="text-sage-600" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-700">Today's Meals</span>
                </div>
                <span className="text-[11px] text-sage-700 font-medium">Open planner</span>
              </div>

              {todayMeals.length === 0 ? (
                <p className="text-xs text-ink-400 italic py-0.5">
                  No meals planned for today. Tap to open planner.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {todayMeals.map((meal) => (
                    <div
                      key={meal.id}
                      className="p-2 rounded-xl bg-white border border-cream-200/80 shadow-2xs"
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider text-sage-700 block">
                        {meal.meal_type}
                      </span>
                      <p className="text-xs font-semibold text-ink-800 truncate mt-0.5">{meal.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Mood Check-in Card */}
          {modules.mood !== false && (
            <section
              className="bg-cream-50/70 rounded-2xl p-3.5 hover:bg-cream-100/60 transition-all cursor-pointer"
              onClick={() => onNavigate("mood")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500 block mb-0.5">
                    Mood
                  </span>
                  <p className="text-xs text-ink-700">
                    {todayMood ? (
                      <>
                        <span className="font-semibold text-ink-800">
                          {MOOD_LEVELS.find((l) => l.score === todayMood.score)?.label}
                        </span>{" "}
                        ({todayMood.score}/5)
                        {todayMood.note && <span className="text-ink-500"> &ldquo;{todayMood.note}&rdquo;</span>}
                      </>
                    ) : (
                      "Tap to log your mood"
                    )}
                  </p>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      className={`w-2.5 h-2.5 rounded-full ${
                        todayMood && s <= todayMood.score ? "bg-sage-500" : "bg-cream-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
