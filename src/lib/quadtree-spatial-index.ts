import type { Event, Task } from "@/types";

// 2D Point interface
interface Point {
  x: number;
  y: number;
}

// 2D Rectangle interface
interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Quadtree node interface
interface QuadTreeNode {
  bounds: Rectangle;
  items: Array<{ id: string; bounds: Rectangle; data: Event | Task }>;
  children: QuadTreeNode[];
  level: number;
  isDivided: boolean;
}

// Quadtree configuration
interface QuadTreeConfig {
  maxItems: number; // Maximum items per node before subdivision
  maxLevel: number; // Maximum tree depth
  bounds: Rectangle; // Root bounds (usually screen or container bounds)
}

// Default configuration
const defaultQuadTreeConfig: QuadTreeConfig = {
  maxItems: 8,
  maxLevel: 8,
  bounds: { x: 0, y: 0, width: 1920, height: 1080 }, // Default screen size
};

/**
 * Quadtree-based spatial index for 2D collision detection
 * Optimized for drag and drop collision detection
 */
export class QuadTree {
  private root: QuadTreeNode;
  private config: QuadTreeConfig;
  private itemMap = new Map<string, { id: string; bounds: Rectangle; data: Event | Task }>();

  constructor(config: Partial<QuadTreeConfig> = {}) {
    this.config = { ...defaultQuadTreeConfig, ...config };
    this.root = this.createNode(this.config.bounds, 0);
  }

  /**
   * Create a new quadtree node
   */
  private createNode(bounds: Rectangle, level: number): QuadTreeNode {
    return {
      bounds,
      items: [],
      children: [],
      level,
      isDivided: false,
    };
  }

  /**
   * Check if rectangle contains point
   */
  private containsPoint(rect: Rectangle, point: Point): boolean {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }

  /**
   * Check if two rectangles intersect
   */
  private intersects(rect1: Rectangle, rect2: Rectangle): boolean {
    return !(
      rect2.x > rect1.x + rect1.width ||
      rect2.x + rect2.width < rect1.x ||
      rect2.y > rect1.y + rect1.height ||
      rect2.y + rect2.height < rect1.y
    );
  }

  /**
   * Subdivide node into four children
   */
  private subdivide(node: QuadTreeNode): void {
    const { x, y, width, height } = node.bounds;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // Create four child nodes
    node.children = [
      this.createNode({ x, y, width: halfWidth, height: halfHeight }, node.level + 1), // NW
      this.createNode({ x: x + halfWidth, y, width: halfWidth, height: halfHeight }, node.level + 1), // NE
      this.createNode({ x, y: y + halfHeight, width: halfWidth, height: halfHeight }, node.level + 1), // SW
      this.createNode({ x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight }, node.level + 1), // SE
    ];

    node.isDivided = true;

    // Move existing items to children
    const itemsToMove = [...node.items];
    node.items = [];

    itemsToMove.forEach(item => {
      const childIndex = this.getChildIndex(node.bounds, item.bounds);
      if (childIndex !== -1) {
        node.children[childIndex].items.push(item);
      } else {
        node.items.push(item); // Fallback if item doesn't fit in children
      }
    });
  }

  /**
   * Get index of child node that contains the item
   */
  private getChildIndex(parentBounds: Rectangle, itemBounds: Rectangle): number {
    const { x, y, width, height } = parentBounds;
    const midX = x + width / 2;
    const midY = y + height / 2;

    const inNorth = itemBounds.y < midY && itemBounds.y + itemBounds.height < midY;
    const inSouth = itemBounds.y > midY;
    const inWest = itemBounds.x < midX && itemBounds.x + itemBounds.width < midX;
    const inEast = itemBounds.x > midX;

    if (inNorth && inWest) return 0; // NW
    if (inNorth && inEast) return 1;  // NE
    if (inSouth && inWest) return 2;  // SW
    if (inSouth && inEast) return 3;  // SE

    return -1; // Item spans multiple quadrants
  }

  /**
   * Insert item into quadtree
   */
  insert(id: string, bounds: Rectangle, data: Event | Task): void {
    const item = { id, bounds, data };

    // Store in item map for quick lookup
    this.itemMap.set(id, item);

    this.insertIntoNode(this.root, item);
  }

  /**
   * Insert item into specific node
   */
  private insertIntoNode(node: QuadTreeNode, item: { id: string; bounds: Rectangle; data: Event | Task }): void {
    // If node has children, try to insert into appropriate child
    if (node.isDivided) {
      const childIndex = this.getChildIndex(node.bounds, item.bounds);
      if (childIndex !== -1) {
        this.insertIntoNode(node.children[childIndex], item);
        return;
      }
    }

    // Add to current node
    node.items.push(item);

    // Subdivide if necessary
    if (
      node.items.length > this.config.maxItems &&
      node.level < this.config.maxLevel &&
      !node.isDivided
    ) {
      this.subdivide(node);

      // Try to move items to children after subdivision
      const itemsToMove = [...node.items];
      node.items = [];

      itemsToMove.forEach(movedItem => {
        const childIndex = this.getChildIndex(node.bounds, movedItem.bounds);
        if (childIndex !== -1) {
          this.insertIntoNode(node.children[childIndex], movedItem);
        } else {
          node.items.push(movedItem); // Keep in parent if it doesn't fit
        }
      });
    }
  }

  /**
   * Query items that intersect with given rectangle
   */
  query(range: Rectangle): Array<{ id: string; bounds: Rectangle; data: Event | Task }> {
    return this.queryNode(this.root, range);
  }

