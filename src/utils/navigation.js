export function navigateTo(path) {
  const currentPath = `${window.location.pathname}${window.location.search}`;

  if (currentPath === path) {
    return;
  }

  window.history.pushState({}, "", path);
  window.dispatchEvent(new Event("popstate"));
}
