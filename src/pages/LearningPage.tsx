import { useEffect, useState } from "react";
import { BookOpen, Plus, Trash2, CheckCircle2, Bookmark, Sparkles } from "lucide-react";
import { getStoredValue, setStoredValue } from "../lib/storage";
import { Button, EmptyState, Input, Label, Modal, SectionHeader, Textarea } from "../components/ui";

interface SkillItem {
  id: string;
  name: string;
  status: "Not started" | "In progress" | "Comfortable";
  notes?: string;
}

interface CurriculumItem {
  id: string;
  title: string;
  type: "Book" | "Course" | "Video" | "Article";
  status: "To read" | "In progress" | "Completed";
}

interface ExperimentItem {
  id: string;
  hypothesis: string;
  result: string;
  status: "Running" | "Completed";
}

interface KeyIdea {
  id: string;
  idea: string;
  nextReview: string; // ISO date
  interval: number; // days
}

export function LearningPage() {
  const [skills, setSkills] = useState<SkillItem[]>(() => {
    try {
      const s = getStoredValue("lifehub:skills");
      return s ? JSON.parse(s) : [
        { id: "1", name: "TypeScript & React Architecture", status: "In progress" },
        { id: "2", name: "Mindful Communication", status: "Comfortable" },
      ];
    } catch {
      return [];
    }
  });

  const [curriculum, setCurriculum] = useState<CurriculumItem[]>(() => {
    try {
      const c = getStoredValue("lifehub:curriculum");
      return c ? JSON.parse(c) : [
        { id: "1", title: "Atomic Habits by James Clear", type: "Book", status: "Completed" },
        { id: "2", title: "Designing Data-Intensive Applications", type: "Book", status: "In progress" },
      ];
    } catch {
      return [];
    }
  });

  const [experiments, setExperiments] = useState<ExperimentItem[]>(() => {
    try {
      const e = getStoredValue("lifehub:experiments");
      return e ? JSON.parse(e) : [
        { id: "1", hypothesis: "Meditating 10 mins before work for 7 days", result: "Calmer mornings and better focus.", status: "Completed" },
      ];
    } catch {
      return [];
    }
  });

  const [ideas, setIdeas] = useState<KeyIdea[]>(() => {
    try {
      const i = getStoredValue("lifehub:spaced_ideas");
      return i ? JSON.parse(i) : [
        { id: "1", idea: "Simplicity is the ultimate sophistication.", nextReview: new Date().toISOString().slice(0, 10), interval: 3 },
      ];
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<"skills" | "curriculum" | "experiments" | "ideas">("skills");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"skill" | "curriculum" | "experiment" | "idea">("skill");

  // Form states
  const [skillForm, setSkillForm] = useState({ name: "", status: "In progress" as SkillItem["status"] });
  const [currForm, setCurrForm] = useState({ title: "", type: "Book" as CurriculumItem["type"], status: "To read" as CurriculumItem["status"] });
  const [expForm, setExpForm] = useState({ hypothesis: "", result: "", status: "Running" as ExperimentItem["status"] });
  const [ideaForm, setIdeaForm] = useState({ idea: "", interval: "3" });

  useEffect(() => {
    setStoredValue("lifehub:skills", JSON.stringify(skills));
  }, [skills]);

  useEffect(() => {
    setStoredValue("lifehub:curriculum", JSON.stringify(curriculum));
  }, [curriculum]);

  useEffect(() => {
    setStoredValue("lifehub:experiments", JSON.stringify(experiments));
  }, [experiments]);

  useEffect(() => {
    setStoredValue("lifehub:spaced_ideas", JSON.stringify(ideas));
  }, [ideas]);

  const handleSave = () => {
    if (modalType === "skill") {
      if (!skillForm.name.trim()) return;
      setSkills([...skills, { id: Date.now().toString(), name: skillForm.name.trim(), status: skillForm.status }]);
      setSkillForm({ name: "", status: "In progress" });
    } else if (modalType === "curriculum") {
      if (!currForm.title.trim()) return;
      setCurriculum([...curriculum, { id: Date.now().toString(), title: currForm.title.trim(), type: currForm.type, status: currForm.status }]);
      setCurrForm({ title: "", type: "Book", status: "To read" });
    } else if (modalType === "experiment") {
      if (!expForm.hypothesis.trim()) return;
      setExperiments([...experiments, { id: Date.now().toString(), hypothesis: expForm.hypothesis.trim(), result: expForm.result.trim(), status: expForm.status }]);
      setExpForm({ hypothesis: "", result: "", status: "Running" });
    } else if (modalType === "idea") {
      if (!ideaForm.idea.trim()) return;
      const days = Number(ideaForm.interval) || 3;
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + days);
      setIdeas([...ideas, { id: Date.now().toString(), idea: ideaForm.idea.trim(), nextReview: nextDate.toISOString().slice(0, 10), interval: days }]);
      setIdeaForm({ idea: "", interval: "3" });
    }
    setModalOpen(false);
  };

  return (
    <div className="animate-fade-up pb-12">
      <SectionHeader
        title="Learning &amp; Growth"
        subtitle="Track skills you are developing, books you are reading, and 7-day personal experiments."
        action={
          <Button onClick={() => {
            setModalType(activeTab === "skills" ? "skill" : activeTab === "curriculum" ? "curriculum" : activeTab === "experiments" ? "experiment" : "idea");
            setModalOpen(true);
          }}>
            <Plus size={16} /> Add {activeTab === "skills" ? "Skill" : activeTab === "curriculum" ? "Item" : activeTab === "experiments" ? "Experiment" : "Idea"}
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: "skills", label: "Skills & Topics" },
          { id: "curriculum", label: "Curriculum" },
          { id: "experiments", label: "Experiment Log" },
          { id: "ideas", label: "Spaced Repetition Ideas" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as typeof activeTab)}
            className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all ${
              activeTab === t.id ? "bg-sage-600 text-white shadow-sm" : "bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "skills" && (
        skills.length === 0 ? (
          <EmptyState icon={<BookOpen size={26} />} title="No skills tracked yet" hint="Add skills and topics you are actively exploring." />
        ) : (
          <div className="space-y-2.5">
            {skills.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-white rounded-2xl border border-cream-200 p-4">
                <div>
                  <p className="text-sm font-semibold text-ink-800">{s.name}</p>
                  <span className={`inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    s.status === "Comfortable" ? "bg-sage-100 text-sage-700" : s.status === "In progress" ? "bg-honey-100 text-amber-800" : "bg-cream-100 text-ink-600"
                  }`}>
                    {s.status}
                  </span>
                </div>
                <Button variant="danger" size="sm" onClick={() => setSkills(skills.filter((x) => x.id !== s.id))}>
                  <Trash2 size={13} />
                </Button>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === "curriculum" && (
        curriculum.length === 0 ? (
          <EmptyState icon={<Bookmark size={26} />} title="Curriculum is empty" hint="Add books, courses, or articles you want to study." />
        ) : (
          <div className="space-y-2.5">
            {curriculum.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white rounded-2xl border border-cream-200 p-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-cream-100 text-ink-600 px-2 py-0.5 rounded-full">{c.type}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.status === "Completed" ? "bg-sage-100 text-sage-700" : "bg-honey-100 text-amber-800"}`}>{c.status}</span>
                  </div>
                  <p className="text-sm font-semibold text-ink-800">{c.title}</p>
                </div>
                <Button variant="danger" size="sm" onClick={() => setCurriculum(curriculum.filter((x) => x.id !== c.id))}>
                  <Trash2 size={13} />
                </Button>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === "experiments" && (
        experiments.length === 0 ? (
          <EmptyState icon={<Sparkles size={26} />} title="No experiments logged" hint="Try something for 7 days and record the result." />
        ) : (
          <div className="space-y-3">
            {experiments.map((e) => (
              <div key={e.id} className="bg-white rounded-2xl border border-cream-200 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-sage-700 bg-sage-50 px-2.5 py-0.5 rounded-full border border-sage-200">
                      {e.status}
                    </span>
                    <h4 className="font-display text-base font-semibold text-ink-800 mt-2">{e.hypothesis}</h4>
                    {e.result && <p className="text-sm text-ink-600 mt-1 bg-cream-50 p-3 rounded-xl border border-cream-100">Result: {e.result}</p>}
                  </div>
                  <Button variant="danger" size="sm" onClick={() => setExperiments(experiments.filter((x) => x.id !== e.id))}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === "ideas" && (
        ideas.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={26} />} title="No spaced ideas yet" hint="Add key insights to resurface periodically." />
        ) : (
          <div className="space-y-3">
            {ideas.map((i) => (
              <div key={i.id} className="bg-white rounded-2xl border border-cream-200 p-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-800 leading-relaxed">&ldquo;{i.idea}&rdquo;</p>
                  <p className="text-xs text-ink-500 mt-1.5">Next review: {i.nextReview} (Every {i.interval} days)</p>
                </div>
                <Button variant="danger" size="sm" onClick={() => setIdeas(ideas.filter((x) => x.id !== i.id))}>
                  <Trash2 size={13} />
                </Button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Add ${modalType}`}>
        <div className="space-y-4">
          {modalType === "skill" && (
            <>
              <div>
                <Label>Skill or Topic</Label>
                <Input value={skillForm.name} onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })} placeholder="e.g. Public speaking" autoFocus />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  value={skillForm.status}
                  onChange={(e) => setSkillForm({ ...skillForm, status: e.target.value as SkillItem["status"] })}
                  className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-xs font-medium text-ink-800"
                >
                  <option value="Not started">Not started</option>
                  <option value="In progress">In progress</option>
                  <option value="Comfortable">Comfortable</option>
                </select>
              </div>
            </>
          )}

          {modalType === "curriculum" && (
            <>
              <div>
                <Label>Title &amp; Author</Label>
                <Input value={currForm.title} onChange={(e) => setCurrForm({ ...currForm, title: e.target.value })} placeholder="e.g. Designing Data-Intensive Apps" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <select
                    value={currForm.type}
                    onChange={(e) => setCurrForm({ ...currForm, type: e.target.value as CurriculumItem["type"] })}
                    className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-xs font-medium text-ink-800"
                  >
                    <option value="Book">Book</option>
                    <option value="Course">Course</option>
                    <option value="Video">Video</option>
                    <option value="Article">Article</option>
                  </select>
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    value={currForm.status}
                    onChange={(e) => setCurrForm({ ...currForm, status: e.target.value as CurriculumItem["status"] })}
                    className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-xs font-medium text-ink-800"
                  >
                    <option value="To read">To read / watch</option>
                    <option value="In progress">In progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {modalType === "experiment" && (
            <>
              <div>
                <Label>Hypothesis / 7-Day Experiment</Label>
                <Input value={expForm.hypothesis} onChange={(e) => setExpForm({ ...expForm, hypothesis: e.target.value })} placeholder="e.g. No screens 1 hour before bed" autoFocus />
              </div>
              <div>
                <Label>Result / Observation</Label>
                <Textarea rows={3} value={expForm.result} onChange={(e) => setExpForm({ ...expForm, result: e.target.value })} placeholder="What did you notice?" />
              </div>
            </>
          )}

          {modalType === "idea" && (
            <>
              <div>
                <Label>Key Idea / Insight</Label>
                <Textarea rows={3} value={ideaForm.idea} onChange={(e) => setIdeaForm({ ...ideaForm, idea: e.target.value })} placeholder="An insight to remember..." autoFocus />
              </div>
              <div>
                <Label>Review Interval (days)</Label>
                <Input type="number" min={1} value={ideaForm.interval} onChange={(e) => setIdeaForm({ ...ideaForm, interval: e.target.value })} />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-cream-100">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
