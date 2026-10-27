import { X } from "lucide-react";
import { cn } from "../lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 max-h-[85vh] overflow-y-auto animate-pop-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl font-semibold text-ink-800">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-ink-500 hover:bg-cream-100 hover:text-ink-700 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}

export function EmptyState({ icon, title, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-cream-100 flex items-center justify-center text-ink-500 mb-4">
        {icon}
      </div>
      <p className="font-display text-lg font-medium text-ink-700">{title}</p>
      {hint && <p className="text-sm text-ink-500 mt-1 max-w-xs leading-relaxed">{hint}</p>}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink-800">{title}</h2>
        {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none",
        size === "sm" ? "text-xs px-3 py-1.5" : "text-sm px-4 py-2.5",
        variant === "primary" && "bg-sage-600 text-white hover:bg-sage-700 active:scale-[0.98]",
        variant === "secondary" && "bg-cream-100 text-ink-700 hover:bg-cream-200 active:scale-[0.98]",
        variant === "ghost" && "text-ink-500 hover:bg-cream-100 hover:text-ink-700",
        variant === "danger" && "text-rose-soft-600 hover:bg-rose-soft-100",
        className
      )}
      {...props}
    />
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-cream-200 bg-white px-3.5 py-2.5 text-sm text-ink-800 placeholder:text-ink-500/60 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-shadow",
        className
      )}
      {...props}
    />
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-cream-200 bg-white px-3.5 py-2.5 text-sm text-ink-800 placeholder:text-ink-500/60 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-shadow resize-y",
        className
      )}
      {...props}
    />
  );
}

interface LabelProps {
  children: React.ReactNode;
}

export function Label({ children }: LabelProps) {
  return <label className="block text-xs font-semibold text-ink-600 mb-1.5 uppercase tracking-wide">{children}</label>;
}
