import { useEffect, useState } from "react";
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
import type { MealTab } from "./pages/MealsPage";

function renderSection(section: SectionId, onNavigate: (id: string) => void, mealTab: MealTab) {
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
      return <MealsPage activeTab={mealTab} onTabChange={(tab) => onNavigate(`meals:${tab}`)} />;
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
  const { session, loading, offlineAccess } = useAuth();
  const [section, setSection] = useState<SectionId>("dashboard");
  const [mealTab, setMealTab] = useState<MealTab>("week");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    window.history.replaceState(
      { ...(window.history.state ?? {}), appSection: "dashboard", mealTab: "week" },
      "",
      window.location.href
    );
    const restoreSection = (event: PopStateEvent) => {
      const sectionId = event.state?.appSection;
      if (typeof sectionId === "string" && Object.prototype.hasOwnProperty.call(SECTION_TITLES, sectionId)) {
        setSection(sectionId as SectionId);
      } else {
        setSection("dashboard");
      }
      const tab = event.state?.mealTab;
      setMealTab(
        tab === "week" || tab === "library" || tab === "recipes" || tab === "pantry" || tab === "shopping"
          ? tab
          : "week"
      );
      setMenuOpen(false);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", restoreSection);
    return () => window.removeEventListener("popstate", restoreSection);
  }, []);

  const navigate = (id: string) => {
    const mealTarget = id.match(/^meals:(week|library|recipes|pantry|shopping)$/);
    const nextSection = mealTarget ? "meals" : id;
    if (!Object.prototype.hasOwnProperty.call(SECTION_TITLES, nextSection)) return;
    const nextMealTab = mealTarget ? (mealTarget[1] as MealTab) : nextSection === "meals" ? mealTab : "week";
    if (nextSection !== section || (nextSection === "meals" && nextMealTab !== mealTab)) {
      window.history.pushState(
        { appSection: nextSection, mealTab: nextMealTab },
        "",
        window.location.href
      );
      setSection(nextSection as SectionId);
      setMealTab(nextMealTab);
    }
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  };
  const mobileTitle =
    section !== "meals"
      ? SECTION_TITLES[section]
      : mealTab === "pantry"
        ? "Pantry"
        : mealTab === "shopping"
          ? "Shop"
          : mealTab === "recipes"
            ? "Recipes"
            : "Meal Planner";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 rounded-2xl bg-cream-100 animate-pulse" />
      </div>
    );
  }

  if (!session && !offlineAccess) return <SignInScreen />;

  return (
    <div className="min-h-screen">
      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-cream-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Feather size={20} className="text-sage-600" />
            <span className="font-display text-lg font-semibold text-ink-800">{mobileTitle}</span>
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
          {renderSection(section, navigate, mealTab)}
        </main>
      </div>

      <MobileNav active={section} mealTab={mealTab} onNavigate={navigate} />
      <InstallAppCard />
    </div>
  );
}
