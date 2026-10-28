import { getStoredValue } from "./storage";

let mediaListenerAttached = false;

export function applyDisplayPreferences(): void {
  const root = document.documentElement;
  const theme = getStoredValue("lifehub:theme") || "system";
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  root.classList.toggle("lh-dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";

  const fontSize = getStoredValue("lifehub:fontsize") || "normal";
  root.classList.toggle("lh-text-small", fontSize === "small");
  root.classList.toggle("lh-text-large", fontSize === "large");

  root.classList.toggle("lh-contrast", getStoredValue("lifehub:contrast") === "1");

  if (!mediaListenerAttached && window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyDisplayPreferences);
    mediaListenerAttached = true;
  }
}
