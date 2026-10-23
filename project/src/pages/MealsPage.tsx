import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Wallet, Salad, BookOpen, ShoppingCart, FlaskConical, Check } from "lucide-react";
import {
  listMeals,
  addMeal,
  deleteMeal,
  getWeeklyBudget,
  setWeeklyBudget,
  listMealLibrary,
  addMealLibraryItem,
  deleteMealLibraryItem,
  listRecipes,
  addRecipe,
  deleteRecipe,
  listPantry,
  addPantryItem,
  setPantryNeedToBuy,
  deletePantryItem,
  listShopping,
  addShoppingItem,
  setShoppingBought,
  deleteShoppingItem,
} from "../lib/data";
import type { Meal, MealLibraryItem, Recipe, PantryItem, ShoppingItem } from "../lib/types";
import { Button, Input, EmptyState, Label, Modal, Textarea } from "../components/ui";
import { cn, todayISO } from "../lib/utils";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
const MEAL_EMOJI: Record<string, string> = {
  Breakfast: "☕",
  Lunch: "🍛",
  Dinner: "🍲",
  Snack: "🍎",
};

type Tab = "week" | "library" | "recipes" | "pantry" | "shopping";

function startOfWeekMonday(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

function addDaysISO(base: string, offset: number): string {
  const d = new Date(base + "T12:00:00");
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MealsPage() {
  const [tab, setTab] = useState<Tab>("week");

  return (
    <div className="animate-fade-up pb-4">
      <div className="relative overflow-hidden rounded-2xl bg-sage-600 text-white px-5 py-6 mb-4">
        <div className="relative z-10 max-w-[75%]">
          <h1 className="font-display text-xl sm:text-2xl font-semibold leading-tight">Meal Planner</h1>
          <p className="text-white/85 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Plan your week on Sunday, pick from your meal library, and keep a pantry &amp; shopping list.
          </p>
        </div>
        <div className="absolute -right-3 -bottom-4 opacity-90">
          <Salad size={90} strokeWidth={1} className="text-sage-300" />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {([
          { id: "week", label: "This Week", icon: Salad },
          { id: "library", label: "Meal Library", icon: BookOpen },
          { id: "recipes", label: "Recipes", icon: FlaskConical },
          { id: "pantry", label: "Pantry", icon: Wallet },
          { id: "shopping", label: "Shopping", icon: ShoppingCart },
        ] as { id: Tab; label: string; icon: typeof Salad }[]).map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all",
                isActive ? "bg-sage-600 text-white shadow-sm" : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
              )}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "week" && <WeekPlan />}
      {tab === "library" && <MealLibrary />}
      {tab === "recipes" && <Recipes />}
      {tab === "pantry" && <Pantry />}
      {tab === "shopping" && <Shopping />}
    </div>
  );
}

// ---------- Week plan ----------

