import { useEffect, useState } from 'react';
import { Download, Copy, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Database } from '../../types/supabase';
import supabase from '../../utils/supabase';

type Document = Database['public']['Tables']['documents']['Row'];

interface DocumentPreviewProps {
  document: Document;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ document }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    const fetchDocumentUrl = async () => {
      try {
        // Get file URL from Supabase storage
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(document.file_path, 60); // 60 seconds expiry
        
        if (error) throw error;
        
        setImageUrl(data.signedUrl);
      } catch (error) {
        console.error('Error fetching document URL:', error);
      }
    };
    
    if (document.file_path) {
      fetchDocumentUrl();
    }
  }, [document.file_path]);
  
  const handleCopyText = () => {
    if (!document.ocr_text) return;
    
    navigator.clipboard.writeText(document.ocr_text)
      .then(() => {
        setCopied(true);
        toast.success('Text copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        toast.error('Failed to copy text');
      });
  };
  
  const handleDownload = () => {
    if (!document.ocr_text) return;
    
    // Create a blob from the OCR text
    const blob = new Blob([document.ocr_text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link
    const a = document.createElement('a');
    a.href = url;
    a.download = document.original_filename.split('.')[0] + '.txt';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Document downloaded successfully');
  };

  return (
    <div className="rounded-lg overflow-hidden shadow-sm border border-gray-200 bg-white">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">{document.original_filename}</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {/* Document Image Preview */}
        <div className="border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center h-64 md:h-auto">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={document.original_filename} 
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="animate-pulse flex flex-col items-center justify-center text-gray-400">
              <div className="rounded-md bg-gray-200 h-32 w-48"></div>
              <p className="mt-2 text-sm">Loading preview...</p>
            </div>
          )}
        </div>
        
        {/* OCR Text Preview */}
        <div className="flex flex-col h-64 md:h-auto">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Extracted Text</h4>
            <div className="flex space-x-2">
              <button 
                onClick={handleCopyText}
                disabled={!document.ocr_text || document.status !== 'completed'}
                className="btn-secondary btn-sm flex items-center"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button 
                onClick={handleDownload}
                disabled={!document.ocr_text || document.status !== 'completed'}
                className="btn-primary btn-sm flex items-center"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </button>
            </div>
          </div>
          
          <div className="flex-1 bg-gray-50 border rounded-lg p-3 overflow-auto">
            {document.status === 'completed' && document.ocr_text ? (
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                {document.ocr_text}
              </pre>
            ) : document.status === 'failed' ? (
              <div className="flex items-center justify-center h-full text-red-500">
                <p>Processing failed: {document.error_message || 'Unknown error'}</p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                {document.status === 'processing' ? (
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-2">Processing document...</p>
                  </div>
                ) : (
                  <p>Waiting to process document...</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;