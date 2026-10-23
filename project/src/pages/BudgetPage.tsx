import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown, ArrowLeftRight, ShoppingCart, Info } from "lucide-react";
import { listBudgetItems, addBudgetItem, deleteBudgetItem, listShopping } from "../lib/data";
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
  const [form, setForm] = useState({
    kind: "expense" as "income" | "expense",
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
    try {
      await addBudgetItem({
        kind: form.kind,
        amount,
        category: form.category,
        note: form.note.trim(),
        item_date: form.item_date,
      });
      setError("");
    } catch {
      setError("Could not add the entry.");
    } finally {
      setOpen(false);
      setForm({ kind: "expense", amount: "", category: "Food", note: "", item_date: todayISO() });
      load();
    }
  };

  const remove = async (id: string) => {
    try { await deleteBudgetItem(id); } catch { setError("Could not delete."); }
    load();
  };

  const { income, expenses, balance } = useMemo(() => {
    let inc = 0, exp = 0;
    for (const item of items) {
      if (item.kind === "income") inc += item.amount;
      else exp += item.amount;
    }
    return { income: inc, expenses: exp, balance: inc - exp };
  }, [items]);

  const stillToBuy = useMemo(
    () => shopping.filter((s) => !s.bought).reduce((sum, s) => sum + s.est_cost, 0),
    [shopping]
  );

  const remainingAfterBuying = balance - stillToBuy;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      if (item.kind === "expense") {
        map.set(item.category, (map.get(item.category) ?? 0) + item.amount);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const maxCat = byCategory[0]?.[1] ?? 1;

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Budget"
        subtitle="Track income, expenses, and see where your money goes"
        action={<Button onClick={() => setOpen(true)}><Plus size={16} /> New entry</Button>}
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <div className="bg-white rounded-2xl border border-cream-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-sage-100 flex items-center justify-center">
              <TrendingUp size={14} className="text-sage-600" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">Income</p>
          </div>
          <p className="font-display text-lg font-bold text-sage-600">KSh {income.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-cream-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-cream-100 flex items-center justify-center">
              <TrendingDown size={14} className="text-ink-600" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">Spent</p>
          </div>
          <p className="font-display text-lg font-bold text-ink-800">KSh {expenses.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-cream-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-sage-100 flex items-center justify-center">
              <ArrowLeftRight size={14} className="text-sage-600" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">Balance</p>
          </div>
          <p className="font-display text-lg font-bold text-sage-600">KSh {balance.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-cream-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-cream-100 flex items-center justify-center">
              <ShoppingCart size={14} className="text-ink-600" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">Still to buy</p>
          </div>
          <p className="font-display text-lg font-bold text-ink-800">KSh {stillToBuy.toLocaleString()}</p>
        </div>
      </section>

      <section className="bg-sage-600 text-white rounded-2xl px-5 py-4 mb-5 flex items-center gap-3">
        <Info size={18} className="shrink-0 text-white/80" />
        <p className="text-sm leading-relaxed">
          After buying everything on your list you would have{" "}
          <span className={cn("font-bold", remainingAfterBuying >= 0 ? "text-white" : "text-rose-200")}>
            KSh {remainingAfterBuying.toLocaleString()}
          </span>{" "}
          left.
        </p>
      </section>

      {byCategory.length > 0 && (
        <section className="bg-white rounded-2xl border border-cream-200 p-5 mb-5">
          <h2 className="font-display text-base font-semibold text-ink-800 mb-3">Spending by category</h2>
          <ul className="space-y-2">
            {byCategory.map(([cat, amount]) => (
              <li key={cat}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-ink-700 font-medium">{cat}</span>
                  <span className="text-ink-600">KSh {amount.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-cream-100 overflow-hidden">
                  <div className="h-full rounded-full bg-sage-500" style={{ width: `${Math.round((amount / maxCat) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-cream-100 animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={<Wallet size={26} />} title="No entries yet" hint="Add income or an expense to start tracking your money." />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="group flex items-center gap-3 bg-white rounded-xl border border-cream-200 px-4 py-3">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", item.kind === "income" ? "bg-sage-100" : "bg-rose-soft-100")}>
                {item.kind === "income" ? <TrendingUp size={15} className="text-sage-600" /> : <TrendingDown size={15} className="text-rose-soft-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-800 truncate">{item.category}</p>
                <p className="text-xs text-ink-500">
                  {new Date(item.item_date + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  {item.note && ` · ${item.note}`}
                </p>
              </div>
              <span className={cn("text-sm font-semibold shrink-0", item.kind === "income" ? "text-sage-600" : "text-rose-soft-600")}>
                {item.kind === "income" ? "+" : "−"} KSh {item.amount.toLocaleString()}
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
              {(["expense", "income"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setForm({ ...form, kind: k })}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all",
                    form.kind === k ? "bg-sage-600 text-white" : "bg-cream-100 text-ink-600 hover:bg-cream-200"
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Amount (KSh)</Label>
            <Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" autoFocus />
          </div>
          <div>
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
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
            </div>
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="What was it for?" />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" max={todayISO()} value={form.item_date} onChange={(e) => setForm({ ...form, item_date: e.target.value })} />
          </div>
          <Button onClick={save} disabled={!form.amount.trim() || Number(form.amount) <= 0} className="w-full">
            Add entry
          </Button>
        </div>
      </Modal>
    </div>
  );
}
