import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { applyDisplayPreferences } from "./lib/display";
import { hydrateLocalDb } from "./lib/localdb";

applyDisplayPreferences();

void hydrateLocalDb().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>
  );
});
