import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";

const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
const token = hash.get("token");
if (token) {
  sessionStorage.setItem("veyra_token", token);
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
