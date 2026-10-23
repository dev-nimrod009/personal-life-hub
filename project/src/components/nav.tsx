import { BookOpen, CalendarDays, CheckCircle2, ClipboardList, CupSoda, Heart, Notebook, Salad, Smile, Target, Utensils, Bell, Inbox, Quote, UserRound, Wallet } from "lucide-react";
import { cn } from "../lib/utils";

export type SectionId =
  | "dashboard"
  | "braindump"
  | "journal"
  | "diary"
  | "notes"
  | "quotes"
  | "dayplans"
  | "reminders"
  | "habits"
  | "meals"
  | "budget"
  | "mood"
  | "water"
  | "gratitude"
  | "goals"
  | "profile";

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
      { id: "diary", label: "Diary", icon: Heart },
      { id: "notes", label: "Notepad", icon: Notebook },
      { id: "quotes", label: "Quote Vault", icon: Quote },
    ],
  },
  {
    title: "Planning",
    items: [
      { id: "dayplans", label: "Day Plans", icon: ClipboardList },
      { id: "reminders", label: "Reminders", icon: Bell },
      { id: "goals", label: "Goals", icon: Target },
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
    ],
  },
  {
    title: "Account",
    items: [{ id: "profile", label: "Profile", icon: UserRound }],
  },
];

interface SidebarProps {
  active: SectionId;
  onNavigate: (id: SectionId) => void;
}

export function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <nav className="p-4 space-y-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="text-[10px] font-semibold text-ink-500/70 uppercase tracking-widest px-2 mb-1.5">{group.title}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
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
      ))}
    </nav>
  );
}

export function MobileNav({ active, onNavigate }: SidebarProps) {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-cream-200">
      <div className="grid grid-cols-5">
        {(
          [
            { id: "dashboard", label: "Today", icon: CalendarDays },
            { id: "journal", label: "Journal", icon: BookOpen },
            { id: "dayplans", label: "Plans", icon: ClipboardList },
            { id: "habits", label: "Habits", icon: CheckCircle2 },
            { id: "meals", label: "Meals", icon: Utensils },
          ] as NavItem[]
        ).map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                isActive ? "text-sage-600" : "text-ink-500"
              )}
            >
              <Icon size={19} />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

const ALL_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function CompactNav({ active, onNavigate }: SidebarProps) {
  return (
    <div className="grid grid-cols-3 gap-1 p-3">
      {ALL_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 rounded-lg text-[11px] font-medium transition-all",
              isActive ? "bg-sage-500 text-white" : "text-ink-600 hover:bg-cream-100"
            )}
          >
            <Icon size={17} className={cn(isActive ? "text-white" : "text-ink-500")} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
