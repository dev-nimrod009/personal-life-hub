import { useEffect, useMemo, useState } from "react";
import { Notebook, Plus, Trash2, Pin, PinOff, Pencil, Lock, Unlock, Eye, EyeOff, ChevronDown, Shield } from "lucide-react";
import { listNotes, upsertNote, setNotePinned, deleteNote, getPrivatePasswordHash, setPrivatePasswordHash, clearNotePasswordHashes } from "../lib/data";
import type { Note } from "../lib/types";
import { Button, EmptyState, Input, Label, Modal, SectionHeader, Textarea } from "../components/ui";
import { cn } from "../lib/utils";

const CATEGORIES = ["personal", "work", "ideas", "private"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABEL: Record<Category, string> = {
  personal: "Personal",
  work: "Work",
  ideas: "Ideas",
  private: "Private",
};

const CATEGORY_COLOR: Record<Category, string> = {
  personal: "bg-sage-100 text-sage-700",
  work: "bg-sky-soft-100 text-sky-soft-700",
  ideas: "bg-honey-100 text-honey-700",
  private: "bg-rose-soft-100 text-rose-soft-700",
};

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface Draft {
  title: string;
  content: string;
  category: Category;
}

const emptyDraft: Draft = { title: "", content: "", category: "personal" };

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Note | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [privateHash, setPrivateHash] = useState("");
  const [privateUnlocked, setPrivateUnlocked] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockInput, setUnlockInput] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [setPassOpen, setSetPassOpen] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [newPassConfirm, setNewPassConfirm] = useState("");
  const [passError, setPassError] = useState("");

  const load = async () => {
    try {
      const [notesList, hash] = await Promise.all([listNotes(), getPrivatePasswordHash()]);
      setNotes(notesList);
      setPrivateHash(hash);
      setError("");
    } catch {
      setError("Could not read notes from this device.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setEditing(null);
    const defaultCat: Category = filter === "all" ? "personal" : (filter as Category);
    if (defaultCat === "private" && !privateUnlocked) {
      setUnlockOpen(true);
      return;
    }
    setForm({ ...emptyDraft, category: defaultCat });
    setOpen(true);
  };

  const startEdit = (note: Note) => {
    setEditing(note);
    setForm({
      title: note.title,
      content: note.content,
      category: (note.category as Category) ?? "personal",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() && !form.content.trim()) return;
    setSaving(true);
    try {
      await upsertNote({
        id: editing?.id,
        title: form.title,
        content: form.content,
        category: form.category,
      });
      setEditing(null);
      setForm(emptyDraft);
      setOpen(false);
      setError("");
      await load();
    } catch {
      setError("Could not save the note.");
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (note: Note) => {
    try {
      await setNotePinned(note.id, !note.pinned);
    } catch {
      setError("Could not pin the note.");
    }
    load();
  };

  const remove = async (id: string) => {
    try {
      await deleteNote(id);
    } catch {
      setError("Could not delete the note.");
    }
    load();
  };

  const tryUnlock = async () => {
    const hash = await sha256(unlockInput);
    if (hash === privateHash) {
      setPrivateUnlocked(true);
      setUnlockOpen(false);
      setUnlockInput("");
      setUnlockError("");
    } else {
      setUnlockError("Wrong password.");
    }
  };

  const lockPrivate = () => {
    setPrivateUnlocked(false);
    setFilter("all");
  };

  const saveNewPassword = async () => {
    if (!newPass.trim()) {
      setPassError("Enter a password.");
      return;
    }
    if (newPass !== newPassConfirm) {
      setPassError("Passwords do not match.");
      return;
    }
    try {
      const hash = await sha256(newPass.trim());
      await setPrivatePasswordHash(hash);
      await clearNotePasswordHashes();
      setPrivateHash(hash);
      setPrivateUnlocked(true);
      setSetPassOpen(false);
      setNewPass("");
      setNewPassConfirm("");
      setPassError("");
      setError("");
      load();
    } catch {
      setPassError("Could not save the password.");
    }
  };

  const privateNotes = notes.filter((n) => (n.category ?? "personal") === "private");
  const hasPrivate = privateNotes.length > 0 || privateHash !== "";

  const filtered = useMemo(() => {
    const list = filter === "all" ? notes.filter((n) => (n.category ?? "personal") !== "private" || privateUnlocked) : notes.filter((n) => (n.category ?? "personal") === filter);
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [notes, filter, privateUnlocked]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {
      all: notes.filter((n) => (n.category ?? "personal") !== "private" || privateUnlocked).length,
    };
    for (const c of CATEGORIES) map[c] = notes.filter((n) => (n.category ?? "personal") === c).length;
    return map;
  }, [notes, privateUnlocked]);

  const filterLabel = filter === "all" ? "All notes" : CATEGORY_LABEL[filter];

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title="Notepad"
        subtitle="Quick notes, lists, and things to remember"
        action={
          <Button onClick={startNew}>
            <Plus size={16} /> New note
          </Button>
        }
      />

      {error && <div className="mb-4 rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{error}</div>}

      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white border border-cream-200 text-ink-600 hover:bg-cream-100"
          >
            {filterLabel} <span className="text-ink-500/60">({counts[filter] ?? 0})</span>
            <ChevronDown size={14} className={cn("transition-transform", dropdownOpen && "rotate-180")} />
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-40 bg-white rounded-xl border border-cream-200 shadow-lg py-1 min-w-[140px]">
                <button
                  onClick={() => { setFilter("all"); setDropdownOpen(false); }}
                  className={cn("w-full text-left px-3 py-2 text-xs hover:bg-cream-100", filter === "all" ? "text-sage-600 font-semibold" : "text-ink-600")}
                >
                  All notes ({counts.all})
                </button>
                {CATEGORIES.filter((c) => c !== "private").map((c) => (
                  <button
                    key={c}
                    onClick={() => { setFilter(c); setDropdownOpen(false); }}
                    className={cn("w-full text-left px-3 py-2 text-xs hover:bg-cream-100", filter === c ? "text-sage-600 font-semibold" : "text-ink-600")}
                  >
                    {CATEGORY_LABEL[c]} ({counts[c] ?? 0})
                  </button>
                ))}
                <div className="border-t border-cream-100 my-1" />
                {hasPrivate ? (
                  privateUnlocked ? (
                    <>
                      <button
                        onClick={() => { setFilter("private"); setDropdownOpen(false); }}
                        className={cn("w-full text-left px-3 py-2 text-xs hover:bg-cream-100 flex items-center gap-1.5", filter === "private" ? "text-sage-600 font-semibold" : "text-ink-600")}
                      >
                        <Unlock size={12} /> Private ({counts.private ?? 0})
                      </button>
                      <button
                        onClick={() => { lockPrivate(); setDropdownOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-cream-100 text-ink-500 flex items-center gap-1.5"
                      >
                        <Lock size={12} /> Lock private
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setUnlockOpen(true); setDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-cream-100 text-rose-soft-600 flex items-center gap-1.5"
                    >
                      <Lock size={12} /> Private ({counts.private ?? 0}) — unlock
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => { setSetPassOpen(true); setDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-cream-100 text-rose-soft-600 flex items-center gap-1.5"
                  >
                    <Shield size={12} /> Set up private notes
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {filter === "private" && privateUnlocked && (
        <div className="mb-3 flex items-center justify-between rounded-xl bg-rose-soft-100 px-4 py-2.5">
          <p className="text-xs text-rose-soft-700 flex items-center gap-1.5"><Unlock size={13} /> Private notes are unlocked</p>
          <button onClick={lockPrivate} className="text-xs font-medium text-rose-soft-700 hover:text-rose-soft-800">Lock now</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-cream-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Notebook size={26} />}
          title={filter === "private" ? "No private notes yet" : "No notes here yet"}
          hint={filter === "private" ? "Create a private note and it'll be hidden until you unlock." : "Jot down anything — a gift idea, a packing list, a passing thought."}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((note) => {
            const cat = (note.category ?? "personal") as Category;
            const isPrivate = cat === "private";
            const hidden = isPrivate && !privateUnlocked;
            return (
              <div
                key={note.id}
                className={cn(
                  "group relative bg-white rounded-2xl border p-5 hover:shadow-md transition-all duration-200",
                  note.pinned ? "border-honey-300 bg-honey-100/40" : "border-cream-200",
                  hidden && "bg-cream-100/60"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isPrivate && <Lock size={14} className="text-rose-soft-500 shrink-0" />}
                    <h4 className="font-display text-lg font-semibold text-ink-800 truncate">
                      {hidden ? "Locked private note" : note.title || "Untitled"}
                    </h4>
                  </div>
                  <div className="flex gap-0.5 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    {(!hidden) && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => togglePin(note)} aria-label="Pin">
                          {note.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => startEdit(note)} aria-label="Edit">
                          <Pencil size={13} />
                        </Button>
                      </>
                    )}
                    <Button variant="danger" size="sm" onClick={() => remove(note.id)} aria-label="Delete">
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full", CATEGORY_COLOR[cat])}>
                    {CATEGORY_LABEL[cat]}
                  </span>
                </div>
                {hidden ? (
                  <div className="mt-3">
                    <p className="text-xs text-ink-500 mb-2">Unlock private notes to view this.</p>
                    <Button variant="secondary" size="sm" onClick={() => setUnlockOpen(true)}>
                      <Lock size={13} /> Unlock
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-ink-600 leading-relaxed mt-2 whitespace-pre-wrap line-clamp-5">
                    {note.content}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          setForm(emptyDraft);
        }}
        title={editing ? "Edit note" : "New note"}
      >
        <div className="space-y-4">
          <div>
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter((c) => c !== "private").map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, category: c })}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    form.category === c ? "bg-sage-600 text-white" : "bg-cream-100 text-ink-600 hover:bg-cream-200"
                  )}
                >
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
              {privateUnlocked && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, category: "private" })}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    form.category === "private" ? "bg-rose-soft-500 text-white" : "bg-rose-soft-100 text-rose-soft-700 hover:bg-rose-soft-200"
                  )}
                >
                  {CATEGORY_LABEL.private}
                </button>
              )}
            </div>
          </div>
          <div>
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Note title..."
            />
          </div>
          <div>
            <Label>Note</Label>
            <Textarea
              rows={6}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Write it down..."
            />
          </div>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? "Saving..." : editing ? "Save changes" : "Save note"}
          </Button>
        </div>
      </Modal>

      <Modal open={unlockOpen} onClose={() => { setUnlockOpen(false); setUnlockInput(""); setUnlockError(""); }} title="Unlock private notes">
        <div className="space-y-4">
          <p className="text-xs text-ink-500">Enter your private notes password to see all locked notes.</p>
          <div>
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                autoFocus
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={unlockInput}
                onChange={(e) => setUnlockInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
                placeholder="Enter your private password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500/60 hover:text-ink-700"
                aria-label={showPassword ? "Hide" : "Show"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          {unlockError && <div className="rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{unlockError}</div>}
          <Button onClick={() => void tryUnlock()} disabled={!unlockInput} className="w-full">
            Unlock
          </Button>
        </div>
      </Modal>

      <Modal open={setPassOpen} onClose={() => { setSetPassOpen(false); setNewPass(""); setNewPassConfirm(""); setPassError(""); }} title="Set up private notes password">
        <div className="space-y-4">
          <p className="text-xs text-ink-500">Choose one password for all your private notes. You'll enter it once to unlock every private note.</p>
          <div>
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Create a password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500/60 hover:text-ink-700"
                aria-label={showPassword ? "Hide" : "Show"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <Label>Confirm password</Label>
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={newPassConfirm}
              onChange={(e) => setNewPassConfirm(e.target.value)}
              placeholder="Repeat your password"
            />
          </div>
          {passError && <div className="rounded-xl bg-rose-soft-100 text-rose-soft-600 text-sm px-4 py-3">{passError}</div>}
          <Button onClick={() => void saveNewPassword()} disabled={!newPass.trim()} className="w-full">
            Set password
          </Button>
        </div>
      </Modal>
    </div>
  );
}
