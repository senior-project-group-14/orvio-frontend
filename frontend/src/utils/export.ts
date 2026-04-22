/**
 * Export utilities for exporting data and UI elements to various formats
 */

// Type definitions for export functions
export type ExportFormat = 'csv' | 'png' | 'pdf';

export interface ExportOptions {
  filename?: string;
  title?: string;
}

/**
 * Export data as CSV file
 */
export function exportToCSV(
  data: Record<string, any>[],
  filename: string = 'export.csv'
): void {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  try {
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in values
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    downloadFile(csvContent, filename, 'text/csv');
  } catch (error) {
    console.error('Error exporting CSV:', error);
    alert('Failed to export CSV file');
  }
}

/**
 * Export DOM element as PNG image
 */
export async function exportToPNG(
  elementId: string,
  filename: string = 'export.png'
): Promise<void> {
  try {
    const { default: html2canvas } = await import('html2canvas');

    const element = document.getElementById(elementId);
    if (!element) {
      alert('Element not found');
      return;
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality
      logging: false,
      useCORS: true,
      ignoreElements: (el) => {
        // Hide elements marked with data-export-hide
        return el.hasAttribute && el.hasAttribute('data-export-hide');
      },
      onclone: (clonedDoc) => {
        // Fix oklch colors by converting them to computed styles
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          fixOklchColors(clonedElement);
        }
      }
    });

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }
    });
  } catch (error) {
    console.error('Error exporting PNG:', error);
    alert('Failed to export PNG. Error: ' + (error as Error).message);
  }
}

/**
 * Export DOM element or data as PDF
 */
