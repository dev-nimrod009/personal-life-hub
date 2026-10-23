import { useEffect, useState } from "react";
import { Plus, Minus } from "lucide-react";

import { listWater, upsertWater } from "../lib/data";
import type { WaterIntake } from "../lib/types";
import { Button, SectionHeader } from "../components/ui";
import { todayISO } from "../lib/utils";

export function WaterPage() {
  const [intakes, setIntakes] = useState<WaterIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async (withSkeleton = true) => {
    if (withSkeleton) setLoading(true);
    try {
      setIntakes(await listWater());
      setError("");
    } catch {
      setError("Could not read water data from this device.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const today = intakes.find((i) => i.intake_date === todayISO());
  const glasses = today?.glasses ?? 0;
  const goal = today?.goal ?? 8;

  const update = async (delta: number) => {
    setSaving(true);
    const next = Math.max(0, glasses + delta);
    try {
      await upsertWater(todayISO(), next, goal);
      setError("");
    } catch {
      setError("Could not update water data.");
    } finally {
      setSaving(false);
      load(false);
    }
  };

  const setGoal = async (value: number) => {
    const g = Math.max(1, Math.min(20, value));
    try {
      await upsertWater(todayISO(), glasses, g);
      setError("");
    } catch {
      setError("Could not update the goal.");
    } finally {
      load(false);
    }
  };

  const week = intakes.slice(0, 7).reverse();
  const pct = Math.min(100, Math.round((glasses / goal) * 100));

  return (
    <div className="animate-fade-up">
      <SectionHeader title="Water Intake" subtitle="Track your glasses through the day" />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      <div className="bg-white rounded-2xl border border-cream-200 p-6 mb-3">
        <div className="flex items-center justify-center gap-6 mb-8">
          <Button variant="secondary" onClick={() => update(-1)} disabled={saving || glasses === 0} aria-label="Remove a glass">
            <Minus size={18} />
          </Button>
          <div className="text-center">
            <p className="font-display text-5xl font-semibold text-ink-800">{glasses}</p>
            <p className="text-sm text-ink-500 mt-1">of {goal} glasses</p>
          </div>
          <Button onClick={() => update(1)} disabled={saving} aria-label="Add a glass">
            <Plus size={18} />
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-2">
          {Array.from({ length: Math.max(goal, glasses) }).map((_, i) => (
            <span
              key={i}
              className={`w-8 h-10 rounded-b-xl rounded-t-md border-2 transition-all duration-300 ${
                i < glasses ? "bg-sky-soft-300 border-sky-soft-500" : "bg-white border-cream-200"
              }`}
              title={i < glasses ? "Filled" : "Empty"}
            />
          ))}
        </div>
        <p className="text-center text-xs font-semibold text-sky-soft-600 mb-6">{pct}% of goal</p>

        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-ink-500">Daily goal:</span>
          {[6, 8, 10, 12].map((g) => (
            <button
              key={g}
              onClick={() => setGoal(g)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                goal === g ? "bg-sky-soft-500 text-white" : "bg-cream-100 text-ink-600 hover:bg-cream-200"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-cream-200 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3">Last 7 days</p>
        {loading ? (
          <div className="h-20 rounded-xl bg-cream-100 animate-pulse" />
        ) : week.length === 0 ? (
          <p className="text-sm text-ink-500">Start tracking to see your week here.</p>
        ) : (
          <div className="flex items-end gap-3 h-24">
            {week.map((day) => (
              <div key={day.id} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-ink-600">{day.glasses}</span>
                <div
                  className="w-full rounded-t-md bg-sky-soft-300 transition-all duration-500"
                  style={{ height: `${Math.min(100, (day.glasses / day.goal) * 100)}%` }}
                />
                <span className="text-[9px] text-ink-500">
                  {new Date(day.intake_date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
