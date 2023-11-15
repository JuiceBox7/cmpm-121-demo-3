import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board, Cell, Geocache } from "./board-n-caches";

// --- Macros ---

const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;

// --- Map ---

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

// --- Marker ---

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// --- Interfaces ---

interface Token {
  cell: Cell;
  serial: number | null;
}

// ----- HTML Div Elements -----

// --- Status and Messages ---

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";

const tokenMsg = document.querySelector<HTMLDivElement>("#tokenMsg")!;
tokenMsg.innerHTML = "";

// --- Arrows ---

const northArrow = document.querySelector<HTMLButtonElement>("#north")!;
northArrow.addEventListener("click", () => moveMarker("north"));

const eastArrow = document.querySelector<HTMLDivElement>("#east")!;
eastArrow.addEventListener("click", () => moveMarker("east"));

const southArrow = document.querySelector<HTMLDivElement>("#south")!;
southArrow.addEventListener("click", () => moveMarker("south"));

const westArrow = document.querySelector<HTMLDivElement>("#west")!;
westArrow.addEventListener("click", () => moveMarker("west"));

// --- Varirable and Object Declarations/Initializations ---

let points = 0;
const tokenCache: Token[] = [];
const mementos: Map<string, string> = new Map();
const cacheMap: Map<Cell, leaflet.Layer> = new Map();

const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
const cells = board.getCellsNearPoint(MERRILL_CLASSROOM);
makeCells(cells);

// --- Functions ---

function makePit(cell: Cell) {
  let geocache = new Geocache(cell);
  if (mementos.has(`${cell}`)) {
    console.log("has cell", cell);
    const memento = mementos.get(`${cell}`)!;
    geocache.fromMemento(memento);
  } else {
    geocache.numCoins = Math.floor(
      luck([cell.i, cell.j, "initialValue"].toString()) * 100
    );
    const memento = geocache.toMemento();
    mementos.set(`${cell}`, memento);
  }
  const bounds = board.getCellBounds(playerMarker.getLatLng(), cell);
  const pit = leaflet.rectangle(bounds) as leaflet.Layer;
  cacheMap.set(cell, pit);
  let serial = 0;
  let visited = false;

  // --- Inner Function ---

  function createButton(container: HTMLDivElement) {
    const button = document.createElement("button");
    button.innerHTML = "poke";
    button.addEventListener("click", (e) => {
      geocache.numCoins--;
      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        geocache.toMemento();
      points++;
      if (visited) {
        serial++;
      }
      visited = true;
      const toAdd: Token = { cell, serial };
      tokenCache.push(toAdd);
      const memento = geocache.toMemento();
      mementos.set(`${cell}`, memento);
      updateTokenMsg(toAdd, "add");
      updateStatusPanel();
      e.stopPropagation();
      button.remove();
    });
    container.append(button);
  }

  // --- Inner Function ---

  pit.bindPopup(() => {
    const container = document.createElement("div");
    container.innerHTML = `
                <div>There is a pit here at "${cell.i},${cell.j}". It has value <span id="value">${geocache.numCoins}</span>.</div>
                <button id="deposit">deposit</button><br>`;

    for (let x = 0; x < geocache.numCoins; x++) {
      createButton(container);
    }

    const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
    deposit.addEventListener("click", () => {
      if (tokenCache.length > 0) {
        points--;
        updateStatusPanel();
        geocache.numCoins++;
        container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          geocache.toMemento();
        const depositedToken = tokenCache.pop();
        const memento = geocache.toMemento();
        mementos.set(`${cell}`, memento);
        updateTokenMsg(depositedToken!, "deposit");
        createButton(container);
      } else tokenMsg.innerHTML = "No tokens to deposit";
    });
    return container;
  });
  pit.addTo(map);
}

function updateStatusPanel() {
  statusPanel.innerHTML =
    points < 1 ? "No points yet..." : `${points} points accumulated`;
}

function updateTokenMsg(token: Token, msg: string) {
  switch (msg) {
    case "add":
      tokenMsg.innerHTML = `Token collected: ${token.cell.i}:${token.cell.j}#${token.serial}`;
      break;

    case "deposit":
      tokenMsg.innerHTML = `Token deposited: ${token.cell.i}:${token.cell.j}#${token.serial}`;
      break;
  }
}

function makeCells(cells: Array<any>) {
  cells.forEach((cell) => {
    console.log(cell);
    makePit(cell);
  });
}

function updatePits() {
  const marker = board.getCellForPoint(playerMarker.getLatLng());
  cacheMap.forEach((cache, cell) => {
    if (
      Math.abs(cell.i - marker.i) > NEIGHBORHOOD_SIZE ||
      Math.abs(cell.j - marker.j) > NEIGHBORHOOD_SIZE
    ) {
      cache.remove();
    }
  });
}

function moveMarker(direction: string) {
  const marker = playerMarker.getLatLng();
  switch (direction) {
    case "north":
      marker.lat += 0.0001;
      break;

    case "east":
      marker.lng += 0.0001;
      break;

    case "south":
      marker.lat -= 0.0001;
      break;

    case "west":
      marker.lng -= 0.0001;
      break;
  }
  playerMarker.setLatLng(marker);
  updatePits();
  const cells = board.getCellsNearPoint(marker);
  makeCells(cells);
}
