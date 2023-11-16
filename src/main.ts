import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board, Cell, Geocache } from "./board";

// --- Macros ---

const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const GAME_STATE_CHANGED = "game-state-changed";

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
  serial: number;
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
const mementos: Map<Cell, string> = new Map();
const cacheMap: Map<Cell, leaflet.Layer> = new Map();

const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

function spawnGeocachesNearPlayer() {
  const cells = board.getCellsNearPoint(playerMarker.getLatLng());
  cells.forEach((cell) => {
    maybeSpawnGeocache(cell);
  });
}

function despawnAllGeocaches() {
  cacheMap.forEach((rect) => rect.remove());
  cacheMap.clear();
}

window.addEventListener(GAME_STATE_CHANGED, () => {
  despawnAllGeocaches();
  spawnGeocachesNearPlayer();
});

window.dispatchEvent(new Event(GAME_STATE_CHANGED));

// --- Functions ---

function maybeSpawnGeocache(cell: Cell) {
  let geocache = new Geocache(cell);

  geocache.numCoins = Math.floor(
    luck([cell.i, cell.j, "initialValue"].toString()) * 20
  );

  if (mementos.has(cell)) {
    console.log("works");
    geocache.fromMemento(mementos.get(cell)!);
  }

  const bounds = board.getCellBounds(cell);
  const rect = leaflet.rectangle(bounds) as leaflet.Layer;

  // --- Inner Function ---

  function createCollectButton(container: HTMLDivElement): HTMLButtonElement {
    const button = document.createElement("button");
    button.innerHTML = "collect";
    button.addEventListener("click", (e) => {
      geocache.numCoins--;
      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        geocache.toMemento();
      points++;
      const toAdd: Token = { cell, serial: 0 };
      tokenCache.push(toAdd);
      updateTokenMsg(toAdd, "add");
      updateStatusPanel();
      e.stopPropagation();
      button.remove();
    });
    container.append(button);
    return button;
  }

  // --- Inner Function ---

  rect.bindPopup(() => {
    const container = document.createElement("div");
    container.innerHTML = `
    <div>There is a pit here at "${cell.i},${cell.j}". It has value <span id="value">${geocache.numCoins}</span>.</div>
    <button id="deposit">deposit</button><br>`;

    for (let x = 0; x < geocache.numCoins; x++) {
      createCollectButton(container);
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
        updateTokenMsg(depositedToken!, "deposit");
        createCollectButton(container);
      } else tokenMsg.innerHTML = "No tokens to deposit";
    });
    return container;
  });
  mementos.set(cell, geocache.toMemento());
  cacheMap.set(cell, rect);
  rect.addTo(map);
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

function moveMarker(direction: string) {
  const marker = playerMarker.getLatLng();
  switch (direction) {
    case "north":
      marker.lat += TILE_DEGREES;
      break;

    case "east":
      marker.lng += TILE_DEGREES;
      break;

    case "south":
      marker.lat -= TILE_DEGREES;
      break;

    case "west":
      marker.lng -= TILE_DEGREES;
      break;
  }
  playerMarker.setLatLng(marker);
  window.dispatchEvent(new Event(GAME_STATE_CHANGED));
}
