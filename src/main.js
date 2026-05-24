import "./styles/global.css";
import { createApp } from "./app";
import { initMetrika } from "./analytics/metrika.js";

initMetrika();

const root = document.querySelector("#app");

if (!root) {
  throw new Error("Root container not found");
}

const app = createApp();
root.append(app);
