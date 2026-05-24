export function appendWithFragment(container, nodes) {
  const fragment = document.createDocumentFragment();
  nodes.forEach((node) => {
    fragment.append(node);
  });
  container.append(fragment);
}
