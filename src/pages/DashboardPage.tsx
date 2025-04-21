import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Upload, Download, CreditCard, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useDocumentStore } from '../stores/documentStore';
import { usePaymentStore } from '../stores/paymentStore';
import DocumentCard from '../components/document/DocumentCard';

const DashboardPage = () => {
  const { user } = useAuthStore();
  const { documents, fetchDocuments, isLoading } = useDocumentStore();
  const { creditBalance, fetchCreditBalance } = usePaymentStore();
  
  useEffect(() => {
    fetchDocuments();
    fetchCreditBalance();
  }, [fetchDocuments, fetchCreditBalance]);
  
  // Filter recent documents (last 5)
  const recentDocuments = documents.slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">
            Welcome back, {user?.email?.split('@')[0] || 'User'}
          </p>
        </div>
      </div>
      
      {/* Stats cards */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Documents Processed
                </dt>
                <dd>
                  <div className="text-lg font-bold text-gray-900">
                    {isLoading ? '...' : documents.length}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CreditCard className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Credit Balance
                </dt>
                <dd>
                  <div className="text-lg font-bold text-gray-900">
                    {creditBalance}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
          {creditBalance < 5 && (
            <div className="mt-4">
              <Link to="/account" className="text-sm text-primary-600 hover:text-primary-800 font-medium flex items-center">
                Purchase more credits
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
        
        <div className="card p-6 bg-primary-50 border-primary-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Upload className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <h3 className="text-sm font-medium text-gray-900">Upload Document</h3>
              <p className="text-sm text-gray-600 mt-1">
                Upload a new document for OCR processing
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/upload" className="btn-primary w-full">
              Upload
            </Link>
          </div>
        </div>
      </div>
      
      {/* Recent documents */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Documents</h2>
          <Link to="/documents" className="text-sm text-primary-600 hover:text-primary-800 font-medium flex items-center">
            View all
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        
        <div className="mt-4 space-y-4">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card p-6">
                  <div className="flex items-center space-x-4">
                    <div className="rounded-md bg-gray-200 h-10 w-10"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentDocuments.length > 0 ? (
            <div className="space-y-4">
              {recentDocuments.map((document) => (
                <DocumentCard key={document.id} document={document} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No documents yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by uploading your first document.
              </p>
              <div className="mt-6">
                <Link to="/upload" className="btn-primary">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload a Document
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;