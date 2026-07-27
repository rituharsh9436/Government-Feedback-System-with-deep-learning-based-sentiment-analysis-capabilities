import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePolicies, useOverallAnalysis } from '../hooks/usePolicies';
import { PolicyCard } from '../features/policies/PolicyCard';
import { PolicyForm } from '../features/policies/PolicyForm';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export const FeedPage = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ keyword: '', recent: false, sort: 'newest', dateFrom: '', dateTo: '' });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [repostSource, setRepostSource] = useState(null);
  const [showOverallAnalysis, setShowOverallAnalysis] = useState(false);

  // Use a simple timeout for debouncing filters
  // In a real app, use a proper useDebounce hook
  const handleFilterChange = (updates) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    setTimeout(() => setDebouncedFilters(newFilters), 300);
  };

  const { data: policies, isLoading } = usePolicies(debouncedFilters);
  const { data: overallAnalysis, isLoading: isAnalysisLoading } = useOverallAnalysis();

  const isGovernment = user?.role === 'govt';

  return (
    <div className="max-w-4xl mx-auto">
      {isGovernment && (
        <section className="mb-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {repostSource ? 'Repost policy with updates' : 'Government Actions'}
            </h2>
            <Button 
              variant="outline" 
              onClick={() => setShowOverallAnalysis(!showOverallAnalysis)}
            >
              {showOverallAnalysis ? 'Hide Analysis' : 'Overall Feedback Analysis'}
            </Button>
          </div>

          {showOverallAnalysis && (
            <div className="card mb-6 bg-primary-50 border-primary-100">
              {isAnalysisLoading ? (
                <p>Loading analysis...</p>
              ) : (
                overallAnalysis && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Overall Policy Sentiment</h3>
                    <div className="grid grid-cols-3 gap-4 text-center mt-4">
                      <div className="p-4 bg-white rounded-lg shadow-sm">
                        <div className="text-3xl font-bold text-primary-600">{overallAnalysis.policy_count}</div>
                        <div className="text-sm text-slate-600 mt-1">Total Policies</div>
                      </div>
                      <div className="p-4 bg-white rounded-lg shadow-sm">
                        <div className="text-3xl font-bold text-primary-600">{overallAnalysis.comment_count}</div>
                        <div className="text-sm text-slate-600 mt-1">Total Replies</div>
                      </div>
                      <div className="p-4 bg-white rounded-lg shadow-sm">
                        <div className="text-xl font-bold text-slate-800 capitalize mt-2">{overallAnalysis.analysis_status}</div>
                        <div className="text-sm text-slate-600 mt-1">Status</div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          <PolicyForm 
            initialPolicy={repostSource} 
            onCancel={repostSource ? () => setRepostSource(null) : null}
            onSuccess={() => setRepostSource(null)}
          />
        </section>
      )}

      <section className="card mb-8 bg-slate-50">
        <h3 className="font-semibold mb-4 text-slate-700">Filter & Search</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <Input 
            className="flex-1 min-w-[200px] mb-0"
            placeholder="Search policies..." 
            value={filters.keyword} 
            onChange={(e) => handleFilterChange({ keyword: e.target.value })} 
          />
          <div className="form-group mb-0">
            <select 
              className="form-input"
              value={filters.sort} 
              onChange={(e) => handleFilterChange({ sort: e.target.value })}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="most_replied">Most replied</option>
            </select>
          </div>
          <div className="flex items-center gap-2 h-10 px-4 bg-white border border-slate-200 rounded-md">
            <input 
              type="checkbox" 
              id="recent"
              checked={filters.recent} 
              onChange={(e) => handleFilterChange({ recent: e.target.checked })} 
            />
            <label htmlFor="recent" className="text-sm cursor-pointer select-none">Last 7 days</label>
          </div>
        </div>
      </section>

      <section aria-busy={isLoading}>
        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Loading policies...</div>
        ) : policies?.length > 0 ? (
          policies.map((policy) => (
            <PolicyCard 
              key={policy._id} 
              policy={policy} 
              onRepost={setRepostSource} 
            />
          ))
        ) : (
          <div className="text-center py-12 card bg-slate-50 text-slate-500">
            No policies match your current filters.
          </div>
        )}
      </section>
    </div>
  );
};
