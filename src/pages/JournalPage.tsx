import { useEffect, useState } from "react";
import { BookOpen, Plus, Trash2, Pencil, Search, Calendar, Heart } from "lucide-react";
import { listJournal, upsertJournal, deleteJournal } from "../lib/data";
import type { JournalEntry } from "../lib/types";
import { Button, EmptyState, Input, Label, Modal, SectionHeader, Textarea } from "../components/ui";
import { formatDay } from "../lib/utils";

const MOOD_OPTIONS = [
  "🌿 Peaceful",
  "☀️ Inspired",
  "💭 Reflective",
  "✨ Grateful",
  "⚡ Energized",
  "🌧️ Heavy",
  "🌱 Hopeful",
];

export function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("🌿 Peaceful");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await listJournal();
      setEntries(data);
      setError("");
    } catch {
      setError("Could not load journal entries from this device.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setMood("🌿 Peaceful");
    setModalOpen(true);
  };

  const openEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setMood(entry.mood || "🌿 Peaceful");
    setModalOpen(true);
  };

  const save = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await upsertJournal({
        id: editingId ?? undefined,
        title: title.trim() || "Untitled Reflection",
        content: content.trim(),
        mood,
      });
      setModalOpen(false);
      await load();
    } catch {
      setError("Could not save journal entry.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteJournal(id);
      if (editingId === id) setModalOpen(false);
      await load();
    } catch {
      setError("Could not delete journal entry.");
    }
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.title.toLowerCase().includes(search.toLowerCase()) ||
      entry.content.toLowerCase().includes(search.toLowerCase());
    const matchesMood = selectedMood === "all" || entry.mood === selectedMood;
    return matchesSearch && matchesMood;
  });

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Journal"
        subtitle="Freeform thoughts, mindful reflections, and personal moments"
        action={
          <Button onClick={openNew}>
            <Plus size={16} /> New Entry
          </Button>
        }
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {/* Search & Mood Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries..."
            className="pl-9"
          />
        </div>
        <select
          value={selectedMood}
          onChange={(e) => setSelectedMood(e.target.value)}
          className="rounded-xl border border-cream-200 bg-white px-3.5 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
        >
          <option value="all">All Moods</option>
          {MOOD_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Entries List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={26} className="text-sage-600" />}
          title={search || selectedMood !== "all" ? "No matching entries" : "No journal entries yet"}
          hint="Capture thoughts, record discoveries, or reflect on your day."
        />
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => openEdit(entry)}
              className="bg-white rounded-2xl border border-cream-200 p-5 sm:p-6 hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h3 className="font-display font-semibold text-lg text-ink-800 group-hover:text-sage-700 transition-colors">
                    {entry.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-ink-500/80 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} />
                      {formatDay(entry.created_at)}
                    </span>
                    {entry.mood && (
                      <span className="rounded-full bg-cream-100 px-2 py-0.5 text-ink-700 text-[11px] font-medium">
                        {entry.mood}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(entry);
                    }}
                    className="p-1.5 text-ink-500 hover:text-ink-700 hover:bg-cream-100 rounded-lg"
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void remove(entry.id);
                    }}
                    className="p-1.5 text-rose-soft-500 hover:text-rose-soft-700 hover:bg-rose-soft-100 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-ink-700 leading-relaxed font-serif whitespace-pre-line line-clamp-3">
                {entry.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Journal Entry" : "New Journal Entry"}
      >
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your entry a title..."
              autoFocus
            />
          </div>

          <div>
            <Label>Mood / State of Mind</Label>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    mood === m
                      ? "border-sage-500 bg-sage-50 text-sage-700 font-medium ring-1 ring-sage-300"
                      : "border-cream-200 bg-white text-ink-600 hover:bg-cream-100"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Your Thoughts</Label>
            <Textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write freely here..."
              className="font-serif leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {editingId ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => void remove(editingId)}
              >
                <Trash2 size={14} /> Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void save()} disabled={saving || !content.trim()}>
                {saving ? "Saving..." : "Save Entry"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
