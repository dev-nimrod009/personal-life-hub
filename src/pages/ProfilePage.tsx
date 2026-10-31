import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Fingerprint,
  Check,
  Download,
  Upload,
  KeyRound,
  BookOpen,
  Target,
  Clock,
  Flame,
  CheckCircle2,
} from "lucide-react";
import {
  getProfile,
  updateProfile,
  listDiary,
  listJournal,
  listHabits,
  listHabitLogs,
  listGoals,
  listMoods,
  listWater,
} from "../lib/data";
import { backupToFile, restoreFromText } from "../lib/backup";
import { useAuth } from "../lib/auth";
import type { Profile } from "../lib/types";
import { Button, EmptyState, Input, Label, Modal, SectionHeader, Textarea } from "../components/ui";
import { clearLocalData, getStoredValue, setStoredValue } from "../lib/storage";

const AVATAR_PRESETS = [
  { emoji: "🌿", label: "Leaf" },
  { emoji: "🦊", label: "Fox" },
  { emoji: "🌙", label: "Moon" },
  { emoji: "☕", label: "Coffee" },
  { emoji: "📚", label: "Books" },
  { emoji: "🏔️", label: "Mountain" },
  { emoji: "🌊", label: "Wave" },
  { emoji: "🌻", label: "Sunflower" },
];


