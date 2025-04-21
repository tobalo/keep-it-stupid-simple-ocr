import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, Filter, Upload } from 'lucide-react';
import { useDocumentStore } from '../stores/documentStore';
import DocumentCard from '../components/document/DocumentCard';
import { Database } from '../types/supabase';

type Document = Database['public']['Tables']['documents']['Row'];

const DocumentsPage = () => {
  const { documents, fetchDocuments, isLoading } = useDocumentStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);
  
  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="mt-1 text-gray-500">
            Manage and view all your processed documents
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link to="/upload" className="btn-primary">
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Link>
        </div>
      </div>
      
      {/* Filters and search */}
      <div className="mt-6 sm:flex sm:items-center sm:justify-between">
        <div className="relative max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="search"
            placeholder="Search documents..."
            className="form-input pl-10 w-full sm:w-60"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center">
          <Filter className="h-5 w-5 text-gray-400 mr-2" />
          <select
            className="form-input w-full sm:w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>
      
      {/* Documents list */}
      <div className="mt-6">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
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
        ) : filteredDocuments.length > 0 ? (
          <div className="space-y-4">
            {filteredDocuments.map((document) => (
              <DocumentCard key={document.id} document={document} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {documents.length > 0
                ? 'Try changing your search or filter criteria.'
                : 'Get started by uploading your first document.'}
            </p>
            {documents.length === 0 && (
              <div className="mt-6">
                <Link to="/upload" className="btn-primary">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload a Document
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsPage;