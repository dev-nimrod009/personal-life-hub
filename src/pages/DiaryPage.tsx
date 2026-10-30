import { useEffect, useRef, useState } from "react";
import { BookHeart, Plus, Trash2, Calendar, ArrowLeft, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { listDiary, upsertDiary, deleteDiary } from "../lib/data";
import type { DiaryEntry } from "../lib/types";
import { Button, EmptyState, SectionHeader } from "../components/ui";
import { formatDay, todayISO } from "../lib/utils";

export function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Full-Screen Writing Page
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [content, setContent] = useState("");
  const [entryId, setEntryId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  const saveTimerRef = useRef<number | null>(null);
  const activeEntryIdRef = useRef<string | null>(null);
  activeEntryIdRef.current = entryId;

  const load = async () => {
    try {
      const data = await listDiary();
      setEntries(data);
      setError("");
    } catch {
      setError("Could not read the diary from this device.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openForDate = (dateStr: string) => {
    const existing = entries.find((e) => e.entry_date === dateStr);
    setSelectedDate(dateStr);
    setContent(existing?.content ?? "");
    setEntryId(existing?.id ?? null);
    activeEntryIdRef.current = existing?.id ?? null;
    setSaveStatus("saved");
    setEditorOpen(true);
  };

  const flushSave = async (dateStr: string, currentContent: string) => {
    if (!currentContent.trim()) return;
    setSaveStatus("saving");
    try {
      const newId = await upsertDiary(dateStr, currentContent.trim(), activeEntryIdRef.current);
      if (newId && !activeEntryIdRef.current) {
        setEntryId(newId);
        activeEntryIdRef.current = newId;
      }
      setSaveStatus("saved");
      void load();
    } catch {
      setSaveStatus("unsaved");
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setSaveStatus("saving");

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void flushSave(selectedDate, newContent);
    }, 700);
  };

  const closeEditor = async () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    await flushSave(selectedDate, content);
    setEditorOpen(false);
    setEntryId(null);
    void load();
  };

  const removeCurrent = async () => {
    if (!activeEntryIdRef.current) {
      setEditorOpen(false);
      return;
    }
    try {
      await deleteDiary(activeEntryIdRef.current);
      setEditorOpen(false);
      setEntryId(null);
      await load();
    } catch {
      setError("Could not delete the diary page.");
    }
  };

  const shiftDate = (delta: number) => {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() + delta);
    const newDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    void flushSave(selectedDate, content);
    openForDate(newDateStr);
  };

  const today = todayISO();
  const todayEntry = entries.find((e) => e.entry_date === today);

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
              aria-label="Back to Diary"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Diary</span>
            </button>
            <span className="text-cream-300">|</span>
            <div className="flex items-center gap-1.5 text-xs text-ink-500">
              {saveStatus === "saving" ? (
                <span className="text-honey-600 flex items-center gap-1">Saving draft...</span>
              ) : saveStatus === "saved" ? (
                <span className="text-sage-600 flex items-center gap-1">
                  <Check size={13} /> Auto-saved
                </span>
              ) : (
                <span className="text-ink-400">Unsaved changes</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {entryId && (
              <button
                onClick={() => void removeCurrent()}
                className="p-2 text-rose-soft-500 hover:text-rose-soft-700 hover:bg-rose-soft-100 rounded-xl transition-colors"
                title="Delete this page"
              >
                <Trash2 size={16} />
              </button>
            )}
            <Button size="sm" onClick={closeEditor}>
              Done
            </Button>
          </div>
        </header>

        {/* Big, Clean Writing Canvas */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-10 py-8">
          <div className="max-w-3xl mx-auto flex flex-col h-full space-y-6">
            {/* Date Switcher */}
            <div className="flex items-center justify-between bg-white border border-cream-200 rounded-2xl px-4 py-3 shadow-xs">
              <button
                onClick={() => shiftDate(-1)}
                className="p-1.5 rounded-lg text-ink-600 hover:bg-cream-100 transition-colors"
                aria-label="Previous day"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="text-center">
                <p className="font-display text-lg font-semibold text-ink-800">
                  {formatDay(selectedDate)}
                </p>
                {selectedDate === today && (
                  <span className="text-[11px] text-sage-600 font-medium">Today's Page</span>
                )}
              </div>

              <button
                onClick={() => shiftDate(1)}
                className="p-1.5 rounded-lg text-ink-600 hover:bg-cream-100 transition-colors"
                aria-label="Next day"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Expansive Textarea */}
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="What happened today? How did you feel? Write freely — your diary auto-saves continuously..."
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
        title="Diary"
        subtitle="One full page per day with auto-save, just like a private notebook"
        action={
          <Button onClick={() => openForDate(today)}>
            <Plus size={16} /> {todayEntry ? "Open Today's Page" : "Add Entry"}
          </Button>
        }
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {/* Today Prompt Card */}
      {!loading && !todayEntry && (
        <div
          onClick={() => openForDate(today)}
          className="mb-6 rounded-2xl bg-sage-50 border border-sage-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-sage-100/60 transition-colors"
        >
          <div>
            <h3 className="font-display text-lg font-semibold text-ink-800">
              Today's page is waiting for you
            </h3>
            <p className="text-sm text-ink-600 mt-1">
              Capture a thought, memorable moment, or lesson from today.
            </p>
          </div>
          <Button size="sm" onClick={() => openForDate(today)}>
            Write Today
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<BookHeart size={26} className="text-sage-600" />}
          title="No diary entries yet"
          hint="Start your daily diary today. Tap 'Add Entry' above to begin writing."
        />
      ) : (
        <div className="space-y-3.5">
          {entries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => openForDate(entry.entry_date)}
              className="bg-white rounded-2xl border border-cream-200 p-5 sm:p-6 hover:shadow-md transition-all duration-200 cursor-pointer group flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-display font-semibold text-ink-800 text-base group-hover:text-sage-700 transition-colors">
                    {formatDay(entry.entry_date)}
                  </span>
                  {entry.entry_date === today && (
                    <span className="text-[11px] font-medium text-sage-600 bg-sage-50 px-2 py-0.5 rounded-full border border-sage-200">
                      Today
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-700 line-clamp-3 leading-relaxed whitespace-pre-line">
                  {entry.content}
                </p>
              </div>

              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await deleteDiary(entry.id);
                    await load();
                  } catch {
                    setError("Could not delete entry.");
                  }
                }}
                className="p-1.5 text-rose-soft-500 hover:text-rose-soft-700 hover:bg-rose-soft-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                title="Delete entry"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
