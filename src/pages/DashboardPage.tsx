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
  Plus,
  Check,
} from "lucide-react";
import {
  listDayPlanner,
  listReminders,
  listHabits,
  listHabitLogs,
  listMoods,
  listWater,
  listMeals,
  addMeal,
  updateMeal,
  onSyncStatus,
  toggleHabitLog,
  upsertWater,
  getProfile,
  checkBackendConnectivity,
} from "../lib/data";
import type { DayPlanTask, Habit, HabitLog, Mood, Reminder, WaterIntake, Profile, Meal } from "../lib/types";
import { useAuth } from "../lib/auth";
import { useEnabledModules } from "../components/nav";
import { Button, Input, Label, Modal } from "../components/ui";
import { formatDay, todayISO } from "../lib/utils";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
const MEAL_EMOJI: Record<string, string> = {
  Breakfast: "☕",
  Lunch: "🍛",
  Dinner: "🍲",
  Snack: "🍎",
};

export function DashboardPage({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { user } = useAuth();
  const [sync, setSync] = useState<{ pending: number }>({ pending: 0 });
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [tasks, setTasks] = useState<DayPlanTask[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
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
  const [mealModalOpen, setMealModalOpen] = useState(false);
  const [mealForm, setMealForm] = useState({
    meal_type: "Lunch",
    name: "",
    notes: "",
    cost: "",
  });
  const [mealSaving, setMealSaving] = useState(false);

  const today = todayISO();

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
      setReminders(allReminders.filter((x) => !x.done).slice(0, 5));
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

  const handleAddMeal = async () => {
    if (!mealForm.name.trim()) return;
    setMealSaving(true);
    try {
      await addMeal({
        meal_date: today,
        meal_type: mealForm.meal_type,
        name: mealForm.name.trim(),
        notes: mealForm.notes.trim(),
        cost: mealForm.cost ? Number(mealForm.cost) : 0,
      });
      setMealModalOpen(false);
      setMealForm({ meal_type: "Lunch", name: "", notes: "", cost: "" });
      await load(false);
    } finally {
      setMealSaving(false);
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
          {apiOnline === false && (
            <div
              className={`sm:col-span-2 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ${
                sync.pending > 0 ? "bg-honey-500/15 text-amber-700" : "bg-cream-100 text-ink-500"
              }`}
            >
              {sync.pending > 0 ? (
                <>
                  <RefreshCw size={15} /> Offline — {sync.pending} pending item
                  {sync.pending === 1 ? "" : "s"} will sync when internet returns
                </>
              ) : (
                <>
                  <CloudOff size={15} /> Offline — entries are saved on this phone and will sync automatically
                </>
              )}
            </div>
          )}

          {/* Today's Plan */}
          <section
            hidden={modules.dayplans === false}
            className="bg-white rounded-2xl border border-cream-200 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
            onClick={() => onNavigate("dayplans")}
          >
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

          {/* Upcoming Reminders */}
          <section
            hidden={modules.reminders === false}
            className="bg-white rounded-2xl border border-cream-200 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
            onClick={() => onNavigate("reminders")}
          >
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

          {/* Habits Today */}
          <section
            hidden={modules.habits === false}
            className="bg-white rounded-2xl border border-cream-200 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
            onClick={() => onNavigate("habits")}
          >
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

          {/* Water Tracker */}
          <section
            hidden={modules.water === false}
            className="bg-white rounded-2xl border border-cream-200 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
            onClick={() => onNavigate("water")}
          >
            <div className="flex items-center gap-2 text-ink-500 mb-3">
              <CupSoda size={16} />
              <h3 className="text-xs font-semibold uppercase tracking-widest">Water</h3>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-display text-3xl font-semibold text-ink-800">{glasses}</p>
              <p className="text-sm text-ink-500 flex-1">of {goal} glasses</p>
              <Button
                size="sm"
                disabled={waterSaving}
                onClick={(e) => {
                  e.stopPropagation();
                  void quickWater();
                }}
              >
                {waterSaving ? "Saving..." : "+1 glass"}
              </Button>
            </div>
            {waterError && <p className="mt-2 text-xs text-rose-soft-600" role="alert">{waterError}</p>}
          </section>

          {/* Today's Meals Card */}
          <section
            hidden={modules.meals === false}
            className="sm:col-span-2 bg-white rounded-2xl border border-cream-200 p-6 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3.5">
              <div
                className="flex items-center gap-2 text-ink-500 cursor-pointer"
                onClick={() => onNavigate("meals")}
              >
                <UtensilsCrossed size={16} className="text-sage-600" />
                <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-700">Today's Meals</h3>
                {todayMeals.length > 0 && (
                  <span className="text-[11px] font-medium text-sage-600 bg-sage-50 px-2 py-0.5 rounded-full border border-sage-200">
                    {todayMeals.filter(isMealEaten).length}/{todayMeals.length} eaten
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setMealForm({ meal_type: "Lunch", name: "", notes: "", cost: "" });
                  setMealModalOpen(true);
                }}
              >
                <Plus size={14} /> Add meal
              </Button>
            </div>

            {todayMeals.length === 0 ? (
              <div
                className="rounded-xl bg-cream-50/70 border border-cream-100 p-4 text-center cursor-pointer hover:bg-cream-100/60 transition-colors"
                onClick={() => onNavigate("meals")}
              >
                <p className="text-sm text-ink-600">No meals planned for today yet.</p>
                <p className="text-xs text-ink-500 mt-1">Tap "+ Add meal" above or open the Meal Planner.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {todayMeals.map((meal) => {
                  const eaten = isMealEaten(meal);
                  const emoji = MEAL_EMOJI[meal.meal_type] || "🍽️";
                  return (
                    <div
                      key={meal.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                        eaten
                          ? "bg-sage-50/60 border-sage-200 text-ink-600"
                          : "bg-cream-50/50 border-cream-200 text-ink-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg shrink-0">{emoji}</span>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold truncate ${eaten ? "line-through text-ink-500" : ""}`}>
                            {meal.name}
                          </p>
                          <p className="text-[11px] text-ink-500 truncate">
                            {meal.meal_type}
                            {meal.cost ? ` · KES ${meal.cost.toLocaleString()}` : ""}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void toggleMealEaten(meal)}
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all active:scale-95 shrink-0 ${
                          eaten
                            ? "bg-sage-600 text-white shadow-xs"
                            : "bg-white text-ink-700 border border-cream-200 hover:border-sage-300 hover:bg-sage-50"
                        }`}
                        title={eaten ? "Mark as not eaten" : "Log as eaten"}
                      >
                        <Check size={12} className={eaten ? "text-white" : "text-ink-400"} />
                        {eaten ? "Eaten" : "Log eaten"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Mood Check-in Card */}
      <section
            hidden={modules.mood === false}
        className="mt-3 bg-white rounded-2xl border border-cream-200 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
        onClick={() => onNavigate("mood")}
      >
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

      {/* Quick Add Meal Modal */}
      <Modal open={mealModalOpen} onClose={() => setMealModalOpen(false)} title="Add Today's Meal">
        <div className="space-y-4">
          <div>
            <Label>Meal Type</Label>
            <div className="grid grid-cols-4 gap-2">
              {MEAL_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMealForm((prev) => ({ ...prev, meal_type: t }))}
                  className={`py-2 px-1 rounded-xl text-xs font-medium border text-center transition-all ${
                    mealForm.meal_type === t
                      ? "bg-sage-600 text-white border-sage-600 shadow-xs"
                      : "bg-white text-ink-700 border-cream-200 hover:bg-cream-100"
                  }`}
                >
                  <span className="block text-sm mb-0.5">{MEAL_EMOJI[t]}</span>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Meal Name</Label>
            <Input
              placeholder="e.g. Avocado toast &amp; poached egg"
              value={mealForm.name}
              onChange={(e) => setMealForm((prev) => ({ ...prev, name: e.target.value }))}
              autoFocus
            />
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Input
              placeholder="e.g. homemade, salad on side"
              value={mealForm.notes}
              onChange={(e) => setMealForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div>
            <Label>Estimated Cost (optional)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={mealForm.cost}
              onChange={(e) => setMealForm((prev) => ({ ...prev, cost: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-cream-100">
            <Button variant="ghost" size="sm" onClick={() => setMealModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMeal} disabled={mealSaving || !mealForm.name.trim()}>
              {mealSaving ? "Saving..." : "Add to Today"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
