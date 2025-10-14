/**
 * Spatial Index for efficient collision detection in time-based layouts
 * Uses a grid-based approach optimized for calendar time slots
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpatialObject {
  id: string;
  bounds: BoundingBox;
  data?: Record<string, unknown>;
}

export interface CollisionResult {
  object: SpatialObject;
  distance?: number;
}

/**
 * Grid-based spatial index for time slot collision detection
 */
export class SpatialIndex {
  private grid: Map<string, SpatialObject[]> = new Map();
  private gridSize: number;

  constructor(
    gridSize: number = 60,
    _bounds: BoundingBox = { x: 0, y: 0, width: 200, height: 1020 }
  ) {
    this.gridSize = gridSize;
  }

  /**
   * Convert world coordinates to grid coordinates
   */
  private worldToGrid(x: number, y: number): { gridX: number; gridY: number } {
    const gridX = Math.floor(x / this.gridSize);
    const gridY = Math.floor(y / this.gridSize);
    return { gridX, gridY };
  }

  /**
   * Convert grid coordinates to world coordinates
   */
  // Removed unused helper gridToWorld

  /**
   * Get grid key for coordinates
   */
  private getGridKey(gridX: number, gridY: number): string {
    return `${gridX},${gridY}`;
  }

  /**
   * Get all grid cells that an object spans
   */
  private getObjectGridCells(object: SpatialObject): string[] {
    const { bounds } = object;
    const topLeft = this.worldToGrid(bounds.x, bounds.y);
    const bottomRight = this.worldToGrid(
      bounds.x + bounds.width,
      bounds.y + bounds.height
    );

    const cells: string[] = [];

    // Handle objects that span multiple grid cells
    for (let gridX = topLeft.gridX; gridX <= bottomRight.gridX; gridX++) {
      for (let gridY = topLeft.gridY; gridY <= bottomRight.gridY; gridY++) {
        cells.push(this.getGridKey(gridX, gridY));
      }
    }

    return cells;
  }

  /**
   * Insert an object into the spatial index
   */
  insert(object: SpatialObject): void {
    const cells = this.getObjectGridCells(object);

    cells.forEach((cellKey) => {
      if (!this.grid.has(cellKey)) {
        this.grid.set(cellKey, []);
      }
      this.grid.get(cellKey)!.push(object);
    });
  }

  /**
   * Remove an object from the spatial index
   */
  remove(objectId: string): void {
    for (const [cellKey, objects] of this.grid.entries()) {
      const filteredObjects = objects.filter((obj) => obj.id !== objectId);
      if (filteredObjects.length !== objects.length) {
        if (filteredObjects.length === 0) {
          this.grid.delete(cellKey);
        } else {
          this.grid.set(cellKey, filteredObjects);
        }
      }
    }
  }

  /**
   * Update an object's position in the spatial index
   */
  update(object: SpatialObject): void {
    this.remove(object.id);
    this.insert(object);
  }

  /**
   * Query objects within a bounding box
   */
  query(bounds: BoundingBox): SpatialObject[] {
    const results = new Set<SpatialObject>();
    const topLeft = this.worldToGrid(bounds.x, bounds.y);
    const bottomRight = this.worldToGrid(
      bounds.x + bounds.width,
      bounds.y + bounds.height
    );

    // Check all grid cells that the query bounds span
    for (let gridX = topLeft.gridX; gridX <= bottomRight.gridX; gridX++) {
      for (let gridY = topLeft.gridY; gridY <= bottomRight.gridY; gridY++) {
        const cellKey = this.getGridKey(gridX, gridY);
        const cellObjects = this.grid.get(cellKey);

        if (cellObjects) {
          // Filter objects that actually intersect with the query bounds
          cellObjects.forEach((obj) => {
            if (this.boundsIntersect(bounds, obj.bounds)) {
              results.add(obj);
            }
          });
        }
      }
    }

    return Array.from(results);
  }