function WeekPlan() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [library, setLibrary] = useState<MealLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [budget, setBudget] = useState(0);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [weekStart, setWeekStart] = useState(startOfWeekMonday());
  const [picker, setPicker] = useState<{ date: string; mealType: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [mealsList, libraryList, budgetValue] = await Promise.all([listMeals(), listMealLibrary(), getWeeklyBudget()]);
      setMeals(mealsList);
      setLibrary(libraryList);
      setBudget(budgetValue);
      setError("");
    } catch {
      setError("Could not read meals from this device.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i)), [weekStart]);

  const weekMeals = meals.filter((m) => m.meal_date >= weekStart && m.meal_date <= addDaysISO(weekStart, 6));
  const totalCost = weekMeals.reduce((sum, meal) => sum + (meal.cost ?? 0), 0);
  const remaining = budget - totalCost;
  const usedPct = budget > 0 ? Math.min(100, Math.round((totalCost / budget) * 100)) : 0;

  const saveBudget = async () => {
    const value = Number(budgetDraft) || 0;
    try {
      await setWeeklyBudget(value);
      setBudget(value);
      setEditingBudget(false);
      setError("");
    } catch {
      setError("Could not save the budget.");
    }
  };

  const addFromLibrary = async (item: MealLibraryItem) => {
    if (!picker) return;
    try {
      await addMeal({
        meal_date: picker.date,
        meal_type: picker.mealType,
        name: item.name,
        notes: item.notes,
        cost: item.default_cost,
      });
      setError("");
    } catch {
      setError("Could not add the meal.");
    } finally {
      setPicker(null);
      load();
    }
  };

  const addCustom = async (date: string, mealType: string, name: string, cost: number) => {
    if (!name.trim()) return;
    try {
      await addMeal({ meal_date: date, meal_type: mealType, name: name.trim(), notes: "", cost });
      setError("");
    } catch {
      setError("Could not add the meal.");
    } finally {
      setPicker(null);
      load();
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteMeal(id);
      setError("");
    } catch {
      setError("Could not remove the meal.");
    }
    load();
  };

  const shiftWeek = (delta: number) => setWeekStart(addDaysISO(weekStart, delta * 7));

  return (
    <div className="space-y-4">
      {error && <div className="rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      <section className="bg-white rounded-2xl border border-cream-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-semibold text-ink-800 flex items-center gap-2">
            <Wallet size={16} className="text-sage-600" /> Weekly budget
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={() => shiftWeek(-1)} className="px-2 py-1 rounded-lg text-ink-500 hover:bg-cream-100 text-xs">‹</button>
            <span className="text-[11px] text-ink-600 font-medium">Week of {new Date(weekStart + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
            <button onClick={() => shiftWeek(1)} className="px-2 py-1 rounded-lg text-ink-500 hover:bg-cream-100 text-xs">›</button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">Planned cost</p>
            <p className="font-display text-sm font-semibold text-ink-800">KES {totalCost.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">Your budget</p>
            {editingBudget ? (
              <div className="flex items-center gap-1 justify-center">
                <input
                  type="number"
                  min={0}
                  autoFocus
                  value={budgetDraft}
                  onChange={(e) => setBudgetDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveBudget()}
                  className="w-20 rounded-lg border border-cream-200 px-2 py-0.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
                />
                <Button variant="ghost" size="sm" onClick={saveBudget}>Save</Button>
              </div>
            ) : (
              <p className="font-display text-sm font-semibold text-ink-800 flex items-center gap-1 justify-center">
                KES {budget.toLocaleString()}
                <button onClick={() => { setBudgetDraft(String(budget)); setEditingBudget(true); }} aria-label="Edit budget" className="text-ink-500/60 hover:text-sage-600">
                  <Pencil size={12} />
                </button>
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">Remaining</p>
            <p className={cn("font-display text-sm font-semibold", remaining >= 0 ? "text-sage-600" : "text-rose-soft-600")}>
              KES {remaining.toLocaleString()}
            </p>
          </div>
        </div>
        {budget > 0 && (
          <div className="mt-3 h-2 rounded-full bg-cream-100 overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", remaining >= 0 ? "bg-sage-500" : "bg-rose-soft-500")} style={{ width: `${usedPct}%` }} />
          </div>
        )}
      </section>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-cream-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {days.map((date, idx) => {
            const dayMeals = meals.filter((m) => m.meal_date === date);
            const isToday = date === todayISO();
            return (
              <div key={date} className={cn("bg-white rounded-2xl border p-4", isToday ? "border-sage-300 shadow-sm" : "border-cream-200")}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-ink-500">{WEEKDAY_LABELS[idx]}</p>
                    <p className="font-display text-sm font-semibold text-ink-800">
                      {new Date(date + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      {isToday && <span className="ml-2 text-[10px] text-sage-600 font-medium">Today</span>}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {MEAL_TYPES.map((mealType) => {
                    const slots = dayMeals.filter((m) => m.meal_type === mealType);
                    return (
                      <div key={mealType} className="flex items-start gap-2">
                        <span className="text-[11px] font-medium text-ink-500 w-16 shrink-0 pt-1.5">{MEAL_EMOJI[mealType]} {mealType}</span>
                        <div className="flex-1 min-w-0 space-y-1">
                          {slots.map((meal) => (
                            <div key={meal.id} className="group flex items-center gap-2 bg-cream-50 rounded-lg px-2.5 py-1.5">
                              <span className="text-xs text-ink-800 flex-1 truncate">{meal.name}</span>
                              {meal.cost != null && meal.cost > 0 && <span className="text-[11px] text-sage-600 font-medium">KES {meal.cost.toLocaleString()}</span>}
                              <button onClick={() => remove(meal.id)} className="text-ink-400 hover:text-rose-soft-600" aria-label="Remove meal">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => setPicker({ date, mealType })}
                            className="text-[11px] text-sage-600 hover:text-sage-700 font-medium"
                          >
                            + Add {mealType.toLowerCase()}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {picker && (
        <MealPicker
          date={picker.date}
          mealType={picker.mealType}
          library={library}
          onClose={() => setPicker(null)}
          onPick={addFromLibrary}
          onCustom={addCustom}
        />
      )}
    </div>
  );
}

function MealPicker({
  date,
  mealType,
  library,
  onClose,
  onPick,
  onCustom,
}: {
  date: string;
  mealType: string;
  library: MealLibraryItem[];
  onClose: () => void;
  onPick: (item: MealLibraryItem) => void;
  onCustom: (date: string, mealType: string, name: string, cost: number) => void;
}) {
  const [customName, setCustomName] = useState("");
  const [customCost, setCustomCost] = useState("");
  const matches = library.filter((l) => l.meal_type === mealType);
  return (
    <Modal open onClose={onClose} title={`Add ${mealType} · ${new Date(date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`}>
      <div className="space-y-4">
        <div>
          <Label>Pick from your meal library</Label>
          {matches.length === 0 ? (
            <p className="text-xs text-ink-500">No saved {mealType.toLowerCase()} meals yet. Add one in the Meal Library tab.</p>
          ) : (
            <ul className="space-y-1.5 max-h-56 overflow-y-auto">
              {matches.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onPick(item)}
                    className="w-full flex items-center gap-2 bg-cream-50 hover:bg-cream-100 rounded-lg px-3 py-2 text-left transition-colors"
                  >
                    <span className="text-base">{item.emoji}</span>
                    <span className="text-sm text-ink-800 flex-1 truncate">{item.name}</span>
                    {item.default_cost > 0 && <span className="text-[11px] text-sage-600 font-medium">KES {item.default_cost.toLocaleString()}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <Label>Or add a one-off meal</Label>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Meal name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customName.trim()) {
                  onCustom(date, mealType, customName, Number(customCost) || 0);
                }
              }}
              className="flex-1"
            />
            <Input
              type="number"
              min={0}
              placeholder="KES"
              value={customCost}
              onChange={(e) => setCustomCost(e.target.value)}
              className="w-24 shrink-0"
            />
          </div>
          <Button
            onClick={() => { if (customName.trim()) onCustom(date, mealType, customName, Number(customCost) || 0); }}
            disabled={!customName.trim()}
            className="w-full"
          >
            Add meal
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Meal library ----------

function MealLibrary() {
  const [items, setItems] = useState<MealLibraryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", meal_type: "Dinner", default_cost: "", emoji: "🍽️", notes: "", recipe_id: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [libraryList, recipeList] = await Promise.all([listMealLibrary(), listRecipes()]);
      setItems(libraryList);
      setRecipes(recipeList);
      setError("");
    } catch {
      setError("Could not read your meal library.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      await addMealLibraryItem({
        name: form.name.trim(),
        meal_type: form.meal_type,
        default_cost: Number(form.default_cost) || 0,
        emoji: form.emoji || "🍽️",
        notes: form.notes.trim(),
        recipe_id: form.recipe_id || null,
      });
      setError("");
    } catch {
      setError("Could not save the meal.");
    } finally {
      setOpen(false);
      setForm({ name: "", meal_type: "Dinner", default_cost: "", emoji: "🍽️", notes: "", recipe_id: "" });
      load();
    }
  };

  const remove = async (id: string) => {
    try { await deleteMealLibraryItem(id); } catch { setError("Could not remove."); }
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-ink-800">Meal Library</h2>
        <Button size="sm" onClick={() => setOpen(true)}><Plus size={14} /> New meal</Button>
      </div>
      <p className="text-xs text-ink-500 -mt-1">Save meals you cook often, then pick them when planning your week.</p>
      {error && <div className="rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-cream-100 animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={<BookOpen size={22} />} title="No saved meals yet" hint="Add meals you cook often so you can plan weeks in seconds." />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const recipe = recipes.find((r) => r.id === item.recipe_id);
            return (
              <li key={item.id} className="group flex items-center gap-3 bg-white rounded-xl border border-cream-200 px-4 py-3">
                <span className="text-xl">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-800 truncate">{item.name}</p>
                  <p className="text-xs text-ink-500">
                    {item.meal_type}{item.default_cost > 0 && ` · KES ${item.default_cost.toLocaleString()}`}
                    {recipe && ` · 📖 ${recipe.title}`}
                  </p>
                </div>
                <button onClick={() => remove(item.id)} className="text-ink-400 hover:text-rose-soft-600" aria-label="Delete">
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New meal">
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ugali &amp; Sukuma" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Meal type</Label>
              <select
                value={form.meal_type}
                onChange={(e) => setForm({ ...form, meal_type: e.target.value })}
                className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
              >
                {MEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label>Default cost (KES)</Label>
              <Input type="number" min={0} value={form.default_cost} onChange={(e) => setForm({ ...form, default_cost: e.target.value })} placeholder="0" />
            </div>
          </div>
          <div>
            <Label>Emoji</Label>
            <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="🍽️" maxLength={4} />
          </div>
          <div>
            <Label>Attach a recipe (optional)</Label>
            <select
              value={form.recipe_id}
              onChange={(e) => setForm({ ...form, recipe_id: e.target.value })}
              className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
            >
              <option value="">No recipe</option>
              {recipes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Side dishes, substitutions..." />
          </div>
          <Button onClick={save} disabled={!form.name.trim()} className="w-full">Save meal</Button>
        </div>
      </Modal>
    </div>
  );
}

// ---------- Recipes ----------

function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Recipe | null>(null);
  const [form, setForm] = useState({ title: "", ingredients: "", instructions: "", servings: "2" });

  const load = async () => {
    setLoading(true);
    try {
      setRecipes(await listRecipes());
      setError("");
    } catch {
      setError("Could not read recipes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim()) return;
    try {
      await addRecipe({
        title: form.title.trim(),
        ingredients: form.ingredients.trim(),
        instructions: form.instructions.trim(),
        servings: Number(form.servings) || 1,
      });
      setError("");
    } catch {
      setError("Could not save the recipe.");
    } finally {
      setOpen(false);
      setForm({ title: "", ingredients: "", instructions: "", servings: "2" });
      load();
    }
  };

  const remove = async (id: string) => {
    try { await deleteRecipe(id); } catch { setError("Could not remove."); }
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-ink-800">Recipes</h2>
        <Button size="sm" onClick={() => setOpen(true)}><Plus size={14} /> New recipe</Button>
      </div>
      <p className="text-xs text-ink-500 -mt-1">Write down how to cook a meal so it's ready next time.</p>
      {error && <div className="rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-cream-100 animate-pulse" />)}</div>
      ) : recipes.length === 0 ? (
        <EmptyState icon={<FlaskConical size={22} />} title="No recipes saved" hint="Add ingredients and steps for any meal you cook." />
      ) : (
        <ul className="space-y-2">
          {recipes.map((r) => (
            <li key={r.id} className="group bg-white rounded-xl border border-cream-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => setView(r)} className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-800 truncate">{r.title}</p>
                  <p className="text-xs text-ink-500 mt-0.5">Serves {r.servings} · {r.ingredients ? "has ingredients" : "no ingredients yet"}</p>
                </button>
                <button onClick={() => remove(r.id)} className="text-ink-400 hover:text-rose-soft-600" aria-label="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New recipe">
        <div className="space-y-4">
          <div>
            <Label>Meal name</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sukuma Wiki" />
          </div>
          <div>
            <Label>Ingredients</Label>
            <Textarea rows={4} value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} placeholder="One per line: 1 bunch sukuma, 1 onion, 2 tomatoes..." />
          </div>
          <div>
            <Label>How to cook</Label>
            <Textarea rows={5} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Step by step instructions..." />
          </div>
          <div>
            <Label>Serves</Label>
            <Input type="number" min={1} value={form.servings} onChange={(e) => setForm({ ...form, servings: e.target.value })} />
          </div>
          <Button onClick={save} disabled={!form.title.trim()} className="w-full">Save recipe</Button>
        </div>
      </Modal>

      {view && (
        <Modal open onClose={() => setView(null)} title={view.title}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-sage-600 mb-1.5">Ingredients</p>
              {view.ingredients ? (
                <p className="text-sm text-ink-700 whitespace-pre-wrap leading-relaxed">{view.ingredients}</p>
              ) : (
                <p className="text-sm text-ink-500">No ingredients listed.</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-sage-600 mb-1.5">Instructions</p>
              {view.instructions ? (
                <p className="text-sm text-ink-700 whitespace-pre-wrap leading-relaxed">{view.instructions}</p>
              ) : (
                <p className="text-sm text-ink-500">No instructions yet.</p>
              )}
            </div>
            <p className="text-xs text-ink-500">Serves {view.servings}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------- Pantry ----------

function Pantry() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listPantry());
      setError("");
    } catch {
      setError("Could not read pantry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    try {
      await addPantryItem({ name: name.trim(), quantity: quantity.trim(), unit: unit.trim() });
      setName(""); setQuantity(""); setUnit("");
      setError("");
    } catch {
      setError("Could not add item.");
    }
    load();
  };

  const toggleNeed = async (item: PantryItem) => {
    try { await setPantryNeedToBuy(item.id, !item.need_to_buy); } catch { setError("Could not update."); }
    load();
  };

  const remove = async (id: string) => {
    try { await deletePantryItem(id); } catch { setError("Could not remove."); }
    load();
  };

  const needToBuy = items.filter((i) => i.need_to_buy);
  const haveOnHand = items.filter((i) => !i.need_to_buy);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-base font-semibold text-ink-800">Pantry</h2>
      {error && <div className="rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      <div className="bg-white rounded-2xl border border-cream-200 p-4">
        <div className="grid grid-cols-[1fr_60px_60px_auto] gap-2 mb-2">
          <Input placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <Input placeholder="Qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <Input placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <Button onClick={add} disabled={!name.trim()} className="shrink-0"><Plus size={16} /></Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-cream-100 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-2">In the house ({haveOnHand.length})</p>
            {haveOnHand.length === 0 ? (
              <p className="text-sm text-ink-500">Nothing listed yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {haveOnHand.map((item) => (
                  <li key={item.id} className="group flex items-center gap-2 bg-white rounded-lg border border-cream-200 px-3 py-2">
                    <span className="text-sm text-ink-800 flex-1">{item.name}</span>
                    {item.quantity && <span className="text-xs text-ink-500">{item.quantity} {item.unit}</span>}
                    <button onClick={() => toggleNeed(item)} className="text-[11px] text-ink-500 hover:text-honey-600 font-medium">Need to buy</button>
                    <button onClick={() => remove(item.id)} className="text-ink-400 hover:text-rose-soft-600" aria-label="Delete"><Trash2 size={13} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-honey-600 mb-2">Need to buy ({needToBuy.length})</p>
            {needToBuy.length === 0 ? (
              <p className="text-sm text-ink-500">All stocked up.</p>
            ) : (
              <ul className="space-y-1.5">
                {needToBuy.map((item) => (
                  <li key={item.id} className="group flex items-center gap-2 bg-honey-500/10 rounded-lg border border-honey-500/30 px-3 py-2">
                    <span className="text-sm text-ink-800 flex-1">{item.name}</span>
                    {item.quantity && <span className="text-xs text-ink-500">{item.quantity} {item.unit}</span>}
                    <button onClick={() => toggleNeed(item)} className="text-[11px] text-sage-600 hover:text-sage-700 font-medium">Got it</button>
                    <button onClick={() => remove(item.id)} className="text-ink-400 hover:text-rose-soft-600" aria-label="Delete"><Trash2 size={13} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Shopping ----------

function Shopping() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [cost, setCost] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [shopList, pantryList] = await Promise.all([listShopping(), listPantry()]);
      setItems(shopList);
      setPantry(pantryList);
      setError("");
    } catch {
      setError("Could not read shopping list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    try {
      await addShoppingItem({ name: name.trim(), quantity: quantity.trim(), est_cost: Number(cost) || 0 });
      setName(""); setQuantity(""); setCost("");
      setError("");
    } catch {
      setError("Could not add item.");
    }
    load();
  };

  const importFromPantry = async () => {
    const needToBuy = pantry.filter((p) => p.need_to_buy);
    if (needToBuy.length === 0) return;
    try {
      for (const p of needToBuy) {
        await addShoppingItem({ name: p.name, quantity: p.quantity, est_cost: 0 });
        await setPantryNeedToBuy(p.id, false);
      }
      setError("");
    } catch {
      setError("Could not import pantry items.");
    }
    load();
  };

  const toggleBought = async (item: ShoppingItem) => {
    try { await setShoppingBought(item.id, !item.bought); } catch { setError("Could not update."); }
    load();
  };

  const remove = async (id: string) => {
    try { await deleteShoppingItem(id); } catch { setError("Could not remove."); }
    load();
  };

  const totalEstimated = items.filter((i) => !i.bought).reduce((s, i) => s + i.est_cost, 0);
  const pantryNeedCount = pantry.filter((p) => p.need_to_buy).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-ink-800">Shopping List</h2>
        {pantryNeedCount > 0 && (
          <Button size="sm" variant="secondary" onClick={() => void importFromPantry()}>
            <Plus size={13} /> Import {pantryNeedCount} from pantry
          </Button>
        )}
      </div>
      {error && <div className="rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      <div className="bg-white rounded-2xl border border-cream-200 p-4">
        <div className="grid grid-cols-[1fr_60px_80px_auto] gap-2 mb-1">
          <Input placeholder="Item to buy" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <Input placeholder="Qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <Input type="number" min={0} placeholder="KES" value={cost} onChange={(e) => setCost(e.target.value)} />
          <Button onClick={add} disabled={!name.trim()} className="shrink-0"><Plus size={16} /></Button>
        </div>
        <p className="text-xs text-ink-500">Estimated total for pending items: KES {totalEstimated.toLocaleString()}</p>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-cream-100 animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={<ShoppingCart size={22} />} title="Your list is empty" hint="Add items you need to pick up on your next shop." />
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", item.bought ? "bg-cream-50 border-cream-200 opacity-60" : "bg-white border-cream-200")}>
              <button onClick={() => toggleBought(item)} className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", item.bought ? "bg-sage-500 border-sage-500 text-white" : "border-cream-300 hover:border-sage-400")}>
                {item.bought && <Check size={12} />}
              </button>
              <span className={cn("text-sm flex-1", item.bought ? "text-ink-500 line-through" : "text-ink-800")}>{item.name}</span>
              {item.quantity && <span className="text-xs text-ink-500">{item.quantity}</span>}
              {item.est_cost > 0 && <span className="text-xs text-sage-600 font-medium">KES {item.est_cost.toLocaleString()}</span>}
              <button onClick={() => remove(item.id)} className="text-ink-400 hover:text-rose-soft-600" aria-label="Delete"><Trash2 size={13} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
