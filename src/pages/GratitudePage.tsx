import { useEffect, useState } from "react";
import { Sparkles, Plus, Trash2, Calendar, Heart } from "lucide-react";
import { listGratitude, addGratitude, deleteGratitude } from "../lib/data";
import type { GratitudeEntry } from "../lib/types";
import { Button, EmptyState, Label, Modal, SectionHeader, Textarea } from "../components/ui";
import { formatDay, todayISO } from "../lib/utils";

export function GratitudePage() {
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");

  const load = async () => {
    try {
      setEntries(await listGratitude());
      setError("");
    } catch {
      setError("Could not read gratitude notes from this device.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await addGratitude(todayISO(), content.trim());
      setError("");
      setContent("");
      setModalOpen(false);
      await load();
    } catch {
      setError("Could not add the gratitude note.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteGratitude(id);
    } catch {
      setError("Could not delete the note.");
    }
    load();
  };

  const todayCount = entries.filter((e) => e.entry_date === todayISO()).length;
  const total = entries.length;

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Gratitude Sanctuary"
        subtitle="Write down the small blessings, kind gestures, and positive moments you are thankful for."
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Add note
          </Button>
        }
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {/* View Mode Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setViewMode("daily")}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-semibold transition-all ${
            viewMode === "daily" ? "bg-sage-600 text-white shadow-sm" : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
          }`}
        >
          Daily Gratitude Feed
        </button>
        <button
          onClick={() => setViewMode("weekly")}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-semibold transition-all ${
            viewMode === "weekly" ? "bg-sage-600 text-white shadow-sm" : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
          }`}
        >
          Weekly Summary &amp; Highlights
        </button>
      </div>

      {/* Summary Info */}
      <div className="flex items-center justify-between bg-cream-100/70 border border-cream-200 rounded-2xl px-5 py-3 mb-6">
        <p className="text-xs text-ink-600 font-medium">
          {total} moment{total === 1 ? "" : "s"} of gratitude logged · {todayCount} today
        </p>
        <span className="text-xs text-sage-600 font-semibold flex items-center gap-1">
          <Sparkles size={13} /> Daily streak active
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : viewMode === "daily" ? (
        entries.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={26} className="text-honey-500" />}
            title="Nothing noted yet"
            hint="One line is enough — a warm coffee, a good laugh, a kind message. Tap 'Add note' to begin."
          />
        ) : (
          <ul className="space-y-2.5">
            {entries.map((entry, idx) => (
              <li
                key={entry.id}
                className="group flex items-start gap-3.5 bg-white rounded-2xl border border-cream-200 px-5 py-4 hover:shadow-sm transition-all duration-200"
              >
                <span className="w-8 h-8 rounded-xl bg-honey-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink-800 leading-relaxed font-medium">{entry.content}</p>
                  <p className="text-xs text-ink-500 mt-1">{formatDay(entry.entry_date)}</p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => remove(entry.id)}
                  className="opacity-70 hover:opacity-100 shrink-0"
                  aria-label="Delete"
                >
                  <Trash2 size={13} />
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-cream-200 p-6">
            <h3 className="font-display text-base font-semibold text-ink-800 flex items-center gap-2 mb-3">
              <Calendar size={18} className="text-sage-600" /> Weekly Appreciation Highlights
            </h3>
            <p className="text-xs text-ink-600 leading-relaxed mb-4">
              Reviewing your recent gratitude entries reveals a steady thread of joy in everyday simple things. Here is your recent sanctuary log:
            </p>
            {entries.length === 0 ? (
              <p className="text-xs text-ink-500">No gratitude entries recorded yet this week.</p>
            ) : (
              <div className="space-y-2">
                {entries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="bg-cream-50 rounded-xl p-3 border border-cream-200 flex items-start gap-2.5">
                    <Heart size={14} className="text-sage-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-ink-800 font-medium">{entry.content}</p>
                      <p className="text-[10px] text-ink-500 mt-0.5">{formatDay(entry.entry_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Gratitude Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setContent(""); }} title="Add Gratitude Note">
        <div className="space-y-4">
          <div>
            <Label>Today I am thankful for...</Label>
            <Textarea
              rows={4}
              placeholder="A kind gesture, fresh air, a delicious meal, progress made..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-cream-100">
            <Button variant="ghost" size="sm" onClick={() => { setModalOpen(false); setContent(""); }}>
              Cancel
            </Button>
            <Button onClick={add} disabled={saving || !content.trim()}>
              {saving ? "Saving..." : "Save note"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
