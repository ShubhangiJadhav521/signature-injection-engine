
import { PDFDocument } from 'pdf-lib';

export async function calculateHash(fileBytes) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


export function cloneBuffer(buffer) {
  return buffer.slice(0);
}

export function bufferToBase64(buffer) {
  const cloned = cloneBuffer(buffer);
  const bytes = new Uint8Array(cloned);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}


export async function convertCoordinates(pdfBytes, field) {
  const cloned = cloneBuffer(pdfBytes);
  const pdfDoc = await PDFDocument.load(cloned);
  const pages = pdfDoc.getPages();
  const pageIndex = field.page || 0;
  const page = pages[pageIndex] || pages[0];
  const { width: pageWidth, height: pageHeight } = page.getSize();

  return {
    x: (field.x / 100) * pageWidth,
    y: (field.y / 100) * pageHeight,
    width: (field.width / 100) * pageWidth,
    height: (field.height / 100) * pageHeight,
    page: pageIndex
  };
}


