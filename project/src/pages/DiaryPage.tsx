import { useEffect, useState } from "react";
import { useLiveLoad } from "../lib/useLiveLoad";
import { Heart, ChevronLeft, ChevronRight, Trash2, RotateCcw } from "lucide-react";
import { listDiary, upsertDiary, deleteDiary } from "../lib/data";
import type { DiaryEntry } from "../lib/types";
import { Button, EmptyState, SectionHeader, Textarea } from "../components/ui";
import { formatDay, todayISO } from "../lib/utils";

export function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [content, setContent] = useState("");
  const [entryId, setEntryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const load = async () => {
    try {
      setEntries(await listDiary());
      setError("");
    } catch {
      setError("Could not read the diary from this device.");
    } finally {
      setLoading(false);
    }
  };

  useLiveLoad(load);

  useEffect(() => {
    const existing = entries.find((e) => e.entry_date === selectedDate);
    setContent(existing?.content ?? "");
    setEntryId(existing?.id ?? null);
  }, [entries, selectedDate]);

  const shiftDate = (days: number) => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d + days);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    setSelectedDate(iso);
  };

  const save = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await upsertDiary(selectedDate, content, entryId);
      setError("");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      await load();
    } catch {
      setError("Could not save the page.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!entryId) return;
    try {
      await deleteDiary(entryId);
    } catch {
      setError("Could not delete the page.");
    }
    load();
  };

  const others = entries.filter((e) => e.entry_date !== selectedDate);

  return (
    <div className="animate-fade-up">
      <SectionHeader title="Diary" subtitle="One page per day, like a paper diary" />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}
      {saveSuccess && <div className="mb-4 rounded-xl bg-sage-100 text-sage-700 text-sm px-4 py-3">Saved successfully!</div>}

      <div className="bg-white rounded-2xl border border-cream-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => shiftDate(-1)} aria-label="Previous day">
            <ChevronLeft size={16} />
          </Button>
          <div className="text-center">
            <p className="font-display text-lg font-semibold text-ink-800">{formatDay(selectedDate)}</p>
            {selectedDate === todayISO() && <p className="text-xs text-sage-600 font-medium">Today</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => shiftDate(1)} aria-label="Next day">
            <ChevronRight size={16} />
          </Button>
        </div>
        <Textarea
          rows={9}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Dear diary..."
          className="border-0 bg-cream-50/60 px-4 py-3 text-[15px] leading-relaxed"
        />
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setContent(""); setEntryId(null); }} disabled={!content.trim()}>
              <RotateCcw size={13} /> Clear
            </Button>
            <Button variant="danger" size="sm" onClick={remove} disabled={!entryId}>
              <Trash2 size={13} /> Delete page
            </Button>
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : entryId ? "Update page" : "Save page"}
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="font-display text-lg font-semibold text-ink-700 mb-3">Earlier pages</h3>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-cream-100 animate-pulse" />
            ))}
          </div>
        ) : others.length === 0 ? (
          <EmptyState icon={<Heart size={22} />} title="No earlier pages yet" hint="Each day gets its own page." />
        ) : (
          <ul className="space-y-2">
            {others.slice(0, 14).map((entry) => (
              <li key={entry.id}>
                <button
                  onClick={() => setSelectedDate(entry.entry_date)}
                  className="w-full text-left bg-white rounded-xl border border-cream-200 px-4 py-3 hover:border-sage-300 hover:shadow-sm transition-all duration-200"
                >
                  <p className="text-sm font-semibold text-ink-800">{formatDay(entry.entry_date)}</p>
                  <p className="text-xs text-ink-500 mt-0.5 line-clamp-1">{entry.content || "Empty page"}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
