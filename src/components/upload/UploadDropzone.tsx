import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { useDocumentStore } from '../../stores/documentStore';
import { usePaymentStore } from '../../stores/paymentStore';

interface UploadDropzoneProps {
  onSuccess: (documentId: string) => void;
}

const UploadDropzone: React.FC<UploadDropzoneProps> = ({ onSuccess }) => {
  const { user } = useAuthStore();
  const { uploadDocument } = useDocumentStore();
  const { creditBalance, fetchCreditBalance } = usePaymentStore();
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      toast.error('You must be logged in to upload documents');
      return;
    }
    
    if (creditBalance < 1) {
      toast.error('You need at least 1 credit to process a document');
      return;
    }
    
    const file = acceptedFiles[0];
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      return;
    }
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Unsupported file type. Please upload a JPG, PNG, GIF, or PDF');
      return;
    }
    
    const uploadToast = toast.loading('Uploading document...');
    
    try {
      const document = await uploadDocument(file, user.id);
      
      if (!document) {
        throw new Error('Failed to upload document');
      }
      
      toast.success('Document uploaded successfully!', { id: uploadToast });
      fetchCreditBalance(); // Refresh credit balance
      onSuccess(document.id);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document', { id: uploadToast });
    }
  }, [user, uploadDocument, creditBalance, fetchCreditBalance, onSuccess]);
  
  const { 
    getRootProps, 
    getInputProps, 
    isDragActive,
    isDragAccept,
    isDragReject
  } = useDropzone({ 
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/gif': [],
      'application/pdf': []
    },
    maxFiles: 1
  });
  
  let borderColor = 'border-gray-300';
  let bgColor = 'bg-gray-50';
  
  if (isDragActive) bgColor = 'bg-blue-50';
  if (isDragAccept) borderColor = 'border-green-400';
  if (isDragReject) borderColor = 'border-red-400';

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed ${borderColor} ${bgColor} rounded-lg p-6 cursor-pointer transition-colors duration-200 text-center`}
    >
      <input {...getInputProps()} />
      <div className="space-y-4">
        {isDragReject ? (
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <p className="mt-2 text-sm text-red-600">
              File type not supported. Please upload a JPG, PNG, GIF, or PDF.
            </p>
          </div>
        ) : (
          <>
            {isDragActive ? (
              <Upload className="mx-auto h-12 w-12 text-primary-400" />
            ) : (
              <File className="mx-auto h-12 w-12 text-gray-400" />
            )}
            <div>
              <p className="text-base font-medium text-gray-900">
                {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                or <span className="text-primary-600 font-medium">browse files</span>
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Supports JPG, PNG, GIF, PDF (max 10MB)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UploadDropzone;