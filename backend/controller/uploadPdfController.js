const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');


const calculateHash = (pdfBuffer) => {
  return crypto.createHash('sha256').update(pdfBuffer).digest('hex');
};


const uploadPdf = async (req, res) => {
  try {
    const { pdfData, fileName } = req.body;

        if (!pdfData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: pdfData is required'
      });
    }

        const pdfBuffer = Buffer.from(pdfData, 'base64');

        const pdfHash = calculateHash(pdfBuffer);
    const pdfId = pdfHash.substring(0, 16); 
        const uploadsDir = path.join(__dirname, '../uploads');
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

        const pdfPath = path.join(uploadsDir, `${pdfId}.pdf`);
    await fs.writeFile(pdfPath, pdfBuffer);

        res.status(200).json({
      success: true,
      message: 'PDF uploaded successfully',
      data: {
        pdfId,
        hash: pdfHash,
        fileName: fileName || 'document.pdf'
      }
    });

  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while uploading PDF',
      error: error.message
    });
  }
};

module.exports = {
  uploadPdf
};


