import { useEffect, useState } from "react";
import { Quote, Plus, Trash2, Sparkles, Bookmark, Share2 } from "lucide-react";
import { listQuotes, addQuote, deleteQuote } from "../lib/data";
import type { SavedQuote } from "../lib/types";
import { Button, EmptyState, Input, Label, Modal, SectionHeader, Textarea } from "../components/ui";

const CATEGORIES = ["All", "Wisdom", "Mindfulness", "Courage", "Growth", "Life", "Literature"];

export function QuoteVaultPage() {
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [kind, setKind] = useState("Wisdom");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await listQuotes();
      setQuotes(data);
      setError("");
    } catch {
      setError("Could not load quotes from device.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await addQuote(text.trim(), author.trim() || "Anonymous", kind);
      setModalOpen(false);
      setText("");
      setAuthor("");
      setKind("Wisdom");
      await load();
    } catch {
      setError("Could not save quote.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteQuote(id);
      await load();
    } catch {
      setError("Could not delete quote.");
    }
  };

  const filteredQuotes = quotes.filter((q) => {
    if (selectedCategory === "All") return true;
    return q.kind.toLowerCase() === selectedCategory.toLowerCase();
  });

  const featured = quotes.length > 0 ? quotes[0] : null;

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Quote Vault"
        subtitle="Save inspiring quotes, uplifting book passages, and timeless words that ground you."
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Add Quote
          </Button>
        }
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {/* Featured Quote Banner */}
      {featured && (
        <div className="mb-8 rounded-3xl bg-sage-700 text-white p-6 sm:p-10 relative overflow-hidden shadow-sm">
          <Quote
            size={120}
            className="absolute -right-4 -bottom-8 text-sage-600/30 pointer-events-none select-none"
          />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage-600/60 text-sage-100 text-xs font-medium mb-4">
              <Sparkles size={13} /> Daily Reflection
            </span>
            <p className="font-display text-xl sm:text-2xl md:text-3xl font-normal leading-relaxed italic">
              "{featured.text}"
            </p>
            <p className="mt-4 text-sm text-sage-200 font-medium tracking-wide">
              — {featured.author || "Unknown"}
            </p>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? "bg-sage-600 text-white"
                : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : filteredQuotes.length === 0 ? (
        <EmptyState
          icon={<Quote size={26} className="text-sage-600" />}
          title="No quotes in this collection"
          hint="Save favorite lines from books, mantras, or reminders from mentors."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuotes.map((q) => (
            <div
              key={q.id}
              className="bg-white rounded-2xl border border-cream-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow group relative"
            >
              <div>
                <div className="flex items-center justify-between mb-3 text-ink-400">
                  <span className="text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-cream-100 text-ink-600">
                    {q.kind || "Wisdom"}
                  </span>
                  <button
                    onClick={() => void remove(q.id)}
                    className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-rose-soft-600 transition-opacity p-1"
                    title="Delete quote"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <p className="font-serif text-base sm:text-lg text-ink-800 leading-relaxed italic mb-4">
                  "{q.text}"
                </p>
              </div>

              <div className="border-t border-cream-100 pt-3 flex items-center justify-between">
                <span className="text-xs font-medium text-ink-600">— {q.author || "Anonymous"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add to Quote Vault">
        <div className="space-y-4">
          <div>
            <Label>Quote Text</Label>
            <Textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the quote, poem line, or mantra..."
              className="font-serif italic text-base leading-relaxed"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Author / Source</Label>
              <Input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Marcus Aurelius"
              />
            </div>
            <div>
              <Label>Category</Label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="w-full rounded-xl border border-cream-200 bg-white px-3.5 py-2.5 text-sm text-ink-800"
              >
                {CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving || !text.trim()}>
              {saving ? "Saving..." : "Save Quote"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
