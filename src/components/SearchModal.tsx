import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Hash, X } from "lucide-react";
import {
  listJournal,
  listDiary,
  listNotes,
  listInbox,
  listQuotes,
  listGratitude,
  listGoals,
  listReminders,
  listDayPlanner,
  listHabits,
  listBudgetItems,
  listMoods,
} from "../lib/data";
import type { SectionId } from "./nav";
import { cn, formatDay } from "../lib/utils";

interface SearchResult {
  id: string;
  section: SectionId;
  sectionLabel: string;
  title: string;
  snippet: string;
  date?: string;
  tags: string[];
}

const TAG_RE = /(^|\s)#([\p{L}\p{N}_-]{2,40})/gu;

export function extractTags(text: string): string[] {
  const tags = new Set<string>();
  for (const match of text.matchAll(TAG_RE)) tags.add(match[2].toLowerCase());
  return Array.from(tags);
}

function make(
  section: SectionId,
  sectionLabel: string,
  id: string,
  title: string,
  body: string,
  date?: string
): SearchResult {
  const text = `${title} ${body}`;
  return { id: `${section}:${id}`, section, sectionLabel, title: title || body.slice(0, 60), snippet: body, date, tags: extractTags(text) };
}

async function loadEverything(): Promise<SearchResult[]> {
  const safe = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);
  const [journal, diary, notes, inbox, quotes, gratitude, goals, reminders, tasks, habits, budget, moods] = await Promise.all([
    safe(listJournal()),
    safe(listDiary()),
    safe(listNotes()),
    safe(listInbox()),
    safe(listQuotes()),
    safe(listGratitude()),
    safe(listGoals()),
    safe(listReminders()),
    safe(listDayPlanner()),
    safe(listHabits()),
    safe(listBudgetItems()),
    safe(listMoods()),
  ]);
  return [
    ...journal.map((e) => make("journal", "Journal", e.id, e.title, e.content, e.created_at?.slice(0, 10))),
    ...diary.map((e) => make("diary", "Diary", e.id, "", e.content, e.entry_date)),
    ...notes.filter((n) => !n.password_hash).map((n) => make("notes", "Notepad", n.id, n.title, n.content, n.created_at?.slice(0, 10))),
    ...inbox.map((i) => make("braindump", "Brain Dump", i.id, "", i.content, i.created_at?.slice(0, 10))),
    ...quotes.map((q) => make("quotes", "Quote Vault", q.id, q.author ? `— ${q.author}` : "", q.text)),
    ...gratitude.map((g) => make("gratitude", "Gratitude", g.id, "", g.content, g.entry_date)),
    ...goals.map((g) => make("goals", "Goals", g.id, g.title, g.description ?? "")),
    ...reminders.map((r) => make("reminders", "Reminders", r.id, r.title, r.notes ?? "")),
    ...tasks.map((t) => make("dayplans", "Day Plans", t.id, t.task, "", t.plan_date)),
    ...habits.map((h) => make("habits", "Habits", h.id, h.name.replace(" ||| ", " · "), "")),
    ...budget.map((b) => make("budget", "Budget", b.id, `${b.category} · KES ${b.amount.toLocaleString()}`, b.note ?? "", b.item_date)),
    ...moods.filter((m) => m.note).map((m) => make("mood", "Mood", m.id, `Mood ${m.score}/5`, m.note, m.mood_date)),
  ];
}

export function SearchModal({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (id: SectionId) => void }) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [items, setItems] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void loadEverything().then((all) => {
      setItems(all);
      setLoading(false);
    });
    window.setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 24);
  }, [items]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    if (!q && !activeTag) return [];
    return items
      .filter((item) => (activeTag ? item.tags.includes(activeTag) : true))
      .filter((item) => (q ? `${item.title} ${item.snippet} ${item.sectionLabel}`.toLowerCase().includes(q) : true))
      .slice(0, 50);
  }, [items, query, activeTag]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Search Life Hub">
      <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-white rounded-2xl border border-cream-200 shadow-2xl flex flex-col max-h-[85vh] mt-10 animate-pop-in">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-cream-100">
          <Search size={18} className="text-ink-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everything, or type #tag"
            aria-label="Search query"
            className="flex-1 bg-transparent text-sm text-ink-800 placeholder:text-ink-500/70 focus:outline-none"
          />
          <button type="button" onClick={onClose} aria-label="Close search" className="p-1.5 rounded-lg text-ink-500 hover:bg-cream-100">
            <X size={16} />
          </button>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-b border-cream-100" aria-label="Tags">
            {allTags.map(([tag, count]) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                aria-pressed={activeTag === tag}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                  activeTag === tag ? "bg-sage-600 text-white border-sage-600" : "bg-cream-50 text-ink-600 border-cream-200 hover:bg-cream-100"
                )}
              >
                <Hash size={10} />
                {tag}
                <span className="opacity-60 ml-0.5">{count}</span>
              </button>
            ))}
          </div>
        )}

        <div className="overflow-y-auto p-2">
          {loading ? (
            <p className="text-sm text-ink-500 p-4">Searching your device…</p>
          ) : !query.trim() && !activeTag ? (
            <p className="text-sm text-ink-500 p-4">
              Search across journal, diary, notes, brain dump, quotes, gratitude, goals, reminders, plans, habits, budget and mood.
              Add tags to any entry by writing <span className="font-semibold">#tag</span> in its text.
            </p>
          ) : results.length === 0 ? (
            <p className="text-sm text-ink-500 p-4">No matches found.</p>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate(r.section);
                      onClose();
                    }}
                    className="w-full text-left rounded-xl px-3 py-2.5 hover:bg-cream-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-[11px] text-ink-500">
                      <span className="font-semibold uppercase tracking-wider text-sage-700">{r.sectionLabel}</span>
                      {r.date && <span>· {formatDay(r.date)}</span>}
                    </div>
                    <p className="text-sm font-medium text-ink-800 truncate">{r.title || "Untitled"}</p>
                    {r.snippet && r.snippet !== r.title && <p className="text-xs text-ink-500 line-clamp-2">{r.snippet}</p>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
