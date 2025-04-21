import { Link } from 'react-router-dom';
import { FileScan, Github, Twitter } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const Footer = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:justify-between">
          <div className="mb-8 md:mb-0">
            <Link to="/" className="flex items-center">
              <FileScan className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">KissOCR</span>
            </Link>
            <p className="mt-2 text-sm text-gray-600 max-w-md">
              Simple, fast OCR service to extract text from your documents and images. No complexity, just results.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">Product</h2>
              <ul className="text-gray-600">
                {isAuthenticated ? (
                  <>
                    <li className="mb-2">
                      <Link to="/dashboard" className="hover:text-primary-600">Dashboard</Link>
                    </li>
                    <li className="mb-2">
                      <Link to="/documents" className="hover:text-primary-600">Documents</Link>
                    </li>
                    <li className="mb-2">
                      <Link to="/account" className="hover:text-primary-600">Account</Link>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="mb-2">
                      <Link to="/auth" className="hover:text-primary-600">Sign In</Link>
                    </li>
                    <li className="mb-2">
                      <Link to="/auth?signup=true" className="hover:text-primary-600">Get Started</Link>
                    </li>
                    <li className="mb-2">
                      <Link to="/pricing" className="hover:text-primary-600">Pricing</Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
            
            <div>
              <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">Company</h2>
              <ul className="text-gray-600">
                <li className="mb-2">
                  <Link to="/about" className="hover:text-primary-600">About</Link>
                </li>
                <li className="mb-2">
                  <Link to="/contact" className="hover:text-primary-600">Contact</Link>
                </li>
                <li className="mb-2">
                  <Link to="/blog" className="hover:text-primary-600">Blog</Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">Legal</h2>
              <ul className="text-gray-600">
                <li className="mb-2">
                  <Link to="/privacy" className="hover:text-primary-600">Privacy Policy</Link>
                </li>
                <li className="mb-2">
                  <Link to="/terms" className="hover:text-primary-600">Terms of Service</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <hr className="my-6 border-gray-200" />
        
        <div className="flex flex-col items-center justify-between sm:flex-row">
          <span className="text-sm text-gray-600">© 2025 KissOCR. All rights reserved.</span>
          <div className="flex space-x-6 mt-4 sm:mt-0">
            <a href="https://github.com" className="text-gray-500 hover:text-primary-600" target="_blank" rel="noopener noreferrer">
              <Github className="h-5 w-5" />
            </a>
            <a href="https://twitter.com" className="text-gray-500 hover:text-primary-600" target="_blank" rel="noopener noreferrer">
              <Twitter className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;