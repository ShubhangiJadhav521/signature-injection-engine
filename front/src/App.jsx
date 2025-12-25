import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import DraggableField from './components/DraggableField.jsx';
import SignaturePad from './components/SignaturePad.jsx';
import { usePdfRenderer } from './hooks/usePdfRenderer';
import { calculateHash, cloneBuffer } from './utils/pdfHelpers';
import { generateSamplePDF } from './utils/pdfGenerator';
import { uploadPdf, signPdf, downloadPdf, fetchPdf } from './services/apiService';
import { convertCoordinates } from './utils/pdfHelpers';
import { 
  FaFont, 
  FaAlignLeft, 
  FaPen, 
  FaCalendar, 
  FaImage, 
  FaCircle,
  FaClipboard,
  FaFilePdf
} from 'react-icons/fa';

// Field types available
const FIELD_TYPES = [
  { type: 'INPUT', label: 'Input', icon: FaFont },
  { type: 'TEXT', label: 'Text Area', icon: FaAlignLeft },
  { type: 'SIGNATURE', label: 'Sign', icon: FaPen },
  { type: 'DATE', label: 'Date', icon: FaCalendar },
  { type: 'IMAGE', label: 'Image', icon: FaImage },
  { type: 'RADIO', label: 'Radio', icon: FaCircle },
];

