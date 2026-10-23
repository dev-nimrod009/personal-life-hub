import { useEffect, useState } from "react";
import { Salad, Plus, Trash2 } from "lucide-react";
import { listGratitude, addGratitude, deleteGratitude } from "../lib/data";
import type { GratitudeEntry } from "../lib/types";
import { Button, EmptyState, Input, SectionHeader } from "../components/ui";
import { formatDay, todayISO } from "../lib/utils";

export function GratitudePage() {
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
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
    } catch {
      setError("Could not add the note.");
    } finally {
      setSaving(false);
      setContent("");
      load();
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
      <SectionHeader title="Gratitude" subtitle="Small good things, noticed daily" />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      <div className="bg-white rounded-2xl border border-cream-200 p-6 mb-6">
        <Input
          placeholder="Today I'm thankful for..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-ink-500">
            {total} thing{total === 1 ? "" : "s"} total · {todayCount} today
          </p>
          <Button onClick={add} disabled={saving || !content.trim()}>
            <Plus size={15} /> Add
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<Salad size={26} />}
          title="Nothing noted yet"
          hint="One line is enough — a warm coffee, a good laugh, a kind message."
        />
      ) : (
        <ul className="space-y-2">
          {entries.map((entry, idx) => (
            <li
              key={entry.id}
              className="group flex items-center gap-4 bg-white rounded-xl border border-cream-200 px-5 py-4 hover:shadow-sm transition-all duration-200"
            >
              <span className="w-8 h-8 rounded-full bg-sage-100 text-sage-600 text-xs font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink-800 leading-relaxed">{entry.content}</p>
                <p className="text-xs text-ink-500 mt-0.5">{formatDay(entry.entry_date)}</p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => remove(entry.id)}
                className="opacity-60 shrink-0"
                aria-label="Delete"
              >
                <Trash2 size={13} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
