import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board } from "./board";

const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const NULL_ISLAND = leaflet.latLng({
  lat: 0,
  lng: 0,
});

interface Token {
  i: number;
  j: number;
  serial: number | null;
}

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;

const mapContainer = document.querySelector<HTMLElement>("#map")!;

const map = leaflet.map(mapContainer, {
  center: MERRILL_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(NULL_ISLAND);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

let points = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";

function makePit(i: number, j: number) {
  let cache: Token[] = [];
  const bounds = board.getCellBounds(map.getCenter(), { i, j });
  const pit = leaflet.rectangle(bounds) as leaflet.Layer;
  let serial = 0;

  pit.bindPopup(() => {
    let value = Math.floor(luck([i, j, "initialValue"].toString()) * 100);
    const container = document.createElement("div");
    container.innerHTML = `
                <div>There is a pit here at "${i},${j}". It has value <span id="value">${value}</span>.</div>
                <button id="poke">poke</button><button id="deposit">deposit</button>`;

    const poke = container.querySelector<HTMLButtonElement>("#poke")!;
    poke.addEventListener("click", () => {
      value--;
      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        value.toString();
      points++;
      if (cache.length > 0) {
        serial++;
      }
      const toAdd: Token = { i, j, serial };
      cache.push(toAdd);
      console.log(toAdd);
      updateStatusPanel();
    });

    const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
    deposit.addEventListener("click", () => {
      if (points > 0) {
        points--;
        updateStatusPanel();
        value++;
        container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          value.toString();
      }
    });
    return container;
  });
  pit.addTo(map);
}

function updateStatusPanel() {
  statusPanel.innerHTML =
    points < 1 ? "No points yet..." : `${points} points accumulated`;
}

function makeCells(cells: Array<any>) {
  cells.forEach((cell) => {
    makePit(cell.i, cell.j);
  });
}

const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
const cells = board.getCellsNearPoint(MERRILL_CLASSROOM);
makeCells(cells);
