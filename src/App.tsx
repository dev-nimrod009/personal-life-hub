import { useCallback, useEffect, useState } from "react";
import { Menu, X, Feather, ArrowLeft, Plus, Inbox, Notebook, Wallet, CheckCircle2, Smile, Salad, Settings as SettingsIcon, Search } from "lucide-react";
import { Sidebar, CompactNav, type SectionId } from "./components/nav";
import { InstallAppCard } from "./components/InstallAppCard";
import { SearchModal } from "./components/SearchModal";
import { useAuth } from "./lib/auth";
import { SignInScreen } from "./pages/SignInScreen";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { JournalPage } from "./pages/JournalPage";
import { LifeReviewsPage } from "./pages/LifeReviewsPage";
import { YearlyReviewPage } from "./pages/YearlyReviewPage";
import { LearningPage } from "./pages/LearningPage";
import { CyclePage } from "./pages/CyclePage";
import { InsightsPage } from "./pages/InsightsPage";
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
import { getProfile } from "./lib/data";
import type { Profile } from "./lib/types";
import { Modal } from "./components/ui";

function renderSection(section: SectionId, onNavigate: (id: string) => void, mealTab: MealTab) {
  switch (section) {
    case "dashboard":
      return <DashboardPage onNavigate={onNavigate} />;
    case "braindump":
      return <BrainDumpPage />;
    case "journal":
      return <JournalPage />;
    case "reviews":
      return <LifeReviewsPage />;
    case "yearly":
      return <YearlyReviewPage />;
    case "learning":
      return <LearningPage />;
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
    case "cycle":
      return <CyclePage />;
    case "insights":
      return <InsightsPage />;
    case "profile":
      return <ProfilePage />;
    case "settings":
      return <SettingsPage />;
  }
}

const SECTION_TITLES: Record<SectionId, string> = {
  dashboard: "Today",
  braindump: "Brain Dump",
  journal: "Journal",
  reviews: "Life Reviews",
  yearly: "Yearly Review",
  learning: "Learning & Growth",
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
  cycle: "Cycle Tracking",
  insights: "Local Insights",
  profile: "Profile",
  settings: "Settings",
};

