import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useDocumentStore } from '../stores/documentStore';
import { usePaymentStore } from '../stores/paymentStore';
import UploadDropzone from '../components/upload/UploadDropzone';
import DocumentPreview from '../components/document/DocumentPreview';

const UploadPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { creditBalance, fetchCreditBalance } = usePaymentStore();
  const { currentDocument, fetchDocument } = useDocumentStore();
  const [documentId, setDocumentId] = useState<string | null>(null);
  
  useEffect(() => {
    // Check for document ID in location state (from homepage upload)
    const stateDocId = (location.state as { documentId?: string })?.documentId;
    if (stateDocId) {
      setDocumentId(stateDocId);
      fetchDocument(stateDocId);
    }
  }, [location.state, fetchDocument]);
  
  // Fetch credit balance on page load
  useEffect(() => {
    if (user && creditBalance === 0) {
      fetchCreditBalance();
    }
  }, [user, creditBalance, fetchCreditBalance]);
  
  const handleUploadSuccess = (docId: string) => {
    setDocumentId(docId);
    fetchDocument(docId);
  };
  
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="mr-4 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Upload Document</h1>
      </div>
      
      {/* Credit balance warning */}
      {creditBalance < 1 && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You need at least 1 credit to process a document.{' '}
                <a href="/account" className="font-medium underline">
                  Add credits to your account
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Upload area */}
      {!documentId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="text-center mb-6">
              <FileText className="mx-auto h-12 w-12 text-primary-600" />
              <h2 className="mt-2 text-xl font-semibold text-gray-900">Upload a Document</h2>
              <p className="mt-1 text-gray-500">
                Upload an image or PDF to extract the text using OCR
              </p>
            </div>
            
            <div className="mt-6">
              <UploadDropzone onSuccess={handleUploadSuccess} />
            </div>
            
            <div className="mt-6">
              <div className="rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1 md:flex md:justify-between">
                    <p className="text-sm text-blue-700">
                      Each document processed will use 1 credit. You currently have {creditBalance} credits.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Document preview */}
      {documentId && currentDocument && (
        <div>
          <DocumentPreview document={currentDocument} />
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                setDocumentId(null);
              }}
              className="btn-secondary mr-4"
            >
              Upload Another
            </button>
            <button
              onClick={() => navigate('/documents')}
              className="btn-primary"
            >
              View All Documents
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;