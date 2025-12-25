import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
export async function calculateSHA256(data) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateSamplePDF() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.276, 841.890]);
  const { height } = page.getSize();
  
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({
    x: 0,
    y: height - 120,
    width: 595,
    height: 120,
    color: rgb(0.05, 0.1, 0.2),
  });

  page.drawText('CERTIFICATE OF VERIFICATION', {
    x: 50,
    y: height - 60,
    size: 24,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('INJECTION ENGINE SYSTEM TEMPLATE v2.1', {
    x: 50,
    y: height - 85,
    size: 10,
    font: fontRegular,
    color: rgb(0.7, 0.7, 0.8),
  });

  const bodyY = height - 200;
  page.drawText('Document ID: SYS-' + Math.random().toString(36).substr(2, 9).toUpperCase(), {
    x: 50,
    y: bodyY,
    size: 12,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  const text = [
    "This document is a system-generated template used to demonstrate high-fidelity",
    "coordinate injection. All placement points are resolution-independent and mapped",
    "using the browser's viewport-relative percentage engine.",
    "",
    "Please drag any of the tools from the sidebar and place them in the designated",
    "areas below to test the burn-in capability."
  ];

  text.forEach((line, i) => {
    page.drawText(line, {
      x: 50,
      y: bodyY - 40 - (i * 20),
      size: 11,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
  });

  page.drawRectangle({ x: 50, y: 150, width: 200, height: 80, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 });
  page.drawText('PLACE SIGNATURE HERE', { x: 55, y: 140, size: 8, font: fontBold, color: rgb(0.6, 0.6, 0.6) });

  page.drawRectangle({ x: 345, y: 150, width: 200, height: 25, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 });
  page.drawText('PLACE DATE HERE', { x: 350, y: 140, size: 8, font: fontBold, color: rgb(0.6, 0.6, 0.6) });

  const finalBytes = await pdfDoc.save();
  const finalHash = await calculateSHA256(finalBytes.buffer);
  
  return { bytes: finalBytes.buffer, hash: finalHash };
}

export async function burnFieldsIntoPDF(pdfBytes, fields) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const field of fields) {
    const page = pages[field.page] || pages[0];
    const { width: pdfW, height: pdfH } = page.getSize();

    const x = (field.x / 100) * pdfW;
    const w = (field.width / 100) * pdfW;
    const h = (field.height / 100) * pdfH;
    const y = pdfH - ((field.y / 100) * pdfH) - h;

    if (field.type === "TEXT" || field.type === "DATE" || field.type === "INPUT") {
      const text = field.value || '';
      const fontSize = Math.max(6, Math.min(11, h * 0.6));
      
      if (field.type === "TEXT" && text.length > 0) {
        const lines = text.split('\n');
        lines.forEach((line, i) => {
          page.drawText(line, {
            x: x + 4,
            y: y + h - (fontSize * 1.2) * (i + 1),
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          });
        });
      } else {
        page.drawText(text, {
          x: x + 4,
          y: y + (h / 2) - (fontSize / 2.5),
          size: fontSize,
          font: field.type === "INPUT" ? fontBold : font,
          color: rgb(0, 0, 0),
        });
      }
    } else if (field.type === "RADIO") {
      if (field.checked) {
        const radius = Math.min(w, h) / 3;
        page.drawCircle({
          x: x + w / 2,
          y: y + h / 2,
          size: radius,
          color: rgb(0.25, 0.45, 0.95),
        });
      }
    } else if ((field.type === "SIGNATURE" || field.type === "IMAGE") && field.value) {
      try {
        const isPng = field.value.includes('image/png');
        const img = isPng ? await pdfDoc.embedPng(field.value) : await pdfDoc.embedJpg(field.value);
        
        const dims = img.scale(1);
        const scale = Math.min(w / dims.width, h / dims.height);
        const finalW = dims.width * scale;
        const finalH = dims.height * scale;
        
        page.drawImage(img, {
          x: x + (w - finalW) / 2,
          y: y + (h - finalH) / 2,
          width: finalW,
          height: finalH,
        });
      } catch (e) {
        console.warn('Image embedding failed:', e);
      }
    }
  }

  const finalBytes = await pdfDoc.save();
  const finalHash = await calculateSHA256(finalBytes.buffer);
  
  return { bytes: finalBytes, hash: finalHash };
}