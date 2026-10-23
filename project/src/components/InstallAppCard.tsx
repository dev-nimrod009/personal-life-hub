import { useEffect, useState } from "react";
import { Smartphone, X } from "lucide-react";
import { cn } from "../lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppCard() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia("(display-mode: standalone)").matches || (window.navigator as { standalone?: boolean }).standalone === true
  );
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("lifehub:install-dismissed") === "1");
  const [platform, setPlatform] = useState<"ios" | "other">("other");

  useEffect(() => {
    setPlatform(/iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios" : "other");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || dismissed) return null;
  if (!installEvent && platform !== "ios") return null;

  const hide = () => {
    localStorage.setItem("lifehub:install-dismissed", "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  };

  return (
    <div
      className={cn(
        "fixed z-50 left-3 right-3 bottom-20 md:left-auto md:right-4 md:bottom-4 md:w-80",
        "bg-white rounded-2xl shadow-xl border border-cream-200 p-4 animate-pop-in"
      )}
    >
      <button
        onClick={hide}
        className="absolute top-2.5 right-2.5 p-1 rounded-full text-ink-500/60 hover:bg-cream-100 transition-colors"
        aria-label="Dismiss install prompt"
      >
        <X size={15} />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-sage-100 flex items-center justify-center shrink-0">
          <Smartphone size={20} className="text-sage-600" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-ink-800">Install Life Hub</p>
          {installEvent ? (
            <>
              <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">
                Add it to your home screen for full-screen use and offline access.
              </p>
              <button
                onClick={() => void install()}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-sage-600 text-white text-xs font-medium px-3.5 py-2 hover:bg-sage-700 active:scale-[0.98] transition-all"
              >
                Install app
              </button>
            </>
          ) : (
            <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">
              On iPhone: tap the <strong>Share</strong> button in Safari, then choose <strong>Add to Home Screen</strong>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
