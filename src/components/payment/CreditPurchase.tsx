import { useState } from 'react';
import { CreditCard, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePaymentStore } from '../../stores/paymentStore';

const creditPackages = [
  { credits: 10, price: 2.5, popular: false },
  { credits: 50, price: 12.5, popular: true },
  { credits: 100, price: 25, popular: false },
];

const CreditPurchase = () => {
  const [selectedPackage, setSelectedPackage] = useState(1); // Default to middle package
  const [customCredits, setCustomCredits] = useState(50);
  const [isCustom, setIsCustom] = useState(false);
  const { createCheckoutSession, isLoading } = usePaymentStore();
  
  const handleCustomIncrement = () => {
    setCustomCredits(prev => Math.min(prev + 10, 1000));
  };
  
  const handleCustomDecrement = () => {
    setCustomCredits(prev => Math.max(prev - 10, 10));
  };
  
  const handlePurchase = async () => {
    const credits = isCustom ? customCredits : creditPackages[selectedPackage].credits;
    
    toast.loading('Creating checkout session...');
    
    const checkoutUrl = await createCheckoutSession(credits);
    
    toast.dismiss();
    
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    } else {
      toast.error('Failed to create checkout session');
    }
  };
  
  const calculatePrice = (credits: number) => {
    return (credits * 0.25).toFixed(2);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6">
        <h2 className="text-2xl font-semibold text-gray-900">Purchase Credits</h2>
        <p className="mt-2 text-gray-600">
          Credits are used to process documents. Each document costs 1 credit.
        </p>
        
        {/* Package selection */}
        {!isCustom && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {creditPackages.map((pkg, index) => (
              <div
                key={pkg.credits}
                className={`
                  relative rounded-lg border p-4 flex flex-col cursor-pointer transition-all
                  ${selectedPackage === index 
                    ? 'border-primary-500 shadow bg-primary-50' 
                    : 'border-gray-200 hover:border-primary-200'}
                  ${pkg.popular ? 'ring-2 ring-primary-500' : ''}
                `}
                onClick={() => setSelectedPackage(index)}
              >
                {pkg.popular && (
                  <span className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 bg-primary-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {pkg.credits} Credits
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    ${pkg.price.toFixed(2)} (${(pkg.price / pkg.credits).toFixed(2)}/credit)
                  </p>
                </div>
                <div className="mt-4">
                  <div className={`h-4 w-4 rounded-full border ${selectedPackage === index ? 'bg-primary-500 border-primary-500' : 'border-gray-300'}`}>
                    {selectedPackage === index && (
                      <div className="h-2 w-2 mx-auto mt-1 rounded-full bg-white"></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Custom amount */}
        {isCustom && (
          <div className="mt-6 rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900">Custom Amount</h3>
            <div className="mt-4 flex items-center">
              <button
                onClick={handleCustomDecrement}
                className="btn-secondary rounded-full p-1"
                disabled={customCredits <= 10}
              >
                <Minus className="h-5 w-5" />
              </button>
              <span className="mx-4 text-2xl font-bold text-gray-900 min-w-[60px] text-center">
                {customCredits}
              </span>
              <button
                onClick={handleCustomIncrement}
                className="btn-secondary rounded-full p-1"
                disabled={customCredits >= 1000}
              >
                <Plus className="h-5 w-5" />
              </button>
              
              <div className="ml-6 text-gray-700">
                <p className="font-semibold">${calculatePrice(customCredits)}</p>
                <p className="text-xs text-gray-500">$0.25 per credit</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Toggle between preset and custom */}
        <button
          onClick={() => setIsCustom(!isCustom)}
          className="mt-4 text-sm text-primary-600 hover:text-primary-800 font-medium"
        >
          {isCustom ? 'Choose a package instead' : 'Need a custom amount?'}
        </button>
        
        {/* Purchase button */}
        <div className="mt-8">
          <button
            onClick={handlePurchase}
            disabled={isLoading}
            className="btn-primary btn-lg w-full flex items-center justify-center"
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <CreditCard className="h-5 w-5 mr-2" />
            )}
            Purchase {isCustom ? customCredits : creditPackages[selectedPackage].credits} Credits
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreditPurchase;