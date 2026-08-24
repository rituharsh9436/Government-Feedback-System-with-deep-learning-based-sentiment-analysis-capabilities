import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePolicies, useOverallAnalysis } from '../hooks/usePolicies';
import { PolicyCard } from '../features/policies/PolicyCard';
import { PolicyForm } from '../features/policies/PolicyForm';
import { Button } from '../components/common/Button';
import { useDebounce } from '../hooks/useDebounce';
import { Search, Filter, CalendarClock, ChevronLeft, ChevronRight, FileText, BarChart3, List } from 'lucide-react';
import { SentimentDistributionChart } from '../components/charts/SentimentDistributionChart';
import { FeedbackOverTimeChart } from '../components/charts/FeedbackOverTimeChart';
import { CategoryFeedbackChart } from '../components/charts/CategoryFeedbackChart';
import { SentimentScoreChart } from '../components/charts/SentimentScoreChart';

const DEPARTMENTS = ["Health", "Education", "Defense", "Transportation", "Central", "Finance", "Infrastructure"];

const DepartmentFilter = ({ selected = [], onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = (dept) => {
    if (dept === "") {
      onChange([]);
      setIsOpen(false);
      return;
    }
    
    if (selected.includes(dept)) {
      onChange(selected.filter(d => d !== dept));
    } else {
      onChange([...selected, dept]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-10 pl-9 pr-4 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all hover:bg-slate-50"
      >
        <Filter className="absolute left-3 w-4 h-4 text-slate-400" />
        <span className="truncate max-w-[120px]">
          {selected.length === 0 ? "All Departments" : selected.join(', ')}
        </span>
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-50 py-1">
          <label className="flex items-center px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm">
            <input 
              type="checkbox" 
              className="mr-2"
              checked={selected.length === 0}
              onChange={() => handleToggle("")} 
            />
            All Departments
          </label>
          <div className="h-px bg-slate-100 my-1"></div>
          {DEPARTMENTS.map(dept => (
            <label key={dept} className="flex items-center px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm">
              <input 
                type="checkbox" 
                className="mr-2"
                checked={selected.includes(dept)}
                onChange={() => handleToggle(dept)} 
              />
              {dept}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export const FeedPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ keyword: '', department: [], sortName: '', sortPopularity: '', recent: false, sortDate: 'newest', dateFrom: '', dateTo: '', page: 1, limit: 10 });
  const debouncedFilters = useDebounce(filters, 400);

  const [repostSource, setRepostSource] = useState(null);
  
  const isGovernment = user?.role === 'govt';
  const [activeTab, setActiveTab] = useState(isGovernment ? 'publish' : 'view');

  const handleFilterChange = (updates) => {
    setFilters(prev => ({ ...prev, ...updates, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleRepost = (policy) => {
    setRepostSource(policy);
    setActiveTab('publish');
  };

  const { data, isLoading } = usePolicies(debouncedFilters);
  const { data: overallAnalysis, isLoading: isAnalysisLoading } = useOverallAnalysis();

  const policies = data?.items || [];
  const totalPages = data?.pages || 1;

  const availableTabs = [
    ...(isGovernment ? [
      { id: 'publish', label: 'Publish Policy', icon: FileText },
      { id: 'analysis', label: 'Analysis Dashboard', icon: BarChart3 },
    ] : []),
    { id: 'view', label: 'View Policies', icon: List }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {availableTabs.length > 1 && (
        <div className="flex space-x-1 bg-slate-100/80 p-1 rounded-lg">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'publish' && isGovernment && (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {repostSource ? 'Repost Policy' : 'Publish Policy'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Publish new policies and gather public sentiment.
            </p>
          </div>
          
          <PolicyForm 
            initialPolicy={repostSource} 
            onCancel={repostSource ? () => setRepostSource(null) : null}
            onSuccess={() => {
              setRepostSource(null);
              setActiveTab('view');
            }}
          />
        </section>
      )}

      {activeTab === 'analysis' && isGovernment && (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Analysis Dashboard
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {user?.department_name === 'Central' 
                ? 'Overall Analysis — All Departments' 
                : `Overall Analysis — ${user?.department_name || 'Department'}`}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6">
              {isAnalysisLoading ? (
                <div className="animate-pulse flex space-x-4">
                  <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 rounded"></div>
                      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              ) : (
                overallAnalysis && (
                  <div className="space-y-8">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <span className="text-sm font-medium text-slate-500">Total Policies</span>
                        <p className="text-2xl font-bold text-primary-600 mt-1">{overallAnalysis.policy_count}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <span className="text-sm font-medium text-slate-500">Public Feedback</span>
                        <p className="text-2xl font-bold text-primary-600 mt-1">{overallAnalysis.comment_count}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <span className="text-sm font-medium text-slate-500">Overall Sentiment</span>
                        <p className="text-lg font-bold text-slate-800 capitalize mt-1">{overallAnalysis.overall_sentiment || 'Neutral'}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <span className="text-sm font-medium text-slate-500">Status</span>
                        <p className="text-lg font-bold text-slate-800 capitalize mt-1">Active</p>
                      </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div 
                        className="space-y-3 cursor-pointer group"
                        onClick={() => navigate('/analysis/sentiment-distribution')}
                      >
                        <h4 className="text-sm font-semibold text-slate-700 group-hover:text-primary-600 transition-colors">Sentiment Distribution</h4>
                        <div className="bg-white border border-slate-100 rounded-lg p-4 shadow-sm h-64 group-hover:shadow-md transition-shadow ring-1 ring-transparent group-hover:ring-primary-100">
                          <SentimentDistributionChart data={overallAnalysis.sentiment_distribution} />
                        </div>
                      </div>
                      
                      <div 
                        className="space-y-3 cursor-pointer group"
                        onClick={() => navigate('/analysis/feedback-over-time')}
                      >
                        <h4 className="text-sm font-semibold text-slate-700 group-hover:text-primary-600 transition-colors">Feedback Over Time</h4>
                        <div className="bg-white border border-slate-100 rounded-lg p-4 shadow-sm h-64 group-hover:shadow-md transition-shadow ring-1 ring-transparent group-hover:ring-primary-100">
                          <FeedbackOverTimeChart data={overallAnalysis.feedback_over_time} />
                        </div>
                      </div>

                      <div 
                        className="space-y-3 cursor-pointer group"
                        onClick={() => navigate('/analysis/category-comparison')}
                      >
                        <h4 className="text-sm font-semibold text-slate-700 group-hover:text-primary-600 transition-colors">Category Comparison</h4>
                        <div className="bg-white border border-slate-100 rounded-lg p-4 shadow-sm h-64 group-hover:shadow-md transition-shadow ring-1 ring-transparent group-hover:ring-primary-100">
                          <CategoryFeedbackChart data={overallAnalysis.category_comparison} />
                        </div>
                      </div>

                      <div 
                        className="space-y-3 cursor-pointer group"
                        onClick={() => navigate('/analysis/sentiment-score')}
                      >
                        <h4 className="text-sm font-semibold text-slate-700 group-hover:text-primary-600 transition-colors">ML Confidence (Sentiment Score)</h4>
                        <div className="bg-white border border-slate-100 rounded-lg p-4 shadow-sm h-64 group-hover:shadow-md transition-shadow ring-1 ring-transparent group-hover:ring-primary-100">
                          <SentimentScoreChart data={overallAnalysis.sentiment_scores} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'view' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sticky top-[72px] z-30 space-y-4">
            <div className="flex flex-col gap-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  className="w-full h-10 pl-9 pr-4 rounded-md border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-slate-400"
                  placeholder="Search policies by keyword..." 
                  value={filters.keyword} 
                  onChange={(e) => handleFilterChange({ keyword: e.target.value })} 
                />
              </div>
              
              <div className="flex items-center gap-3 w-full flex-wrap">
                <DepartmentFilter 
                  selected={filters.department}
                  onChange={(newDept) => handleFilterChange({ department: newDept })}
                />

                <div className="relative flex items-center">
                  <select 
                    className="h-10 pl-4 pr-8 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none cursor-pointer hover:bg-slate-50"
                    value={filters.sortDate} 
                    onChange={(e) => handleFilterChange({ sortDate: e.target.value })}
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </div>
                
                <div className="relative flex items-center">
                  <select 
                    className="h-10 pl-4 pr-8 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none cursor-pointer hover:bg-slate-50"
                    value={filters.sortName} 
                    onChange={(e) => handleFilterChange({ sortName: e.target.value })}
                  >
                    <option value="">Name (None)</option>
                    <option value="asc">Name (A-Z)</option>
                    <option value="desc">Name (Z-A)</option>
                  </select>
                </div>
                
                <div className="relative flex items-center">
                  <select 
                    className="h-10 pl-4 pr-8 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none cursor-pointer hover:bg-slate-50"
                    value={filters.sortPopularity} 
                    onChange={(e) => handleFilterChange({ sortPopularity: e.target.value })}
                  >
                    <option value="">Popularity (None)</option>
                    <option value="most_replied">Most replied</option>
                    <option value="least_replied">Least replied</option>
                  </select>
                </div>
                
                <label className="flex items-center gap-2 h-10 px-4 bg-white border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 transition-colors select-none group">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    checked={filters.recent} 
                    onChange={(e) => handleFilterChange({ recent: e.target.checked })} 
                  />
                  <CalendarClock className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">7 Days</span>
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-slate-100 pt-4">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <span className="text-sm font-medium text-slate-500">Date Range:</span>
                <input 
                  type="date" 
                  className="h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
                  disabled={filters.recent}
                  title={filters.recent ? "Disable '7 Days' filter to select custom dates" : "Start Date"}
                />
                <span className="text-sm text-slate-400">to</span>
                <input 
                  type="date" 
                  className="h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
                  disabled={filters.recent}
                  title={filters.recent ? "Disable '7 Days' filter to select custom dates" : "End Date"}
                />
              </div>
              {(filters.dateFrom || filters.dateTo) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleFilterChange({ dateFrom: '', dateTo: '' })}
                  className="text-slate-500 hover:text-slate-800"
                >
                  Clear Dates
                </Button>
              )}
            </div>
          </section>

          <section aria-busy={isLoading} className="space-y-6">
            {isLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                      <div className="flex-1 space-y-3 py-1">
                        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                      </div>
                    </div>
                    <div className="mt-6 space-y-3">
                      <div className="h-4 bg-slate-200 rounded w-full"></div>
                      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : policies.length > 0 ? (
              <div className="space-y-6">
                {policies.map((policy) => (
                  <PolicyCard 
                    key={policy.id || policy._id} 
                    policy={policy} 
                    onRepost={handleRepost} 
                  />
                ))}
                
                {totalPages > 1 && (
                  <div className="flex justify-between items-center py-6 border-t border-slate-200 mt-8">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={filters.page <= 1}
                      onClick={() => handlePageChange(filters.page - 1)}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </Button>
                    <span className="text-sm font-medium text-slate-600">
                      Page {filters.page} of {totalPages}
                    </span>
                    <Button 
                      variant="outline"
                      size="sm"
                      disabled={filters.page >= totalPages}
                      onClick={() => handlePageChange(filters.page + 1)}
                      className="flex items-center gap-1"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
                <Search className="w-10 h-10 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No policies found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm text-center">
                  We couldn't find anything matching your current filters. Try adjusting your search terms.
                </p>
                {(filters.keyword || filters.recent) && (
                  <Button 
                    variant="ghost" 
                    className="mt-4"
                    onClick={() => setFilters(prev => ({ ...prev, keyword: '', department: [], sortName: '', sortPopularity: '', recent: false, dateFrom: '', dateTo: '', sortDate: 'newest', page: 1, limit: 10 }))}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

