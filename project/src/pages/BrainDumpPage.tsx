import { useEffect, useState } from "react";
import { Inbox, Plus, Trash2, ClipboardList, Notebook } from "lucide-react";
import { listInbox, addInboxItem, deleteInboxItem, addDayPlannerTask, upsertNote } from "../lib/data";
import type { InboxItem } from "../lib/types";
import { Button, EmptyState, Input, SectionHeader } from "../components/ui";
import { formatDay, todayISO } from "../lib/utils";

export function BrainDumpPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setItems(await listInbox());
      setError("");
    } catch {
      setError("Could not read the inbox from this device.");
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
      await addInboxItem(content.trim());
      setContent("");
      setError("");
    } catch {
      setError("Could not save the thought.");
    } finally {
      setSaving(false);
      load();
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteInboxItem(id);
    } catch {
      setError("Could not remove the thought.");
    }
    load();
  };

  const moveToToday = async (item: InboxItem) => {
    try {
      await addDayPlannerTask(item.content, todayISO());
      await deleteInboxItem(item.id);
      setError("");
    } catch {
      setError("Could not move the thought to today's plan.");
    }
    load();
  };

  const moveToNotes = async (item: InboxItem) => {
    try {
      await upsertNote({ title: item.content.slice(0, 60), content: item.content });
      await deleteInboxItem(item.id);
      setError("");
    } catch {
      setError("Could not move the thought to the notepad.");
    }
    load();
  };

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Brain Dump"
        subtitle="Dump a thought now, organize it later"
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Whatever's on your mind..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          autoFocus
        />
        <Button onClick={add} disabled={saving || !content.trim()}>
          <Plus size={16} />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Inbox size={26} />}
          title="Your inbox is empty"
          hint="Random thought, idea, or something to remember? Type it above — no organizing required."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="bg-white rounded-xl border border-cream-200 px-4 py-3 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3">
                <span className="flex-1 min-w-0 text-sm text-ink-800 leading-relaxed">{item.content}</span>
                <Button variant="danger" size="sm" onClick={() => remove(item.id)} aria-label="Delete">
                  <Trash2 size={13} />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-cream-100">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">Move to:</span>
                <Button variant="secondary" size="sm" onClick={() => moveToToday(item)}>
                  <ClipboardList size={12} /> Today's plan
                </Button>
                <Button variant="secondary" size="sm" onClick={() => moveToNotes(item)}>
                  <Notebook size={12} /> Notepad
                </Button>
                <span className="ml-auto text-xs text-ink-500/70">{formatDay(item.created_at.slice(0, 10))}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
