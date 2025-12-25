# PDF Signature Injection Backend

Backend server for PDF signature injection with audit trail functionality.

## Features

- **POST /api/sign-pdf**: Sign PDFs with signature images
- **Aspect Ratio Preservation**: Maintains signature aspect ratio within specified coordinates
- **SHA-256 Hash Calculation**: Calculates hashes before and after signing
- **MongoDB Audit Trail**: Stores document history for verification

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (copy from `.env.example`):
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/signature-injection
```

3. Make sure MongoDB is running on your system

4. Create upload directories:
```bash
mkdir -p uploads/signed
```

5. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoint

### POST /api/sign-pdf

**Request Body:**
```json
{
  "pdfId": "unique-pdf-id",
  "signatureImage": "data:image/png;base64,iVBORw0KG...",
  "coordinates": {
    "x": 100,
    "y": 200,
    "width": 200,
    "height": 100
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "PDF signed successfully",
  "data": {
    "signedPdfUrl": "/uploads/signed/pdf-id_signed_1234567890.pdf",
    "originalHash": "sha256-hash-of-original-pdf",
    "signedHash": "sha256-hash-of-signed-pdf",
    "auditTrailId": "mongodb-object-id"
  }
}
```

## Important Notes

1. **PDF Storage**: The current implementation expects PDFs to be stored in `back/uploads/` directory with filename `{pdfId}.pdf`. You may need to modify the PDF retrieval logic in `controller/signPdfController.js` based on your storage solution (database, cloud storage, etc.).

2. **File Upload**: Ensure the `uploads/signed/` directory exists for storing signed PDFs.

3. **MongoDB**: Make sure MongoDB is installed and running before starting the server.


