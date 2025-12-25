import { PDFDocument } from 'pdf-lib';

/**
 * Safely clone an ArrayBuffer, handling detached buffers
 * @param {ArrayBuffer} buffer - ArrayBuffer to clone
 * @returns {ArrayBuffer} - Cloned ArrayBuffer
 */
const safeCloneBuffer = (buffer) => {
  try {
   
    return buffer.slice(0);
  } catch (error) {
    console.warn('Buffer appears detached, attempting recovery...');
    const newBuffer = new ArrayBuffer(buffer.byteLength);
    const sourceView = new Uint8Array(buffer);
    const targetView = new Uint8Array(newBuffer);
    targetView.set(sourceView);
    return newBuffer;
  }
};

/**
 * Convert percentage-based coordinates to PDF points
 * @param {ArrayBuffer} pdfBytes - PDF file bytes
 * @param {Object} field - Field object with percentage coordinates {x, y, width, height, page}
 * @returns {Promise<Object>} - Coordinates in PDF points {x, y, width, height, page}
 */
export const convertToPdfPoints = async (pdfBytes, field) => {
  try {
   
    const clonedBytes = safeCloneBuffer(pdfBytes);
    const pdfDoc = await PDFDocument.load(clonedBytes);
    const pages = pdfDoc.getPages();
    const pageIndex = field.page || 0;
    const page = pages[pageIndex] || pages[0];
    const { width: pdfWidth, height: pdfHeight } = page.getSize();

   
    const x = (field.x / 100) * pdfWidth;
    const y = (field.y / 100) * pdfHeight;
    const width = (field.width / 100) * pdfWidth;
    const height = (field.height / 100) * pdfHeight;

    return {
      x,
      y,
      width,
      height,
      page: pageIndex
    };
  } catch (error) {
    console.error('Error converting coordinates:', error);
    throw error;
  }
};

/**
 * Convert ArrayBuffer to base64 string
 * @param {ArrayBuffer} buffer - ArrayBuffer to convert
 * @returns {string} - Base64 string
 */
export const arrayBufferToBase64 = (buffer) => {
 
  const clonedBuffer = buffer.slice(0);
  const bytes = new Uint8Array(clonedBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

