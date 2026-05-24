import { createRouter } from "./router/router";
import { createStore } from "./state/store";
import { renderAppHeader } from "./components/layout/AppHeader";

export function createApp() {
  const store = createStore();
  const app = document.createElement("div");
  app.className = "app-shell";

  const header = renderAppHeader();
  const content = document.createElement("main");
  content.className = "app-content";

  app.append(header, content);

  createRouter({
    contentRoot: content,
    store
  });

  return app;
}
