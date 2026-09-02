import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "@/App";
import "@/styles/globals.css";

const goatcounterUrl = import.meta.env.VITE_GOATCOUNTER_URL;
if (goatcounterUrl) {
  const script = document.createElement("script");
  script.async = true;
  script.dataset.goatcounter = goatcounterUrl;
  script.src = "https://gc.zgo.at/count.js";
  document.head.appendChild(script);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
