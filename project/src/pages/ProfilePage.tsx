import { useEffect, useRef, useState } from "react";
import { Camera, Fingerprint, Check, Download, Upload, KeyRound, AlertTriangle, Info } from "lucide-react";
import { getProfile, updateProfile } from "../lib/data";
import { backupToFile, restoreFromText, type BackupProgress } from "../lib/backup";
import { useAuth } from "../lib/auth";
import { todayISO } from "../lib/utils";
import type { Profile } from "../lib/types";
import { Button, EmptyState, Input, Label, Modal, SectionHeader, Textarea } from "../components/ui";

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
const APP_VERSION = "2.01";

function compressImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not load the image."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > height && width > 512) {
          height = Math.round((height * 512) / width);
          width = 512;
        } else if (height > 512) {
          width = Math.round((width * 512) / height);
          height = 512;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not process the image."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length > maxSize && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ProfilePage() {
  const { user, registerPasskey, hasPasskey, setupLocalPin, unlockWithLocalPin, hasLocalPin, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<string>("");
  const [backupProgress, setBackupProgress] = useState<BackupProgress | null>(null);
  const [backupRunning, setBackupRunning] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    avatar_url: "",
    bio: "",
    location: "",
    birthday: "",
  });
  const [photoError, setPhotoError] = useState("");
  const [passkeyError, setPasskeyError] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinMode, setPinMode] = useState<"setup" | "verify">("setup");
  const [appInfoOpen, setAppInfoOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const data = await getProfile(user.id, user.email ?? undefined);
        if (data) {
          setProfile(data);
          setForm({
            full_name: data.full_name ?? "",
            avatar_url: data.avatar_url ?? "",
            bio: data.bio ?? "",
            location: data.location ?? "",
            birthday: data.birthday ?? "",
          });
        }
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
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("Photo is larger than 2 MB. It will be compressed automatically.");
    }
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file.");
      return;
    }
    try {
      const dataUrl = await compressImage(file, 1.8 * 1024 * 1024);
      setForm((prev) => ({ ...prev, avatar_url: dataUrl }));
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Could not process the photo.");
    }
  };

  const setupPasskey = async () => {
    setPasskeyError("");
    const result = await registerPasskey();
    if (result.error) {
      setPasskeyError(result.error);
      if (/disabled|unsupported|not available|embedded/i.test(result.error)) {
        setPinMode("setup");
        setPinOpen(true);
      }
    }
  };

  const handlePinSetup = async () => {
    if (pinMode === "verify") {
      try {
        if (!(await unlockWithLocalPin(pinInput))) {
          setPinError("That PIN is not correct.");
          return;
        }
        setPinOpen(false);
        setPinInput("");
        setPinError("");
      } catch {
        setPinError("Could not verify the PIN on this device.");
      }
      return;
    }
    if (pinInput.length < 4) {
      setPinError("PIN must be at least 4 digits.");
      return;
    }
    if (pinMode === "setup") {
      if (pinInput !== pinConfirm) {
        setPinError("PINs do not match.");
        return;
      }
      try {
        await setupLocalPin(pinInput);
        setPinOpen(false);
        setPinInput("");
        setPinConfirm("");
        setPinError("");
      } catch {
        setPinError("Could not save the PIN on this device.");
      }
    }
  };

  const doBackup = () => {
    void (async () => {
      setBackupRunning(true);
      setBackupProgress(null);
      try {
        const progress = await backupToFile(setBackupProgress);
        setBackupProgress(progress);
        setError("");
      } catch {
        setError("Could not create your backup file. Check your connection and try again.");
        setBackupProgress(null);
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
        setRestoreResult(
          restored > 0
            ? `Restored ${restored} item${restored === 1 ? "" : "s"} into your account. Everything you already had was kept.`
            : "Nothing new to restore - your account already has all of it."
        );
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read that backup file.");
      } finally {
        setRestoring(false);
      }
    })();
  };

  const initials = (form.full_name.trim() || user?.email || "?")
    .slice(0, 2)
    .toUpperCase();

  const isEmoji = form.avatar_url.length <= 4 && !form.avatar_url.startsWith("http") && !form.avatar_url.startsWith("data:");

  return (
    <div className="animate-fade-up">
      <SectionHeader title="Profile" subtitle="Your picture and personal details" />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      {loading ? (
        <div className="h-64 rounded-2xl bg-cream-100 animate-pulse" />
      ) : !profile ? (
        <EmptyState icon={<Camera size={22} />} title="Profile unavailable" hint="Try signing out and back in." />
      ) : (
        <>
          <section className="bg-white rounded-2xl border border-cream-200 p-6 mb-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                {form.avatar_url.trim() ? (
                  isEmoji ? (
                    <div className="w-20 h-20 rounded-2xl bg-cream-100 flex items-center justify-center text-4xl border border-cream-200">
                      {form.avatar_url}
                    </div>
                  ) : (
                    <img
                      src={form.avatar_url.trim()}
                      alt="Profile picture"
                      className="w-20 h-20 rounded-2xl object-cover border border-cream-200"
                    />
                  )
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-sage-500 flex items-center justify-center text-white text-xl font-semibold">
                    {initials}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-display text-xl font-semibold text-ink-800 truncate">
                  {form.full_name.trim() || "Unnamed"}
                </p>
                <p className="text-sm text-ink-500 truncate">{profile.email}</p>
                <p className="text-xs text-ink-500 mt-1">
                  Member since {new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-cream-200 p-6 mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-4">Personal details</h3>
            <div className="space-y-4">
              <div>
                <Label>Profile photo</Label>
                <div className="flex flex-col gap-3">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                      <Camera size={15} /> Upload from phone
                    </Button>
                    {form.avatar_url && (
                      <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, avatar_url: "" })}>
                        Remove
                      </Button>
                    )}
                  </div>
                  {photoError && <p className="text-xs text-honey-600">{photoError}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        key={preset.emoji}
                        type="button"
                        onClick={() => setForm({ ...form, avatar_url: preset.emoji })}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border transition-all ${
                          form.avatar_url === preset.emoji ? "border-sage-500 bg-sage-50" : "border-cream-200 hover:bg-cream-100"
                        }`}
                        aria-label={preset.label}
                      >
                        {preset.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <Label>Full name</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Your name"
                />
              </div>
              <div>
                <Label>About you</Label>
                <Textarea
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="A line or two about yourself"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Location</Label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="City, country"
                  />
                </div>
                <div>
                  <Label>Birthday</Label>
                  <Input
                    type="date"
                    max={todayISO()}
                    value={form.birthday}
                    onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={() => void save()} disabled={saving} className="w-full sm:w-auto">
                {saving ? "Saving..." : saved ? <><Check size={16} /> Saved</> : "Save changes"}
              </Button>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-cream-200 p-6 mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-2">Backup &amp; restore</h3>
            <p className="text-sm text-ink-600 leading-relaxed mb-4">
              Your entries live in your account, so they follow you to any phone automatically - just sign in. As an
              extra safety net, you can also save a backup file to your device or bring one back in.
            </p>
            {backupRunning && (
              <div className="flex items-center gap-2 text-sm font-medium text-sage-600 mb-4" role="status">
                <Download size={16} />
                {backupProgress
                  ? `${backupProgress.backedUp} items backed up, ${backupProgress.remaining} remaining`
                  : "Preparing your backup..."}
              </div>
            )}
            {!backupRunning && backupProgress && (
              <div className="flex items-center gap-2 text-sm font-medium text-sage-600 mb-4" role="status">
                <Check size={16} /> All items are backed up.
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={doBackup} disabled={backupRunning}>
                <Download size={16} /> {backupRunning ? "Backing up..." : "Save backup file"}
              </Button>
              <label className="cursor-pointer">
                <span className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium border transition-colors bg-white text-ink-700 border-cream-200 hover:bg-cream-100 w-full sm:w-auto" style={{ minHeight: 40 }}>
                  <Upload size={16} /> {restoring ? "Restoring..." : "Restore from file"}
                </span>
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  disabled={restoring}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) doRestore(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {restoreResult && (
              <div className="mt-4 rounded-xl bg-sage-500/10 text-sage-600 text-sm px-4 py-3">{restoreResult}</div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-cream-200 p-6 mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-2">Quick unlock</h3>
            <p className="text-sm text-ink-600 leading-relaxed mb-4">
              Set up biometric unlock (fingerprint or face) or a local PIN so you don't have to type your password every time.
            </p>
            {passkeyError && (
              <div className="mb-3 flex items-start gap-2 rounded-xl bg-honey-500/15 text-amber-700 text-xs px-3 py-2.5">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{passkeyError} You can set up a local PIN instead.</span>
              </div>
            )}
            {hasPasskey ? (
              <div className="flex items-center gap-2 text-sm font-medium text-sage-600 mb-3">
                <Fingerprint size={17} /> Biometric unlock is set up on this device
              </div>
            ) : (
              <Button variant="secondary" onClick={() => void setupPasskey()} className="mb-3">
                <Fingerprint size={16} /> Set up biometric unlock
              </Button>
            )}
            {hasLocalPin ? (
              <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-sage-600">
                <span className="flex items-center gap-2">
                  <KeyRound size={16} /> Local PIN is set up
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPinMode("verify");
                    setPinOpen(true);
                    setPinError("");
                    setPinInput("");
                    setPinConfirm("");
                  }}
                >
                  Verify PIN
                </Button>
              </div>
            ) : (
              <Button variant="ghost" onClick={() => { setPinMode("setup"); setPinOpen(true); setPinError(""); setPinInput(""); setPinConfirm(""); }}>
                <KeyRound size={15} /> Set up a local PIN instead
              </Button>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-cream-200 p-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-4">Account</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setAppInfoOpen(true)}>
                <Info size={16} /> App info
              </Button>
              <Button variant="danger" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
          </section>
        </>
      )}

      <Modal open={pinOpen} onClose={() => setPinOpen(false)} title={pinMode === "setup" ? "Set up a local PIN" : "Enter your PIN"}>
        <div className="space-y-4">
          <p className="text-xs text-ink-500">
            {pinMode === "setup"
              ? "Choose a PIN (at least 4 digits). You'll use it to unlock the app when biometrics aren't available."
              : "Enter your PIN to unlock."}
          </p>
          <div>
            <Label>PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              onKeyDown={(e) => e.key === "Enter" && handlePinSetup()}
            />
          </div>
          {pinMode === "setup" && (
            <div>
              <Label>Confirm PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={8}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                onKeyDown={(e) => e.key === "Enter" && handlePinSetup()}
              />
            </div>
          )}
          {pinError && <div className="rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{pinError}</div>}
          <Button
            onClick={() => void handlePinSetup()}
            disabled={pinInput.length < (pinMode === "setup" ? 4 : 1)}
            className="w-full"
          >
            {pinMode === "setup" ? "Save PIN" : "Verify PIN"}
          </Button>
        </div>
      </Modal>
      <Modal open={appInfoOpen} onClose={() => setAppInfoOpen(false)} title="App info">
        <div className="space-y-2 text-sm text-ink-600">
          <p className="font-medium text-ink-800">Life Hub</p>
          <p>Version {APP_VERSION}</p>
          <p>Your private journal, planner, and wellbeing hub.</p>
        </div>
      </Modal>
    </div>
  );
}
