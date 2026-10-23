import { useEffect, useState } from "react";
import { Plus, Trash2, Search, Quote } from "lucide-react";
import { listQuotes, addQuote, deleteQuote } from "../lib/data";
import type { SavedQuote } from "../lib/types";
import { Button, EmptyState, Input, Label, Modal, SectionHeader, Textarea } from "../components/ui";

const KINDS = ["quote", "excerpt", "affirmation"] as const;

const KIND_LABELS: Record<string, string> = {
  quote: "Quote",
  excerpt: "Book Excerpt",
  affirmation: "Affirmation",
};

export function QuoteVaultPage() {
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ text: "", author: "", kind: "quote" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setQuotes(await listQuotes());
      setError("");
    } catch {
      setError("Could not read the vault from this device.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.text.trim()) return;
    setSaving(true);
    try {
      await addQuote(form.text.trim(), form.author.trim(), form.kind);
      setForm({ text: "", author: "", kind: "quote" });
      setOpen(false);
      setError("");
    } catch {
      setError("Could not save the entry.");
    } finally {
      setSaving(false);
      load();
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteQuote(id);
    } catch {
      setError("Could not remove the entry.");
    }
    load();
  };

  const filtered = filterQuotes(quotes, query);

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Quote Vault"
        subtitle="Words to revisit when you need them"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> New entry
          </Button>
        }
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500/60" />
        <Input
          placeholder="Search the vault..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Quote size={26} />}
          title={query ? "Nothing matches your search" : "The vault is empty"}
          hint="Save a favorite quote, a book excerpt, or a personal affirmation."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((quote) => (
            <figure
              key={quote.id}
              className="group relative bg-white rounded-2xl border border-cream-200 p-6 hover:shadow-md hover:border-sage-300 transition-all"
            >
              <blockquote className="text-[15px] leading-relaxed text-ink-800 whitespace-pre-wrap">
                {quote.text}
              </blockquote>
              <figcaption className="mt-4 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-sage-600 block">
                    {KIND_LABELS[quote.kind] ?? "Quote"}
                  </span>
                  {quote.author && <span className="text-sm text-ink-500">— {quote.author}</span>}
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => remove(quote.id)}
                  className="opacity-60 shrink-0"
                  aria-label="Delete"
                >
                  <Trash2 size={13} />
                </Button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New vault entry">
        <div className="space-y-4">
          <div>
            <Label>Words</Label>
            <Textarea
              rows={4}
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="A favorite quote, excerpt, or affirmation..."
            />
          </div>
          <div>
            <Label>Said by (optional)</Label>
            <Input
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              placeholder="Author, book title, or just you..."
            />
          </div>
          <div>
            <Label>Kind</Label>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((kind) => (
                <button
                  key={kind}
                  onClick={() => setForm({ ...form, kind })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    form.kind === kind ? "bg-sage-600 text-white" : "bg-cream-100 text-ink-600 hover:bg-cream-200"
                  }`}
                >
                  {KIND_LABELS[kind]}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={save} disabled={saving || !form.text.trim()} className="w-full">
            {saving ? "Saving..." : "Save to vault"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function filterQuotes(quotes: SavedQuote[], query: string): SavedQuote[] {
  const q = query.toLowerCase();
  return quotes.filter((quote) => quote.text.toLowerCase().includes(q) || quote.author.toLowerCase().includes(q));
}