function localDateKey(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Consecutive days with any habit done, counting back from today (or yesterday if today isn't logged yet).
function habitStreak(doneDates: Set<string>): number {
  if (doneDates.size === 0) return 0;
  const d = new Date();
  const todayKey = localDateKey(d);
  const doneToday = doneDates.has(todayKey);
  if (!doneToday) {
    d.setDate(d.getDate() - 1);
  }
  let count = 0;
  while (doneDates.has(localDateKey(d))) {
    count++;
    d.setDate(d.getDate() - 1);
    if (count >= 365) break;
  }
  return count;
}

function compressImage(file: File, maxSize = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

export function ProfilePage() {
  const {
    user,
    registerPasskey,
    hasPasskey,
    clearPasskey,
    setupLocalPin,
    unlockWithLocalPin,
    hasLocalPin,
    clearLocalPin,
    signOut,
  } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<string>("");
  const [backupRunning, setBackupRunning] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    avatar_url: "",
    bio: "",
    current_focus: "",
    location: "",
    birthday: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  const [stats, setStats] = useState({
    diary: 0,
    journal: 0,
    habits: 0,
    goals: 0,
    streak: 0,
    daysActive: 0,
  });
  const [photoError, setPhotoError] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  const [pinMode, setPinMode] = useState<"setup" | "change" | "remove">("setup");
  const [oldPin, setOldPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const [data, diaryList, journalList, habitsList, goalsList, habitLogs, moods, water] = await Promise.all([
          getProfile(user.id, user.email ?? undefined),
          listDiary().catch(() => []),
          listJournal().catch(() => []),
          listHabits().catch(() => []),
          listGoals().catch(() => []),
          listHabitLogs().catch(() => []),
          listMoods().catch(() => []),
          listWater().catch(() => []),
        ]);
        const activeDays = new Set<string>([
          ...diaryList.map((d) => d.entry_date),
          ...journalList.map((j) => localDateKey(new Date(j.created_at))),
          ...habitLogs.map((l) => l.log_date),
          ...moods.map((m) => m.mood_date),
          ...water.filter((w) => w.glasses > 0).map((w) => w.intake_date),
        ].filter(Boolean));
        if (data) {
          setProfile(data);
          setForm({
            full_name: data.full_name ?? "",
            avatar_url: data.avatar_url ?? "",
            bio: data.bio ?? "",
            current_focus: getStoredValue(`lifehub:current-focus:${user.id}`) || getStoredValue("lifehub:current-focus") || "Mindfulness and daily focus",
            location: data.location ?? "",
            birthday: data.birthday ?? "",
            timezone: getStoredValue(`lifehub:timezone:${user.id}`) || getStoredValue("lifehub:timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          });
        }
        setStats({
          diary: diaryList.length,
          journal: journalList.length,
          habits: habitsList.length,
          goals: goalsList.filter((g) => g.done).length,
          streak: habitStreak(new Set(habitLogs.map((l) => l.log_date))),
          daysActive: activeDays.size,
        });
        setError("");
      } catch {
        setError("Could not read your profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile(user.id, {
        full_name: form.full_name.trim(),
        avatar_url: form.avatar_url.trim(),
        bio: form.bio.trim(),
        location: form.location.trim(),
        birthday: form.birthday || null,
      });
      setStoredValue(`lifehub:current-focus:${user.id}`, form.current_focus);
      setStoredValue(`lifehub:timezone:${user.id}`, form.timezone);
      setSaved(true);
      setError("");
      window.setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    setPhotoError("");
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file.");
      return;
    }
    try {
      const avatar = await compressImage(file);
      setForm((prev) => ({ ...prev, avatar_url: avatar }));
    } catch {
      setPhotoError("Could not process photo.");
    }
  };

  const handlePinAction = async () => {
    setPinError("");
    setPinSuccess("");

    if (pinMode === "remove") {
      if (!oldPin) {
        setPinError("Please enter your current PIN to confirm removal.");
        return;
      }
      const ok = await unlockWithLocalPin(oldPin);
      if (!ok) {
        setPinError("Current PIN is incorrect.");
        return;
      }
      clearLocalPin();
      setPinOpen(false);
      setOldPin("");
      setPinSuccess("Local PIN removed.");
      window.setTimeout(() => setPinSuccess(""), 3000);
      return;
    }

    if (pinMode === "change") {
      if (!oldPin) {
        setPinError("Please enter your current PIN.");
        return;
      }
      const ok = await unlockWithLocalPin(oldPin);
      if (!ok) {
        setPinError("Current PIN is incorrect.");
        return;
      }
      if (pinInput.length < 4) {
        setPinError("New PIN must be at least 4 digits.");
        return;
      }
      if (pinInput !== pinConfirm) {
        setPinError("New PINs do not match.");
        return;
      }
      await setupLocalPin(pinInput);
      setPinOpen(false);
      setOldPin("");
      setPinInput("");
      setPinConfirm("");
      setPinSuccess("PIN changed successfully.");
      window.setTimeout(() => setPinSuccess(""), 3000);
      return;
    }

    if (pinMode === "setup") {
      if (pinInput.length < 4) {
        setPinError("PIN must be at least 4 digits.");
        return;
      }
      if (pinInput !== pinConfirm) {
        setPinError("PINs do not match.");
        return;
      }
      try {
        await setupLocalPin(pinInput);
        setPinOpen(false);
        setPinInput("");
        setPinConfirm("");
        setPinSuccess("Local PIN set up successfully.");
        window.setTimeout(() => setPinSuccess(""), 3000);
      } catch {
        setPinError("Could not save the PIN on this device.");
      }
    }
  };

  const doBackup = () => {
    void (async () => {
      setBackupRunning(true);
      try {
        await backupToFile();
        setError("");
      } catch {
        setError("Could not create backup file.");
      } finally {
        setBackupRunning(false);
      }
    })();
  };

  const doRestore = (file: File) => {
    setRestoring(true);
    setRestoreResult("");
    void (async () => {
      try {
        const text = await file.text();
        const { restored } = await restoreFromText(text);
        setRestoreResult(`Restored ${restored} items successfully.`);
        setError("");
      } catch {
        setError("Could not read backup file.");
      } finally {
        setRestoring(false);
      }
    })();
  };

  const initials = (form.full_name.trim() || user?.email || "U")
    .slice(0, 2)
    .toUpperCase();

  const isEmoji =
    form.avatar_url.length <= 4 &&
    !form.avatar_url.startsWith("http") &&
    !form.avatar_url.startsWith("data:");

  return (
    <div className="animate-fade-up pb-12">
      <SectionHeader title="Profile" subtitle="Manage your personal profile, review your total activity streaks, and configure security." />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}
      {pinSuccess && <div className="mb-4 rounded-xl bg-sage-100 text-sage-700 text-sm px-4 py-3 font-medium flex items-center gap-2"><Check size={16} />{pinSuccess}</div>}

      {loading ? (
        <div className="h-64 rounded-2xl bg-cream-100 animate-pulse" />
      ) : !profile ? (
        <EmptyState icon={<Camera size={22} />} title="Profile unavailable" hint="Try signing out and back in." />
      ) : (
        <>
          {/* Profile Overview Card */}
          <section className="bg-white rounded-2xl border border-cream-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative">
                {form.avatar_url.trim() ? (
                  isEmoji ? (
                    <div className="w-20 h-20 rounded-2xl bg-cream-100 flex items-center justify-center text-4xl border border-cream-200 shadow-sm">
                      {form.avatar_url}
                    </div>
                  ) : (
                    <img
                      src={form.avatar_url.trim()}
                      alt="Avatar"
                      className="w-20 h-20 rounded-2xl object-cover border border-cream-200 shadow-sm"
                    />
                  )
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-sage-600 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                    {initials}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-2xl font-semibold text-ink-800 truncate">
                  {form.full_name.trim() || "Life Hub Member"}
                </h3>
                <p className="text-sm text-ink-500 truncate">{profile.email || user?.email}</p>
                <p className="text-xs text-sage-700 font-medium mt-1 bg-sage-50 px-2.5 py-1 rounded-lg inline-block border border-sage-200">
                  Current focus: {form.current_focus}
                </p>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="mt-6 pt-5 border-t border-cream-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-cream-50/80 rounded-xl p-3 border border-cream-100">
                <div className="flex items-center gap-1.5 text-sage-600 text-xs font-semibold uppercase tracking-wider mb-1">
                  <Flame size={13} /> Streak
                </div>
                <p className="font-display text-xl font-bold text-ink-800">
                  {stats.streak} {stats.streak === 1 ? "day" : "days"}
                </p>
                <p className="text-[11px] text-ink-500">active habit streak</p>
              </div>

              <div className="bg-cream-50/80 rounded-xl p-3 border border-cream-100">
                <div className="flex items-center gap-1.5 text-sage-600 text-xs font-semibold uppercase tracking-wider mb-1">
                  <BookOpen size={13} /> Journal
                </div>
                <p className="font-display text-xl font-bold text-ink-800">{stats.journal}</p>
                <p className="text-[11px] text-ink-500">reflections logged</p>
              </div>

              <div className="bg-cream-50/80 rounded-xl p-3 border border-cream-100">
                <div className="flex items-center gap-1.5 text-sage-600 text-xs font-semibold uppercase tracking-wider mb-1">
                  <Target size={13} /> Goals
                </div>
                <p className="font-display text-xl font-bold text-ink-800">{stats.goals}</p>
                <p className="text-[11px] text-ink-500">targets completed</p>
              </div>

              <div className="bg-cream-50/80 rounded-xl p-3 border border-cream-100">
                <div className="flex items-center gap-1.5 text-sage-600 text-xs font-semibold uppercase tracking-wider mb-1">
                  <CheckCircle2 size={13} /> Habits
                </div>
                <p className="font-display text-xl font-bold text-ink-800">{stats.habits}</p>
                <p className="text-[11px] text-ink-500">{stats.habits === 1 ? "active habit" : "active habits"}</p>
              </div>
            </div>
          </section>

          {/* Editable Personal Info */}
          <section className="bg-white rounded-2xl border border-cream-200 p-6 mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-4">Edit Personal Information</h3>
            <div className="space-y-4">
              <div>
                <Label>Profile photo or avatar</Label>
                <div className="flex flex-col gap-3">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handlePhotoUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Camera size={14} /> Upload image
                    </Button>
                    {form.avatar_url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setForm((prev) => ({ ...prev, avatar_url: "" }))}
                      >
                        Reset to initials
                      </Button>
                    )}
                  </div>
                  {photoError && <p className="text-xs text-rose-soft-600">{photoError}</p>}
                  <div>
                    <span className="text-[11px] font-medium text-ink-500 block mb-1.5">Or choose emoji avatar:</span>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_PRESETS.map((p) => (
                        <button
                          key={p.emoji}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, avatar_url: p.emoji }))}
                          className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                            form.avatar_url === p.emoji
                              ? "bg-sage-100 ring-2 ring-sage-500 scale-105"
                              : "bg-cream-100 hover:bg-cream-200"
                          }`}
                          aria-label={p.label}
                        >
                          {p.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label>Full name / Preferred name</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Your name"
                />
              </div>

              <div>
                <Label>Current Focus</Label>
                <Input
                  value={form.current_focus}
                  onChange={(e) => setForm((prev) => ({ ...prev, current_focus: e.target.value }))}
                  placeholder="e.g. Health, deep work, or mindfulness"
                />
              </div>

              <div>
                <Label>Bio / Motto</Label>
                <Textarea
                  rows={2}
                  value={form.bio}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Quiet reflections..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Location</Label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="City, Country"
                  />
                </div>
                <div>
                  <Label>Birthday</Label>
                  <Input
                    type="date"
                    value={form.birthday}
                    onChange={(e) => setForm((prev) => ({ ...prev, birthday: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Input
                    value={form.timezone}
                    onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save profile"}
                </Button>
                {saved && (
                  <span className="text-xs text-sage-600 font-medium flex items-center gap-1">
                    <Check size={14} /> Saved
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Shortcuts to Security */}
          <section className="bg-white rounded-2xl border border-cream-200 p-6 mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3">Security &amp; PIN Shortcuts</h3>
            <div className="flex flex-wrap items-center gap-3">
              {hasLocalPin ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPinMode("change");
                    setPinOpen(true);
                  }}
                >
                  <KeyRound size={14} /> Change Local PIN
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPinMode("setup");
                    setPinOpen(true);
                  }}
                >
                  <KeyRound size={14} /> Set up Local PIN
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void registerPasskey()}
              >
                <Fingerprint size={14} /> {hasPasskey ? "Biometric Active" : "Set up Biometrics"}
              </Button>
            </div>
          </section>

          {/* Data Section */}
          <section className="bg-white rounded-2xl border border-cream-200 p-6 mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3">Data &amp; Backups</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={doBackup} disabled={backupRunning} size="sm">
                <Download size={14} /> {backupRunning ? "Backing up..." : "Download JSON backup"}
              </Button>
              <label className="cursor-pointer">
                <span className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-medium border bg-white text-ink-700 border-cream-200 hover:bg-cream-100">
                  <Upload size={14} /> {restoring ? "Restoring..." : "Restore backup"}
                </span>
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) doRestore(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {restoreResult && <p className="mt-2 text-xs text-sage-600 font-medium">{restoreResult}</p>}
          </section>

          {/* Account Actions */}
          <section className="bg-white rounded-2xl border border-cream-200 p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm text-ink-800">Account session</p>
              <p className="text-xs text-ink-500">Sign out or permanently erase local data</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => void signOut()}>
                Sign out
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Delete account
              </Button>
            </div>
          </section>
        </>
      )}

      {/* PIN Modal */}
      <Modal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title={pinMode === "setup" ? "Set up local PIN" : "Change local PIN"}
      >
        <div className="space-y-4">
          {pinMode === "change" && (
            <div>
              <Label>Current PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                autoFocus
              />
            </div>
          )}
          <div>
            <Label>New PIN (4-8 digits)</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              autoFocus={pinMode === "setup"}
            />
          </div>
          <div>
            <Label>Confirm PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
            />
          </div>
          {pinError && <div className="rounded-xl bg-rose-soft-100 text-rose-soft-600 text-xs px-3 py-2">{pinError}</div>}
          <div className="flex justify-end gap-2 pt-2 border-t border-cream-100">
            <Button variant="ghost" size="sm" onClick={() => setPinOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void handlePinAction()} disabled={pinInput.length < 4}>
              Save PIN
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Account & Local Data">
        <div className="space-y-4 text-sm text-ink-700">
          <p className="leading-relaxed">
            This will permanently delete all your journals, diary entries, habits, budgets, and local data from this device. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-cream-100">
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                clearLocalData();
                void signOut();
              }}
            >
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
