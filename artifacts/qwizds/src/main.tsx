import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { SoundProvider } from "./contexts/SoundContext";
import { ThemeProvider } from "./contexts/ThemeContext";

const stored = localStorage.getItem("qwizds_theme");
if (stored !== "light") document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <SoundProvider>
      <App />
    </SoundProvider>
  </ThemeProvider>
);
