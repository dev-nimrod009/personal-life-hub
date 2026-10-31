import { useEffect, useMemo, useState } from "react";
import {
  Utensils,
  Plus,
  Trash2,
  BookOpen,
  ShoppingBag,
  Package,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Wallet,
  Pencil,
} from "lucide-react";
import {
  listMeals,
  addMeal,
  deleteMeal,
  listRecipes,
  addRecipe,
  deleteRecipe,
  listMealLibrary,
  addMealLibraryItem,
  deleteMealLibraryItem,
  listPantry,
  addPantryItem,
  deletePantryItem,
  listShopping,
  addShoppingItem,
  deleteShoppingItem,
  getMealBudget,
  setMealBudget,
} from "../lib/data";
import type { Meal, Recipe, MealLibraryItem, PantryItem, ShoppingItem } from "../lib/types";
import { Button, EmptyState, Input, Label, Modal, SectionHeader, Textarea } from "../components/ui";
import { todayISO, formatDay, cn } from "../lib/utils";

export type MealTab = "week" | "library" | "recipes" | "pantry" | "shopping";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

function getMondayOfDate(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.getFullYear(), date.getMonth(), diff);
}

function getWeekDays(monday: Date): { dateStr: string; dayName: string; formatted: string }[] {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    const dayName = cur.toLocaleDateString(undefined, { weekday: "long" });
    const formatted = cur.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    days.push({ dateStr, dayName, formatted });
  }
  return days;
}

