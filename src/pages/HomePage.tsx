import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useDocumentStore } from '../stores/documentStore';
import toast from 'react-hot-toast';

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [showSignupModal, setShowSignupModal] = useState(false);
  const { uploadDocument } = useDocumentStore();
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (!isAuthenticated || !user) {
      navigate('/auth?signup=true');
      return;
    }
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    if (!isAuthenticated || !user) {
      navigate('/auth?signup=true');
      return;
    }
    
    const files = Array.from(e.target.files);
    handleFiles(files);
  };
  
  const handleFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    
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

    if (!user) {
      navigate('/auth?signup=true');
      return;
    }

    const loadingToast = toast.loading('Uploading document...');
    
    try {
      const document = await uploadDocument(file, user.id);
      
      if (document?.id) {
        toast.dismiss(loadingToast);
        toast.success('Document uploaded successfully!');
        navigate('/upload', { state: { documentId: document.id } });
      } else {
        throw new Error('Failed to create document record');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document';
      toast.error(errorMessage);
      console.error('Upload error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 pt-20 pb-32 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
            Text Extraction Made Simple
            <span className="block text-primary-600 mt-2">Just Upload & Go</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
            Drop your document below. We'll handle the rest. No complexity, just results.
          </p>
          
          {!isAuthenticated && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => navigate('/auth?signup=true')}
                className="btn-primary btn-lg"
              >
                Get Started - 2 Free Documents
              </button>
            </div>
          )}
        </div>

        {/* Upload Area */}
        <div 
          className="mt-12 max-w-2xl mx-auto"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <label 
            className="relative block group cursor-pointer"
            htmlFor="file-upload"
          >
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white px-6 py-10 transition-all duration-200 hover:border-primary-500 hover:bg-primary-50">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 group-hover:text-primary-500" />
                <div className="mt-4">
                  <span className="text-sm font-medium text-gray-900">
                    {isAuthenticated ? (
                      <>
                        Drop your file here, or{' '}
                        <span className="text-primary-600">browse</span>
                      </>
                    ) : (
                      'Sign up to start uploading documents'
                    )}
                  </span>
                  <p className="mt-1 text-xs text-gray-500">
                    PDF, JPG, PNG or GIF (max. 10MB)
                  </p>
                </div>
              </div>
            </div>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.gif"
              onChange={handleFileInput}
              disabled={!isAuthenticated}
            />
          </label>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Simple Upload</h3>
            <p className="mt-2 text-sm text-gray-500">
              Works with PDFs and images. No complex settings.
            </p>
          </div>
          
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
              <Upload className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Quick Results</h3>
            <p className="mt-2 text-sm text-gray-500">
              Get your text in seconds, not minutes
            </p>
          </div>
          
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Pay As You Go</h3>
            <p className="mt-2 text-sm text-gray-500">
              25¢ per document. Start with 2 free.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;