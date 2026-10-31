import { useEffect, useRef, useState } from "react";
import { BookOpen, Plus, Trash2, Search, ArrowLeft, Check, Sparkles } from "lucide-react";
import { listJournal, upsertJournal, deleteJournal } from "../lib/data";
import type { JournalEntry } from "../lib/types";
import { Button, EmptyState, Input, SectionHeader } from "../components/ui";
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

  // Full-Screen Writing Page
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("🌿 Peaceful");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  const saveTimerRef = useRef<number | null>(null);
  const activeEntryIdRef = useRef<string | null>(null);
  activeEntryIdRef.current = editingId;

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
    setSaveStatus("saved");
    setEditorOpen(true);
  };

  const openEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setMood(entry.mood || "🌿 Peaceful");
    setSaveStatus("saved");
    setEditorOpen(true);
  };

  const flushSave = async (currentTitle: string, currentContent: string, currentMood: string) => {
    if (!currentContent.trim() && !currentTitle.trim()) return;
    setSaveStatus("saving");
    try {
      const newId = await upsertJournal({
        id: activeEntryIdRef.current ?? undefined,
        title: currentTitle.trim() || "Untitled Reflection",
        content: currentContent,
        mood: currentMood,
      });
      if (newId && !activeEntryIdRef.current) {
        setEditingId(newId);
        activeEntryIdRef.current = newId;
      }
      setSaveStatus("saved");
      void load();
    } catch {
      setSaveStatus("unsaved");
    }
  };

  const handleContentChange = (newTitle: string, newContent: string, newMood: string) => {
    setTitle(newTitle);
    setContent(newContent);
    setMood(newMood);
    setSaveStatus("saving");

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void flushSave(newTitle, newContent, newMood);
    }, 700);
  };

  const closeEditor = async () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    await flushSave(title, content, mood);
    setEditorOpen(false);
    setEditingId(null);
    void load();
  };

  const remove = async (id: string) => {
    try {
      await deleteJournal(id);
      if (editingId === id) setEditorOpen(false);
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

  // Full-Screen Writing Page - Big, comfortable, auto-saving
  if (editorOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-cream-50 flex flex-col animate-fade-up">
        {/* Top Header */}
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-cream-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={closeEditor}
              className="p-2 rounded-xl text-ink-600 hover:bg-cream-100 transition-colors flex items-center gap-1.5 text-sm font-medium"
              aria-label="Back to Journal"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Journal</span>
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
                title="Delete reflection"
              >
                <Trash2 size={16} />
              </button>
            )}
            <Button size="sm" onClick={closeEditor}>
              Done
            </Button>
          </div>
        </header>

        {/* Large Writing Canvas */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-10 py-8">
          <div className="max-w-3xl mx-auto flex flex-col h-full space-y-5">
            {/* Mood selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              <span className="text-xs text-ink-400 mr-1 font-medium">Feeling:</span>
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => handleContentChange(title, content, m)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                    mood === m
                      ? "bg-sage-600 text-white font-medium shadow-xs"
                      : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => handleContentChange(e.target.value, content, mood)}
              placeholder="Give this reflection a title..."
              className="font-display text-2xl sm:text-4xl font-semibold text-ink-900 placeholder:text-ink-300 bg-transparent border-0 focus:outline-none w-full"
            />

            {/* Expansive Writing Area */}
            <textarea
              value={content}
              onChange={(e) => handleContentChange(title, e.target.value, mood)}
              placeholder="Write about your ideas, life lessons, deep reflections, and whatever is on your mind..."
              className="font-sans text-base sm:text-lg leading-relaxed text-ink-800 placeholder:text-ink-400/50 bg-transparent border-0 focus:outline-none w-full flex-1 min-h-[60vh] resize-none"
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
        title="Journal"
        subtitle="Write long-form reflections, explore personal thoughts, and capture meaningful life lessons."
        action={
          <Button onClick={openNew}>
            <Plus size={16} /> New Reflection
          </Button>
        }
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search journal..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedMood("all")}
            className={`text-xs px-3.5 py-2 rounded-xl transition-all whitespace-nowrap font-medium ${
              selectedMood === "all"
                ? "bg-sage-600 text-white shadow-xs"
                : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
            }`}
          >
            All
          </button>
          {MOOD_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMood(m)}
              className={`text-xs px-3 py-2 rounded-xl transition-all whitespace-nowrap font-medium ${
                selectedMood === m
                  ? "bg-sage-600 text-white shadow-xs"
                  : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={26} className="text-sage-600" />}
          title="No reflections yet"
          hint={search ? "No entries match your search." : "Write your thoughts freely. Tap New Reflection to start."}
        />
      ) : (
        <div className="space-y-3.5">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => openEdit(entry)}
              className="bg-white rounded-2xl border border-cream-200 p-5 sm:p-6 hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-display font-semibold text-lg text-ink-800 group-hover:text-sage-700 transition-colors">
                    {entry.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-ink-400 font-medium">
                      {formatDay(entry.created_at)}
                    </span>
                    {entry.mood && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-cream-100 text-ink-700 font-medium">
                        {entry.mood}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void remove(entry.id);
                  }}
                  className="p-1.5 text-rose-soft-500 hover:text-rose-soft-700 hover:bg-rose-soft-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete entry"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <p className="text-sm text-ink-700 line-clamp-3 leading-relaxed whitespace-pre-line mt-3">
                {entry.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
