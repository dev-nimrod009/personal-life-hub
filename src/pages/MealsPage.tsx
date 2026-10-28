import { useEffect, useState } from "react";
import {
  Utensils,
  Plus,
  Trash2,
  BookOpen,
  ShoppingBag,
  Package,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
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
  setPantryNeedToBuy,
  deletePantryItem,
  listShopping,
  addShoppingItem,
  setShoppingBought,
  deleteShoppingItem,
} from "../lib/data";
import type { Meal, Recipe, MealLibraryItem, PantryItem, ShoppingItem } from "../lib/types";
import { Button, EmptyState, Input, Label, Modal, SectionHeader, Textarea } from "../components/ui";
import { todayISO, formatDay } from "../lib/utils";

export type MealTab = "week" | "library" | "recipes" | "pantry" | "shopping";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

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

  // Modals state
  const [mealModal, setMealModal] = useState(false);
  const [newMeal, setNewMeal] = useState({
    meal_date: todayISO(),
    meal_type: "Lunch",
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
    emoji: "🥗",
    notes: "",
    default_cost: 0,
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
    est_cost: 0,
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

  // Handlers
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
        emoji: newLibItem.emoji || "🍽️",
        notes: newLibItem.notes.trim(),
        default_cost: Number(newLibItem.default_cost) || 0,
      });
      setLibraryModal(false);
      setNewLibItem({ name: "", meal_type: "Dinner", emoji: "🥗", notes: "", default_cost: 0 });
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
      setNewShopping({ name: "", quantity: "1", est_cost: 0 });
      await loadAll();
    } catch {
      setError("Failed to add shopping item.");
    }
  };

  const tabs: { id: MealTab; label: string; icon: typeof Utensils }[] = [
    { id: "week", label: "Planner", icon: Calendar },
    { id: "library", label: "Library", icon: Sparkles },
    { id: "recipes", label: "Recipes", icon: BookOpen },
    { id: "pantry", label: "Pantry", icon: Package },
    { id: "shopping", label: "Shopping", icon: ShoppingBag },
  ];

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Meal Planner"
        subtitle="Organize meals, recipes, pantry staples, and groceries"
        action={
          activeTab === "week" ? (
            <Button onClick={() => setMealModal(true)}>
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
              <Plus size={16} /> Add Item
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
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : activeTab === "week" ? (
        /* Planner Tab */
        meals.length === 0 ? (
          <EmptyState
            icon={<Utensils size={26} className="text-sage-600" />}
            title="No planned meals"
            hint="Plan your breakfast, lunch, or dinner for the week."
          />
        ) : (
          <div className="space-y-4">
            {meals.map((meal) => (
              <div
                key={meal.id}
                className="bg-white rounded-2xl border border-cream-200 p-5 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sage-50 text-sage-700">
                      {meal.meal_type}
                    </span>
                    <span className="text-xs text-ink-500">{formatDay(meal.meal_date)}</span>
                  </div>
                  <h4 className="font-display font-semibold text-ink-800 text-base">{meal.name}</h4>
                  {meal.notes && <p className="text-xs text-ink-600 mt-1">{meal.notes}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {meal.cost !== null && meal.cost !== undefined && (
                    <span className="text-sm font-semibold text-ink-700 font-mono">${Number(meal.cost).toFixed(2)}</span>
                  )}
                  <button
                    onClick={() => {
                      void deleteMeal(meal.id);
                      void loadAll();
                    }}
                    className="p-1.5 text-ink-400 hover:text-rose-soft-600 rounded-lg hover:bg-rose-soft-100 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === "library" ? (
        /* Library Tab */
        library.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={26} className="text-sage-600" />}
            title="Meal library is empty"
            hint="Save go-to recipes, takeout favorites, and easy dinner ideas."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {library.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-cream-200 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{item.emoji || "🍽️"}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-cream-100 text-ink-600 font-medium">
                      {item.meal_type}
                    </span>
                  </div>
                  <h4 className="font-display font-semibold text-ink-800 text-base">{item.name}</h4>
                  {item.notes && <p className="text-xs text-ink-500 mt-1 line-clamp-2">{item.notes}</p>}
                </div>
                <div className="mt-4 pt-3 border-t border-cream-100 flex items-center justify-between">
                  <span className="text-xs text-ink-500">
                    {item.default_cost > 0 ? `$${item.default_cost.toFixed(2)}` : "Quick meal"}
                  </span>
                  <button
                    onClick={() => {
                      void deleteMealLibraryItem(item.id);
                      void loadAll();
                    }}
                    className="text-ink-400 hover:text-rose-soft-600 p-1"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === "recipes" ? (
        /* Recipes Tab */
        recipes.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={26} className="text-sage-600" />}
            title="No recipes saved"
            hint="Keep your family favorites and kitchen experiments handy."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recipes.map((rec) => (
              <div key={rec.id} className="bg-white rounded-2xl border border-cream-200 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-display font-semibold text-ink-800 text-lg">{rec.title}</h4>
                    <button
                      onClick={() => {
                        void deleteRecipe(rec.id);
                        void loadAll();
                      }}
                      className="text-ink-400 hover:text-rose-soft-600 p-1"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <p className="text-xs text-ink-500 mb-3">Serves {rec.servings}</p>

                  <div className="mb-3">
                    <p className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-1">Ingredients</p>
                    <p className="text-xs text-ink-600 whitespace-pre-line leading-relaxed font-mono bg-cream-50 p-2.5 rounded-xl border border-cream-100">
                      {rec.ingredients}
                    </p>
                  </div>

                  {rec.instructions && (
                    <div>
                      <p className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-1">Instructions</p>
                      <p className="text-xs text-ink-600 whitespace-pre-line leading-relaxed">{rec.instructions}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === "pantry" ? (
        /* Pantry Tab */
        pantry.length === 0 ? (
          <EmptyState
            icon={<Package size={26} className="text-sage-600" />}
            title="Pantry is empty"
            hint="Track oils, spices, grains, and pantry essentials."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-cream-200 divide-y divide-cream-100 overflow-hidden">
            {pantry.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-cream-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      void setPantryNeedToBuy(item.id, !item.need_to_buy);
                      void loadAll();
                    }}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                      item.need_to_buy
                        ? "bg-honey-100 text-honey-600 border border-honey-300"
                        : "bg-cream-100 text-ink-600"
                    }`}
                  >
                    {item.need_to_buy ? "Need to buy" : "In stock"}
                  </button>
                  <div>
                    <span className="text-sm font-semibold text-ink-800">{item.name}</span>
                    <span className="text-xs text-ink-500 ml-2">
                      ({item.quantity} {item.unit})
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    void deletePantryItem(item.id);
                    void loadAll();
                  }}
                  className="text-ink-400 hover:text-rose-soft-600 p-1"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Shopping Tab */
        shopping.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag size={26} className="text-sage-600" />}
            title="Shopping list is empty"
            hint="Add grocery items or import items flagged as 'Need to buy'."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-cream-200 divide-y divide-cream-100 overflow-hidden">
            {shopping.map((item) => (
              <div
                key={item.id}
                className={`p-4 flex items-center justify-between transition-colors ${
                  item.bought ? "bg-cream-50/40 opacity-60" : "hover:bg-cream-50/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      void setShoppingBought(item.id, !item.bought);
                      void loadAll();
                    }}
                    className="text-ink-400 hover:text-sage-600"
                  >
                    {item.bought ? (
                      <CheckCircle2 size={18} className="text-sage-600 fill-sage-100" />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>
                  <span className={`text-sm font-medium ${item.bought ? "line-through text-ink-400" : "text-ink-800"}`}>
                    {item.name}
                  </span>
                  {item.quantity && <span className="text-xs text-ink-500">x{item.quantity}</span>}
                </div>
                <div className="flex items-center gap-3">
                  {item.est_cost > 0 && (
                    <span className="text-xs font-mono font-medium text-ink-700">${item.est_cost.toFixed(2)}</span>
                  )}
                  <button
                    onClick={() => {
                      void deleteShoppingItem(item.id);
                      void loadAll();
                    }}
                    className="text-ink-400 hover:text-rose-soft-600 p-1"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
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
            <Label>Type</Label>
            <div className="grid grid-cols-4 gap-2">
              {MEAL_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewMeal({ ...newMeal, meal_type: t })}
                  className={`py-2 rounded-xl text-xs font-medium border ${
                    newMeal.meal_type === t
                      ? "border-sage-500 bg-sage-50 text-sage-700 ring-1 ring-sage-300"
                      : "border-cream-200 bg-white text-ink-600"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Meal Name</Label>
            <Input
              value={newMeal.name}
              onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
              placeholder="e.g. Avocado Toast & Chai"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Estimated Cost (Optional)</Label>
              <Input
                type="number"
                step="0.01"
                value={newMeal.cost}
                onChange={(e) => setNewMeal({ ...newMeal, cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={newMeal.notes}
                onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })}
                placeholder="Prep notes, sides..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setMealModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleAddMeal()} disabled={!newMeal.name.trim()}>
              Save Meal
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Recipe Modal */}
      <Modal open={recipeModal} onClose={() => setRecipeModal(false)} title="Add Recipe">
        <div className="space-y-4">
          <div>
            <Label>Recipe Name</Label>
            <Input
              value={newRecipe.title}
              onChange={(e) => setNewRecipe({ ...newRecipe, title: e.target.value })}
              placeholder="e.g. Grandma's Lentil Soup"
              autoFocus
            />
          </div>
          <div>
            <Label>Servings</Label>
            <Input
              type="number"
              value={newRecipe.servings}
              onChange={(e) => setNewRecipe({ ...newRecipe, servings: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Ingredients (one per line)</Label>
            <Textarea
              rows={4}
              value={newRecipe.ingredients}
              onChange={(e) => setNewRecipe({ ...newRecipe, ingredients: e.target.value })}
              placeholder="1 cup brown lentils&#10;2 carrots, diced&#10;1 onion"
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label>Instructions</Label>
            <Textarea
              rows={4}
              value={newRecipe.instructions}
              onChange={(e) => setNewRecipe({ ...newRecipe, instructions: e.target.value })}
              placeholder="Simmer vegetables, add stock and lentils for 35 min..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setRecipeModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleAddRecipe()} disabled={!newRecipe.title.trim()}>
              Save Recipe
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Library Modal */}
      <Modal open={libraryModal} onClose={() => setLibraryModal(false)} title="Add Meal to Library">
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <Label>Emoji</Label>
              <Input
                value={newLibItem.emoji}
                onChange={(e) => setNewLibItem({ ...newLibItem, emoji: e.target.value })}
                className="text-center text-lg"
              />
            </div>
            <div className="col-span-3">
              <Label>Meal Name</Label>
              <Input
                value={newLibItem.name}
                onChange={(e) => setNewLibItem({ ...newLibItem, name: e.target.value })}
                placeholder="e.g. Quinoa Salad"
                autoFocus
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <select
                value={newLibItem.meal_type}
                onChange={(e) => setNewLibItem({ ...newLibItem, meal_type: e.target.value })}
                className="w-full rounded-xl border border-cream-200 bg-white px-3.5 py-2.5 text-sm"
              >
                {MEAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Default Cost</Label>
              <Input
                type="number"
                step="0.01"
                value={newLibItem.default_cost}
                onChange={(e) => setNewLibItem({ ...newLibItem, default_cost: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Input
              value={newLibItem.notes}
              onChange={(e) => setNewLibItem({ ...newLibItem, notes: e.target.value })}
              placeholder="Quick recipe reference or favorite brands"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setLibraryModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleAddLib()} disabled={!newLibItem.name.trim()}>
              Save
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
              placeholder="e.g. Rolled Oats"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input
                value={newPantry.quantity}
                onChange={(e) => setNewPantry({ ...newPantry, quantity: e.target.value })}
              />
            </div>
            <div>
              <Label>Unit</Label>
              <Input
                value={newPantry.unit}
                onChange={(e) => setNewPantry({ ...newPantry, unit: e.target.value })}
                placeholder="bag, jar, lbs..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setPantryModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleAddPantry()} disabled={!newPantry.name.trim()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Shopping Item Modal */}
      <Modal open={shoppingModal} onClose={() => setShoppingModal(false)} title="Add Shopping Item">
        <div className="space-y-4">
          <div>
            <Label>Item Name</Label>
            <Input
              value={newShopping.name}
              onChange={(e) => setNewShopping({ ...newShopping, name: e.target.value })}
              placeholder="e.g. Almond Milk"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input
                value={newShopping.quantity}
                onChange={(e) => setNewShopping({ ...newShopping, quantity: e.target.value })}
              />
            </div>
            <div>
              <Label>Est. Cost ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={newShopping.est_cost}
                onChange={(e) => setNewShopping({ ...newShopping, est_cost: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShoppingModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleAddShopping()} disabled={!newShopping.name.trim()}>
              Add to List
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
