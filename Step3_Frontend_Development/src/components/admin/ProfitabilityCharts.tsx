import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { TrendingUp, BarChart3, PieChart, RefreshCw } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ProfitabilityData {
  revenue: {
    hourly: number[];
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  payouts: {
    total: number;
    byMethod: { [key: string]: number };
  };
  metrics: {
    profitMargin: number;
    houseEdge: number;
    crashRate: number;
    averageBet: number;
  };
  timeframes: {
    hourly: string[];
    daily: string[];
    weekly: string[];
    monthly: string[];
  };
}

interface ProfitabilityChartsProps {
  refreshInterval?: number;
}

const ProfitabilityCharts: React.FC<ProfitabilityChartsProps> = ({ refreshInterval = 30000 }) => {
  const [data, setData] = useState<ProfitabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTimeframe, setActiveTimeframe] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/v1/admin/profitability/charts');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch profitability data');
      }
    } catch (err) {
      console.error('Error fetching profitability data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh, refreshInterval]);

  const handleRefresh = () => {
    fetchData();
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  if (loading && !data) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mr-3" />
          <span className="text-gray-400">Loading profitability charts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-600 rounded-lg mr-3">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-red-200 font-semibold">Chart Error</h4>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Revenue Trend Chart
  const revenueChartData = {
    labels: data.timeframes[activeTimeframe],
    datasets: [
      {
        label: 'Revenue',
        data: data.revenue[activeTimeframe],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const revenueChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e5e7eb',
        },
      },
      title: {
        display: true,
        text: `Revenue Trend (${activeTimeframe.charAt(0).toUpperCase() + activeTimeframe.slice(1)})`,
        color: '#ffffff',
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#9ca3af',
        },
        grid: {
          color: '#374151',
        },
      },
      y: {
        ticks: {
          color: '#9ca3af',
          callback: function(value: any) {
            return `₣${value.toLocaleString()}`;
          },
        },
        grid: {
          color: '#374151',
        },
      },
    },
  };

  // Payout Methods Chart
  const payoutMethodsData = {
    labels: Object.keys(data.payouts.byMethod),
    datasets: [
      {
        data: Object.values(data.payouts.byMethod),
        backgroundColor: [
          '#3b82f6',
          '#ef4444',
          '#10b981',
          '#f59e0b',
          '#8b5cf6',
          '#06b6d4',
        ],
        borderColor: '#1f2937',
        borderWidth: 2,
      },
    ],
  };

  const payoutMethodsOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#e5e7eb',
        },
      },
      title: {
        display: true,
        text: 'Payouts by Method',
        color: '#ffffff',
      },
    },
  };

  // Metrics Bar Chart
  const metricsData = {
    labels: ['Profit Margin', 'House Edge', 'Crash Rate', 'Avg Bet'],
    datasets: [
      {
        label: 'Percentage',
        data: [
          data.metrics.profitMargin,
          data.metrics.houseEdge,
          data.metrics.crashRate,
          data.metrics.averageBet / 1000, // Convert to thousands
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(245, 158, 11)',
          'rgb(59, 130, 246)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const metricsOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: '#e5e7eb',
        },
      },
      title: {
        display: true,
        text: 'Key Metrics',
        color: '#ffffff',
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#9ca3af',
        },
        grid: {
          color: '#374151',
        },
      },
      y: {
        ticks: {
          color: '#9ca3af',
          callback: function(value: any) {
            return `${value}%`;
          },
        },
        grid: {
          color: '#374151',
        },
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg border border-gray-700 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-600 rounded-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Profitability Analytics</h3>
            <p className="text-sm text-gray-400">Interactive charts and metrics</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={activeTimeframe}
            onChange={(e) => setActiveTimeframe(e.target.value as any)}
            className="px-3 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          
          <button
            onClick={toggleAutoRefresh}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            {autoRefresh ? 'Auto ON' : 'Auto OFF'}
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <TrendingUp className="w-5 h-5 text-green-400 mr-2" />
            <h4 className="text-lg font-semibold text-white">Revenue Trend</h4>
          </div>
          <div className="h-64">
            <Line data={revenueChartData} options={revenueChartOptions} />
          </div>
        </div>

        {/* Payout Methods Chart */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <PieChart className="w-5 h-5 text-blue-400 mr-2" />
            <h4 className="text-lg font-semibold text-white">Payout Methods</h4>
          </div>
          <div className="h-64">
            <Doughnut data={payoutMethodsData} options={payoutMethodsOptions} />
          </div>
        </div>

        {/* Key Metrics Chart */}
        <div className="bg-gray-700 rounded-lg p-4 lg:col-span-2">
          <div className="flex items-center mb-4">
            <BarChart3 className="w-5 h-5 text-purple-400 mr-2" />
            <h4 className="text-lg font-semibold text-white">Key Performance Metrics</h4>
          </div>
          <div className="h-64">
            <Bar data={metricsData} options={metricsOptions} />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Revenue</p>
              <p className="text-xl font-bold text-green-400">
                ₣{data.revenue[activeTimeframe].reduce((a, b) => a + b, 0).toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Payouts</p>
              <p className="text-xl font-bold text-red-400">
                ₣{data.payouts.total.toLocaleString()}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-red-400" />
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Profit Margin</p>
              <p className="text-xl font-bold text-yellow-400">
                {data.metrics.profitMargin}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">House Edge</p>
              <p className="text-xl font-bold text-purple-400">
                {data.metrics.houseEdge}%
              </p>
            </div>
            <PieChart className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfitabilityCharts;
