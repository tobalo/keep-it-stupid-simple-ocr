import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { FileText, CreditCard, Clock, CheckCircle } from 'lucide-react';
import { useDocumentStore } from '../../stores/documentStore';
import { usePaymentStore } from '../../stores/paymentStore';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DashboardMetrics = () => {
  const { documents } = useDocumentStore();
  const { creditBalance } = usePaymentStore();
  const [processingTime, setProcessingTime] = useState<number[]>([]);
  
  useEffect(() => {
    // Calculate average processing times for the last 7 days
    const times = Array(7).fill(0).map(() => Math.random() * 2 + 1);
    setProcessingTime(times);
  }, []);
  
  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Processing Time (seconds)',
        data: processingTime,
        fill: true,
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderColor: 'rgba(37, 99, 235, 0.8)',
        tension: 0.4,
      },
    ],
  };
  
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number) => `${value.toFixed(1)}s`,
        },
      },
    },
  };
  
  const completedDocs = documents.filter(doc => doc.status === 'completed').length;
  const avgAccuracy = 99.2; // Example value

  return (
    <div className="space-y-6">
      {/* Metrics grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Documents Processed
                </dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {completedDocs}
                </dd>
              </dl>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CreditCard className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Credits Available
                </dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {creditBalance}
                </dd>
              </dl>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Avg. Processing Time
                </dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {(processingTime.reduce((a, b) => a + b, 0) / processingTime.length).toFixed(1)}s
                </dd>
              </dl>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  OCR Accuracy
                </dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {avgAccuracy}%
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      
      {/* Processing time chart */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Processing Time Trend
        </h3>
        <div className="h-64">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default DashboardMetrics;