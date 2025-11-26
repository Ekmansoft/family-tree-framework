/**
 * Tree export utilities - export tree visualization as image
 */

export interface ExportOptions {
    format: 'png' | 'svg';
    quality?: number; // 0-1 for PNG quality
    scale?: number; // multiplier for resolution (default 2 for retina)
    backgroundColor?: string;
}

/**
 * Export tree container to PNG image
 */
export async function exportTreeAsPNG(
    container: HTMLElement,
    options: ExportOptions = { format: 'png' }
): Promise<Blob> {
    const { quality = 0.95, scale = 2, backgroundColor = '#ffffff' } = options;

    // Get dimensions
    const rect = container.getBoundingClientRect();
    const width = rect.width * scale;
    const height = rect.height * scale;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    ctx.scale(scale, scale);

    // Convert container to SVG
    const svg = await containerToSVG(container);
    
    // Draw SVG to canvas
    return new Promise((resolve, reject) => {
        const img = new Image();
        const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob'));
                }
            }, 'image/png', quality);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

/**
 * Export tree container to SVG
 */
export async function exportTreeAsSVG(
    container: HTMLElement,
    options: ExportOptions = { format: 'svg' }
): Promise<Blob> {
    const { backgroundColor = '#ffffff' } = options;
    const svg = await containerToSVG(container, backgroundColor);
    return new Blob([svg], { type: 'image/svg+xml' });
}

/**
 * Convert HTML container to SVG string
 */
async function containerToSVG(
    container: HTMLElement,
    backgroundColor?: string
): Promise<string> {
    const rect = container.getBoundingClientRect();
    const { width, height } = rect;

    // Clone container to avoid modifying original
    const clone = container.cloneNode(true) as HTMLElement;
    
    // Extract computed styles
    const elements = clone.querySelectorAll('*');
    elements.forEach((el) => {
        const computedStyle = window.getComputedStyle(el as Element);
        const inlineStyle = Array.from(computedStyle).reduce((acc, prop) => {
            acc += `${prop}:${computedStyle.getPropertyValue(prop)};`;
            return acc;
        }, '');
        (el as HTMLElement).setAttribute('style', inlineStyle);
    });

    // Wrap in SVG foreignObject
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
    
    if (backgroundColor) {
        svg += `<rect width="100%" height="100%" fill="${backgroundColor}"/>`;
    }
    
    svg += `<foreignObject width="100%" height="100%">`;
    svg += `<div xmlns="http://www.w3.org/1999/xhtml">${clone.innerHTML}</div>`;
    svg += `</foreignObject></svg>`;

    return svg;
}

/**
 * Download exported tree
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Convenience function to export and download tree
 */
export async function exportAndDownloadTree(
    container: HTMLElement,
    filename: string,
    options: ExportOptions = { format: 'png' }
): Promise<void> {
    const blob = options.format === 'svg' 
        ? await exportTreeAsSVG(container, options)
        : await exportTreeAsPNG(container, options);
    
    downloadBlob(blob, filename);
}
