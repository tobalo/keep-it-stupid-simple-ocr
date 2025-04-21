import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useOnboardingStore } from '../../stores/onboardingStore';

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to KissOCR',
    description: 'Let's get you set up in just a few quick steps.',
  },
  {
    id: 'profile',
    title: 'Complete Your Profile',
    description: 'Tell us a bit about yourself.',
  },
  {
    id: 'preferences',
    title: 'Set Your Preferences',
    description: 'Customize your experience.',
  },
  {
    id: 'complete',
    title: 'All Set!',
    description: 'You're ready to start using KissOCR.',
  },
];

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { completeOnboarding } = useOnboardingStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    role: '',
    defaultLanguage: 'en',
    notifications: true,
  });
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
      navigate('/dashboard');
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center">
            <img
              src="https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
              alt="Welcome"
              className="w-64 h-64 mx-auto rounded-full object-cover"
            />
            <h3 className="mt-6 text-xl font-semibold text-gray-900">
              Welcome to KissOCR, {user?.email}!
            </h3>
            <p className="mt-2 text-gray-600">
              We're excited to help you extract text from your documents with ease.
              Let's get your account set up.
            </p>
          </div>
        );
      
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </div>
            
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                Company (Optional)
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role (Optional)
              </label>
              <input
                type="text"
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="defaultLanguage" className="block text-sm font-medium text-gray-700">
                Default OCR Language
              </label>
              <select
                id="defaultLanguage"
                name="defaultLanguage"
                value={formData.defaultLanguage}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="notifications"
                name="notifications"
                checked={formData.notifications}
                onChange={handleInputChange}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="notifications" className="ml-2 block text-sm text-gray-700">
                Enable email notifications for completed OCR jobs
              </label>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-gray-900">
              You're All Set!
            </h3>
            <p className="mt-2 text-gray-600">
              Your account is ready to use. You have 10 free credits to get started.
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Progress bar */}
          <div className="h-2 bg-gray-100">
            <div
              className="h-full bg-primary-600 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          
          <div className="p-8">
            {/* Step indicator */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {steps[currentStep].title}
              </h2>
              <p className="mt-2 text-gray-600">
                {steps[currentStep].description}
              </p>
            </div>
            
            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
            
            {/* Navigation */}
            <div className="mt-8 flex justify-between">
              <button
                onClick={handleBack}
                className={`btn-secondary flex items-center ${
                  currentStep === 0 ? 'invisible' : ''
                }`}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </button>
              
              <button
                onClick={handleNext}
                className="btn-primary flex items-center"
              >
                {currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;