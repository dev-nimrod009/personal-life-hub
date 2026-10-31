import { useEffect, useState } from "react";
import { Heart, Plus, Trash2, Calendar, Sparkles } from "lucide-react";
import { getStoredValue, setStoredValue } from "../lib/storage";
import { Button, EmptyState, Input, Label, Modal, SectionHeader, Textarea } from "../components/ui";
import { formatDay, todayISO } from "../lib/utils";

interface CycleLog {
  id: string;
  startDate: string;
  cycleLength: number;
  symptoms: string;
  notes: string;
}

export function CyclePage() {
  const [logs, setLogs] = useState<CycleLog[]>(() => {
    try {
      const s = getStoredValue("lifehub:cycle_logs");
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    startDate: todayISO(),
    cycleLength: "28",
    symptoms: "Cramps, fatigue",
    notes: "Feeling gentle and reflective.",
  });

  useEffect(() => {
    setStoredValue("lifehub:cycle_logs", JSON.stringify(logs));
  }, [logs]);

  const add = () => {
    if (!form.startDate) return;
    setLogs([
      {
        id: Date.now().toString(),
        startDate: form.startDate,
        cycleLength: Number(form.cycleLength) || 28,
        symptoms: form.symptoms.trim(),
        notes: form.notes.trim(),
      },
      ...logs,
    ]);
    setOpen(false);
  };

  const remove = (id: string) => {
    setLogs(logs.filter((l) => l.id !== id));
  };

  const latest = logs[0];
  const nextPeriod = latest
    ? (() => {
        const d = new Date(latest.startDate);
        d.setDate(d.getDate() + latest.cycleLength);
        return d.toISOString().slice(0, 10);
      })()
    : null;

  return (
    <div className="animate-fade-up pb-12">
      <SectionHeader
        title="Cycle Tracking"
        subtitle="Privately log your cycle phases, physical symptoms, and energy changes to understand your rhythm."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Log cycle / period
          </Button>
        }
      />

      {/* Prediction Banner */}
      {latest && nextPeriod && (
        <section className="bg-white rounded-2xl border border-cream-200 p-5 mb-6 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-rose-soft-600 mb-1">
              <Heart size={16} />
              <h3 className="font-display text-sm font-semibold">Predicted Next Period</h3>
            </div>
            <p className="font-display text-xl font-bold text-ink-800">{formatDay(nextPeriod)}</p>
            <p className="text-xs text-ink-500 mt-0.5">Based on {latest.cycleLength}-day average cycle</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-soft-100 flex items-center justify-center text-rose-soft-600 text-xl font-bold">
            🌸
          </div>
        </section>
      )}

      {logs.length === 0 ? (
        <EmptyState
          icon={<Calendar size={26} className="text-rose-soft-600" />}
          title="No cycle logs yet"
          hint="Track your cycle start dates and symptoms privately on your device."
        />
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="bg-white rounded-2xl border border-cream-200 p-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-rose-soft-600 bg-rose-soft-100 px-2.5 py-0.5 rounded-full">
                    Started {formatDay(log.startDate)}
                  </span>
                  <span className="text-xs text-ink-500">{log.cycleLength} day cycle</span>
                </div>
                {log.symptoms && (
                  <p className="text-sm font-medium text-ink-800 mt-1 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-sage-600" /> Symptoms: {log.symptoms}
                  </p>
                )}
                {log.notes && <p className="text-xs text-ink-600 mt-1 leading-relaxed">{log.notes}</p>}
              </div>
              <Button variant="danger" size="sm" onClick={() => remove(log.id)}>
                <Trash2 size={13} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Log Cycle / Period">
        <div className="space-y-4">
          <div>
            <Label>Period Start Date</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div>
            <Label>Average Cycle Length (Days)</Label>
            <Input
              type="number"
              min={21}
              max={45}
              value={form.cycleLength}
              onChange={(e) => setForm({ ...form, cycleLength: e.target.value })}
            />
          </div>
          <div>
            <Label>Symptoms (optional)</Label>
            <Input
              value={form.symptoms}
              onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
              placeholder="e.g. Cramps, fatigue, bloating"
            />
          </div>
          <div>
            <Label>Notes &amp; Reflection (optional)</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="How are you taking care of yourself today?"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-cream-100">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={add}>Save log</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
