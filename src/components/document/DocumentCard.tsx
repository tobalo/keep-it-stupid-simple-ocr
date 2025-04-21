import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from '../../utils/date';
import { Database } from '../../types/supabase';
import toast from 'react-hot-toast';

type Document = Database['public']['Tables']['documents']['Row'];

interface DocumentCardProps {
  document: Document;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const getStatusIcon = () => {
    switch (document.status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <div className="h-5 w-5 text-blue-500 animate-spin border-2 border-blue-500 border-t-transparent rounded-full" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };
  
  const getStatusText = () => {
    switch (document.status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return '';
    }
  };
  
  const getStatusClass = () => {
    switch (document.status) {
      case 'pending':
        return 'badge-yellow';
      case 'processing':
        return 'badge-blue';
      case 'completed':
        return 'badge-green';
      case 'failed':
        return 'badge-red';
      default:
        return 'badge-gray';
    }
  };
  
  const canDownload = document.status === 'completed' && document.ocr_text;
  
  const handleDownload = () => {
    if (!canDownload) return;
    
    setIsDownloading(true);
    
    try {
      // Create a blob from the OCR text
      const blob = new Blob([document.ocr_text || ''], { type: 'text/plain' });
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
    } catch (error) {
      toast.error('Failed to download document');
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="card card-hover">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <FileText className="h-10 w-10 text-primary-500" />
            <div className="ml-3">
              <h3 className="font-medium text-gray-900 truncate max-w-xs">
                {document.original_filename}
              </h3>
              <div className="flex items-center mt-1">
                <span className={`${getStatusClass()} mr-2 flex items-center space-x-1`}>
                  {getStatusIcon()}
                  <span>{getStatusText()}</span>
                </span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(document.created_at))}
                </span>
              </div>
            </div>
          </div>
          
          {canDownload && (
            <button 
              onClick={handleDownload}
              disabled={isDownloading}
              className="btn-secondary btn-sm flex items-center"
            >
              {isDownloading ? (
                <div className="h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mr-1"></div>
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Download
            </button>
          )}
        </div>
        
        {document.word_count && document.status === 'completed' && (
          <div className="mt-2 text-sm text-gray-500">
            {document.word_count} words extracted
          </div>
        )}
        
        {document.status === 'failed' && document.error_message && (
          <div className="mt-2 text-sm text-red-500">
            Error: {document.error_message}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentCard;