import { useEffect, useState } from "react";
import { BookHeart, Plus, Trash2, Pencil, Calendar, ChevronRight } from "lucide-react";
import { listDiary, upsertDiary, deleteDiary } from "../lib/data";
import type { DiaryEntry } from "../lib/types";
import { Button, EmptyState, Label, Modal, SectionHeader, Textarea } from "../components/ui";
import { formatDay, todayISO } from "../lib/utils";

export function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [content, setContent] = useState("");
  const [entryId, setEntryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const openNewPage = () => {
    const today = todayISO();
    const existing = entries.find((e) => e.entry_date === today);
    setSelectedDate(today);
    setContent(existing?.content ?? "");
    setEntryId(existing?.id ?? null);
    setModalOpen(true);
  };

  const openEntry = (entry: DiaryEntry) => {
    setSelectedDate(entry.entry_date);
    setContent(entry.content);
    setEntryId(entry.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setContent("");
    setEntryId(null);
  };

  const save = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await upsertDiary(selectedDate, content.trim(), entryId);
      setError("");
      closeModal();
      await load();
    } catch {
      setError("Could not save the diary page.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!entryId) return;
    try {
      await deleteDiary(entryId);
      closeModal();
      await load();
    } catch {
      setError("Could not delete the diary page.");
    }
  };

  const today = todayISO();
  const todayEntry = entries.find((e) => e.entry_date === today);

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Diary"
        subtitle="One page per day, like a paper diary"
        action={
          <Button onClick={openNewPage}>
            <Plus size={16} /> {todayEntry ? "Open today's page" : "Add entry"}
          </Button>
        }
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {/* Today Prompt Card */}
      {!loading && !todayEntry && (
        <div className="mb-6 rounded-2xl bg-cream-100 border border-cream-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-sage-600" />
              <p className="font-display font-semibold text-ink-800">Today's page hasn't been written yet</p>
            </div>
            <p className="text-xs text-ink-500 mt-1">Take a quiet moment to reflect on your day.</p>
          </div>
          <Button size="sm" onClick={openNewPage}>
            <Plus size={14} /> Write today's page
          </Button>
        </div>
      )}

      {/* Entries List (Data First) */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<BookHeart size={26} className="text-sage-600" />}
          title="No diary pages yet"
          hint="Your entries will appear here. Tap 'Add entry' to write your first reflection."
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const isToday = entry.entry_date === today;
            return (
              <div
                key={entry.id}
                onClick={() => openEntry(entry)}
                className={`group bg-white rounded-2xl border p-5 transition-all duration-200 hover:shadow-md cursor-pointer ${
                  isToday ? "border-sage-300 ring-1 ring-sage-200" : "border-cream-200 hover:border-sage-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-semibold text-ink-800 text-base">{formatDay(entry.entry_date)}</p>
                    {isToday && (
                      <span className="rounded-full bg-sage-100 text-sage-700 text-[11px] font-medium px-2 py-0.5">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-ink-500/70 group-hover:text-sage-600 transition-colors">
                    <span className="text-xs hidden sm:inline">Edit</span>
                    <Pencil size={15} />
                  </div>
                </div>
                <p className="text-sm text-ink-700 line-clamp-3 leading-relaxed whitespace-pre-line font-serif">
                  {entry.content}
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-ink-500/70 border-t border-cream-100 pt-2.5">
                  <span>{entry.content.split(/\s+/).filter(Boolean).length} words</span>
                  <span className="flex items-center gap-1 text-sage-600 font-medium">
                    Read entry <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Entry Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={entryId ? `Edit Page — ${formatDay(selectedDate)}` : `New Page — ${formatDay(selectedDate)}`}
      >
        <div className="space-y-4">
          <div>
            <Label>Date of entry</Label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setSelectedDate(newDate);
                  const existing = entries.find((x) => x.entry_date === newDate);
                  if (existing) {
                    setContent(existing.content);
                    setEntryId(existing.id);
                  } else {
                    setContent("");
                    setEntryId(null);
                  }
                }}
                className="w-full rounded-xl border border-cream-200 bg-white px-3.5 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-sage-300 transition-shadow"
              />
              {selectedDate !== today && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const existing = entries.find((x) => x.entry_date === today);
                    setSelectedDate(today);
                    setContent(existing?.content ?? "");
                    setEntryId(existing?.id ?? null);
                  }}
                >
                  Today
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label>Your thoughts</Label>
            <Textarea
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Dear diary, today was..."
              autoFocus
              className="font-serif text-[15px] leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-cream-100">
            {entryId ? (
              <Button type="button" variant="danger" size="sm" onClick={remove}>
                <Trash2 size={14} /> Delete
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={closeModal}>
                Cancel
              </Button>
            )}
            <div className="flex items-center gap-2">
              {entryId && (
                <Button type="button" variant="ghost" size="sm" onClick={closeModal}>
                  Cancel
                </Button>
              )}
              <Button type="button" onClick={save} disabled={saving || !content.trim()}>
                {saving ? "Saving..." : entryId ? "Update page" : "Save page"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
