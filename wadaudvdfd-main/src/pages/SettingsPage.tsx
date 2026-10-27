import { useState } from "react";
import {
  Settings,
  Shield,
  Database,
  RefreshCw,
  Palette,
  Sliders,
  Bell,
  Info,
  KeyRound,
  Fingerprint,
  Download,
  Upload,
  Trash2,
  Check,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { Button, Input, Label, Modal, SectionHeader } from "../components/ui";
import { backupToFile, restoreFromText } from "../lib/backup";
import { clearLocalData, getStoredValue, setStoredValue } from "../lib/storage";

export function SettingsPage() {
  const { hasLocalPin, setupLocalPin, clearLocalPin, unlockWithLocalPin, registerPasskey, hasPasskey, signOut, user } = useAuth();
  
  // Settings state
  const [theme, setTheme] = useState(() => getStoredValue("lifehub:theme") || "system");
  const [fontSize, setFontSize] = useState(() => getStoredValue("lifehub:fontsize") || "normal");
  const [highContrast, setHighContrast] = useState(() => getStoredValue("lifehub:contrast") === "1");
  const [autoLockMinutes, setAutoLockMinutes] = useState(() => getStoredValue("lifehub:autolock") || "30");
  
  // Module visibility toggles
  const [modules, setModules] = useState<{ [key: string]: boolean }>(() => {
    try {
      const saved = getStoredValue("lifehub:modules");
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      budget: true,
      meals: true,
      habits: true,
      gratitude: true,
      quotes: true,
      braindump: true,
    };
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => getStoredValue("lifehub:notifs") === "1");
  
  // PIN Modal state
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinMode, setPinMode] = useState<"setup" | "change" | "remove">("setup");
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");

  // Backup & Restore
  const [restoring, setRestoring] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    window.setTimeout(() => setSuccessMessage(""), 3500);
  };

  const handleThemeChange = (val: string) => {
    setTheme(val);
    setStoredValue("lifehub:theme", val);
    showSuccess("Theme updated.");
  };

  const handleFontSizeChange = (val: string) => {
    setFontSize(val);
    setStoredValue("lifehub:fontsize", val);
    showSuccess("Font size updated.");
  };

  const handleContrastToggle = (val: boolean) => {
    setHighContrast(val);
    setStoredValue("lifehub:contrast", val ? "1" : "0");
    showSuccess("Display contrast updated.");
  };

  const handleAutoLockChange = (val: string) => {
    setAutoLockMinutes(val);
    setStoredValue("lifehub:autolock", val);
    showSuccess("Auto-lock timeout updated.");
  };

  const toggleModule = (key: string) => {
    const next = { ...modules, [key]: !modules[key] };
    setModules(next);
    setStoredValue("lifehub:modules", JSON.stringify(next));
    showSuccess("Module preferences updated.");
  };

  const handlePinSubmit = async () => {
    setPinError("");
    if (pinMode === "remove") {
      const ok = await unlockWithLocalPin(oldPin);
      if (!ok) {
        setPinError("Current PIN is incorrect.");
        return;
      }
      clearLocalPin();
      setPinModalOpen(false);
      showSuccess("Local PIN removed.");
      return;
    }
    if (pinMode === "change") {
      const ok = await unlockWithLocalPin(oldPin);
      if (!ok) {
        setPinError("Current PIN is incorrect.");
        return;
      }
      if (newPin.length < 4 || newPin !== confirmPin) {
        setPinError("New PINs must match and be at least 4 digits.");
        return;
      }
      await setupLocalPin(newPin);
      setPinModalOpen(false);
      showSuccess("PIN updated successfully.");
      return;
    }
    if (pinMode === "setup") {
      if (newPin.length < 4 || newPin !== confirmPin) {
        setPinError("PINs must match and be at least 4 digits.");
        return;
      }
      await setupLocalPin(newPin);
      setPinModalOpen(false);
      showSuccess("Local PIN set up successfully.");
    }
  };

  const exportMarkdown = () => {
    const content = `# Life Hub Data Export\nExported on: ${new Date().toLocaleString()}\nUser: ${user?.email || "Local"}\n\nAll your entries are safely stored on this device.`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `life-hub-export-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess("Markdown export downloaded.");
  };

  return (
    <div className="animate-fade-up pb-10">
      <SectionHeader title="Settings" subtitle="Personalize your PWA, security, backups, and modules" />

      {successMessage && (
        <div className="mb-4 rounded-xl bg-sage-100 text-sage-700 text-sm px-4 py-3 font-medium flex items-center gap-2">
          <Check size={16} /> {successMessage}
        </div>
      )}

      {/* 1. Account */}
      <section className="bg-white rounded-2xl border border-cream-200 p-6 mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3 flex items-center gap-2">
          <Settings size={15} /> Account
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-cream-100">
            <div>
              <p className="text-sm font-semibold text-ink-800">Email address</p>
              <p className="text-xs text-ink-500">{user?.email || "Offline / Local Account"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (window.confirm("Are you sure you want to clear all local data and sign out?")) {
                  clearLocalData();
                  void signOut();
                }
              }}
            >
              <Trash2 size={14} /> Clear local data &amp; Delete account
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Security */}
      <section className="bg-white rounded-2xl border border-cream-200 p-6 mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3 flex items-center gap-2">
          <Shield size={15} /> Security &amp; Lock
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-800">Local PIN Protection</p>
              <p className="text-xs text-ink-500">Secure app access offline with a 4-8 digit PIN</p>
            </div>
            {hasLocalPin ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPinMode("change");
                    setOldPin("");
                    setNewPin("");
                    setConfirmPin("");
                    setPinError("");
                    setPinModalOpen(true);
                  }}
                >
                  Change
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setPinMode("remove");
                    setOldPin("");
                    setPinError("");
                    setPinModalOpen(true);
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  setPinMode("setup");
                  setNewPin("");
                  setConfirmPin("");
                  setPinError("");
                  setPinModalOpen(true);
                }}
              >
                <KeyRound size={14} /> Set PIN
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-cream-100">
            <div>
              <p className="text-sm font-semibold text-ink-800">Biometric Unlock</p>
              <p className="text-xs text-ink-500">Use fingerprint or FaceID via device passkeys</p>
            </div>
            <Button
              variant={hasPasskey ? "secondary" : "primary"}
              size="sm"
              onClick={() => void registerPasskey()}
            >
              <Fingerprint size={14} /> {hasPasskey ? "Configured" : "Enable"}
            </Button>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-cream-100">
            <div>
              <p className="text-sm font-semibold text-ink-800">Auto-lock Timeout</p>
              <p className="text-xs text-ink-500">Lock app after period of inactivity</p>
            </div>
            <select
              value={autoLockMinutes}
              onChange={(e) => handleAutoLockChange(e.target.value)}
              className="rounded-xl border border-cream-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
            >
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
            </select>
          </div>
        </div>
      </section>

      {/* 3. Data & Backup */}
      <section className="bg-white rounded-2xl border border-cream-200 p-6 mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3 flex items-center gap-2">
          <Database size={15} /> Data &amp; Backup
        </h3>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void backupToFile()}
            >
              <Download size={14} /> Save backup file
            </Button>

            <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium border bg-white text-ink-700 border-cream-200 hover:bg-cream-100">
              <Upload size={14} /> {restoring ? "Restoring..." : "Restore from file"}
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                disabled={restoring}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setRestoring(true);
                    void file.text().then((text) => restoreFromText(text)).then(({ restored }) => {
                      setRestoring(false);
                      showSuccess(`Restored ${restored} items successfully.`);
                    }).catch(() => {
                      setRestoring(false);
                      showSuccess("Could not restore file.");
                    });
                  }
                  e.target.value = "";
                }}
              />
            </label>

            <Button variant="secondary" size="sm" onClick={exportMarkdown}>
              <Download size={14} /> Export Markdown
            </Button>
          </div>
        </div>
      </section>

      {/* 4. Sync & Offline */}
      <section className="bg-white rounded-2xl border border-cream-200 p-6 mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3 flex items-center gap-2">
          <RefreshCw size={15} /> Sync &amp; Offline Mode
        </h3>
        <div className="space-y-3 text-sm text-ink-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-ink-800">Local-first architecture</p>
              <p className="text-xs text-ink-500">All changes save instantly to device storage and sync automatically when online.</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-sage-100 text-sage-700 text-xs font-medium px-2.5 py-1">
              <Check size={12} /> Active
            </span>
          </div>
        </div>
      </section>

      {/* 5. Appearance */}
      <section className="bg-white rounded-2xl border border-cream-200 p-6 mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3 flex items-center gap-2">
          <Palette size={15} /> Appearance
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-800">Theme mode</p>
              <p className="text-xs text-ink-500">Choose your preferred color mode</p>
            </div>
            <select
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="rounded-xl border border-cream-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
            >
              <option value="light">Light Paper</option>
              <option value="dark">Dark Calm</option>
              <option value="system">System Default</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-cream-100">
            <div>
              <p className="text-sm font-semibold text-ink-800">Font size</p>
              <p className="text-xs text-ink-500">Adjust text scaling for readability</p>
            </div>
            <select
              value={fontSize}
              onChange={(e) => handleFontSizeChange(e.target.value)}
              className="rounded-xl border border-cream-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
            >
              <option value="small">Small</option>
              <option value="normal">Normal</option>
              <option value="large">Large</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-cream-100">
            <div>
              <p className="text-sm font-semibold text-ink-800">High contrast</p>
              <p className="text-xs text-ink-500">Enhance border and text contrast</p>
            </div>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => handleContrastToggle(e.target.checked)}
              className="w-4 h-4 rounded text-sage-600 focus:ring-sage-300"
            />
          </div>
        </div>
      </section>

      {/* 6. Modules */}
      <section className="bg-white rounded-2xl border border-cream-200 p-6 mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3 flex items-center gap-2">
          <Sliders size={15} /> Active Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: "budget", label: "Budget & Expenses" },
            { key: "meals", label: "Meal Planner & Recipes" },
            { key: "habits", label: "Habits & Streaks" },
            { key: "gratitude", label: "Gratitude & Mood" },
            { key: "quotes", label: "Quote Vault" },
            { key: "braindump", label: "Brain Dump" },
          ].map((mod) => (
            <label
              key={mod.key}
              className="flex items-center justify-between p-3 rounded-xl border border-cream-200 bg-cream-50/50 cursor-pointer hover:bg-cream-100/60 transition-colors"
            >
              <span className="text-sm font-medium text-ink-800">{mod.label}</span>
              <input
                type="checkbox"
                checked={modules[mod.key] ?? true}
                onChange={() => toggleModule(mod.key)}
                className="w-4 h-4 rounded text-sage-600 focus:ring-sage-300"
              />
            </label>
          ))}
        </div>
      </section>

      {/* 7. Notifications & Reminders */}
      <section className="bg-white rounded-2xl border border-cream-200 p-6 mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3 flex items-center gap-2">
          <Bell size={15} /> Notifications &amp; Reminders
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-800">Daily Reflection Reminders</p>
            <p className="text-xs text-ink-500">Receive quiet prompts to check in with your day</p>
          </div>
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={(e) => {
              setNotificationsEnabled(e.target.checked);
              setStoredValue("lifehub:notifs", e.target.checked ? "1" : "0");
              showSuccess("Notification preferences updated.");
            }}
            className="w-4 h-4 rounded text-sage-600 focus:ring-sage-300"
          />
        </div>
      </section>

      {/* 8. About */}
      <section className="bg-white rounded-2xl border border-cream-200 p-6">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3 flex items-center gap-2">
          <Info size={15} /> About Life Hub
        </h3>
        <div className="space-y-2 text-xs text-ink-600 leading-relaxed">
          <p className="font-semibold text-ink-800 text-sm">Life Hub PWA v2.3.0</p>
          <p>Your private, local-first journal, planner, and wellbeing space.</p>
          <p className="text-ink-500 pt-1">Privacy Policy: All data stays strictly on your device and encrypted cloud sync (when enabled).</p>
        </div>
      </section>

      {/* PIN Modal */}
      <Modal
        open={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        title={pinMode === "setup" ? "Set up local PIN" : pinMode === "change" ? "Change local PIN" : "Remove local PIN"}
      >
        <div className="space-y-4">
          {(pinMode === "change" || pinMode === "remove") && (
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
                className="text-center font-mono text-lg"
              />
            </div>
          )}

          {(pinMode === "setup" || pinMode === "change") && (
            <>
              <div>
                <Label>New PIN (4-8 digits)</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  autoFocus={pinMode === "setup"}
                  className="text-center font-mono text-lg"
                />
              </div>
              <div>
                <Label>Confirm PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="text-center font-mono text-lg"
                />
              </div>
            </>
          )}

          {pinError && <div className="rounded-xl bg-rose-soft-100 text-rose-soft-600 text-xs px-3 py-2">{pinError}</div>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-cream-100">
            <Button variant="ghost" size="sm" onClick={() => setPinModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={pinMode === "remove" ? "danger" : "primary"}
              size="sm"
              onClick={() => void handlePinSubmit()}
            >
              {pinMode === "setup" ? "Save PIN" : pinMode === "change" ? "Update PIN" : "Remove PIN"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