  /**
   * Query items in specific node
   */
  private queryNode(node: QuadTreeNode, range: Rectangle): Array<{ id: string; bounds: Rectangle; data: Event | Task }> {
    const found: Array<{ id: string; bounds: Rectangle; data: Event | Task }> = [];

    // Check if node intersects with query range
    if (!this.intersects(node.bounds, range)) {
      return found;
    }

    // Check items in current node
    node.items.forEach(item => {
      if (this.intersects(item.bounds, range)) {
        found.push(item);
      }
    });

    // Query children if they exist
    if (node.isDivided) {
      node.children.forEach(child => {
        found.push(...this.queryNode(child, range));
      });
    }

    return found;
  }

  /**
   * Remove item from quadtree
   */
  remove(id: string): boolean {
    const item = this.itemMap.get(id);
    if (!item) return false;

    this.itemMap.delete(id);

    // Remove from tree (simplified - would need full tree traversal in production)
    this.clear(); // For now, rebuild tree after removal

    return true;
  }

  /**
   * Update item position in quadtree
   */
  update(id: string, newBounds: Rectangle): boolean {
    const item = this.itemMap.get(id);
    if (!item) return false;

    // Remove old item and insert with new bounds
    this.remove(id);
    this.insert(id, newBounds, item.data);

    return true;
  }

  /**
   * Clear all items from quadtree
   */
  clear(): void {
    this.root = this.createNode(this.config.bounds, 0);
    this.itemMap.clear();
  }

  /**
   * Update quadtree bounds (public method for external access)
   */
  updateBounds(newBounds: Rectangle): void {
    this.config.bounds = newBounds;
    this.root = this.createNode(newBounds, 0);
  }

  /**
   * Get all items in quadtree
   */
  getAllItems(): Array<{ id: string; bounds: Rectangle; data: Event | Task }> {
    return Array.from(this.itemMap.values());
  }

  /**
   * Get quadtree statistics
   */
  getStats(): {
    totalItems: number;
    treeDepth: number;
    nodeCount: number;
    averageItemsPerNode: number;
  } {
    const nodeCount = this.countNodes(this.root);

    return {
      totalItems: this.itemMap.size,
      treeDepth: this.getMaxDepth(this.root),
      nodeCount,
      averageItemsPerNode: nodeCount > 0 ? this.itemMap.size / nodeCount : 0,
    };
  }

  /**
   * Count total nodes in tree
   */
  private countNodes(node: QuadTreeNode): number {
    let count = 1; // Count current node

    if (node.isDivided) {
      node.children.forEach(child => {
        count += this.countNodes(child);
      });
    }

    return count;
  }

  /**
   * Get maximum depth of tree
   */
  private getMaxDepth(node: QuadTreeNode): number {
    if (!node.isDivided) return node.level;

    let maxDepth = node.level;
    node.children.forEach(child => {
      maxDepth = Math.max(maxDepth, this.getMaxDepth(child));
    });

    return maxDepth;
  }

  /**
   * Visualize quadtree (for debugging)
   */
  visualize(): { nodes: Rectangle[]; items: Rectangle[] } {
    const nodes: Rectangle[] = [];
    const items: Rectangle[] = [];

    this.collectVisualizationData(this.root, nodes, items);

    return { nodes, items };
  }

  /**
   * Collect visualization data from tree
   */
  private collectVisualizationData(
    node: QuadTreeNode,
    nodes: Rectangle[],
    items: Rectangle[]
  ): void {
    nodes.push(node.bounds);

    items.push(...node.items.map(item => item.bounds));

    if (node.isDivided) {
      node.children.forEach(child => {
        this.collectVisualizationData(child, nodes, items);
      });
    }
  }
}

// Global quadtree instance for drag and drop collision detection
export const dragQuadTree = new QuadTree({
  maxItems: 8,
  maxLevel: 6,
  bounds: { x: 0, y: 0, width: 1920, height: 1080 },
});

/**
 * Convert DOM element bounds to Rectangle
 */
export function getElementBounds(element: HTMLElement): Rectangle {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Convert calendar position to Rectangle for collision detection
 */
export function getCalendarItemBounds(
  top: number,
  height: number,
  left: number = 0,
  width: number = 100
): Rectangle {
  return {
    x: left,
    y: top,
    width,
    height,
  };
}

/**
 * Check collision between dragged item and calendar items using quadtree
 */
export function checkDragCollisions(
  dragBounds: Rectangle,
  excludeId?: string
): Array<{ id: string; bounds: Rectangle; data: Event | Task }> {
  const collisions = dragQuadTree.query(dragBounds);

  return collisions.filter(item =>
    !excludeId || item.id !== excludeId
  );
}

/**
 * Update quadtree with calendar items
 */
export function updateQuadTreeItems(items: Array<{
  id: string;
  bounds: Rectangle;
  data: Event | Task;
}>): void {
  dragQuadTree.clear();

  items.forEach(item => {
    dragQuadTree.insert(item.id, item.bounds, item.data);
  });
}

/**
 * Performance monitoring for quadtree operations
 */
export function getQuadTreePerformanceMetrics() {
  return {
    ...dragQuadTree.getStats(),
    itemCount: dragQuadTree.getAllItems().length,
  };
}

/**
 * Initialize quadtree with calendar bounds
 */
export function initializeQuadTree(containerBounds: Rectangle): void {
  // Update quadtree bounds to match container
  dragQuadTree.updateBounds(containerBounds);
}

/**
 * Hook for React components to use quadtree collision detection
 */
export function useQuadTreeCollisionDetection() {
  const checkCollisions = (bounds: Rectangle, excludeId?: string) => {
    return checkDragCollisions(bounds, excludeId);
  };

  const updateItems = (items: Array<{ id: string; bounds: Rectangle; data: Event | Task }>) => {
    updateQuadTreeItems(items);
  };

  const getStats = () => {
    return getQuadTreePerformanceMetrics();
  };

  return {
    checkCollisions,
    updateItems,
    getStats,
  };
}