import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CupSoda,
  Heart,
  Notebook,
  Salad,
  Smile,
  Target,
  Utensils,
  Bell,
  Inbox,
  Quote,
  UserRound,
  Wallet,
  Calendar,
  GraduationCap,
  Award,
  TrendingUp,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";

export type SectionId =
  | "dashboard"
  | "braindump"
  | "journal"
  | "reviews"
  | "yearly"
  | "learning"
  | "diary"
  | "notes"
  | "quotes"
  | "dayplans"
  | "reminders"
  | "goals"
  | "habits"
  | "meals"
  | "budget"
  | "mood"
  | "water"
  | "gratitude"
  | "cycle"
  | "insights"
  | "profile"
  | "settings";

export interface NavItem {
  id: SectionId;
  label: string;
  icon: typeof BookOpen;
}

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Home",
    items: [
      { id: "dashboard", label: "Today", icon: CalendarDays },
      { id: "braindump", label: "Brain Dump", icon: Inbox },
    ],
  },
  {
    title: "Writing",
    items: [
      { id: "journal", label: "Journal", icon: BookOpen },
      { id: "reviews", label: "Life Reviews", icon: Calendar },
      { id: "yearly", label: "Yearly Review", icon: Award },
      { id: "diary", label: "Diary", icon: Heart },
      { id: "notes", label: "Notepad", icon: Notebook },
      { id: "quotes", label: "Quote Vault", icon: Quote },
    ],
  },
  {
    title: "Planning & Growth",
    items: [
      { id: "learning", label: "Learning & Growth", icon: GraduationCap },
      { id: "dayplans", label: "Day Plans", icon: ClipboardList },
      { id: "reminders", label: "Reminders", icon: Bell },
      { id: "goals", label: "Goals", icon: Target },
      { id: "insights", label: "Local Insights", icon: TrendingUp },
    ],
  },
  {
    title: "Wellbeing",
    items: [
      { id: "habits", label: "Habits", icon: CheckCircle2 },
      { id: "meals", label: "Meal Planner", icon: Utensils },
      { id: "budget", label: "Budget", icon: Wallet },
      { id: "mood", label: "Mood", icon: Smile },
      { id: "water", label: "Water", icon: CupSoda },
      { id: "gratitude", label: "Gratitude", icon: Salad },
      { id: "cycle", label: "Cycle Tracking", icon: Heart },
    ],
  },
  {
    title: "Account",
    items: [
      { id: "profile", label: "Profile", icon: UserRound },
      { id: "settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

function getEnabledModules(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem("lifehub:modules");
    if (saved) return JSON.parse(saved);
  } catch {
    // fallback
  }
  return {};
}

interface SidebarProps {
  active: SectionId;
  onNavigate: (id: SectionId) => void;
}

export function Sidebar({ active, onNavigate }: SidebarProps) {
  const modules = getEnabledModules();

  return (
    <nav className="p-4 space-y-4 scrollbar-hide">
      {NAV_GROUPS.map((group) => {
        const filteredItems = group.items.filter((item) => {
          if (item.id === "dashboard" || item.id === "profile" || item.id === "settings") return true;
          if (modules[item.id] === false) return false;
          return true;
        });

        if (filteredItems.length === 0) return null;

        return (
          <div key={group.title}>
            <p className="text-[10px] font-semibold text-ink-500/70 uppercase tracking-widest px-2 mb-1.5">{group.title}</p>
            <ul className="space-y-0.5">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onNavigate(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200",
                        isActive
                          ? "bg-sage-500 text-white shadow-sm"
                          : "text-ink-600 hover:bg-cream-100 hover:text-ink-800"
                      )}
                    >
                      <Icon size={16} className={cn(isActive ? "text-white" : "text-ink-500")} />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function CompactNav({ active, onNavigate, onClose }: SidebarProps & { onClose: () => void }) {
  const modules = getEnabledModules();

  return (
    <nav className="w-[85vw] max-w-[280px] max-h-[calc(100vh-64px)] overflow-y-auto p-2 overscroll-behavior-contain scrollbar-hide">
      <div className="flex items-center justify-between px-2 mb-3">
        <span className="font-semibold text-ink-600 text-sm">Menu</span>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cream-100 text-ink-500">
          <X size={16} />
        </button>
      </div>
      {NAV_GROUPS.map((group) => {
        const filteredItems = group.items.filter((item) => {
          if (item.id === "dashboard" || item.id === "profile" || item.id === "settings") return true;
          if (modules[item.id] === false) return false;
          return true;
        });

        if (filteredItems.length === 0) return null;

        return (
          <div key={group.title} className="mb-2 last:mb-0">
            <p className="px-2 mb-1 text-[9px] font-bold uppercase tracking-wider text-ink-500/70">
              {group.title}
            </p>
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all",
                    isActive ? "bg-sage-500 text-white" : "text-ink-600 hover:bg-cream-100"
                  )}
                >
                  <Icon size={14} className={cn("shrink-0", isActive ? "text-white" : "text-ink-500")} />
                  {item.label}
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
