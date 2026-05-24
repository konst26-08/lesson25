import { navigateTo } from "../../utils/navigation";

export function renderSportTile(sport) {
  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = "sport-tile";
  tile.textContent = sport.label;
  tile.addEventListener("click", () => navigateTo(`/catalog?sport=${sport.id}`));
  return tile;
}
