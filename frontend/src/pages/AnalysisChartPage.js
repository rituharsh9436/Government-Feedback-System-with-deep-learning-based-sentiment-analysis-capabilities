import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOverallAnalysis } from '../hooks/usePolicies';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../components/common/Button';
import SentimentDistributionChart from '../components/charts/SentimentDistributionChart';
import { FeedbackOverTimeChart } from '../components/charts/FeedbackOverTimeChart';
import { CategoryFeedbackChart } from '../components/charts/CategoryFeedbackChart';
import { SentimentScoreChart } from '../components/charts/SentimentScoreChart';

export const AnalysisChartPage = () => {
  const { chartId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: overallAnalysis, isLoading } = useOverallAnalysis();

  const getChartConfig = () => {
    switch (chartId) {
      case 'sentiment-distribution':
        return {
          title: 'Sentiment Distribution',
          description: 'A detailed breakdown of public sentiment across all analyzed policies.',
          component: SentimentDistributionChart,
          dataKey: 'sentiment_distribution'
        };
      case 'feedback-over-time':
        return {
          title: 'Feedback Over Time',
          description: 'Historical trend of feedback volume received from the public.',
          component: FeedbackOverTimeChart,
          dataKey: 'feedback_over_time'
        };
      case 'category-comparison':
        return {
          title: user?.department_name === 'Central' ? 'Category Comparison' : 'Policy Comparison',
          description: user?.department_name === 'Central' 
            ? 'Comparison of feedback volume and sentiment across different departments/categories.' 
            : 'Comparison of feedback volume and sentiment across different policies.',
          component: CategoryFeedbackChart,
          dataKey: 'category_comparison'
        };
      case 'sentiment-score':
        return {
          title: 'ML Confidence (Sentiment Score)',
          description: 'Distribution of the ML model\'s confidence scores for sentiment analysis.',
          component: SentimentScoreChart,
          dataKey: 'sentiment_scores'
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
        </div>

        {isLoading ? (
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-64 bg-slate-200 rounded w-full"></div>
            </div>
          </div>
        ) : overallAnalysis ? (
          <div className="h-[calc(100vh-250px)] min-h-[400px] w-full mt-4">
            <ChartComponent data={overallAnalysis[config.dataKey]} />
          </div>
        ) : (
          <div className="flex justify-center py-20 text-slate-500">No data available</div>
        )}
      </div>
    </div>
  );
};
