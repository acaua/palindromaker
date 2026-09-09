import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "@/App";
import { initGoatcounter } from "@/lib/goatcounter";
import "@/styles/globals.css";

// GoatCounter only when configured (see .env.local.example); the router
// counts one pageview per route
initGoatcounter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
