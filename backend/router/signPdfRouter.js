const express = require('express');
const router = express.Router();
const { signPdf } = require('../controller/signPdfController');
const { uploadPdf } = require('../controller/uploadPdfController');



// POST /upload-pdf endpoint
router.post('/upload-pdf', uploadPdf);

// POST /sign-pdf endpoint
router.post('/sign-pdf', signPdf);

module.exports = router;

