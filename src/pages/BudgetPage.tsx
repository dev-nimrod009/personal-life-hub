import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown, ArrowLeftRight, ShoppingCart, Check, ChevronLeft, ChevronRight, Leaf } from "lucide-react";
import {
  listBudgetItems,
  addBudgetItem,
  deleteBudgetItem,
  listShopping,
  addShoppingItem,
  deleteShoppingItem,
  recordShoppingPurchase,
} from "../lib/data";
import type { BudgetItem, ShoppingItem } from "../lib/types";
import { Button, Input, EmptyState, Label, Modal, SectionHeader } from "../components/ui";
import { cn, todayISO } from "../lib/utils";

const CATEGORIES = ["Food", "Transport", "Bills", "Shopping", "Health", "Rent", "Income", "Other"] as const;

export function BudgetPage() {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => todayISO().slice(0, 7));
  const [form, setForm] = useState({
    type: "expense" as "expense" | "income" | "tobuy",
    amount: "",
    category: "Food",
    note: "",
    item_date: todayISO(),
  });

  const load = async () => {
    setLoading(true);
    try {
      const [budgetList, shopList] = await Promise.all([listBudgetItems(), listShopping()]);
      setItems(budgetList);
      setShopping(shopList);
      setError("");
    } catch {
      setError("Could not read budget entries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    const amount = Number(form.amount);
    if (!form.amount.trim() || !Number.isFinite(amount) || amount <= 0) return;
    if (form.type === "tobuy" && !form.note.trim()) return;
    try {
      if (form.type === "tobuy") {
        await addShoppingItem({ name: form.note.trim(), est_cost: amount });
      } else {
        await addBudgetItem({
          kind: form.type,
          amount,
          category: form.category,
          note: form.note.trim(),
          item_date: form.item_date,
        });
      }
      setError("");
      setOpen(false);
      setForm({ type: "expense", amount: "", category: "Food", note: "", item_date: todayISO() });
      await load();
    } catch {
      setError("Could not add the entry.");
    }
  };

  const remove = async (id: string) => {
    try { await deleteBudgetItem(id); } catch { setError("Could not delete."); }
    load();
  };

  const monthItems = useMemo(() => items.filter((item) => (item.item_date ?? "").slice(0, 7) === month), [items, month]);
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const { income, expenses, balance } = useMemo(() => {
    let inc = 0, exp = 0;
    for (const item of monthItems) {
      if (item.kind === "income") inc += item.amount;
      else if (item.kind === "expense") exp += item.amount;
    }
    return { income: inc, expenses: exp, balance: inc - exp };
  }, [monthItems]);

  const stillToBuy = useMemo(
    () => shopping.filter((item) => !item.bought).reduce((sum, item) => sum + item.est_cost, 0),
    [shopping]
  );

  const plannedItems = shopping.filter((item) => !item.bought);
  const completedItems = monthItems;
  const essentials = monthItems
    .filter((item) => item.kind === "expense" && ["Rent", "Food", "Bills"].includes(item.category))
    .reduce((sum, item) => sum + item.amount, 0);
  const afterPlanned = balance - stillToBuy;
  const enoughNote =
    income === 0 && expenses === 0
      ? "Nothing logged for this month yet. Add your income and essentials when you're ready — no rush."
      : afterPlanned >= 0
        ? `You've covered KES ${essentials.toLocaleString()} in essentials (rent, food, bills) and still have KES ${afterPlanned.toLocaleString()} after planned purchases. You have enough.`
        : `Planned purchases are KES ${Math.abs(afterPlanned).toLocaleString()} more than what's left this month. Maybe pause a wishlist item — essentials first, and that's okay.`;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of monthItems) {
      if (item.kind === "expense") {
        map.set(item.category, (map.get(item.category) ?? 0) + item.amount);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [monthItems]);

  const maxCat = byCategory[0]?.[1] ?? 1;

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Budget"
        subtitle="Track income, expenses, and see where your money goes"
        action={<Button onClick={() => setOpen(true)}><Plus size={16} /> New entry</Button>}
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">
          <ChevronLeft size={16} />
        </Button>
        <p className="font-display text-base font-semibold text-ink-800">{monthLabel}</p>
        <Button variant="ghost" size="sm" onClick={() => shiftMonth(1)} aria-label="Next month" disabled={month >= todayISO().slice(0, 7)}>
          <ChevronRight size={16} />
        </Button>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <div className="bg-white rounded-2xl border border-cream-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-sage-100 flex items-center justify-center">
              <TrendingUp size={14} className="text-sage-600" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">Income</p>
          </div>
          <p className="font-display text-lg font-bold text-sage-600">KES {income.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-cream-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-cream-100 flex items-center justify-center">
              <TrendingDown size={14} className="text-ink-600" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">Spent</p>
          </div>
          <p className="font-display text-lg font-bold text-ink-800">KES {expenses.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-cream-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-sage-100 flex items-center justify-center">
              <ArrowLeftRight size={14} className="text-sage-600" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">Balance</p>
          </div>
          <p className={cn("font-display text-lg font-bold", balance < 0 ? "text-rose-soft-600" : "text-sage-600")}>KES {balance.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-cream-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-cream-100 flex items-center justify-center">
              <ShoppingCart size={14} className="text-ink-600" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">Still to buy</p>
          </div>
          <p className="font-display text-lg font-bold text-ink-800">KES {stillToBuy.toLocaleString()}</p>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-cream-200 p-4 mb-4 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sage-50 text-sage-600 flex items-center justify-center shrink-0">
            <Leaf size={14} aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-xs text-ink-800">The "Enough" Mindset</h3>
            <p className="text-[11px] text-ink-600 leading-relaxed">
              {enoughNote}
            </p>
          </div>
        </div>
      </section>

      {plannedItems.length > 0 && (
        <section className="bg-white rounded-2xl border border-cream-200 p-4 mb-4">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <h2 className="font-display text-sm font-semibold text-ink-800">Wishlist / Planned Purchases</h2>
            <span className="text-xs text-ink-500">{plannedItems.length} planned</span>
          </div>
          <ul className="space-y-2">
            {plannedItems.map((item) => (
              <li key={item.id} className="flex items-center gap-2.5 rounded-xl border border-cream-200 px-3 py-2.5">
                <ShoppingCart size={14} className="text-sage-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-800 truncate">{item.name}</p>
                  {item.quantity && <p className="text-xs text-ink-500">{item.quantity}</p>}
                </div>
                <span className="text-xs font-semibold text-ink-700 shrink-0">KES {item.est_cost.toLocaleString()}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await recordShoppingPurchase(item);
                      await load();
                    } catch {
                      setError("Could not mark the purchase as bought.");
                    }
                  }}
                  aria-label={`Mark ${item.name} as bought`}
                  className="text-xs px-2.5 py-1 h-auto"
                >
                  <Check size={12} /> Bought
                </Button>
                <button
                  onClick={async () => {
                    try {
                      await deleteShoppingItem(item.id);
                      await load();
                    } catch {
                      setError("Could not delete planned purchase.");
                    }
                  }}
                  className="text-ink-400 hover:text-rose-soft-600 p-1"
                  aria-label="Delete planned purchase"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {byCategory.length > 0 && (
        <section className="bg-white rounded-2xl border border-cream-200 p-4 mb-4">
          <h2 className="font-display text-sm font-semibold text-ink-800 mb-2.5">Spending by category</h2>
          <ul className="space-y-2">
            {byCategory.map(([cat, amount]) => (
              <li key={cat}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-ink-700 font-medium">{cat}</span>
                  <span className="text-ink-600 font-semibold">KES {amount.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full bg-cream-100 overflow-hidden">
                  <div className="h-full rounded-full bg-sage-500" style={{ width: `${Math.round((amount / maxCat) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-cream-100 animate-pulse" />)}</div>
      ) : completedItems.length === 0 && plannedItems.length === 0 ? (
        <EmptyState icon={<Wallet size={20} />} title="No entries yet" hint="Add income or an expense to start tracking your money." />
      ) : completedItems.length === 0 ? (
        <p className="rounded-xl border border-cream-200 bg-white px-4 py-3 text-sm text-ink-500">
          No income or expense entries for {monthLabel}.
        </p>
      ) : (
        <ul className="space-y-2">
          {completedItems.map((item) => (
            <li key={item.id} className="group flex items-center gap-3 bg-white rounded-xl border border-cream-200 px-3.5 py-2.5">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", item.kind === "income" ? "bg-sage-100" : "bg-rose-soft-100")}>
                {item.kind === "income" ? <TrendingUp size={13} className="text-sage-600" /> : <TrendingDown size={13} className="text-rose-soft-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-800 truncate">{item.category}</p>
                <p className="text-xs text-ink-500">
                  {new Date(item.item_date + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  {item.note && ` · ${item.note}`}
                </p>
              </div>
              <span className={cn("text-sm font-semibold shrink-0", item.kind === "income" ? "text-sage-600" : "text-rose-soft-600")}>
                {item.kind === "income" ? "+" : "−"} KES {item.amount.toLocaleString()}
              </span>
              <button onClick={() => remove(item.id)} className="text-ink-400 hover:text-rose-soft-600" aria-label="Delete">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New budget entry">
        <div className="space-y-4">
          <div>
            <Label>Type</Label>
            <div className="flex gap-2">
              {([
                { value: "expense", label: "Expense" },
                { value: "income", label: "Income" },
                { value: "tobuy", label: "To Buy (Wishlist)" },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setForm({ ...form, type: value, category: value === "tobuy" ? "Shopping" : form.category })}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all",
                    form.type === value ? "bg-sage-600 text-white" : "bg-cream-100 text-ink-600 hover:bg-cream-200"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Amount (KES)</Label>
            <Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" autoFocus />
          </div>
          <div>
            {form.type !== "tobuy" && <Label>Category</Label>}
            {form.type !== "tobuy" && <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setForm({ ...form, category: cat })}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    form.category === cat ? "bg-sage-600 text-white" : "bg-cream-100 text-ink-600 hover:bg-cream-200"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>}
          </div>
          <div>
            <Label>{form.type === "tobuy" ? "What would you like to buy?" : "Note (optional)"}</Label>
            <Input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder={form.type === "tobuy" ? "e.g. New shoes" : "What was it for?"}
            />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" max={form.type === "tobuy" ? undefined : todayISO()} value={form.item_date} onChange={(e) => setForm({ ...form, item_date: e.target.value })} />
          </div>
          <Button onClick={save} disabled={!form.amount.trim() || Number(form.amount) <= 0 || (form.type === "tobuy" && !form.note.trim())} className="w-full">
            Add entry
          </Button>
        </div>
      </Modal>
    </div>
  );
}
