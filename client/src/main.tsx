import { Buffer } from "buffer";
window.Buffer = Buffer;
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import process from "process";

window.process = process;
window.Buffer = Buffer;

createRoot(document.getElementById("root")!).render(<App />);
