import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import "./index.css";
import { applyDisplayPreferences } from "./lib/display";
import { hydrateLocalDb } from "./lib/localdb";

applyDisplayPreferences();

void hydrateLocalDb().finally(() => {
  const rootElement = document.getElementById("root");
  if (!rootElement) return;
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
});
