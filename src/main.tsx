// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { CallProvider } from "./contexts/CallContext";
import { router } from "./router";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CallProvider>
      <RouterProvider router={router} />
    </CallProvider>
  </React.StrictMode>
);
