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
const ADD = "add";
const DEPOSIT = "deposit";
const GAME_STATE_CHANGED = "game-state-changed";
const NORTH = "north";
const EAST = "east";
const SOUTH = "south";
const WEST = "west";
const DIRECTIONS: { [id: string]: string } = {
  "#north": NORTH,
  "#east": EAST,
  "#south": SOUTH,
  "#west": WEST,
};

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

// --- HTML Elements ---

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";

const tokenMsg = document.querySelector<HTMLDivElement>("#tokenMsg")!;
tokenMsg.innerHTML = "";

const directions: string[] = ["#north", "#east", "#south", "#west"];
makeArrowButtons(directions);

const resetBtn = document.querySelector<HTMLButtonElement>("#reset")!;
resetBtn.addEventListener("click", () => reset());

const sensorButton = document.querySelector("#sensor")!;
sensorButton.addEventListener("click", () => {
  navigator.geolocation.watchPosition((position) => {
    playerMarker.setLatLng(
      leaflet.latLng(position.coords.latitude, position.coords.longitude)
    );
    map.setView(playerMarker.getLatLng());
    window.dispatchEvent(new Event(GAME_STATE_CHANGED));
  });
});

// --- Varirable and Object Declarations/Initializations ---

let points = 0;
let tokenCache: Token[] = [];
const mementos: Map<Cell, string> = new Map();
const cacheMap: Map<Cell, leaflet.Layer> = new Map();
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
let path: Array<[number, number]> = [];
path.push([MERRILL_CLASSROOM.lat, MERRILL_CLASSROOM.lng]);
let polylines: leaflet.Polyline[] = [];

// --- Event Listeners ---

window.addEventListener(GAME_STATE_CHANGED, () => {
  despawnGeocaches();
  spawnGeocachesNearPlayer();
});

window.dispatchEvent(new Event(GAME_STATE_CHANGED));

// --- Functions ---

function spawnGeocache(cell: Cell) {
  let geocache = new Geocache(cell);
  geocache.numCoins = Math.floor(
    luck([cell.i, cell.j, "initialValue"].toString()) * 20
  );

  if (mementos.has(cell)) {
    geocache.fromMemento(mementos.get(cell)!);
  }

  const bounds = board.getCellBounds(cell);
  const rect = leaflet.rectangle(bounds) as leaflet.Layer;
  mementos.set(cell, geocache.toMemento());
  cacheMap.set(cell, rect);
  rect.addTo(map);

  rect.bindPopup(() => {
    const container = document.createElement("div");
    container.innerHTML = `
    <div>There is a pit here at "${cell.i},${cell.j}". It has value <span id="value">${geocache.numCoins}</span>.</div>
    <button id="deposit">deposit</button><br>`;

    for (let count = 0; count < geocache.numCoins; count++) {
      createCollectButton(container, count, geocache);
    }
    createDepositButton(container, geocache);
    return container;
  });
}

function updateStatusPanel() {
  statusPanel.innerHTML =
    points < 1 ? "No points yet..." : `${points} points accumulated`;
}

function updateTokenMsg(token: Token, msg: string) {
  switch (msg) {
    case ADD:
      tokenMsg.innerHTML = `Token collected: ${token.cell.i}:${token.cell.j}#${token.serial}`;
      break;

    case DEPOSIT:
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
  path.push([marker.lat, marker.lng]);
  polylines.push(leaflet.polyline(path, { color: "red" }).addTo(map));
  map.setView(marker);
  window.dispatchEvent(new Event(GAME_STATE_CHANGED));
}

function spawnGeocachesNearPlayer() {
  const cells = board.getCellsNearPoint(playerMarker.getLatLng());
  cells.forEach((cell) => {
    spawnGeocache(cell);
  });
}

function despawnGeocaches() {
  cacheMap.forEach((rect) => rect.remove());
  cacheMap.clear();
}

function makeArrowButtons(directions: string[]) {
  directions.forEach((direction) => {
    const button = document.querySelector<HTMLButtonElement>(direction)!;
    button.addEventListener("click", () => moveMarker(DIRECTIONS[direction]));
  });
}

function createCollectButton(
  container: HTMLDivElement,
  serial: number,
  geocache: Geocache
) {
  const button = document.createElement("button");
  button.innerHTML = "collect";
  button.addEventListener("click", (e) => {
    geocache.numCoins--;
    container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
      geocache.toMemento();
    points++;
    const cell = geocache.cell;
    const toAdd: Token = { cell, serial };
    tokenCache.push(toAdd);
    updateTokenMsg(toAdd, ADD);
    mementos.set(cell, geocache.toMemento());
    updateStatusPanel();
    e.stopPropagation();
    button.remove();
  });
  container.append(button);
}

function createDepositButton(container: HTMLDivElement, geocache: Geocache) {
  const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
  deposit.addEventListener("click", () => {
    if (tokenCache.length > 0) {
      points--;
      updateStatusPanel();
      geocache.numCoins++;
      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        geocache.toMemento();
      const depositedToken = tokenCache.pop()!;
      updateTokenMsg(depositedToken, DEPOSIT);
      mementos.set(geocache.cell, geocache.toMemento());
      createCollectButton(container, depositedToken.serial, geocache);
    } else tokenMsg.innerHTML = "No tokens to deposit";
  });
}

function reset() {
  tokenCache = [];
  playerMarker.setLatLng(path[0]);
  map.setView(path[0]);
  path = [];
  path.push([MERRILL_CLASSROOM.lat, MERRILL_CLASSROOM.lng]);
  polylines.forEach((line) => {
    line.remove();
  });
  console.log(map.getCenter());
  board.clear();
  mementos.clear();
  points = 0;
  updateStatusPanel();
  tokenMsg.innerHTML = "";
  window.dispatchEvent(new Event(GAME_STATE_CHANGED));
}