export default function App() {
  const { session, user, loading, offlineAccess } = useAuth();
  const [section, setSection] = useState<SectionId>("dashboard");
  const [mealTab, setMealTab] = useState<MealTab>("week");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    void getProfile(user.id, user.email ?? undefined).then((p) => {
      if (p) setProfile(p);
    });
  }, [user, section]);

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

  const isEmoji =
    profile?.avatar_url &&
    profile.avatar_url.length <= 4 &&
    !profile.avatar_url.startsWith("http") &&
    !profile.avatar_url.startsWith("data:");
  const initials = (profile?.full_name?.trim() || user?.email || "U").slice(0, 2).toUpperCase();
  const displayName = profile?.full_name?.trim()
    ? profile.full_name.trim().split(/\s+/)[0]
    : user?.email?.split("@")[0] || "Profile";

  const renderAvatar = (size = "w-8 h-8", textClass = "text-xs") => {
    if (profile?.avatar_url?.trim()) {
      if (isEmoji) {
        return (
          <span className={`${size} rounded-full bg-cream-100 border border-cream-200 flex items-center justify-center text-sm shrink-0`}>
            {profile.avatar_url}
          </span>
        );
      }
      return (
        <img
          src={profile.avatar_url.trim()}
          alt="Avatar"
          className={`${size} rounded-full object-cover border border-sage-300 shrink-0`}
        />
      );
    }
    return (
      <span className={`${size} rounded-full bg-sage-600 text-white font-semibold ${textClass} flex items-center justify-center shrink-0 shadow-xs`}>
        {initials}
      </span>
    );
  };

  return (
    <div className="min-h-screen relative">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-cream-200">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            {section !== "dashboard" ? (
              <button
                onClick={() => navigate("dashboard")}
                className="p-1.5 rounded-xl text-ink-600 hover:bg-cream-100 transition-colors"
                aria-label="Back to Today"
                title="Back to Today"
              >
                <ArrowLeft size={20} />
              </button>
            ) : (
              <Feather size={20} className="text-sage-600" />
            )}
            <span className="font-display text-lg font-semibold text-ink-800">{mobileTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-xl text-ink-600 hover:bg-cream-100 transition-colors"
              aria-label="Search"
              title="Search (Ctrl+K)"
            >
              <Search size={18} />
            </button>
            <button
              onClick={() => navigate("settings")}
              className="p-2 rounded-xl text-ink-600 hover:bg-cream-100 transition-colors"
              aria-label="Settings"
              title="Settings"
            >
              <SettingsIcon size={18} />
            </button>
            <button
              onClick={() => navigate("profile")}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-full hover:bg-cream-100 transition-colors text-ink-700"
              aria-label="Open profile and settings"
              title={`Logged in as ${profile?.full_name || user?.email || "User"}`}
            >
              {renderAvatar()}
              <span className="hidden sm:inline text-xs font-semibold text-ink-800 max-w-[120px] truncate">
                {displayName}
              </span>
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-xl text-ink-600 hover:bg-cream-100 transition-colors md:hidden"
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-xs" />
          <div 
            className="absolute left-0 top-[57px] border-r border-b border-cream-200 bg-white shadow-xl max-w-[280px] w-full max-h-[calc(100dvh-57px)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CompactNav active={section} onNavigate={navigate} onClose={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex">
        <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-cream-200 bg-white/60 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-2">
              <Feather size={22} className="text-sage-600" />
              <span className="font-display text-xl font-semibold text-ink-800">Life Hub</span>
            </div>
            <button
              onClick={() => navigate("profile")}
              className="p-1 rounded-full hover:ring-2 hover:ring-sage-300 transition-all"
              aria-label="Open profile and settings"
              title="Open profile"
            >
              {renderAvatar("w-7 h-7", "text-[11px]")}
            </button>
          </div>
          <Sidebar active={section} onNavigate={navigate} />
        </aside>

        <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 sm:py-10 pb-20 max-w-4xl mx-auto w-full">
          {renderSection(section, navigate, mealTab)}
        </main>
      </div>

      {/* Floating Quick Capture Button */}
      <button
        onClick={() => setQuickCaptureOpen(true)}
        className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-sage-600 hover:bg-sage-700 text-white shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
        aria-label="Quick Capture"
        title="Quick Capture"
      >
        <Plus size={26} />
      </button>

      {/* Quick Capture Modal */}
      <Modal open={quickCaptureOpen} onClose={() => setQuickCaptureOpen(false)} title="Quick Capture">
        <div className="grid grid-cols-2 gap-3 py-2">
          <button
            onClick={() => { setQuickCaptureOpen(false); navigate("braindump"); }}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-cream-200 bg-cream-50/70 hover:bg-sage-50 hover:border-sage-300 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center shrink-0">
              <Inbox size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-800">Brain Dump</p>
              <p className="text-xs text-ink-500">Capture thoughts</p>
            </div>
          </button>

          <button
            onClick={() => { setQuickCaptureOpen(false); navigate("notes"); }}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-cream-200 bg-cream-50/70 hover:bg-sage-50 hover:border-sage-300 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-honey-100 text-amber-700 flex items-center justify-center shrink-0">
              <Notebook size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-800">Note</p>
              <p className="text-xs text-ink-500">Quick notepad</p>
            </div>
          </button>

          <button
            onClick={() => { setQuickCaptureOpen(false); navigate("budget"); }}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-cream-200 bg-cream-50/70 hover:bg-sage-50 hover:border-sage-300 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-clay-100 text-clay-700 flex items-center justify-center shrink-0">
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-800">Expense</p>
              <p className="text-xs text-ink-500">Log money spent</p>
            </div>
          </button>

          <button
            onClick={() => { setQuickCaptureOpen(false); navigate("habits"); }}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-cream-200 bg-cream-50/70 hover:bg-sage-50 hover:border-sage-300 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-800">Habit</p>
              <p className="text-xs text-ink-500">Check streak</p>
            </div>
          </button>

          <button
            onClick={() => { setQuickCaptureOpen(false); navigate("mood"); }}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-cream-200 bg-cream-50/70 hover:bg-sage-50 hover:border-sage-300 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-soft-100 text-sky-soft-600 flex items-center justify-center shrink-0">
              <Smile size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-800">Mood</p>
              <p className="text-xs text-ink-500">Log how you feel</p>
            </div>
          </button>

          <button
            onClick={() => { setQuickCaptureOpen(false); navigate("gratitude"); }}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-cream-200 bg-cream-50/70 hover:bg-sage-50 hover:border-sage-300 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-soft-100 text-rose-soft-600 flex items-center justify-center shrink-0">
              <Salad size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-800">Gratitude</p>
              <p className="text-xs text-ink-500">Note a blessing</p>
            </div>
          </button>
        </div>
      </Modal>

      <SearchModal open={searchOpen} onClose={closeSearch} onNavigate={navigate} />

      <InstallAppCard />
    </div>
  );
}
