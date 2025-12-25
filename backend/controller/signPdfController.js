const { PDFDocument } = require('pdf-lib');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const AuditTrail = require('../modal/AuditTrail');


const calculateHash = (pdfBuffer) => {
  return crypto.createHash('sha256').update(pdfBuffer).digest('hex');
};



const signPdf = async (req, res) => {
  try {
    const { pdfId, signatureImage, coordinates } = req.body;

       if (!pdfId || !signatureImage || !coordinates) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: pdfId, signatureImage, and coordinates are required'
      });
    }

       const { x, y, width, height } = coordinates;
    if (x === undefined || y === undefined || width === undefined || height === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates: x, y, width, and height are required'
      });
    }


          const pdfPath = path.join(__dirname, '../uploads', `${pdfId}.pdf`);
    let originalPdfBytes;
    
    try {
      originalPdfBytes = await fs.readFile(pdfPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: `PDF not found with ID: ${pdfId}`
      });
    }

       const originalHash = calculateHash(originalPdfBytes);

       const pdfDoc = await PDFDocument.load(originalPdfBytes);

       const pages = pdfDoc.getPages();
    const pageNumber = coordinates.page !== undefined ? Math.max(0, Math.min(pages.length - 1, coordinates.page)) : 0;
    const targetPage = pages[pageNumber];
    const { width: pageWidth, height: pageHeight } = targetPage.getSize();

       const base64Data = signatureImage.replace(/^data:image\/\w+;base64,/, '');
    const signatureBuffer = Buffer.from(base64Data, 'base64');

       let signatureImageObj;
    try {
      signatureImageObj = await pdfDoc.embedPng(signatureBuffer);
    } catch (pngError) {
           try {
        signatureImageObj = await pdfDoc.embedJpg(signatureBuffer);
      } catch (jpgError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image format. Please provide PNG or JPEG image.'
        });
      }
    }

       const signatureDims = signatureImageObj.scale(1);
    const signatureWidth = signatureDims.width;
    const signatureHeight = signatureDims.height;

       const boxAspectRatio = width / height;
    const signatureAspectRatio = signatureWidth / signatureHeight;

       let finalWidth, finalHeight;
    let offsetX = 0, offsetY = 0;

    if (signatureAspectRatio > boxAspectRatio) {
           finalWidth = width;
      finalHeight = width / signatureAspectRatio;
           offsetY = (height - finalHeight) / 2;
    } else {
           finalHeight = height;
      finalWidth = height * signatureAspectRatio;
           offsetX = (width - finalWidth) / 2;
    }

          const pdfY = pageHeight - (y + height);

    targetPage.drawImage(signatureImageObj, {
      x: x + offsetX,
      y: pdfY + offsetY,
      width: finalWidth,
      height: finalHeight
    });

       const signedPdfBytes = await pdfDoc.save();

       const signedHash = calculateHash(signedPdfBytes);

       const signedPdfPath = path.join(__dirname, '../uploads/signed', `${pdfId}_signed_${Date.now()}.pdf`);
    const uploadsDir = path.join(__dirname, '../uploads/signed');
    
       try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    await fs.writeFile(signedPdfPath, signedPdfBytes);

       const signedPdfUrl = `/uploads/signed/${path.basename(signedPdfPath)}`;

       const auditTrail = new AuditTrail({
      pdfId,
      originalHash,
      signedHash,
      signedPdfUrl
    });

    await auditTrail.save();

       res.status(200).json({
      success: true,
      message: 'PDF signed successfully',
      data: {
        signedPdfUrl,
        originalHash,
        signedHash,
        auditTrailId: auditTrail._id
      }
    });

  } catch (error) {
    console.error('Error signing PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while signing PDF',
      error: error.message
    });
  }
};

module.exports = {
  signPdf
};

