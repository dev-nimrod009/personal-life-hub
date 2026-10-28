import { useEffect, useState } from "react";
import { CupSoda, Plus, Minus, Check, Sparkles, Droplets } from "lucide-react";
import { listWater, upsertWater } from "../lib/data";
import type { WaterIntake } from "../lib/types";
import { Button, EmptyState, Input, Label, SectionHeader } from "../components/ui";
import { todayISO, formatDay } from "../lib/utils";

export function WaterPage() {
  const [intakes, setIntakes] = useState<WaterIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const today = todayISO();
  const [glasses, setGlasses] = useState(0);
  const [goal, setGoal] = useState(8);

  const load = async () => {
    try {
      const data = await listWater();
      setIntakes(data);
      const todayEntry = data.find((w) => w.intake_date === today);
      if (todayEntry) {
        setGlasses(todayEntry.glasses);
        setGoal(todayEntry.goal || 8);
      }
      setError("");
    } catch {
      setError("Could not load hydration records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateIntake = async (newGlasses: number, newGoal: number) => {
    const clamped = Math.max(0, newGlasses);
    setGlasses(clamped);
    setGoal(newGoal);
    setSaving(true);
    try {
      await upsertWater(today, clamped, newGoal);
      await load();
      setError("");
    } catch {
      setError("Could not save water intake.");
    } finally {
      setSaving(false);
    }
  };

  const percentage = Math.min(100, Math.round((glasses / Math.max(1, goal)) * 100));

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Hydration Tracker"
        subtitle="Stay refreshed and build steady daily water drinking habits"
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {/* Main Hydration Dashboard Card */}
      <div className="bg-white rounded-3xl border border-cream-200 p-6 sm:p-10 mb-8 shadow-xs text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-soft-100 text-sky-soft-600 mb-4">
          <CupSoda size={32} />
        </div>

        <h3 className="font-display text-4xl sm:text-5xl font-bold text-ink-800 mb-1">
          {glasses}{" "}
          <span className="text-xl sm:text-2xl font-normal text-ink-500">/ {goal} glasses</span>
        </h3>
        <p className="text-sm text-ink-500 mb-6">
          {percentage >= 100 ? "🎉 Daily hydration target accomplished!" : `${percentage}% of your daily goal`}
        </p>

        {/* Progress Bar */}
        <div className="w-full max-w-md mx-auto bg-cream-100 h-3 rounded-full overflow-hidden mb-8">
          <div
            className="bg-sky-soft-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            type="button"
            onClick={() => void updateIntake(glasses - 1, goal)}
            disabled={saving || glasses <= 0}
            className="w-12 h-12 rounded-2xl border border-cream-200 bg-white hover:bg-cream-100 text-ink-700 flex items-center justify-center font-bold text-lg disabled:opacity-40 transition-colors shadow-xs"
            title="Minus 1 glass"
          >
            <Minus size={20} />
          </button>

          <Button
            size="md"
            onClick={() => void updateIntake(glasses + 1, goal)}
            disabled={saving}
            className="px-6 py-3 text-base shadow-sm"
          >
            <Plus size={18} /> Drink 1 Glass (250ml)
          </Button>

          <button
            type="button"
            onClick={() => void updateIntake(glasses + 2, goal)}
            disabled={saving}
            className="px-4 py-3 rounded-xl border border-cream-200 bg-white hover:bg-cream-100 text-ink-700 font-medium text-sm transition-colors shadow-xs"
            title="+2 glasses (500ml bottle)"
          >
            +2 (Bottle)
          </button>
        </div>

        {/* Goal Adjuster */}
        <div className="inline-flex items-center gap-3 bg-cream-50 border border-cream-200 px-4 py-2 rounded-2xl text-xs text-ink-600">
          <span>Daily Target:</span>
          <div className="flex gap-1">
            {[6, 8, 10, 12].map((g) => (
              <button
                key={g}
                onClick={() => void updateIntake(glasses, g)}
                className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                  goal === g ? "bg-sky-soft-500 text-white" : "bg-white text-ink-600 hover:bg-cream-200"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History */}
      <div>
        <h3 className="font-display font-semibold text-xl text-ink-800 mb-4">Past Records</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-cream-100 animate-pulse" />
            ))}
          </div>
        ) : intakes.length === 0 ? (
          <EmptyState
            icon={<Droplets size={26} className="text-sky-soft-500" />}
            title="No past records"
            hint="Water logs from previous days will be saved here."
          />
        ) : (
          <div className="space-y-3">
            {intakes.map((item) => {
              const itemGoal = item.goal || 8;
              const met = item.glasses >= itemGoal;
              return (
                <div
                  key={item.id || item.intake_date}
                  className="bg-white rounded-2xl border border-cream-200 p-4 sm:p-5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold ${
                        met ? "bg-sage-100 text-sage-700" : "bg-cream-100 text-ink-600"
                      }`}
                    >
                      {met ? <Check size={16} /> : <CupSoda size={16} />}
                    </span>
                    <div>
                      <span className="font-display font-semibold text-ink-800 text-sm">
                        {formatDay(item.intake_date)}
                      </span>
                      {met && <span className="ml-2 text-[11px] text-sage-600 font-medium">Goal reached</span>}
                    </div>
                  </div>
                  <div className="text-sm font-mono font-semibold text-ink-800">
                    {item.glasses} / {itemGoal} glasses
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
