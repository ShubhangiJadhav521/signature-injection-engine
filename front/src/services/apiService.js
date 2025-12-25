// Simple API service for backend communication

import axios from 'axios';
import { bufferToBase64 } from '../utils/pdfHelpers';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://signature-injection-back.onrender.com/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000
});

/**
 * Upload PDF to server
 */
export async function uploadPdf(pdfBytes, fileName) {
  try {
    const base64 = bufferToBase64(pdfBytes);
    const response = await api.post('/upload-pdf', {
      pdfData: base64,
      fileName: fileName
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to upload PDF');
  }
}

/**
 * Sign PDF with signature
 */
export async function signPdf(pdfId, signatureImage, coordinates) {
  try {
    const response = await api.post('/sign-pdf', {
      pdfId,
      signatureImage,
      coordinates
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to sign PDF');
  }
}

/**
 * Fetch PDF from URL
 */
export async function fetchPdf(url) {
  try {
    const fullUrl = url.startsWith('http') ? url : `${API_URL.replace('/api', '')}${url}`;
    const response = await axios.get(fullUrl, { responseType: 'arraybuffer' });
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch PDF', error);
   }
}

/**
 * Download PDF file
 */
export async function downloadPdf(url, fileName) {
  try {
    const pdfBytes = await fetchPdf(url);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    throw new Error('Failed to download PDF', error);
  }
}