  /**
   * Query objects within a radius of a point
   */
  queryRadius(
    centerX: number,
    centerY: number,
    radius: number
  ): CollisionResult[] {
    const radiusBounds: BoundingBox = {
      x: centerX - radius,
      y: centerY - radius,
      width: radius * 2,
      height: radius * 2,
    };

    const objects = this.query(radiusBounds);

    return objects
      .map((obj) => {
        const distance = this.distance(
          centerX,
          centerY,
          obj.bounds.x + obj.bounds.width / 2,
          obj.bounds.y + obj.bounds.height / 2
        );
        return { object: obj, distance };
      })
      .filter((result) => result.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Check if two bounding boxes intersect
   */
  private boundsIntersect(a: BoundingBox, b: BoundingBox): boolean {
    return !(
      a.x + a.width <= b.x ||
      b.x + b.width <= a.x ||
      a.y + a.height <= b.y ||
      b.y + b.height <= a.y
    );
  }

  /**
   * Calculate Euclidean distance between two points
   */
  private distance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get all objects in the spatial index
   */
  getAllObjects(): SpatialObject[] {
    const objects = new Set<SpatialObject>();
    for (const cellObjects of this.grid.values()) {
      cellObjects.forEach((obj) => objects.add(obj));
    }
    return Array.from(objects);
  }

  /**
   * Clear all objects from the spatial index
   */
  clear(): void {
    this.grid.clear();
  }

  /**
   * Get statistics about the spatial index
   */
  getStats(): {
    totalObjects: number;
    gridCells: number;
    averageObjectsPerCell: number;
  } {
    const totalObjects = this.getAllObjects().length;
    const gridCells = this.grid.size;
    const averageObjectsPerCell = gridCells > 0 ? totalObjects / gridCells : 0;

    return {
      totalObjects,
      gridCells,
      averageObjectsPerCell,
    };
  }

  /**
   * Optimize the spatial index by removing empty cells
   */
  optimize(): void {
    for (const [cellKey, objects] of this.grid.entries()) {
      if (objects.length === 0) {
        this.grid.delete(cellKey);
      }
    }
  }
}

/**
 * Time slot specific spatial index
 */
export class TimeSlotSpatialIndex extends SpatialIndex {
  constructor() {
    // Calendar grid bounds: 200px width, 1020px height (17 hours * 60px)
    super(60, { x: 0, y: 0, width: 200, height: 1020 });
  }

  /**
   * Create a spatial object for a time slot
   */
  createTimeSlotObject(
    dayIndex: number,
    hour: number,
    slotHeight: number = 60
  ): SpatialObject {
    const y = hour * slotHeight;
    return {
      id: `timeslot-${dayIndex}-${hour}`,
      bounds: {
        x: dayIndex * 200,
        y,
        width: 200,
        height: slotHeight,
      },
      data: { dayIndex, hour },
    };
  }

  /**
   * Create a spatial object for a time block
   */
  createTimeBlockObject(
    blockId: string,
    top: number,
    height: number,
    left: number = 0,
    width: number = 100
  ): SpatialObject {
    return {
      id: `timeblock-${blockId}`,
      bounds: {
        x: left,
        y: top,
        width,
        height,
      },
      data: { blockId, top, height },
    };
  }

  /**
   * Query time slots that intersect with a drag position
   */
  queryDragIntersection(
    dragX: number,
    dragY: number,
    radius: number = 30
  ): CollisionResult[] {
    return this.queryRadius(dragX, dragY, radius);
  }

  /**
   * Get all time slots for a specific day
   */
  getTimeSlotsForDay(dayIndex: number): SpatialObject[] {
    return this.getAllObjects().filter((obj) =>
      obj.id.startsWith(`timeslot-${dayIndex}-`)
    );
  }

  /**
   * Get all time blocks
   */
  getTimeBlocks(): SpatialObject[] {
    return this.getAllObjects().filter((obj) =>
      obj.id.startsWith("timeblock-")
    );
  }
}
