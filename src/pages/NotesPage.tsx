import { useEffect, useState } from "react";
import { Notebook, Plus, Pin, Trash2, Pencil, Search, Tag } from "lucide-react";
import { listNotes, upsertNote, setNotePinned, deleteNote } from "../lib/data";
import type { Note } from "../lib/types";
import { Button, EmptyState, Input, Label, Modal, SectionHeader, Textarea } from "../components/ui";
import { formatDay } from "../lib/utils";

const DEFAULT_CATEGORIES = ["General", "Ideas", "Personal", "Work", "Checklist", "Reference"];

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await listNotes();
      setNotes(data);
      setError("");
    } catch {
      setError("Could not load notepad entries.");
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
    setCategory("General");
    setPinned(false);
    setModalOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category || "General");
    setPinned(note.pinned || false);
    setModalOpen(true);
  };

  const save = async () => {
    if (!title.trim() && !content.trim()) return;
    setSaving(true);
    try {
      await upsertNote({
        id: editingId ?? undefined,
        title: title.trim() || "Untitled Note",
        content: content.trim(),
        category: category.trim() || "General",
        pinned,
      });
      setModalOpen(false);
      await load();
    } catch {
      setError("Could not save note.");
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (note: Note) => {
    try {
      await setNotePinned(note.id, !note.pinned);
      await load();
    } catch {
      setError("Could not update pin state.");
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteNote(id);
      if (editingId === id) setModalOpen(false);
      await load();
    } catch {
      setError("Could not delete note.");
    }
  };

  const categories = Array.from(
    new Set(["General", ...DEFAULT_CATEGORIES, ...notes.map((n) => n.category).filter(Boolean)])
  );

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === "all" || n.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.pinned);

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Notepad"
        subtitle="Quick reference notes, checklists, and reference guides"
        action={
          <Button onClick={openNew}>
            <Plus size={16} /> New Note
          </Button>
        }
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {/* Search and Category Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`text-xs px-3 py-2 rounded-xl transition-colors whitespace-nowrap ${
              selectedCategory === "all"
                ? "bg-sage-600 text-white font-medium"
                : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-3 py-2 rounded-xl transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-sage-600 text-white font-medium"
                  : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <EmptyState
          icon={<Notebook size={26} className="text-sage-600" />}
          title="No notes found"
          hint="Jot down quick reminders, meeting notes, project ideas, or reference info."
        />
      ) : (
        <div className="space-y-6">
          {pinnedNotes.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sage-700 mb-3">
                <Pin size={13} className="rotate-45" /> Pinned Notes
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onOpen={() => openEdit(note)}
                    onTogglePin={() => togglePin(note)}
                    onDelete={() => remove(note.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {unpinnedNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && (
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-3">Other Notes</div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unpinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onOpen={() => openEdit(note)}
                    onTogglePin={() => togglePin(note)}
                    onDelete={() => remove(note.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Note" : "New Note"}>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category (e.g. Work)"
              />
            </div>
            <div>
              <Label>Pin to top</Label>
              <button
                type="button"
                onClick={() => setPinned(!pinned)}
                className={`w-full py-2.5 px-3 rounded-xl border text-sm flex items-center justify-center gap-2 transition-colors ${
                  pinned
                    ? "bg-sage-50 border-sage-400 text-sage-700 font-medium"
                    : "bg-white border-cream-200 text-ink-600 hover:bg-cream-100"
                }`}
              >
                <Pin size={14} className={pinned ? "rotate-45 text-sage-600 fill-sage-600" : ""} />
                {pinned ? "Pinned" : "Not Pinned"}
              </button>
            </div>
          </div>

          <div>
            <Label>Content</Label>
            <Textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note..."
              className="font-mono text-xs sm:text-sm leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {editingId ? (
              <Button variant="danger" size="sm" onClick={() => void remove(editingId)}>
                <Trash2 size={14} /> Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void save()} disabled={saving || (!title.trim() && !content.trim())}>
                {saving ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function NoteCard({
  note,
  onOpen,
  onTogglePin,
  onDelete,
}: {
  note: Note;
  onOpen: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      className={`bg-white rounded-2xl border p-5 hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between ${
        note.pinned ? "border-sage-300 ring-1 ring-sage-200" : "border-cream-200 hover:border-sage-200"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-display font-semibold text-ink-800 text-base line-clamp-1 group-hover:text-sage-700 transition-colors">
            {note.title}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                note.pinned
                  ? "text-sage-600 bg-sage-50 hover:bg-sage-100"
                  : "text-ink-500/60 hover:text-ink-700 hover:bg-cream-100"
              }`}
              title={note.pinned ? "Unpin note" : "Pin note"}
            >
              <Pin size={14} className={note.pinned ? "rotate-45 fill-sage-600" : ""} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-rose-soft-500 hover:text-rose-soft-700 hover:bg-rose-soft-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete note"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-ink-700 line-clamp-4 whitespace-pre-line leading-relaxed font-sans">
          {note.content}
        </p>
      </div>

      <div className="mt-4 pt-2 border-t border-cream-100 flex items-center justify-between text-[11px] text-ink-500/70">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cream-100 text-ink-700 font-medium">
          <Tag size={10} />
          {note.category || "General"}
        </span>
        <span>{formatDay(note.updated_at || note.created_at)}</span>
      </div>
    </div>
  );
}
