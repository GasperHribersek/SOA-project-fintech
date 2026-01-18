"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, TrendingUp, Clock, RefreshCw } from "lucide-react";
import { isAuthenticated, getUser } from "@/lib/auth";
import { toast } from "sonner";

interface EndpointStatistic {
  id: number;
  endpoint: string;
  call_count: number;
  last_called: string;
  first_called: string;
}

interface StatisticsResponse {
  total_endpoints: number;
  total_calls: number;
  statistics: EndpointStatistic[];
}

export default function StatisticsPage() {
  const router = useRouter();
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [lastCalled, setLastCalled] = useState<EndpointStatistic | null>(null);
  const [mostFrequent, setMostFrequent] = useState<EndpointStatistic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Statistics service URL - Deployed on Railway
  const STATS_SERVICE_URL = process.env.NEXT_PUBLIC_STATS_SERVICE_URL || 'https://selfless-perception-production.up.railway.app';

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all statistics
      const allStatsResponse = await fetch(`${STATS_SERVICE_URL}/api/stats/all?sort_by=call_count&order=desc`);
      if (allStatsResponse.ok) {
        const allStatsData = await allStatsResponse.json();
        setStatistics(allStatsData);
      }

      // Fetch last called endpoint
      const lastCalledResponse = await fetch(`${STATS_SERVICE_URL}/api/stats/last-called`);
      if (lastCalledResponse.ok) {
        const lastCalledData = await lastCalledResponse.json();
        setLastCalled(lastCalledData);
      }

      // Fetch most frequent endpoint
      const mostFrequentResponse = await fetch(`${STATS_SERVICE_URL}/api/stats/most-frequent`);
      if (mostFrequentResponse.ok) {
        const mostFrequentData = await mostFrequentResponse.json();
        setMostFrequent(mostFrequentData);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError('Failed to load statistics');
      setLoading(false);
      toast.error('Failed to load statistics');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('sl-SI', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getEndpointColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-teal-500',
      'bg-indigo-500',
      'bg-red-500',
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/user"
              className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Dashboard</span>
            </Link>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">API Statistics</h1>
            </div>
            <button
              onClick={fetchStatistics}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Last Called Endpoint */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Last Called</h2>
            </div>
            {lastCalled ? (
              <div>
                <p className="text-sm font-mono text-gray-700 bg-gray-50 p-2 rounded mb-2 break-all">
                  {lastCalled.endpoint}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(lastCalled.last_called)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Total calls: {lastCalled.call_count}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>

          {/* Most Frequent Endpoint */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Most Frequent</h2>
            </div>
            {mostFrequent ? (
              <div>
                <p className="text-sm font-mono text-gray-700 bg-gray-50 p-2 rounded mb-2 break-all">
                  {mostFrequent.endpoint}
                </p>
                <p className="text-2xl font-bold text-green-600 mb-1">
                  {mostFrequent.call_count} calls
                </p>
                <p className="text-xs text-gray-500">
                  Last: {formatDate(mostFrequent.last_called)}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>

          {/* Total Statistics */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
            </div>
            {statistics ? (
              <div>
                <div className="mb-3">
                  <p className="text-2xl font-bold text-purple-600">
                    {statistics.total_calls}
                  </p>
                  <p className="text-xs text-gray-500">Total API Calls</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-700">
                    {statistics.total_endpoints}
                  </p>
                  <p className="text-xs text-gray-500">Unique Endpoints</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>
        </div>

        {/* Detailed Statistics Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">
              Endpoint Call Statistics
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Detailed breakdown of API calls per endpoint
            </p>
          </div>

          {statistics && statistics.statistics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Endpoint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Call Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Called
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      First Called
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {statistics.statistics.map((stat, index) => {
                    const percentage = statistics.total_calls > 0
                      ? ((stat.call_count / statistics.total_calls) * 100).toFixed(1)
                      : '0.0';

                    return (
                      <tr key={stat.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${getEndpointColor(index)} text-white font-bold text-sm`}>
                              {index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-mono text-gray-900 break-all">
                            {stat.endpoint}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            {stat.call_count}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getEndpointColor(index)}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{percentage}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs text-gray-500">
                            {formatDate(stat.last_called)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs text-gray-500">
                            {formatDate(stat.first_called)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No statistics available yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Statistics will appear here once your APIs start receiving calls
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
