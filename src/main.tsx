// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { CallProvider } from "./contexts/CallContext";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CallProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </CallProvider>
  </React.StrictMode>
);
