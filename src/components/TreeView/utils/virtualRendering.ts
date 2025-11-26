/**
 * Virtual rendering utilities for large trees
 * Only renders elements visible in viewport plus buffer
 */

export interface ViewportInfo {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface PositionedItem {
    id: string;
    x: number;
    y: number;
}

/**
 * Filter items to only those visible in viewport (with buffer)
 * @param items - All items with positions
 * @param viewport - Current viewport dimensions
 * @param bufferPx - Extra pixels to render beyond viewport (default 500)
 */
export function getVisibleItems<T extends PositionedItem>(
    items: T[],
    viewport: ViewportInfo,
    bufferPx: number = 500
): T[] {
    const minX = viewport.x - bufferPx;
    const maxX = viewport.x + viewport.width + bufferPx;
    const minY = viewport.y - bufferPx;
    const maxY = viewport.y + viewport.height + bufferPx;

    return items.filter(item => {
        return item.x >= minX && 
               item.x <= maxX && 
               item.y >= minY && 
               item.y <= maxY;
    });
}

/**
 * Calculate viewport from container element
 */
export function getViewportFromContainer(container: HTMLElement | null): ViewportInfo {
    if (!container) {
        return { x: 0, y: 0, width: 1000, height: 600 };
    }

    return {
        x: container.scrollLeft,
        y: container.scrollTop,
        width: container.clientWidth,
        height: container.clientHeight
    };
}
