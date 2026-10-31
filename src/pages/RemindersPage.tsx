import { useEffect, useState } from "react";
import { Bell, Plus, CheckCircle2, Circle, Trash2, Calendar, Clock, Pencil } from "lucide-react";
import { listReminders, upsertReminder, setReminderDone, deleteReminder } from "../lib/data";
import type { Reminder } from "../lib/types";
import { Button, EmptyState, Input, Label, Modal, SectionHeader, Textarea } from "../components/ui";
import { formatDay } from "../lib/utils";

export function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"pending" | "completed" | "all">("pending");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await listReminders();
      setReminders(data);
      setError("");
    } catch {
      setError("Could not load reminders.");
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
    setNotes("");
    setDueDate("");
    setDueTime("");
    setModalOpen(true);
  };

  const openEdit = (reminder: Reminder) => {
    setEditingId(reminder.id);
    setTitle(reminder.title);
    setNotes(reminder.notes || "");
    if (reminder.due_at) {
      const d = new Date(reminder.due_at);
      if (!isNaN(d.getTime())) {
        setDueDate(d.toISOString().slice(0, 10));
        setDueTime(d.toTimeString().slice(0, 5));
      } else {
        setDueDate("");
        setDueTime("");
      }
    } else {
      setDueDate("");
      setDueTime("");
    }
    setModalOpen(true);
  };

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      let due_at: string | null = null;
      if (dueDate) {
        due_at = dueTime ? `${dueDate}T${dueTime}:00` : `${dueDate}T12:00:00`;
      }
      await upsertReminder({
        id: editingId ?? undefined,
        title: title.trim(),
        notes: notes.trim(),
        due_at,
      });
      setModalOpen(false);
      await load();
    } catch {
      setError("Could not save reminder.");
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (reminder: Reminder) => {
    try {
      await setReminderDone(reminder.id, !reminder.done);
      await load();
    } catch {
      setError("Could not update reminder.");
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteReminder(id);
      if (editingId === id) setModalOpen(false);
      await load();
    } catch {
      setError("Could not delete reminder.");
    }
  };

  const filtered = reminders.filter((r) => {
    if (filter === "pending") return !r.done;
    if (filter === "completed") return r.done;
    return true;
  });

  const isOverdue = (dueAt: string | null) => {
    if (!dueAt) return false;
    return new Date(dueAt).getTime() < Date.now();
  };

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Reminders"
        subtitle="Set deadlines, upcoming follow-ups, and time-sensitive commitments so nothing slips through."
        action={
          <Button onClick={openNew}>
            <Plus size={16} /> New Reminder
          </Button>
        }
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(["pending", "completed", "all"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors ${
              filter === tab
                ? "bg-sage-600 text-white"
                : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
            }`}
          >
            {tab} (
            {tab === "pending"
              ? reminders.filter((r) => !r.done).length
              : tab === "completed"
              ? reminders.filter((r) => r.done).length
              : reminders.length}
            )
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Bell size={26} className="text-sage-600" />}
          title={filter === "completed" ? "No completed reminders" : "No reminders right now"}
          hint="Create a reminder with optional due date to keep yourself on track."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((reminder) => {
            const overdue = !reminder.done && isOverdue(reminder.due_at);
            return (
              <div
                key={reminder.id}
                className={`group bg-white rounded-2xl border p-4 sm:p-5 transition-all duration-200 flex items-start gap-3 hover:shadow-sm ${
                  reminder.done
                    ? "opacity-60 border-cream-200 bg-cream-50/50"
                    : overdue
                    ? "border-rose-soft-300 ring-1 ring-rose-soft-200"
                    : "border-cream-200 hover:border-sage-300"
                }`}
              >
                <button
                  type="button"
                  onClick={() => void toggleDone(reminder)}
                  className="mt-0.5 text-ink-400 hover:text-sage-600 transition-colors shrink-0"
                >
                  {reminder.done ? (
                    <CheckCircle2 size={20} className="text-sage-600 fill-sage-100" />
                  ) : (
                    <Circle size={20} />
                  )}
                </button>

                <div className="flex-1 min-w-0" onClick={() => openEdit(reminder)}>
                  <p
                    className={`text-sm font-semibold text-ink-800 cursor-pointer ${
                      reminder.done ? "line-through text-ink-500" : ""
                    }`}
                  >
                    {reminder.title}
                  </p>
                  {reminder.notes && (
                    <p className="text-xs text-ink-600 mt-1 line-clamp-2 leading-relaxed whitespace-pre-line">
                      {reminder.notes}
                    </p>
                  )}
                  {reminder.due_at && (
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          reminder.done
                            ? "bg-cream-100 text-ink-500"
                            : overdue
                            ? "bg-rose-soft-100 text-rose-soft-700 font-semibold"
                            : "bg-sage-50 text-sage-700"
                        }`}
                      >
                        <Clock size={11} />
                        {overdue ? "Overdue: " : "Due: "}
                        {formatDay(reminder.due_at)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => openEdit(reminder)}
                    className="p-1.5 text-ink-500 hover:text-ink-700 hover:bg-cream-100 rounded-lg"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(reminder.id)}
                    className="p-1.5 text-rose-soft-500 hover:text-rose-soft-700 hover:bg-rose-soft-100 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Reminder" : "New Reminder"}>
        <div className="space-y-4">
          <div>
            <Label>Reminder Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you need to remember?"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label>Due Time (Optional)</Label>
              <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Additional Notes</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context, links, or instructions..."
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
              <Button onClick={() => void save()} disabled={saving || !title.trim()}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
