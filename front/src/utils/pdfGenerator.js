
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { calculateHash } from './pdfHelpers';

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

    const textLines = [
    "This is a sample PDF document for testing.",
    "You can place signature fields and other elements here.",
    "",
    "Drag tools from the sidebar to add fields to this document."
  ];

  let yPos = height - 200;
  textLines.forEach((line) => {
    page.drawText(line, {
      x: 50,
      y: yPos,
      size: 11,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 20;
  });

    page.drawRectangle({ 
    x: 50, 
    y: 150, 
    width: 200, 
    height: 80, 
    borderColor: rgb(0.8, 0.8, 0.8), 
    borderWidth: 1 
  });
  page.drawText('PLACE SIGNATURE HERE', { 
    x: 55, 
    y: 140, 
    size: 8, 
    font: fontBold, 
    color: rgb(0.6, 0.6, 0.6) 
  });

  const finalBytes = await pdfDoc.save();
  const hash = await calculateHash(finalBytes.buffer);
  
  return { bytes: finalBytes.buffer, hash };
}


