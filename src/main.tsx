import React from "react";
import ReactDOM from "react-dom";

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

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root"),
);
