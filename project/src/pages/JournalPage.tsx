import { useEffect, useState } from "react";
import { BookOpen, Plus, Trash2, Pencil, Search } from "lucide-react";
import { listJournal, upsertJournal, deleteJournal } from "../lib/data";
import type { JournalEntry } from "../lib/types";
import { Button, EmptyState, Input, Label, Modal, SectionHeader, Textarea } from "../components/ui";
import { formatDay } from "../lib/utils";

const MOODS = ["", "Happy", "Calm", "Tired", "Sad", "Anxious", "Excited", "Grateful"];

export function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", mood: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setEntries(await listJournal());
      setError("");
    } catch {
      setError("Could not read the journal from this device.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setEditing(null);
    setForm({ title: "", content: "", mood: "" });
    setOpen(true);
  };

  const startEdit = (entry: JournalEntry) => {
    setEditing(entry);
    setForm({ title: entry.title, content: entry.content, mood: entry.mood });
    setOpen(true);
  };

  const save = async () => {
    if (!form.content.trim()) return;
    setSaving(true);
    try {
      await upsertJournal(editing ? { id: editing.id, ...form } : form);
      setError("");
    } catch {
      setError("Could not save the entry.");
    } finally {
      setSaving(false);
      setOpen(false);
      load();
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteJournal(id);
    } catch {
      setError("Could not delete the entry.");
    }
    load();
  };

  const filtered = entries.filter(
    (e) =>
      e.title.toLowerCase().includes(query.toLowerCase()) ||
      e.content.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Journal"
        subtitle="Longer reflections, ideas, and memories"
        action={
          <Button onClick={startNew}>
            <Plus size={16} /> New entry
          </Button>
        }
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500/60" />
        <Input
          placeholder="Search entries..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={26} />}
          title={query ? "No matching entries" : "Your journal is empty"}
          hint="Write your first reflection — what's on your mind today?"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <article
              key={entry.id}
              className="group bg-white rounded-2xl border border-cream-200 p-5 hover:shadow-md hover:border-sage-300 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-display text-lg font-semibold text-ink-800 truncate">
                    {entry.title || "Untitled"}
                  </h4>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {formatDay(entry.created_at.slice(0, 10))}
                    {entry.mood && <span className="ml-2 text-sage-600 font-medium">{entry.mood}</span>}
                  </p>
                </div>
                <div className="flex gap-1 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(entry)} aria-label="Edit">
                    <Pencil size={14} />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => remove(entry.id)} aria-label="Delete">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-ink-600 leading-relaxed mt-3 whitespace-pre-wrap line-clamp-3">
                {entry.content}
              </p>
            </article>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit entry" : "New journal entry"}>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Give it a name..."
            />
          </div>
          <div>
            <Label>Mood</Label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m || "none"}
                  onClick={() => setForm({ ...form, mood: m })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    form.mood === m ? "bg-sage-600 text-white" : "bg-cream-100 text-ink-600 hover:bg-cream-200"
                  }`}
                >
                  {m || "None"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Entry</Label>
            <Textarea
              rows={7}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Write freely..."
            />
          </div>
          <Button onClick={save} disabled={saving || !form.content.trim()} className="w-full">
            {saving ? "Saving..." : editing ? "Save changes" : "Save entry"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
