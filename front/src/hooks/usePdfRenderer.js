// Custom hook for PDF rendering logic

import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js';
import { cloneBuffer } from '../utils/pdfHelpers';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export function usePdfRenderer(pdfFile) {
  const [pages, setPages] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const containerRef = useRef(null);
  const canvasRefs = useRef({});
  const pdfDocRef = useRef(null);

  // Load and render PDF pages
  useEffect(() => {
    if (!pdfFile) {
      setPages([]);
      setTotalPages(0);
      return;
    }

    async function loadPdf() {
      try {
        const cloned = cloneBuffer(pdfFile.bytes);
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(cloned) });
        const pdf = await loadingTask.promise;
        
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);

        const container = containerRef.current;
        if (!container) {
          setTimeout(loadPdf, 100);
          return;
        }

        // Calculate scale
        const containerWidth = container.getBoundingClientRect().width || 850;
        const maxWidth = Math.min(containerWidth, 850);
        const firstPage = await pdf.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1.0 });
        const scale = maxWidth / viewport.width;

        // Prepare page data
        const pageData = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const scaledViewport = page.getViewport({ scale });
          pageData.push({
            pageNum: i,
            viewport: scaledViewport
          });
        }

        setPages(pageData);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    }

    canvasRefs.current = {};
    loadPdf();
  }, [pdfFile]);

  // Render pages to canvas
  useEffect(() => {
    if (pages.length === 0 || !pdfDocRef.current) return;

    async function renderPages() {
      for (const pageInfo of pages) {
        const canvas = canvasRefs.current[`page-${pageInfo.pageNum}`];
        if (!canvas) continue;

        try {
          const page = await pdfDocRef.current.getPage(pageInfo.pageNum);
          const context = canvas.getContext('2d');
          if (!context) continue;

          const dpr = window.devicePixelRatio || 1;
          const { viewport } = pageInfo;

          canvas.width = viewport.width * dpr;
          canvas.height = viewport.height * dpr;
          canvas.style.width = viewport.width + 'px';
          canvas.style.height = viewport.height + 'px';

          context.scale(dpr, dpr);
          await page.render({ canvasContext: context, viewport }).promise;
        } catch (error) {
          console.error(`Error rendering page ${pageInfo.pageNum}:`, error);
        }
      }
    }

    setTimeout(renderPages, 100);
  }, [pages]);

  return {
    pages,
    totalPages,
    containerRef,
    canvasRefs,
    pdfDocRef
  };
}


