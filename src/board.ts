import leaflet from "leaflet";
import luck from "./luck";

const PIT_SPAWN_PROBABILITY = 0.1;

interface Cell {
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
    const i = point.lat;
    const j = point.lng;
    return this.getCanonicalCell({ i, j });
  }

  getCellBounds(center: leaflet.LatLng, cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds([
      [
        center.lat + cell.i * this.tileWidth,
        center.lng + cell.j * this.tileWidth,
      ],
      [
        center.lat + (cell.i + 1) * this.tileWidth,
        center.lng + (cell.j + 1) * this.tileWidth,
      ],
    ]);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    resultCells.push(originCell);
    for (
      let i = -this.tileVisibilityRadius;
      i < this.tileVisibilityRadius;
      i++
    ) {
      for (
        let j = -this.tileVisibilityRadius;
        j < this.tileVisibilityRadius;
        j++
      ) {
        if (luck([i, j].toString()) < PIT_SPAWN_PROBABILITY) {
          const toAdd = this.getCanonicalCell({ i, j });
          resultCells.push(toAdd);
        }
      }
    }
    return resultCells;
  }
}