export async function exportToPDF(
  elementIdOrData: string | Record<string, any>[],
  filename: string = 'export.pdf',
  options?: { title?: string; orientation?: 'portrait' | 'landscape' }
): Promise<void> {
  try {
    const [{ jsPDF }, html2CanvasModule] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);
    const html2canvas = html2CanvasModule.default;

    const doc = new jsPDF({
      orientation: options?.orientation || 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add title if provided
    if (options?.title) {
      doc.setFontSize(16);
      doc.text(options.title, 15, 15);
    }

    if (typeof elementIdOrData === 'string') {
      // Export DOM element
      const element = document.getElementById(elementIdOrData);
      if (!element) {
        alert('Element not found');
        return;
      }

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        ignoreElements: (el) => {
          // Hide elements marked with data-export-hide
          return el.hasAttribute && el.hasAttribute('data-export-hide');
        },
        onclone: (clonedDoc) => {
          // Fix oklch colors by converting them to computed styles
          const clonedElement = clonedDoc.getElementById(elementIdOrData);
          if (clonedElement) {
            fixOklchColors(clonedElement);
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 180; // A4 width minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const yOffset = options?.title ? 25 : 15;
      doc.addImage(imgData, 'PNG', 15, yOffset, imgWidth, imgHeight);
    } else {
      // Export data as table
      const data = elementIdOrData;
      if (!data || data.length === 0) {
        alert('No data to export');
        return;
      }

      const headers = Object.keys(data[0]);
      const startY = options?.title ? 25 : 15;
      
      // Simple table rendering
      doc.setFontSize(10);
      let y = startY;
      const lineHeight = 7;
      const colWidth = 180 / headers.length;

      // Headers
      doc.setFont('helvetica', 'bold');
      headers.forEach((header, index) => {
        doc.text(header, 15 + index * colWidth, y);
      });
      y += lineHeight;

      // Data rows
      doc.setFont('helvetica', 'normal');
      data.forEach((row) => {
        if (y > 280) { // Page break
          doc.addPage();
          y = 15;
        }
        headers.forEach((header, index) => {
          const value = String(row[header] || '');
          doc.text(value.substring(0, 20), 15 + index * colWidth, y);
        });
        y += lineHeight;
      });
    }

    doc.save(filename);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('Failed to export PDF. Error: ' + (error as Error).message);
  }
}

/**
 * Generic export function that routes to appropriate handler
 */
export async function exportData(
  format: ExportFormat,
  dataOrElementId: Record<string, any>[] | string,
  options?: ExportOptions
): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0];
  const baseFilename = options?.filename || 'export';
  const filename = `${baseFilename}-${timestamp}.${format}`;

  switch (format) {
    case 'csv':
      if (Array.isArray(dataOrElementId)) {
        exportToCSV(dataOrElementId, filename);
      } else {
        alert('CSV export requires data array');
      }
      break;
    case 'png':
      if (typeof dataOrElementId === 'string') {
        await exportToPNG(dataOrElementId, filename);
      } else {
        alert('PNG export requires element ID');
      }
      break;
    case 'pdf':
      await exportToPDF(dataOrElementId, filename, options);
      break;
    default:
      alert(`Unsupported export format: ${format}`);
  }
}

/**
 * Helper function to download file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  // Add UTF-8 BOM for CSV files so Excel correctly handles Turkish characters
  const bom = mimeType === 'text/csv' ? '\uFEFF' : '';
  const blob = new Blob([bom + content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Fix oklch colors in cloned element by converting all styles to inline
 * This is necessary because html2canvas doesn't support oklch color function
 */
function fixOklchColors(element: HTMLElement): void {
  try {
    // Get all elements including the root
    const allElements = [element, ...Array.from(element.querySelectorAll('*'))];
    
    // First pass: Collect all computed styles BEFORE removing stylesheets
    const computedStyles = new Map<Element, CSSStyleDeclaration>();
    allElements.forEach((el) => {
      if (el instanceof HTMLElement || el instanceof SVGElement) {
        try {
          computedStyles.set(el, window.getComputedStyle(el));
        } catch (e) {
          // Ignore
        }
      }
    });
    
    // Now remove ALL stylesheets to prevent oklch from being parsed by html2canvas
    const doc = element.ownerDocument;
    if (doc) {
      doc.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
        el.remove();
      });
    }
    
    // Second pass: Apply computed styles as inline styles
    allElements.forEach((el) => {
      // Skip SVG elements, they'll be processed separately
      if (el instanceof SVGElement) {
        return;
      }
      
      if (!(el instanceof HTMLElement)) {
        return;
      }
      
      try {
        // Get the pre-saved computed style
        const computedStyle = computedStyles.get(el);
        if (!computedStyle) return;
        
        // Clear existing inline style that might have oklch
        el.removeAttribute('style');
        
        // Remove class to prevent any CSS from applying
        el.removeAttribute('class');
        
        // Important CSS properties to preserve
        const importantProperties = [
          'display', 'position', 'top', 'left', 'right', 'bottom',
          'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
          'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
          'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
          'border-width', 'border-style', 'border-top-width', 'border-right-width', 
          'border-bottom-width', 'border-left-width',
          'border-radius', 'border-top-left-radius', 'border-top-right-radius',
          'border-bottom-left-radius', 'border-bottom-right-radius',
          'color', 'background-color', 'background-image', 'background-size', 'background-position',
          'font-size', 'font-weight', 'font-family', 'line-height', 'letter-spacing',
          'text-align', 'text-decoration', 'text-transform', 'vertical-align',
          'white-space', 'word-wrap', 'word-break',
          'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-self',
          'flex-grow', 'flex-shrink', 'flex-basis',
          'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row', 'gap',
          'opacity', 'overflow', 'overflow-x', 'overflow-y', 'box-shadow', 'transform',
          'z-index', 'cursor', 'pointer-events',
          'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'border-color'
        ];
        
        const styleString: string[] = [];
        
        importantProperties.forEach((prop) => {
          try {
            let value = computedStyle.getPropertyValue(prop);
            
            // Skip empty, initial, or none values
            if (!value || value === '' || value === 'none' || value === 'initial' || value === 'inherit') {
              return;
            }
            
            // Convert oklch to rgb if somehow it's still there
            if (value.includes('oklch')) {
              console.warn('Found oklch in computed style, skipping:', prop, value);
              return;
            }
            
            styleString.push(`${prop}: ${value} !important`);
          } catch (e) {
            // Ignore errors for individual properties
          }
        });
        
        // Set all properties at once
        if (styleString.length > 0) {
          el.setAttribute('style', styleString.join('; '));
        }
        
      } catch (e) {
        console.warn('Error processing element:', el, e);
      }
    });
    
    // Process SVG elements separately
    const svgs = element.querySelectorAll('svg, svg *');
    svgs.forEach((svg) => {
      if (svg instanceof SVGElement) {
        const computedStyle = computedStyles.get(svg);
        if (computedStyle) {
          processSVGElement(svg, computedStyle);
        }
      }
    });
    
  } catch (error) {
    console.warn('Error fixing oklch colors:', error);
  }
}

/**
 * Process SVG elements to fix colors
 */
function processSVGElement(svg: SVGElement, computedStyle: CSSStyleDeclaration): void {
  try {
    const props = ['fill', 'stroke', 'stop-color', 'color'];
    
    svg.removeAttribute('class');
    
    const styleString: string[] = [];
    props.forEach((prop) => {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== 'none' && !value.includes('oklch')) {
        styleString.push(`${prop}: ${value} !important`);
      }
    });
    
    if (styleString.length > 0) {
      svg.setAttribute('style', styleString.join('; '));
    }
  } catch (e) {
    // Ignore
  }
}
