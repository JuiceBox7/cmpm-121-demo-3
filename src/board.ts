import leaflet from "leaflet";
import luck from "./luck";

const PIT_SPAWN_PROBABILITY = 0.1;

export interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, cell);
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const i = Math.round(point.lat / this.tileWidth);
    const j = Math.round(point.lng / this.tileWidth);
    return this.getCanonicalCell({ i, j });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds([
      [cell.i * this.tileWidth, cell.j * this.tileWidth],
      [(cell.i + 1) * this.tileWidth, (cell.j + 1) * this.tileWidth],
    ]);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    for (
      let iShift = -this.tileVisibilityRadius;
      iShift < this.tileVisibilityRadius;
      iShift++
    ) {
      for (
        let jShift = -this.tileVisibilityRadius;
        jShift < this.tileVisibilityRadius;
        jShift++
      ) {
        const i = originCell.i + iShift;
        const j = originCell.j + jShift;
        if (luck([i, j].toString()) < PIT_SPAWN_PROBABILITY) {
          const toAdd = this.getCanonicalCell({ i, j });
          resultCells.push(toAdd);
        }
      }
    }
    return resultCells;
  }
}

export class Geocache {
  cell: Cell;
  numCoins: number;
  constructor(cell: Cell) {
    this.cell = cell;
    this.numCoins = 0;
  }

  toMemento() {
    return this.numCoins.toString();
  }

  fromMemento(memento: string) {
    this.numCoins = parseInt(memento);
  }
}
