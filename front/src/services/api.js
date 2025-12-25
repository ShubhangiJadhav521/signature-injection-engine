import axios from 'axios';

// Configure axios base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://signature-injection-back.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds timeout for PDF processing
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('[API] Response error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/**
 * Convert ArrayBuffer to base64 string (safe for detached buffers)
 * @param {ArrayBuffer} buffer - ArrayBuffer to convert
 * @returns {string} - Base64 string
 */
const arrayBufferToBase64 = (buffer) => {
  // Clone the ArrayBuffer to avoid detached buffer errors
  const clonedBuffer = buffer.slice(0);
  const bytes = new Uint8Array(clonedBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * Upload PDF to backend and get PDF ID
 * @param {ArrayBuffer} pdfBytes - PDF file as ArrayBuffer
 * @param {string} fileName - Original file name
 * @returns {Promise<{pdfId: string}>}
 */
export const uploadPdf = async (pdfBytes, fileName) => {
  try {
    // Convert ArrayBuffer to base64
    const base64 = arrayBufferToBase64(pdfBytes);
    
    const response = await api.post('/upload-pdf', {
      pdfData: base64,
      fileName: fileName,
    });
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to upload PDF');
  }
};

/**
 * Sign PDF with signature image
 * @param {string} pdfId - PDF identifier
 * @param {string} signatureImage - Base64 signature image
 * @param {Object} coordinates - Coordinates object {x, y, width, height} in PDF points
 * @returns {Promise<{signedPdfUrl: string, originalHash: string, signedHash: string}>}
 */
export const signPdf = async (pdfId, signatureImage, coordinates) => {
  try {
    const response = await api.post('/sign-pdf', {
      pdfId,
      signatureImage,
      coordinates,
    });
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to sign PDF');
  }
};

/**
 * Download signed PDF from URL and return as ArrayBuffer
 * @param {string} url - URL to the signed PDF
 * @returns {Promise<ArrayBuffer>} - PDF as ArrayBuffer
 */
export const fetchSignedPdf = async (url) => {
  try {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL.replace('/api', '')}${url}`;
    const response = await axios.get(fullUrl, {
      responseType: 'arraybuffer',
    });
    return response.data;
  } catch {
    throw new Error('Failed to fetch signed PDF');
  }
};

/**
 * Download signed PDF from URL
 * @param {string} url - URL to the signed PDF
 * @param {string} fileName - Name for the downloaded file
 */
export const downloadSignedPdf = async (url, fileName) => {
  try {
    const pdfBytes = await fetchSignedPdf(url);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  } catch {
    throw new Error('Failed to download signed PDF');
  }
};

export default api;

