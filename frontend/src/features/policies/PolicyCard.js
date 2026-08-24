import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDeletePolicy, useAddComment, usePolicyAnalysis } from '../../hooks/usePolicies';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import toast from 'react-hot-toast';
import { MapPin, Calendar, Trash2, Repeat, Activity, MessageSquare } from 'lucide-react';
import { SentimentDistributionChart } from '../../components/charts/SentimentDistributionChart';

export const PolicyCard = ({ policy, onRepost }) => {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  const { mutate: deletePolicy, isPending: isDeleting } = useDeletePolicy();
  const { mutate: addComment, isPending: isCommenting } = useAddComment();
  const { data: analysis, isLoading: isAnalysisLoading } = usePolicyAnalysis(showAnalysis ? policy._id : null);

  const isGovernment = user?.role === 'govt';
  const isAdmin = user?.role === 'admin';
  const ownsPolicy = isGovernment && policy.author_email === user?.email;
  const canDelete = isAdmin || ownsPolicy;

  const handleDelete = () => {
    toast((t) => (
      <div className="flex flex-col">
        <p className="mb-3 text-sm font-medium text-slate-800">Are you sure you want to delete <b className="text-slate-900">{policy.title}</b>?</p>
        <div className="flex gap-2">
          <Button variant="danger" size="sm" onClick={() => {
            deletePolicy(policy.id || policy._id, {
              onSuccess: () => toast.success('Policy deleted'),
              onError: (error) => toast.error(error.message || 'Error deleting policy')
            });
            toast.dismiss(t.id);
          }}>Delete</Button>
          <Button variant="outline" size="sm" onClick={() => toast.dismiss(t.id)}>Cancel</Button>
        </div>
      </div>
    ), { duration: 10000 });
  };

  const handleComment = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    addComment({ id: policy.id || policy._id, content: comment }, {
      onSuccess: () => {
        setComment('');
        toast.success('Reply posted');
      },
      onError: (err) => {
        toast.error(err.message || 'Error posting reply');
      }
    });
  };

  return (
    <article className="bg-white rounded-xl border border-slate-200 shadow-soft overflow-hidden transition-all hover:shadow-md">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1.5">
            <Badge variant="primary" className="mb-2 uppercase tracking-wider text-[10px]">{policy.category}</Badge>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">{policy.title}</h2>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {policy.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(policy.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
          
          {canDelete && (
            <div className="flex gap-2 shrink-0 ml-4">
              {ownsPolicy && (
                <Button variant="outline" size="icon" title="Repost updates" onClick={() => onRepost(policy)}>
                  <Repeat className="w-4 h-4 text-slate-600" />
                </Button>
              )}
              <Button variant="outline" size="icon" title="Delete policy" disabled={isDeleting} onClick={handleDelete} className="hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="prose prose-slate prose-sm max-w-none text-slate-700 leading-relaxed">
          <p className="whitespace-pre-wrap">{policy.description}</p>
        </div>
        
        {ownsPolicy && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            {!showAnalysis ? (
              <Button variant="secondary" size="sm" onClick={() => setShowAnalysis(true)} className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                View Sentiment Analysis
              </Button>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary-500" />
                    Sentiment Analysis
                  </h4>
                  <Button variant="ghost" size="sm" onClick={() => setShowAnalysis(false)} className="h-8 text-xs">Hide</Button>
                </div>
                
                {isAnalysisLoading ? (
                  <div className="animate-pulse flex gap-4">
                    <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                  </div>
                ) : analysis ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white p-3 rounded border border-slate-100 shadow-sm">
                        <span className="text-xs text-slate-500 uppercase font-semibold">Replies Analyzed</span>
                        <p className="text-lg font-bold text-slate-900 mt-1">{analysis.comment_count}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-slate-100 shadow-sm">
                        <span className="text-xs text-slate-500 uppercase font-semibold">Overall</span>
                        <p className="text-lg font-bold text-slate-900 mt-1 capitalize">{analysis.analysis?.overall_sentiment || 'Neutral'}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-slate-100 shadow-sm">
                        <span className="text-xs text-slate-500 uppercase font-semibold">Status</span>
                        <p className="text-lg font-bold text-slate-900 mt-1 capitalize">{analysis.analysis_status}</p>
                      </div>
                    </div>
                    <div className="bg-white border border-slate-100 rounded shadow-sm p-4 h-48">
                      <SentimentDistributionChart data={[
                        { name: 'Positive', value: analysis.analysis?.results?.filter(r => r.label.toUpperCase() === 'POSITIVE').length || 0 },
                        { name: 'Negative', value: analysis.analysis?.results?.filter(r => r.label.toUpperCase() === 'NEGATIVE').length || 0 },
                        { name: 'Neutral', value: analysis.analysis?.results?.filter(r => r.label.toUpperCase() !== 'POSITIVE' && r.label.toUpperCase() !== 'NEGATIVE').length || 0 }
                      ]} />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Failed to load analysis.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-slate-50 px-6 py-5 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-400" />
          Public replies ({policy.comments?.length || 0})
        </h3>
        
        <div className="space-y-4 mb-5">
          {policy.comments?.map((c, index) => (
            <div key={`${c.author_email}-${c.created_at}-${index}`} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                  {c.author_email.charAt(0).toUpperCase()}
                </div>
                <p className="font-medium text-sm text-slate-900">{c.author_email}</p>
              </div>
              <p className="text-slate-700 text-sm ml-8 leading-relaxed">{c.content}</p>
            </div>
          ))}
        </div>

        {user?.role === 'public' && (
          <form onSubmit={handleComment} className="flex gap-3 ml-8">
            <div className="flex-1 relative">
              <Input 
                className="w-full bg-white pr-20"
                required 
                minLength="1" 
                maxLength="2000" 
                placeholder="Share your perspective..." 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isCommenting} className="shrink-0">
              {isCommenting ? 'Posting...' : 'Reply'}
            </Button>
          </form>
        )}
      </div>
    </article>
  );
};
