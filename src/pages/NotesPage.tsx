import { useEffect, useRef, useState } from "react";
import { Notebook, Plus, Pin, Trash2, Search, ArrowLeft, Lock, Unlock, Check, Shield } from "lucide-react";
import { listNotes, upsertNote, setNotePinned, deleteNote } from "../lib/data";
import type { Note } from "../lib/types";
import { Button, EmptyState, Input, SectionHeader } from "../components/ui";
import { formatDay } from "../lib/utils";
import { getStoredValue, setStoredValue } from "../lib/storage";

const CATEGORIES = ["General", "Work", "Personal", "Private"] as const;
type Category = (typeof CATEGORIES)[number];

const PRIVATE_KEY_STORAGE = "lifehub:notes:private-key";

async function hashKey(k: string): Promise<string> {
  const data = new TextEncoder().encode(k);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Private notes lock state (session-only memory)
  const [privateUnlocked, setPrivateUnlocked] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [lockPasscode, setLockPasscode] = useState("");
  const [lockError, setLockError] = useState("");
  const [pendingNoteToOpen, setPendingNoteToOpen] = useState<Note | null>(null);
  type PendingUnlockAction =
    | { type: "open-note"; note: Note }
    | { type: "filter-category"; category: "Private" }
    | { type: "set-editor-category"; category: "Private" }
    | { type: "new-private-note" }
    | null;
  const [pendingUnlockAction, setPendingUnlockAction] = useState<PendingUnlockAction>(null);

  // Full-screen page editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Category>("General");
  const [pinned, setPinned] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  const saveTimerRef = useRef<number | null>(null);
  const activeNoteIdRef = useRef<string | null>(null);
  activeNoteIdRef.current = editingId;

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

  const openNew = (defaultCat?: Category) => {
    const targetCat = defaultCat ?? (selectedCategory !== "all" && CATEGORIES.includes(selectedCategory as Category) ? (selectedCategory as Category) : "General");
    if (targetCat === "Private" && !privateUnlocked) {
      setLockError("");
      setLockPasscode("");
      setPendingUnlockAction({ type: "new-private-note" });
      setLockModalOpen(true);
      return;
    }
    setEditingId(null);
    setTitle("");
    setContent("");
    setCategory(targetCat);
    setPinned(false);
    setSaveStatus("saved");
    setEditorOpen(true);
  };

  const openEdit = (note: Note) => {
    if (note.category === "Private" && !privateUnlocked) {
      setLockError("");
      setLockPasscode("");
      setPendingUnlockAction({ type: "open-note", note });
      setLockModalOpen(true);
      return;
    }
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setCategory((CATEGORIES.includes(note.category as Category) ? note.category : "General") as Category);
    setPinned(note.pinned || false);
    setSaveStatus("saved");
    setEditorOpen(true);
  };

  // Immediate save flush
  const flushSave = async (
    currentTitle: string,
    currentContent: string,
    currentCategory: string,
    isPinned: boolean
  ) => {
    if (!currentTitle.trim() && !currentContent.trim()) return;
    setSaveStatus("saving");
    try {
      const newId = await upsertNote({
        id: activeNoteIdRef.current ?? undefined,
        title: currentTitle.trim() || "Untitled Note",
        content: currentContent,
        category: currentCategory || "General",
        pinned: isPinned,
      });
      if (newId && !activeNoteIdRef.current) {
        setEditingId(newId);
        activeNoteIdRef.current = newId;
      }
      setSaveStatus("saved");
      void load();
    } catch {
      setSaveStatus("unsaved");
    }
  };

  // Trigger debounced auto-save on change
  const handleContentChange = (newTitle: string, newContent: string, newCategory: Category, isPinned: boolean) => {
    setTitle(newTitle);
    setContent(newContent);
    setCategory(newCategory);
    setPinned(isPinned);
    setSaveStatus("saving");

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void flushSave(newTitle, newContent, newCategory, isPinned);
    }, 700);
  };

  const closeEditor = async () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    await flushSave(title, content, category, pinned);
    setEditorOpen(false);
    setEditingId(null);
    void load();
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
      if (editingId === id) setEditorOpen(false);
      await load();
    } catch {
      setError("Could not delete note.");
    }
  };

  const handleUnlockPrivate = async () => {
    setLockError("");
    if (!lockPasscode.trim()) {
      setLockError("Please enter your private passcode.");
      return;
    }
    const storedHash = getStoredValue(PRIVATE_KEY_STORAGE);
    const enteredHash = await hashKey(lockPasscode);
    const isMatch = !storedHash || enteredHash === storedHash;

    if (!storedHash) {
      // First time setting private passcode
      setStoredValue(PRIVATE_KEY_STORAGE, enteredHash);
    }

    if (isMatch) {
      setPrivateUnlocked(true);
      setLockModalOpen(false);
      setLockPasscode("");
      const action = pendingUnlockAction;
      setPendingUnlockAction(null);

      if (action) {
        if (action.type === "open-note") {
          openEdit(action.note);
        } else if (action.type === "set-editor-category") {
          setCategory("Private");
          handleContentChange(title, content, "Private", pinned);
        } else if (action.type === "filter-category") {
          setSelectedCategory("Private");
        } else if (action.type === "new-private-note") {
          openNew("Private");
        }
      } else if (pendingNoteToOpen) {
        openEdit(pendingNoteToOpen);
        setPendingNoteToOpen(null);
      }
    } else {
      setLockError("Incorrect passcode. Try again.");
    }
  };

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === "all" || n.category === selectedCategory;
    if (n.category === "Private" && !privateUnlocked && selectedCategory !== "Private") {
      // Don't show preview of private notes in 'All' unless unlocked
      return false;
    }
    return matchesSearch && matchesCat;
  });

  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.pinned);

  // Full-Screen Writing Page
  if (editorOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-cream-50 flex flex-col animate-fade-up">
        {/* Top App Bar */}
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-cream-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={closeEditor}
              className="p-2 rounded-xl text-ink-600 hover:bg-cream-100 transition-colors flex items-center gap-1.5 text-sm font-medium"
              aria-label="Back to Notes"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Notes</span>
            </button>
            <span className="text-cream-300">|</span>
            <div className="flex items-center gap-1.5 text-xs text-ink-500">
              {saveStatus === "saving" ? (
                <span className="text-honey-600 flex items-center gap-1">Saving draft...</span>
              ) : saveStatus === "saved" ? (
                <span className="text-sage-600 flex items-center gap-1">
                  <Check size={13} /> Saved
                </span>
              ) : (
                <span className="text-ink-400">Unsaved changes</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {editingId && (
              <button
                onClick={() => void remove(editingId)}
                className="p-2 text-rose-soft-500 hover:text-rose-soft-700 hover:bg-rose-soft-100 rounded-xl transition-colors"
                title="Delete note"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={() => handleContentChange(title, content, category, !pinned)}
              className={`p-2 rounded-xl border transition-colors ${
                pinned
                  ? "bg-sage-50 border-sage-300 text-sage-700 font-medium"
                  : "bg-white border-cream-200 text-ink-500 hover:bg-cream-100"
              }`}
              title={pinned ? "Unpin note" : "Pin note to top"}
            >
              <Pin size={16} className={pinned ? "rotate-45 fill-sage-600 text-sage-600" : ""} />
            </button>
            <Button size="sm" onClick={closeEditor}>
              Done
            </Button>
          </div>
        </header>

        {/* Writing Body - Spacious, Readable, Responsive */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          <div className="max-w-3xl mx-auto flex flex-col h-full space-y-4">
            {/* Category Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              <span className="text-xs text-ink-400 mr-1 font-medium">Category:</span>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    if (cat === "Private" && !privateUnlocked) {
                      setPendingUnlockAction({ type: "set-editor-category", category: "Private" });
                      setLockError("");
                      setLockPasscode("");
                      setLockModalOpen(true);
                      return;
                    }
                    handleContentChange(title, content, cat, pinned);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    category === cat
                      ? cat === "Private"
                        ? "bg-rose-soft-600 text-white font-medium shadow-xs"
                        : "bg-sage-600 text-white font-medium shadow-xs"
                      : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
                  }`}
                >
                  {cat === "Private" && <Lock size={11} className="inline mr-1" />}
                  {cat}
                </button>
              ))}
            </div>

            {/* Title Input */}
            <input
              type="text"
              value={title}
              onChange={(e) => handleContentChange(e.target.value, content, category, pinned)}
              placeholder="Title..."
              className="font-display text-2xl sm:text-4xl font-semibold text-ink-900 placeholder:text-ink-300 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0 w-full p-0 tracking-tight shadow-none"
            />

            {/* Note Writing Component - Big, auto-expanding space */}
            <textarea
              value={content}
              onChange={(e) => handleContentChange(title, e.target.value, category, pinned)}
              placeholder="Write your notes, lists, reference guides, or personal thoughts here..."
              className="font-sans text-base sm:text-lg leading-relaxed text-ink-800 placeholder:text-ink-400/50 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0 w-full flex-1 min-h-[60vh] resize-none p-0 shadow-none"
              autoFocus
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Notepad"
        subtitle="Jot down quick reference notes, checklists, meeting memos, and organized private thoughts."
        action={
          <Button onClick={() => openNew()}>
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
            className={`text-xs px-3.5 py-2 rounded-xl transition-all whitespace-nowrap font-medium ${
              selectedCategory === "all"
                ? "bg-sage-600 text-white shadow-xs"
                : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                if (cat === "Private" && !privateUnlocked) {
                  setPendingUnlockAction({ type: "filter-category", category: "Private" });
                  setLockError("");
                  setLockPasscode("");
                  setPendingNoteToOpen(null);
                  setLockModalOpen(true);
                  return;
                }
                setSelectedCategory(cat);
              }}
              className={`text-xs px-3.5 py-2 rounded-xl transition-all whitespace-nowrap font-medium flex items-center gap-1 ${
                selectedCategory === cat
                  ? cat === "Private"
                    ? "bg-rose-soft-600 text-white shadow-xs"
                    : "bg-sage-600 text-white shadow-xs"
                  : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
              }`}
            >
              {cat === "Private" && (
                privateUnlocked ? <Unlock size={12} className="text-emerald-500" /> : <Lock size={12} />
              )}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <EmptyState
          icon={<Notebook size={26} className="text-sage-600" />}
          title={selectedCategory === "Private" ? "Private Notes" : "No notes found"}
          hint={
            selectedCategory === "Private"
              ? "Your private notes are protected. Tap New Note to create one."
              : search
              ? "No notes matched your search."
              : "Tap '+ New Note' to start writing."
          }
        />
      ) : (
        <div className="space-y-6">
          {pinnedNotes.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-sage-700 mb-3">
                <Pin size={12} className="rotate-45 fill-sage-600" /> Pinned Notes
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

      {/* Private Notes Lock Modal (Independent, no form/browser password prompts) */}
      {lockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-xs animate-fade-up">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-cream-200 p-6 shadow-lg space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-soft-100 text-rose-soft-600 mx-auto flex items-center justify-center mb-3">
                <Shield size={22} />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink-800">Private Notes Lock</h3>
              <p className="text-xs text-ink-500 mt-1">
                {getStoredValue(PRIVATE_KEY_STORAGE)
                  ? "Enter your private passcode to access private notes"
                  : "Set a private passcode or PIN for your private notes"}
              </p>
            </div>

            {lockError && (
              <div className="rounded-xl bg-rose-soft-100 text-rose-soft-600 text-xs px-3 py-2 text-center">
                {lockError}
              </div>
            )}

            {/* Custom protected input element: strictly isolated from Chrome password manager */}
            <div className="space-y-1">
              <input
                type="password"
                inputMode="text"
                name="lh_priv_k"
                id="lh_priv_k"
                autoComplete="off"
                data-1p-ignore="true"
                data-lpignore="true"
                data-form-type="other"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={lockPasscode}
                onChange={(e) => setLockPasscode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleUnlockPrivate();
                }}
                placeholder="Passcode or PIN"
                autoFocus
                className="w-full text-center tracking-widest text-lg py-2.5 px-4 rounded-xl border border-cream-200 bg-white text-ink-800 focus:outline-none focus:border-sage-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setLockModalOpen(false);
                  setLockPasscode("");
                  setPendingUnlockAction(null);
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => void handleUnlockPrivate()}>
                Unlock
              </Button>
            </div>
          </div>
        </div>
      )}
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
  const isPrivate = note.category === "Private";
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
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium ${
            isPrivate ? "bg-rose-soft-100 text-rose-soft-700" : "bg-cream-100 text-ink-700"
          }`}
        >
          {isPrivate && <Lock size={10} />}
          {note.category || "General"}
        </span>
        <span>{formatDay(note.updated_at || note.created_at)}</span>
      </div>
    </div>
  );
}