function App() {
  // State management
  const [pdfFile, setPdfFile] = useState(null);
  const [fields, setFields] = useState([]);
  const [activeFieldType, setActiveFieldType] = useState(null);
  const [isSigning, setIsSigning] = useState(null);
  const [status, setStatus] = useState('IDLE');
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLogOpen, setIsLogOpen] = useState(false);

  // PDF rendering hook
  const { pages, containerRef, canvasRefs } = usePdfRenderer(pdfFile);

  // Add log entry
  const addLog = (event, details, hash = null) => {
    setAuditLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      event,
      details,
      hash
    }, ...prev]);
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.');
      return;
    }

    try {
      const bytes = await file.arrayBuffer();
      const cloned = cloneBuffer(bytes);
      const hash = await calculateHash(cloned);
      
      setPdfFile({ bytes: cloned, name: file.name });
      setFields([]);
      addLog('DOCUMENT_INITIALIZED', file.name, hash);
    } catch (error) {
      console.error('Error loading file:', error);
      addLog('ERROR', 'Failed to load PDF file');
    }
  };

  // Load sample PDF
  const loadSample = async () => {
    addLog('REQUEST_SAMPLE', 'Generating sample document...');
    try {
      const { bytes, hash } = await generateSamplePDF();
      const cloned = cloneBuffer(bytes);
      
      setPdfFile({ bytes: cloned, name: 'Sample_Document.pdf' });
      setFields([]);
      addLog('SAMPLE_GENERATED', 'Sample document created', hash);
    } catch (error) {
      console.error('Error generating sample:', error);
      addLog('ERROR', 'Failed to generate sample document');
    }
  };

  // Place field on PDF
  const placeField = (clientX, clientY) => {
    if (!activeFieldType || !containerRef.current || pages.length === 0) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const clickY = clientY - containerRect.top;

    // Find which page was clicked
    for (let i = 0; i < pages.length; i++) {
      const pageInfo = pages[i];
      const canvas = canvasRefs.current[`page-${pageInfo.pageNum}`];
      if (!canvas) continue;

      const canvasRect = canvas.getBoundingClientRect();
      const pageTop = canvasRect.top - containerRect.top;
      const pageBottom = pageTop + canvasRect.height;

      if (clickY >= pageTop && clickY <= pageBottom) {
        const targetPage = pageInfo.pageNum - 1;
        const relativeY = clickY - pageTop;
        const x = ((clientX - containerRect.left) / canvasRect.width) * 100;
        const y = (relativeY / canvasRect.height) * 100;

        // Create new field
        const newField = {
          id: Math.random().toString(36).substr(2, 9),
          type: activeFieldType,
          page: targetPage,
          x: Math.max(0, Math.min(92, x - 4)),
          y: Math.max(0, Math.min(96, y - 2)),
          width: getDefaultWidth(activeFieldType),
          height: getDefaultHeight(activeFieldType),
          value: activeFieldType === 'DATE' ? new Date().toISOString().split('T')[0] : '',
          checked: false
        };

        setFields([...fields, newField]);
        setActiveFieldType(null);
        addLog('FIELD_ADDED', `${activeFieldType} field added`);
        return;
      }
    }
  };

  // Get default field dimensions
  const getDefaultWidth = (type) => {
    if (type === 'RADIO') return 4;
    if (type === 'SIGNATURE') return 25;
    if (type === 'TEXT') return 30;
    return 20;
  };

  const getDefaultHeight = (type) => {
    if (type === 'RADIO') return 3;
    if (type === 'SIGNATURE') return 12;
    if (type === 'TEXT') return 15;
    return 5;
  };

  // Update field
  const updateField = useCallback((id, updates) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  // Delete field
  const deleteField = useCallback((id) => {
    setFields(prev => prev.filter(f => f.id !== id));
    addLog('FIELD_REMOVED', 'Field deleted');
  }, []);

  // Handle finalize - process signatures
  const handleFinalize = async () => {
    if (!pdfFile || fields.length === 0) return;

    setStatus('PROCESSING');
    addLog('PROCESSING_START', 'Starting PDF processing...');

    try {
      // Clone PDF bytes
      const clonedBytes = cloneBuffer(pdfFile.bytes);

      // Upload PDF to server
      addLog('UPLOADING', 'Uploading PDF to server...');
      const uploadResponse = await uploadPdf(clonedBytes, pdfFile.name);
      const pdfId = uploadResponse.data.pdfId;
      addLog('UPLOADED', `PDF uploaded: ${pdfId}`, uploadResponse.data.hash);

      // Get signature fields
      const signatureFields = fields.filter(f => f.type === 'SIGNATURE' && f.value);

      if (signatureFields.length > 0) {
        // Process each signature
        let currentPdfId = pdfId;
        let currentPdfBytes = clonedBytes;

        for (let i = 0; i < signatureFields.length; i++) {
          const field = signatureFields[i];
          addLog('SIGNING', `Applying signature ${i + 1}/${signatureFields.length}...`);

          // Convert coordinates
          const coordinates = await convertCoordinates(currentPdfBytes, field);

          // Sign PDF
          const signResponse = await signPdf(currentPdfId, field.value, coordinates);

          if (signResponse.success) {
            addLog('SIGNED', `Signature ${i + 1} applied`, signResponse.data.signedHash);

            // If more signatures, fetch and re-upload
            if (i < signatureFields.length - 1) {
              const signedBytes = await fetchPdf(signResponse.data.signedPdfUrl);
              const reUploadResponse = await uploadPdf(signedBytes, pdfFile.name);
              currentPdfId = reUploadResponse.data.pdfId;
              currentPdfBytes = signedBytes;
            } else {
              // Last signature - download
              setStatus('DOWNLOADING');
              await downloadPdf(signResponse.data.signedPdfUrl, `Signed_${pdfFile.name}`);
              addLog('COMPLETE', 'PDF signed and downloaded', signResponse.data.signedHash);
            }
          }
        }
      } else {
        addLog('NO_SIGNATURES', 'No signatures to process');
      }
    } catch (error) {
      console.error('Finalize error:', error);
      addLog('ERROR', `Processing failed: ${error.message}`);
      alert(`Error: ${error.message || 'Failed to process PDF'}`);
    } finally {
      setStatus('IDLE');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:block">
        <Sidebar onDragStart={setActiveFieldType} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-8">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              S
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">PDF Signature Tool</h1>
              {pdfFile && (
                <p className="text-xs text-gray-400 truncate max-w-xs">{pdfFile.name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {!pdfFile && (
              <button
                onClick={loadSample}
                className="px-4 py-2 text-indigo-600 font-semibold hover:bg-indigo-50 rounded-lg"
              >
                Demo Sample
              </button>
            )}
            <input
              type="file"
              accept=".pdf"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
            />
            <label
              htmlFor="file-upload"
              className="px-4 py-2 border border-gray-300 font-semibold rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              Load PDF
            </label>
            <button
              onClick={handleFinalize}
              disabled={!pdfFile || fields.length === 0 || status !== 'IDLE'}
              className={`px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 ${
                (!pdfFile || fields.length === 0 || status !== 'IDLE')
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              {status === 'IDLE' ? 'Finalize' : status}
            </button>
            <button
              onClick={() => setIsLogOpen(!isLogOpen)}
              className="lg:hidden w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg"
            >
              <FaClipboard className="text-gray-600" />
            </button>
          </div>
        </header>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto p-8 flex justify-center bg-gray-50">
          {!pdfFile ? (
            <div className="flex flex-col items-center justify-center max-w-md mt-20 bg-white rounded-2xl p-10 text-center border-2 border-dashed border-gray-200">
              <FaFilePdf className="text-5xl mb-6 text-gray-400" />
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Ready to Start</h2>
              <p className="text-gray-500 mb-8">
                Load a PDF document to begin adding signature fields
              </p>
              <button
                onClick={loadSample}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700"
              >
                Load Sample PDF
              </button>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="relative bg-white shadow-lg"
              style={{ width: '100%', maxWidth: '850px' }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                placeField(e.clientX, e.clientY);
              }}
              onClick={(e) => {
                if (activeFieldType) {
                  placeField(e.clientX, e.clientY);
                }
              }}
            >
              {pages.map((pageInfo, idx) => {
                const pageFields = fields.filter(f => f.page === pageInfo.pageNum - 1);
                const canvas = canvasRefs.current[`page-${pageInfo.pageNum}`];
                const pageHeight = canvas ? parseFloat(canvas.style.height) || 0 : 0;

                return (
                  <div
                    key={`page-${pageInfo.pageNum}`}
                    className="relative"
                    style={{ marginBottom: idx < pages.length - 1 ? '20px' : '0' }}
                  >
                    <canvas
                      ref={(el) => {
                        if (el) canvasRefs.current[`page-${pageInfo.pageNum}`] = el;
                      }}
                      className="block"
                    />
                    <div className="absolute inset-0 pointer-events-none">
                      {pageFields.map((field) => (
                        <DraggableField
                          key={field.id}
                          field={field}
                          containerWidth={850}
                          containerHeight={pageHeight}
                          onUpdate={updateField}
                          onDelete={deleteField}
                          onSignClick={(id) => setIsSigning(id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {activeFieldType && (
                <div className="absolute inset-0 bg-indigo-100 bg-opacity-20 cursor-crosshair flex items-start justify-center pt-6 pointer-events-none">
                  <div className="bg-indigo-600 text-white px-4 py-2 rounded-full text-xs font-semibold">
                    Click to place {activeFieldType}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Tools */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center justify-around">
          {FIELD_TYPES.map((tool) => {
            const IconComponent = tool.icon;
            return (
              <button
                key={tool.type}
                onClick={() => setActiveFieldType(tool.type)}
                className={`flex flex-col items-center p-2 rounded-xl ${
                  activeFieldType === tool.type
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400'
                }`}
              >
                <IconComponent className="text-xl" />
                <span className="text-xs font-semibold">{tool.label}</span>
              </button>
            );
          })}
        </div>
      </main>

      {/* Audit Log Sidebar */}
      <div
        className={`fixed inset-0 lg:relative lg:inset-auto z-50 lg:z-20 w-80 bg-white border-l border-gray-200 flex flex-col transition-transform ${
          isLogOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        } ${!isLogOpen ? 'hidden lg:flex' : ''}`}
      >
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-600">Audit History</h3>
          <button
            onClick={() => setIsLogOpen(false)}
            className="lg:hidden text-gray-400 text-2xl"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 bg-white rounded-lg border border-gray-200 space-y-2"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold px-2 py-1 rounded bg-indigo-100 text-indigo-700">
                  {log.event}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-gray-600">{log.details}</p>
              {log.hash && (
                <p className="text-xs font-mono text-gray-400 break-all">{log.hash}</p>
              )}
            </div>
          ))}
          {auditLogs.length === 0 && (
            <div className="text-center text-gray-400 mt-20">
              <p className="text-sm">No activity yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Signature Pad Modal */}
      {isSigning && (
        <SignaturePad
          onCancel={() => setIsSigning(null)}
          onSave={(base64) => {
            updateField(isSigning, { value: base64 });
            addLog('SIGNATURE_SAVED', 'Signature captured');
            setIsSigning(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
