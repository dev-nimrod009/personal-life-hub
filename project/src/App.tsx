import { useState } from "react";
import { Menu, X, Feather } from "lucide-react";
import { Sidebar, MobileNav, CompactNav, type SectionId } from "./components/nav";
import { InstallAppCard } from "./components/InstallAppCard";
import { useAuth } from "./lib/auth";
import { SignInScreen } from "./pages/SignInScreen";
import { ProfilePage } from "./pages/ProfilePage";
import { DashboardPage } from "./pages/DashboardPage";
import { JournalPage } from "./pages/JournalPage";
import { DiaryPage } from "./pages/DiaryPage";
import { NotesPage } from "./pages/NotesPage";
import { DayPlansPage } from "./pages/DayPlansPage";
import { RemindersPage } from "./pages/RemindersPage";
import { HabitsPage } from "./pages/HabitsPage";
import { MealsPage } from "./pages/MealsPage";
import { BudgetPage } from "./pages/BudgetPage";
import { MoodPage } from "./pages/MoodPage";
import { WaterPage } from "./pages/WaterPage";
import { GratitudePage } from "./pages/GratitudePage";
import { GoalsPage } from "./pages/GoalsPage";
import { BrainDumpPage } from "./pages/BrainDumpPage";
import { QuoteVaultPage } from "./pages/QuoteVaultPage";

function renderSection(section: SectionId, onNavigate: (id: string) => void) {
  switch (section) {
    case "dashboard":
      return <DashboardPage onNavigate={onNavigate} />;
    case "braindump":
      return <BrainDumpPage />;
    case "journal":
      return <JournalPage />;
    case "diary":
      return <DiaryPage />;
    case "notes":
      return <NotesPage />;
    case "quotes":
      return <QuoteVaultPage />;
    case "dayplans":
      return <DayPlansPage />;
    case "reminders":
      return <RemindersPage />;
    case "habits":
      return <HabitsPage />;
    case "meals":
      return <MealsPage />;
    case "budget":
      return <BudgetPage />;
    case "mood":
      return <MoodPage />;
    case "water":
      return <WaterPage />;
    case "gratitude":
      return <GratitudePage />;
    case "goals":
      return <GoalsPage />;
    case "profile":
      return <ProfilePage />;
  }
}

const SECTION_TITLES: Record<SectionId, string> = {
  dashboard: "Today",
  braindump: "Brain Dump",
  journal: "Journal",
  diary: "Diary",
  notes: "Notepad",
  quotes: "Quote Vault",
  dayplans: "Day Plans",
  reminders: "Reminders",
  habits: "Habits",
  meals: "Meal Planner",
  budget: "Budget",
  mood: "Mood",
  water: "Water",
  gratitude: "Gratitude",
  goals: "Goals",
  profile: "Profile",
};

export default function App() {
  const { session, loading } = useAuth();
  const [section, setSection] = useState<SectionId>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = (id: string) => {
    setSection(id as SectionId);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 rounded-2xl bg-cream-100 animate-pulse" />
      </div>
    );
  }

  if (!session) return <SignInScreen />;

  return (
    <div className="min-h-screen">
      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-cream-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Feather size={20} className="text-sage-600" />
            <span className="font-display text-lg font-semibold text-ink-800">{SECTION_TITLES[section]}</span>
          </div>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-xl text-ink-600 hover:bg-cream-100 transition-colors"
            aria-label="Menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-cream-200 max-h-[42vh] overflow-y-auto bg-white">
            <CompactNav active={section} onNavigate={navigate} />
          </div>
        )}
      </header>

      <div className="flex">
        <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-cream-200 bg-white/60 sticky top-0 h-screen overflow-y-auto">
          <div className="flex items-center gap-2 px-6 pt-6 pb-4">
            <Feather size={22} className="text-sage-600" />
            <span className="font-display text-xl font-semibold text-ink-800">Life Hub</span>
          </div>
          <Sidebar active={section} onNavigate={navigate} />
        </aside>

        <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 sm:py-10 pb-24 md:pb-10 max-w-4xl mx-auto w-full">
          {renderSection(section, navigate)}
        </main>
      </div>

      <MobileNav active={section} onNavigate={navigate} />
      <InstallAppCard />
    </div>
  );
}
