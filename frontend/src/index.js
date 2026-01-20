import React from "react";
import ReactDOM from "react-dom/client";
import ECommercePlatform from "./App"; // must match app.jsx (case-sensitive)
import "./index.css"; // keep if you are using Tailwind or global styles

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <ECommercePlatform />
  </React.StrictMode>
);