export function MealsPage({
  activeTab = "week",
  onTabChange,
}: {
  activeTab: MealTab;
  onTabChange: (tab: MealTab) => void;
}) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [library, setLibrary] = useState<MealLibraryItem[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Week navigation state
  const [currentMonday, setCurrentMonday] = useState(() => getMondayOfDate(new Date()));
  const [weeklyBudget, setWeeklyBudgetState] = useState(() => getMealBudget());
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(getMealBudget()));

  // Modals state
  const [mealModal, setMealModal] = useState(false);
  const [newMeal, setNewMeal] = useState({
    meal_date: todayISO(),
    meal_type: "Lunch" as (typeof MEAL_TYPES)[number],
    name: "",
    notes: "",
    cost: "",
  });

  const [recipeModal, setRecipeModal] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    title: "",
    ingredients: "",
    instructions: "",
    servings: 2,
  });

  const [libraryModal, setLibraryModal] = useState(false);
  const [newLibItem, setNewLibItem] = useState({
    name: "",
    meal_type: "Dinner",
    notes: "",
    default_cost: "",
  });

  const [pantryModal, setPantryModal] = useState(false);
  const [newPantry, setNewPantry] = useState({
    name: "",
    quantity: "1",
    unit: "item",
    need_to_buy: false,
  });

  const [shoppingModal, setShoppingModal] = useState(false);
  const [newShopping, setNewShopping] = useState({
    name: "",
    quantity: "1",
    est_cost: "",
  });

  const loadAll = async () => {
    try {
      const [m, r, lib, p, s] = await Promise.all([
        listMeals(),
        listRecipes(),
        listMealLibrary(),
        listPantry(),
        listShopping(),
      ]);
      setMeals(m);
      setRecipes(r);
      setLibrary(lib);
      setPantry(p);
      setShopping(s);
      setWeeklyBudgetState(getMealBudget());
      setError("");
    } catch {
      setError("Could not load meal data from device.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const weekDays = useMemo(() => getWeekDays(currentMonday), [currentMonday]);
  const weekStartStr = weekDays[0].dateStr;
  const weekEndStr = weekDays[6].dateStr;

  const currentWeekMeals = useMemo(() => {
    return meals.filter((m) => m.meal_date >= weekStartStr && m.meal_date <= weekEndStr);
  }, [meals, weekStartStr, weekEndStr]);

  const totalWeekSpent = useMemo(() => {
    return currentWeekMeals.reduce((acc, m) => acc + (Number(m.cost) || 0), 0);
  }, [currentWeekMeals]);

  const budgetDifference = weeklyBudget - totalWeekSpent;
  const isOverBudget = totalWeekSpent > weeklyBudget;

  const shiftWeek = (delta: number) => {
    const next = new Date(currentMonday);
    next.setDate(next.getDate() + delta * 7);
    setCurrentMonday(next);
  };

  const jumpToCurrentWeek = () => {
    setCurrentMonday(getMondayOfDate(new Date()));
  };

  const handleSaveBudget = () => {
    const val = Number(budgetInput);
    if (Number.isFinite(val) && val >= 0) {
      setMealBudget(val);
      setWeeklyBudgetState(val);
      setBudgetModalOpen(false);
    }
  };

  const handleAddMeal = async () => {
    if (!newMeal.name.trim()) return;
    try {
      await addMeal({
        meal_date: newMeal.meal_date,
        meal_type: newMeal.meal_type,
        name: newMeal.name.trim(),
        notes: newMeal.notes.trim(),
        cost: newMeal.cost ? parseFloat(newMeal.cost) : 0,
      });
      setMealModal(false);
      setNewMeal({ meal_date: todayISO(), meal_type: "Lunch", name: "", notes: "", cost: "" });
      await loadAll();
    } catch {
      setError("Failed to add meal plan.");
    }
  };

  const handleAddRecipe = async () => {
    if (!newRecipe.title.trim()) return;
    try {
      await addRecipe({
        title: newRecipe.title.trim(),
        ingredients: newRecipe.ingredients.trim(),
        instructions: newRecipe.instructions.trim(),
        servings: Number(newRecipe.servings) || 2,
      });
      setRecipeModal(false);
      setNewRecipe({ title: "", ingredients: "", instructions: "", servings: 2 });
      await loadAll();
    } catch {
      setError("Failed to add recipe.");
    }
  };

  const handleAddLib = async () => {
    if (!newLibItem.name.trim()) return;
    try {
      await addMealLibraryItem({
        name: newLibItem.name.trim(),
        meal_type: newLibItem.meal_type,
        emoji: "🍽️",
        notes: newLibItem.notes.trim(),
        default_cost: Number(newLibItem.default_cost) || 0,
      });
      setLibraryModal(false);
      setNewLibItem({ name: "", meal_type: "Dinner", notes: "", default_cost: "" });
      await loadAll();
    } catch {
      setError("Failed to add library item.");
    }
  };

  const handleAddPantry = async () => {
    if (!newPantry.name.trim()) return;
    try {
      await addPantryItem({
        name: newPantry.name.trim(),
        quantity: newPantry.quantity.trim() || "1",
        unit: newPantry.unit.trim() || "item",
        need_to_buy: newPantry.need_to_buy,
      });
      setPantryModal(false);
      setNewPantry({ name: "", quantity: "1", unit: "item", need_to_buy: false });
      await loadAll();
    } catch {
      setError("Failed to add pantry item.");
    }
  };

  const handleAddShopping = async () => {
    if (!newShopping.name.trim()) return;
    try {
      await addShoppingItem({
        name: newShopping.name.trim(),
        quantity: newShopping.quantity.trim() || "1",
        est_cost: Number(newShopping.est_cost) || 0,
      });
      setShoppingModal(false);
      setNewShopping({ name: "", quantity: "1", est_cost: "" });
      await loadAll();
    } catch {
      setError("Failed to add shopping item.");
    }
  };

  const tabs: { id: MealTab; label: string; icon: typeof Calendar }[] = [
    { id: "week", label: "Weekly Planner", icon: Calendar },
    { id: "library", label: "Meal Library", icon: Utensils },
    { id: "recipes", label: "Recipes", icon: BookOpen },
    { id: "pantry", label: "Pantry", icon: Package },
    { id: "shopping", label: "Shopping", icon: ShoppingBag },
  ];

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Meal Planner"
        subtitle="Plan your weekly meals, estimate food costs in KES, and stay within your target budget."
        action={
          activeTab === "week" ? (
            <Button
              onClick={() => {
                setNewMeal({ meal_date: todayISO(), meal_type: "Lunch", name: "", notes: "", cost: "" });
                setMealModal(true);
              }}
            >
              <Plus size={16} /> Plan Meal
            </Button>
          ) : activeTab === "library" ? (
            <Button onClick={() => setLibraryModal(true)}>
              <Plus size={16} /> Add to Library
            </Button>
          ) : activeTab === "recipes" ? (
            <Button onClick={() => setRecipeModal(true)}>
              <Plus size={16} /> New Recipe
            </Button>
          ) : activeTab === "pantry" ? (
            <Button onClick={() => setPantryModal(true)}>
              <Plus size={16} /> Add Item
            </Button>
          ) : (
            <Button onClick={() => setShoppingModal(true)}>
              <Plus size={16} /> Add Grocery Item
            </Button>
          )
        }
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-6 scrollbar-hide border-b border-cream-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-sage-600 text-white shadow-xs"
                  : "bg-white text-ink-600 hover:bg-cream-100 border border-cream-200"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : activeTab === "week" ? (
        /* Weekly Planner View */
        <div className="space-y-6">
          {/* Week Budget & Spending Overview Card */}
          <section className="bg-white rounded-2xl border border-cream-200 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cream-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sage-100 text-sage-600 flex items-center justify-center shrink-0">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-ink-800">Weekly Food Budget</h3>
                  <p className="text-xs text-ink-500">Compare planned weekly meals against your budget</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setBudgetInput(String(weeklyBudget));
                    setBudgetModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Pencil size={13} /> Set Budget
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="rounded-xl bg-cream-50/70 p-3.5 border border-cream-100">
                <p className="text-xs text-ink-500 font-medium">Weekly Target Budget</p>
                <p className="font-display text-xl font-bold text-ink-800 mt-0.5">
                  KES {weeklyBudget.toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl bg-cream-50/70 p-3.5 border border-cream-100">
                <p className="text-xs text-ink-500 font-medium">Total Planned Food Spent</p>
                <p className={cn("font-display text-xl font-bold mt-0.5", isOverBudget ? "text-rose-soft-600" : "text-sage-700")}>
                  KES {totalWeekSpent.toLocaleString()}
                </p>
              </div>

              <div
                className={cn(
                  "rounded-xl p-3.5 border flex items-center gap-3",
                  isOverBudget
                    ? "bg-rose-soft-100/50 border-rose-soft-200 text-rose-soft-700"
                    : "bg-sage-50 border-sage-200 text-sage-700"
                )}
              >
                {isOverBudget ? (
                  <AlertCircle size={24} className="text-rose-soft-600 shrink-0" />
                ) : (
                  <CheckCircle size={24} className="text-sage-600 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider">
                    {isOverBudget ? "Over Budget" : "Within Budget"}
                  </p>
                  <p className="text-xs mt-0.5 font-medium">
                    {isOverBudget
                      ? `Exceeded by KES ${Math.abs(budgetDifference).toLocaleString()}`
                      : `KES ${budgetDifference.toLocaleString()} remaining`}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Week Selector Bar */}
          <div className="flex items-center justify-between bg-white border border-cream-200 rounded-2xl px-4 py-3 shadow-xs">
            <button
              onClick={() => shiftWeek(-1)}
              className="p-2 rounded-xl text-ink-600 hover:bg-cream-100 transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="text-center">
              <p className="font-display text-base sm:text-lg font-semibold text-ink-800">
                {weekDays[0].formatted} – {weekDays[6].formatted}
              </p>
              <button
                onClick={jumpToCurrentWeek}
                className="text-[11px] text-sage-600 hover:underline font-medium mt-0.5"
              >
                Jump to Current Week
              </button>
            </div>

            <button
              onClick={() => shiftWeek(1)}
              className="p-2 rounded-xl text-ink-600 hover:bg-cream-100 transition-colors"
              aria-label="Next week"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* 7-Day Planner Grid */}
          <div className="space-y-4">
            {weekDays.map(({ dateStr, dayName, formatted }) => {
              const dayMeals = currentWeekMeals.filter((m) => m.meal_date === dateStr);
              const dayTotal = dayMeals.reduce((acc, m) => acc + (Number(m.cost) || 0), 0);
              const isToday = dateStr === todayISO();

              return (
                <div
                  key={dateStr}
                  className={cn(
                    "bg-white rounded-2xl border p-4 sm:p-5 transition-all",
                    isToday ? "border-sage-300 ring-1 ring-sage-200" : "border-cream-200"
                  )}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-cream-100 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-ink-800 text-base">
                        {dayName}
                      </span>
                      <span className="text-xs text-ink-400">· {formatted}</span>
                      {isToday && (
                        <span className="text-[11px] font-medium text-sage-700 bg-sage-50 px-2 py-0.5 rounded-full border border-sage-200">
                          Today
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-ink-600">
                        Day Total: KES {dayTotal.toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setNewMeal({ meal_date: dateStr, meal_type: "Lunch", name: "", notes: "", cost: "" });
                          setMealModal(true);
                        }}
                        className="text-xs px-2.5 py-1 h-auto"
                      >
                        <Plus size={12} /> Add
                      </Button>
                    </div>
                  </div>

                  {dayMeals.length === 0 ? (
                    <p className="text-xs text-ink-400 py-1 italic">No meals scheduled for this day.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {dayMeals.map((meal) => (
                        <div
                          key={meal.id}
                          className="p-3 rounded-xl border border-cream-200 bg-cream-50/40 flex items-start justify-between gap-2 group"
                        >
                          <div className="min-w-0">
                            <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sage-100 text-sage-700 mb-1">
                              {meal.meal_type}
                            </span>
                            <p className="text-sm font-semibold text-ink-800 truncate">{meal.name}</p>
                            {meal.notes && (
                              <p className="text-xs text-ink-500 truncate mt-0.5">{meal.notes}</p>
                            )}
                            <p className="text-xs font-bold text-ink-700 mt-1">
                              KES {(Number(meal.cost) || 0).toLocaleString()}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await deleteMeal(meal.id);
                                await loadAll();
                              } catch {
                                setError("Could not delete meal.");
                              }
                            }}
                            className="p-1 text-ink-400 hover:text-rose-soft-600 opacity-60 hover:opacity-100 transition-opacity"
                            title="Delete meal"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : activeTab === "library" ? (
        /* Library Tab */
        <div className="space-y-4">
          {library.length === 0 ? (
            <EmptyState
              icon={<Utensils size={26} className="text-sage-600" />}
              title="No library items"
              hint="Save your favorite go-to meals here to quickly schedule them into your week."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {library.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-cream-200 p-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-cream-100 text-ink-600">
                      {item.meal_type}
                    </span>
                    <p className="text-sm font-semibold text-ink-800 mt-1">{item.name}</p>
                    {item.notes && <p className="text-xs text-ink-500 mt-0.5">{item.notes}</p>}
                    {item.default_cost > 0 && (
                      <p className="text-xs font-medium text-sage-700 mt-1">
                        Est. KES {item.default_cost.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await deleteMealLibraryItem(item.id);
                        await loadAll();
                      } catch {
                        setError("Could not delete item.");
                      }
                    }}
                    className="text-ink-400 hover:text-rose-soft-600 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "recipes" ? (
        /* Recipes Tab */
        <div className="space-y-4">
          {recipes.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={26} className="text-sage-600" />}
              title="No saved recipes"
              hint="Write down ingredients and cooking directions for your favorite dishes."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recipes.map((recipe) => (
                <div key={recipe.id} className="bg-white rounded-2xl border border-cream-200 p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-display font-semibold text-base text-ink-800">{recipe.title}</h3>
                    <button
                      onClick={async () => {
                        try {
                          await deleteRecipe(recipe.id);
                          await loadAll();
                        } catch {
                          setError("Could not delete recipe.");
                        }
                      }}
                      className="text-ink-400 hover:text-rose-soft-600 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-ink-500 mb-3">Servings: {recipe.servings}</p>
                  {recipe.ingredients && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">Ingredients</p>
                      <p className="text-xs text-ink-600 whitespace-pre-line leading-relaxed">{recipe.ingredients}</p>
                    </div>
                  )}
                  {recipe.instructions && (
                    <div>
                      <p className="text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">Instructions</p>
                      <p className="text-xs text-ink-600 whitespace-pre-line leading-relaxed">{recipe.instructions}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "pantry" ? (
        /* Pantry Tab */
        <div className="space-y-4">
          {pantry.length === 0 ? (
            <EmptyState
              icon={<Package size={26} className="text-sage-600" />}
              title="Pantry is empty"
              hint="Track ingredients you have at home to avoid buying duplicates."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {pantry.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-cream-200 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink-800">{item.name}</p>
                    <p className="text-xs text-ink-500 mt-0.5">
                      {item.quantity} {item.unit}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await deletePantryItem(item.id);
                        await loadAll();
                      } catch {
                        setError("Could not delete pantry item.");
                      }
                    }}
                    className="text-ink-400 hover:text-rose-soft-600 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Shopping Tab */
        <div className="space-y-4">
          {shopping.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag size={26} className="text-sage-600" />}
              title="No shopping items"
              hint="Add groceries you need to purchase this week."
            />
          ) : (
            <div className="space-y-2">
              {shopping.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-cream-200 px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-800">{item.name}</p>
                    {item.quantity && <p className="text-xs text-ink-500">Qty: {item.quantity}</p>}
                  </div>
                  <span className="text-sm font-bold text-ink-700">
                    KES {(Number(item.est_cost) || 0).toLocaleString()}
                  </span>
                  <button
                    onClick={async () => {
                      try {
                        await deleteShoppingItem(item.id);
                        await loadAll();
                      } catch {
                        setError("Could not delete item.");
                      }
                    }}
                    className="text-ink-400 hover:text-rose-soft-600 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Plan Meal Modal */}
      <Modal open={mealModal} onClose={() => setMealModal(false)} title="Plan a Meal">
        <div className="space-y-4">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={newMeal.meal_date}
              onChange={(e) => setNewMeal({ ...newMeal, meal_date: e.target.value })}
            />
          </div>

          <div>
            <Label>Meal Type</Label>
            <div className="grid grid-cols-4 gap-2">
              {MEAL_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setNewMeal({ ...newMeal, meal_type: type })}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    newMeal.meal_type === type
                      ? "bg-sage-600 text-white border-sage-600 shadow-xs"
                      : "bg-white text-ink-700 border-cream-200 hover:bg-cream-100"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Meal Name</Label>
            <Input
              placeholder="e.g. Ugali, Sukuma Wiki & Beef"
              value={newMeal.name}
              onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
              autoFocus
            />
          </div>

          <div>
            <Label>Estimated Cost (KES)</Label>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 450"
              value={newMeal.cost}
              onChange={(e) => setNewMeal({ ...newMeal, cost: e.target.value })}
            />
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Input
              placeholder="e.g. home cooked, leftover for lunch"
              value={newMeal.notes}
              onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-cream-100">
            <Button variant="secondary" onClick={() => setMealModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMeal} disabled={!newMeal.name.trim()}>
              Add to Schedule
            </Button>
          </div>
        </div>
      </Modal>

      {/* Set Weekly Food Budget Modal */}
      <Modal open={budgetModalOpen} onClose={() => setBudgetModalOpen(false)} title="Set Weekly Food Budget">
        <div className="space-y-4">
          <p className="text-xs text-ink-600 leading-relaxed">
            Set your target weekly spending limit for food and groceries. Your weekly planner will automatically compare total planned meals against this budget.
          </p>

          <div>
            <Label>Weekly Budget (KES)</Label>
            <Input
              type="number"
              min="0"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              placeholder="e.g. 5000"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-cream-100">
            <Button variant="secondary" onClick={() => setBudgetModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBudget}>Save Budget</Button>
          </div>
        </div>
      </Modal>

      {/* Add to Library Modal */}
      <Modal open={libraryModal} onClose={() => setLibraryModal(false)} title="Add to Meal Library">
        <div className="space-y-4">
          <div>
            <Label>Meal Name</Label>
            <Input
              value={newLibItem.name}
              onChange={(e) => setNewLibItem({ ...newLibItem, name: e.target.value })}
              placeholder="e.g. Githeri with avocado"
              autoFocus
            />
          </div>
          <div>
            <Label>Meal Type</Label>
            <div className="grid grid-cols-4 gap-2">
              {MEAL_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setNewLibItem({ ...newLibItem, meal_type: type })}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    newLibItem.meal_type === type
                      ? "bg-sage-600 text-white border-sage-600"
                      : "bg-white text-ink-700 border-cream-200"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Default Cost (KES, optional)</Label>
            <Input
              type="number"
              min="0"
              value={newLibItem.default_cost}
              onChange={(e) => setNewLibItem({ ...newLibItem, default_cost: e.target.value })}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input
              value={newLibItem.notes}
              onChange={(e) => setNewLibItem({ ...newLibItem, notes: e.target.value })}
              placeholder="Quick recipe tip or staple ingredient"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-cream-100">
            <Button variant="secondary" onClick={() => setLibraryModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLib} disabled={!newLibItem.name.trim()}>
              Save to Library
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Recipe Modal */}
      <Modal open={recipeModal} onClose={() => setRecipeModal(false)} title="New Recipe">
        <div className="space-y-4">
          <div>
            <Label>Dish Title</Label>
            <Input
              value={newRecipe.title}
              onChange={(e) => setNewRecipe({ ...newRecipe, title: e.target.value })}
              placeholder="e.g. Pilau Rice with Kachumbari"
              autoFocus
            />
          </div>
          <div>
            <Label>Servings</Label>
            <Input
              type="number"
              min="1"
              value={newRecipe.servings}
              onChange={(e) => setNewRecipe({ ...newRecipe, servings: Number(e.target.value) || 1 })}
            />
          </div>
          <div>
            <Label>Ingredients</Label>
            <Textarea
              value={newRecipe.ingredients}
              onChange={(e) => setNewRecipe({ ...newRecipe, ingredients: e.target.value })}
              placeholder="List items, e.g.&#10;2 cups rice&#10;500g beef&#10;Pilau masala"
              rows={4}
            />
          </div>
          <div>
            <Label>Cooking Directions</Label>
            <Textarea
              value={newRecipe.instructions}
              onChange={(e) => setNewRecipe({ ...newRecipe, instructions: e.target.value })}
              placeholder="Step by step preparation..."
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-cream-100">
            <Button variant="secondary" onClick={() => setRecipeModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRecipe} disabled={!newRecipe.title.trim()}>
              Save Recipe
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Pantry Item Modal */}
      <Modal open={pantryModal} onClose={() => setPantryModal(false)} title="Add Pantry Item">
        <div className="space-y-4">
          <div>
            <Label>Item Name</Label>
            <Input
              value={newPantry.name}
              onChange={(e) => setNewPantry({ ...newPantry, name: e.target.value })}
              placeholder="e.g. Rice, Onions, Cooking oil"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input
                value={newPantry.quantity}
                onChange={(e) => setNewPantry({ ...newPantry, quantity: e.target.value })}
                placeholder="2"
              />
            </div>
            <div>
              <Label>Unit</Label>
              <Input
                value={newPantry.unit}
                onChange={(e) => setNewPantry({ ...newPantry, unit: e.target.value })}
                placeholder="kg, bottles, items"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-cream-100">
            <Button variant="secondary" onClick={() => setPantryModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPantry} disabled={!newPantry.name.trim()}>
              Save Item
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Grocery Item Modal */}
      <Modal open={shoppingModal} onClose={() => setShoppingModal(false)} title="Add Grocery Item">
        <div className="space-y-4">
          <div>
            <Label>Item Name</Label>
            <Input
              value={newShopping.name}
              onChange={(e) => setNewShopping({ ...newShopping, name: e.target.value })}
              placeholder="e.g. Tomatoes, Milk, Bread"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input
                value={newShopping.quantity}
                onChange={(e) => setNewShopping({ ...newShopping, quantity: e.target.value })}
                placeholder="1 pack"
              />
            </div>
            <div>
              <Label>Est. Cost (KES)</Label>
              <Input
                type="number"
                min="0"
                value={newShopping.est_cost}
                onChange={(e) => setNewShopping({ ...newShopping, est_cost: e.target.value })}
                placeholder="150"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-cream-100">
            <Button variant="secondary" onClick={() => setShoppingModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddShopping} disabled={!newShopping.name.trim()}>
              Add to List
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
