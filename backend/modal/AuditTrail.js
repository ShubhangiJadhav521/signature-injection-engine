const mongoose = require('mongoose');

const auditTrailSchema = new mongoose.Schema({
  pdfId: {
    type: String,
    required: true,
    index: true
  },
  originalHash: {
    type: String,
    required: true
  },
  signedHash: {
    type: String,
    required: true
  },
  signedPdfUrl: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AuditTrail', auditTrailSchema);


