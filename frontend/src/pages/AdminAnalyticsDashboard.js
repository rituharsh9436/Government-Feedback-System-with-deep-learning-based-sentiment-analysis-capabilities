import React, { useState } from 'react';
import { 
  useAdminAnalyticsOverview, 
  useAdminAnalyticsTrends, 
  useAdminAnalyticsPolicies, 
  useAdminAnalyticsConfidence 
} from '../hooks/useAdminAnalytics';
import SentimentDistributionChart from '../components/charts/SentimentDistributionChart';
import TrendLineChart from '../components/charts/TrendLineChart';
import ConfidenceDistributionChart from '../components/charts/ConfidenceDistributionChart';

const AdminAnalyticsDashboard = () => {
  const [department, setDepartment] = useState('');
  const [dateRange, setDateRange] = useState('all'); // all, 7d, 30d, 90d

  // Derive date bounds
  const getDates = () => {
    if (dateRange === 'all') return { dateFrom: null, dateTo: null };
    const dateTo = new Date();
    const dateFrom = new Date();
    if (dateRange === '7d') dateFrom.setDate(dateFrom.getDate() - 7);
    if (dateRange === '30d') dateFrom.setDate(dateFrom.getDate() - 30);
    if (dateRange === '90d') dateFrom.setDate(dateFrom.getDate() - 90);
    return { 
      dateFrom: dateFrom.toISOString(), 
      dateTo: dateTo.toISOString() 
    };
  };

  const { dateFrom, dateTo } = getDates();
  const params = { department: department || undefined, dateFrom, dateTo };

  const { data: overview, isLoading: loadingOverview, isError: errorOverview } = useAdminAnalyticsOverview(params);
  const { data: trends, isLoading: loadingTrends, isError: errorTrends } = useAdminAnalyticsTrends(params);
  const { data: policies, isLoading: loadingPolicies, isError: errorPolicies } = useAdminAnalyticsPolicies(params);
  const { data: confidence, isLoading: loadingConfidence, isError: errorConfidence } = useAdminAnalyticsConfidence(params);

  // Safe fallbacks to prevent runtime crashes
  const safeOverview = overview || {
    total_feedback: 0,
    average_confidence: 0,
    sentiment: { positive_percentage: 0, negative_percentage: 0, neutral_percentage: 0 }
  };
  const safeTrends = Array.isArray(trends) ? trends : [];
  const safePolicies = Array.isArray(policies) ? policies : [];
  const safeConfidence = Array.isArray(confidence) ? confidence : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Admin Sentiment Analytics</h1>
          <div className="flex gap-4">
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 py-1"
            >
              <option value="">All Departments</option>
              <option value="Central">Central (Cross-department)</option>
              <option value="Health">Health</option>
              <option value="Education">Education</option>
              <option value="Transport">Transport</option>
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 py-1"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* KPI Overview */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col justify-center items-center text-center">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Feedback</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {errorOverview ? 'Error' : loadingOverview ? '...' : (safeOverview.total_feedback || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col justify-center items-center text-center">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Avg Confidence</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {errorOverview ? 'Error' : loadingOverview ? '...' : ((safeOverview.average_confidence || 0) * 100).toFixed(0) + '%'}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col justify-center items-center text-center">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Positive</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {errorOverview ? 'Error' : loadingOverview ? '...' : `${safeOverview.sentiment?.positive_percentage || 0}%`}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col justify-center items-center text-center">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Negative</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {errorOverview ? 'Error' : loadingOverview ? '...' : `${safeOverview.sentiment?.negative_percentage || 0}%`}
            </p>
          </div>
        </section>

        {/* Charts Row 1 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Distribution</h2>
            {errorOverview ? (
              <div className="h-80 flex items-center justify-center text-red-500">Failed to load data</div>
            ) : loadingOverview ? (
              <div className="h-80 flex items-center justify-center text-gray-400">Loading...</div>
            ) : (
              <div className="h-80">
                <SentimentDistributionChart data={safeOverview.sentiment} />
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Trend</h2>
            {errorTrends ? (
              <div className="h-80 flex items-center justify-center text-red-500">Failed to load trend data</div>
            ) : loadingTrends ? (
              <div className="h-80 flex items-center justify-center text-gray-400">Loading...</div>
            ) : (
              <TrendLineChart data={safeTrends} />
            )}
          </div>
        </section>

        {/* Charts Row 2 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">ML Confidence Distribution</h2>
            <p className="text-sm text-gray-500 mb-6">Scores closer to 1.0 indicate high confidence in the prediction.</p>
            {errorConfidence ? (
              <div className="h-80 flex items-center justify-center text-red-500">Failed to load confidence data</div>
            ) : loadingConfidence ? (
              <div className="h-80 flex items-center justify-center text-gray-400">Loading...</div>
            ) : (
              <ConfidenceDistributionChart data={safeConfidence} />
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h2>
            <div className="space-y-4">
              {errorPolicies ? (
                <div className="text-red-500 text-center py-8">Failed to load alerts</div>
              ) : loadingPolicies ? (
                <div className="text-gray-400 text-center py-8">Loading alerts...</div>
              ) : safePolicies.filter(p => p.status === 'Mostly Negative').length > 0 ? (
                safePolicies.filter(p => p.status === 'Mostly Negative').slice(0, 3).map(policy => (
                  <div key={policy.id} className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                    <span className="text-red-500 text-xl mt-1">⚠️</span>
                    <div>
                      <h4 className="font-semibold text-red-900">{policy.title}</h4>
                      <p className="text-sm text-red-700">{policy.negative_percentage}% negative sentiment from {policy.total_feedback} feedback items.</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-center py-8">No significant negative sentiment alerts detected.</div>
              )}
            </div>
          </div>
        </section>

        {/* Data Table */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Policy Sentiment Drill-down</h2>
            <span className="text-sm font-medium text-gray-500 px-3 py-1 bg-gray-100 rounded-full">{safePolicies.length} Policies</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Policy Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pos %</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Neg %</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {errorPolicies ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-red-500">Failed to load policy data</td>
                  </tr>
                ) : loadingPolicies ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">Loading policy data...</td>
                  </tr>
                ) : safePolicies.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No policies found for this period.</td>
                  </tr>
                ) : (
                  safePolicies.map((policy) => (
                    <tr key={policy.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 max-w-xs truncate" title={policy.title}>
                        {policy.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{policy.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{policy.total_feedback}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{policy.positive_percentage}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">{policy.negative_percentage}%</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${policy.status === 'Mostly Positive' ? 'bg-green-100 text-green-800' : 
                            policy.status === 'Mostly Negative' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                          {policy.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
};

export default AdminAnalyticsDashboard;
