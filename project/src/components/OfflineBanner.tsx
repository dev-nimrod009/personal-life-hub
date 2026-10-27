import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, CheckCircle } from "lucide-react";
import { onSyncStatus } from "../lib/data";

export function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    setOffline(!navigator.onLine);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onSyncStatus((isSyncing, pending) => {
      setSyncing(isSyncing);
      setPendingCount(pending);
    });
    return unsubscribe;
  }, []);

  if (!offline && pendingCount === 0 && !syncing) return null;

  const showMessage = () => {
    if (offline) {
      return pendingCount > 0
        ? `You're offline – ${pendingCount} change${pendingCount === 1 ? "" : "s"} will sync later`
        : "You're offline – changes will sync later";
    }
    if (syncing) {
      return "Syncing changes...";
    }
    if (pendingCount > 0) {
      return `${pendingCount} change${pendingCount === 1 ? "" : "s"} pending sync`;
    }
    return "";
  };

  const showIcon = () => {
    if (offline) return <CloudOff size={16} />;
    if (syncing) return <RefreshCw size={16} className="animate-spin" />;
    return <CheckCircle size={16} />;
  };

  const bgColor = offline ? "bg-honey-500" : syncing ? "bg-sage-500" : "bg-sage-400";

  return (
    <div
      role="status"
      className={`sticky top-[57px] z-30 flex items-center justify-center gap-2 ${bgColor} text-ink-900 px-4 py-2 text-sm font-medium`}
    >
      {showIcon()}
      {showMessage()}
    </div>
  );
}
