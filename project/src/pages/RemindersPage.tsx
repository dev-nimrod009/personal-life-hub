import { useEffect, useState } from "react";
import { Bell, Plus, Trash2, CheckCircle2, Circle, CalendarClock } from "lucide-react";
import { listReminders, upsertReminder, setReminderDone, deleteReminder } from "../lib/data";
import type { Reminder } from "../lib/types";
import { Button, EmptyState, Input, Label, Modal, SectionHeader, Textarea } from "../components/ui";
import { formatDue, isOverdue } from "../lib/utils";

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [form, setForm] = useState({ title: "", notes: "", due_at: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setReminders(await listReminders());
      setError("");
    } catch {
      setError("Could not read reminders from this device.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setEditing(null);
    setForm({ title: "", notes: "", due_at: "" });
    setOpen(true);
  };

  const startEdit = (reminder: Reminder) => {
    setEditing(reminder);
    setForm({
      title: reminder.title,
      notes: reminder.notes,
      due_at: reminder.due_at ? toLocalInputValue(new Date(reminder.due_at)) : "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = { ...form, due_at: form.due_at ? new Date(form.due_at).toISOString() : null };
    try {
      await upsertReminder(editing ? { id: editing.id, ...payload } : payload);
      setError("");
    } catch {
      setError("Could not save the reminder.");
    } finally {
      setSaving(false);
      setOpen(false);
      load();
    }
  };

  const toggleDone = async (reminder: Reminder) => {
    try {
      await setReminderDone(reminder.id, !reminder.done);
    } catch {
      setError("Could not update the reminder.");
    }
    load();
  };

  const remove = async (id: string) => {
    try {
      await deleteReminder(id);
    } catch {
      setError("Could not delete the reminder.");
    }
    load();
  };

  const open2 = reminders.filter((r) => !r.done);
  const done2 = reminders.filter((r) => r.done);

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Reminders"
        subtitle="Things you don't want to forget"
        action={
          <Button onClick={startNew}>
            <Plus size={16} /> New reminder
          </Button>
        }
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : open2.length === 0 && done2.length === 0 ? (
        <EmptyState
          icon={<Bell size={26} />}
          title="No reminders yet"
          hint="Add one with a time and it will show up on your Today page."
        />
      ) : (
        <div className="space-y-6">
          <ul className="space-y-2">
            {open2.map((reminder) => {
              const overdue = isOverdue(reminder.due_at);
              return (
                <li
                  key={reminder.id}
                  className="group flex items-start gap-3 bg-white rounded-xl border border-cream-200 px-4 py-3 hover:shadow-sm transition-all duration-200"
                >
                  <button onClick={() => toggleDone(reminder)} className="mt-0.5 shrink-0" aria-label="Mark done">
                    <Circle size={20} className="text-ink-500/50 hover:text-sage-500 transition-colors" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-800">{reminder.title}</p>
                    {reminder.notes && <p className="text-xs text-ink-500 mt-0.5 whitespace-pre-wrap">{reminder.notes}</p>}
                    <p className={`text-xs mt-1 flex items-center gap-1 ${overdue ? "text-clay-600 font-semibold" : "text-ink-500"}`}>
                      <CalendarClock size={12} /> {formatDue(reminder.due_at)}
                      {overdue && " · overdue"}
                    </p>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(reminder)} aria-label="Edit">
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => remove(reminder.id)} aria-label="Delete">
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          {done2.length > 0 && (
            <div>
              <h3 className="font-display text-sm font-semibold text-ink-500 uppercase tracking-wide mb-2">Completed</h3>
              <ul className="space-y-2">
                {done2.map((reminder) => (
                  <li
                    key={reminder.id}
                    className="group flex items-center gap-3 bg-cream-100/60 rounded-xl px-4 py-3 transition-colors"
                  >
                    <button onClick={() => toggleDone(reminder)} className="shrink-0" aria-label="Mark not done">
                      <CheckCircle2 size={20} className="text-sage-300" />
                    </button>
                    <span className="flex-1 text-sm line-through text-ink-500/70">{reminder.title}</span>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => remove(reminder.id)}
                      className="opacity-0 group-hover:opacity-100"
                      aria-label="Delete"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit reminder" : "New reminder"}>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What should you remember?"
            />
          </div>
          <div>
            <Label>When</Label>
            <input
              type="datetime-local"
              value={form.due_at}
              onChange={(e) => setForm({ ...form, due_at: e.target.value })}
              className="w-full rounded-xl border border-cream-200 bg-white px-3.5 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional details..."
            />
          </div>
          <Button onClick={save} disabled={saving || !form.title.trim()} className="w-full">
            {saving ? "Saving..." : editing ? "Save changes" : "Save reminder"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
