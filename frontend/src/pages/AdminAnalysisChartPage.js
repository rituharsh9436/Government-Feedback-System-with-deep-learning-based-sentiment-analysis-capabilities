import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../components/common/Button';
import SentimentDistributionChart from '../components/charts/SentimentDistributionChart';
import TrendLineChart from '../components/charts/TrendLineChart';
import ConfidenceDistributionChart from '../components/charts/ConfidenceDistributionChart';
import { 
  useAdminAnalyticsOverview, 
  useAdminAnalyticsTrends, 
  useAdminAnalyticsConfidence 
} from '../hooks/useAdminAnalytics';

const AdminAnalysisChartPage = () => {
  const { chartId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const department = searchParams.get('department') || '';
  const dateRange = searchParams.get('dateRange') || 'all';

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

  const { data: overview, isLoading: loadingOverview } = useAdminAnalyticsOverview(params);
  const { data: trends, isLoading: loadingTrends } = useAdminAnalyticsTrends(params);
  const { data: confidence, isLoading: loadingConfidence } = useAdminAnalyticsConfidence(params);

  const safeOverview = overview || {
    sentiment: { positive: 0, negative: 0, neutral: 0 }
  };
  const safeTrends = Array.isArray(trends) ? trends : [];
  const safeConfidence = Array.isArray(confidence) ? confidence : [];

  const sentimentChartData = [
    { name: 'Positive', value: safeOverview.sentiment?.positive || 0 },
    { name: 'Negative', value: safeOverview.sentiment?.negative || 0 },
    { name: 'Neutral', value: safeOverview.sentiment?.neutral || 0 },
  ];

  const getChartConfig = () => {
    switch (chartId) {
      case 'sentiment-distribution':
        return {
          title: 'Sentiment Distribution',
          description: 'A detailed breakdown of public sentiment.',
          component: SentimentDistributionChart,
          data: sentimentChartData,
          isLoading: loadingOverview
        };
      case 'sentiment-trend':
        return {
          title: 'Sentiment Trend',
          description: 'Historical trend of sentiment.',
          component: TrendLineChart,
          data: safeTrends,
          isLoading: loadingTrends
        };
      case 'confidence-distribution':
        return {
          title: 'ML Confidence Distribution',
          description: 'Scores closer to 1.0 indicate high confidence in the prediction.',
          component: ConfidenceDistributionChart,
          data: safeConfidence,
          isLoading: loadingConfidence
        };
      default:
        return null;
    }
  };

  const config = getChartConfig();

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold text-slate-800">Chart not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const ChartComponent = config.component;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{config.title}</h1>
          <p className="text-slate-500 mt-2">{config.description}</p>
          {department && (
            <p className="text-sm font-medium text-blue-600 mt-1">Department: {department}</p>
          )}
          {dateRange !== 'all' && (
            <p className="text-sm font-medium text-blue-600 mt-1">Time Range: Last {dateRange.replace('d', ' Days')}</p>
          )}
        </div>

        {config.isLoading ? (
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-64 bg-slate-200 rounded w-full"></div>
            </div>
          </div>
        ) : config.data ? (
          <div className="h-[calc(100vh-250px)] min-h-[400px] w-full mt-4">
            <ChartComponent data={config.data} />
          </div>
        ) : (
          <div className="flex justify-center py-20 text-slate-500">No data available</div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalysisChartPage;
