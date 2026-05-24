import { fallbackRoute, routes } from "./routes";
import { trackPageView } from "../analytics/metrika.js";

function matchRoute(pathname) {
  for (const route of routes) {
    if (route.match(pathname)) {
      return route.build(pathname);
    }
  }

  return fallbackRoute;
}

export function createRouter({ contentRoot, store }) {
  function render() {
    const pathname = window.location.pathname;
    const route = matchRoute(pathname);
    const pageNode = route.page({ params: route.params, store });

    contentRoot.replaceChildren(pageNode);
    trackPageView(`${pathname}${window.location.search}`);
  }

  window.addEventListener("popstate", render);
  render();
}
