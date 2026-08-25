import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDeletePolicy, useAddComment, usePolicyAnalysis, usePolicyComments } from '../../hooks/usePolicies';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import toast from 'react-hot-toast';
import { MapPin, Calendar, Trash2, Repeat, Activity, MessageSquare } from 'lucide-react';


export const PolicyCard = ({ policy, onRepost }) => {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  const { mutate: deletePolicy, isPending: isDeleting } = useDeletePolicy();
  const { mutate: addComment, isPending: isCommenting } = useAddComment();
  const { data: analysis, isLoading: isAnalysisLoading } = usePolicyAnalysis(showAnalysis ? (policy.id || policy._id) : null);

  const [showComments, setShowComments] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);
  const { data: commentsData, isLoading: isCommentsLoading } = usePolicyComments(
    showComments ? (policy.id || policy._id) : null,
    commentsPage,
    5
  );

  const isGovernment = user?.role === 'govt';
  const isAdmin = user?.role === 'admin';
  const ownsPolicy = isGovernment && policy.author_email === user?.email;
  const canDelete = isAdmin || ownsPolicy;
  const canViewAnalysis = isGovernment && (user?.department_name === 'Central' || user?.department_name?.toLowerCase() === policy.category?.toLowerCase());

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
        setCommentsPage(1);
        setShowComments(true);
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
        
        {canViewAnalysis && (
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
                    {(() => {
                      const posCount = analysis.analysis?.positive_count || 0;
                      const negCount = analysis.analysis?.negative_count || 0;
                      const neuCount = analysis.analysis?.neutral_count || 0;
                      const total = posCount + negCount + neuCount || 1;
                      const posPct = (posCount / total) * 100;
                      const negPct = (negCount / total) * 100;
                      const neuPct = (neuCount / total) * 100;

                      return (
                        <div className="bg-white border border-slate-100 rounded shadow-sm p-5">
                          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-4 tracking-wider">Sentiment Breakdown</h4>
                          <div className="w-full h-3 flex rounded-full overflow-hidden bg-slate-100">
                            {posPct > 0 && <div style={{ width: `${posPct}%` }} className="bg-emerald-500 transition-all duration-500" title={`Positive: ${posCount}`} />}
                            {neuPct > 0 && <div style={{ width: `${neuPct}%` }} className="bg-slate-400 transition-all duration-500" title={`Neutral: ${neuCount}`} />}
                            {negPct > 0 && <div style={{ width: `${negPct}%` }} className="bg-red-500 transition-all duration-500" title={`Negative: ${negCount}`} />}
                          </div>
                          <div className="flex justify-between items-center mt-4 text-sm font-medium text-slate-600">
                            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Positive ({posCount})</span>
                            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Neutral ({neuCount})</span>
                            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Negative ({negCount})</span>
                          </div>
                        </div>
                      );
                    })()}
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 cursor-pointer select-none" onClick={() => setShowComments(!showComments)}>
            <MessageSquare className="w-4 h-4 text-slate-400" />
            Public replies ({policy.comment_count || 0})
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setShowComments(!showComments)} className="h-8 text-xs">
            {showComments ? 'Hide Replies' : 'Show Replies'}
          </Button>
        </div>
        
        {showComments && (
          <>
            {isCommentsLoading ? (
              <div className="animate-pulse space-y-4 mb-4">
                <div className="h-16 bg-slate-200 rounded-lg w-full"></div>
                <div className="h-16 bg-slate-200 rounded-lg w-full"></div>
              </div>
            ) : (
              <div className="space-y-4 mb-4">
                {commentsData?.items?.length > 0 ? (
                  commentsData.items.map((c, index) => (
                    <div key={`${c.author_email}-${c.created_at}-${index}`} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {c.author_email.charAt(0).toUpperCase()}
                          </div>
                          <p className="font-medium text-sm text-slate-900">{c.author_email}</p>
                        </div>
                        {showAnalysis && c.sentiment && (
                          <Badge variant={c.sentiment.toUpperCase() === 'POSITIVE' ? 'success' : c.sentiment.toUpperCase() === 'NEGATIVE' ? 'destructive' : 'default'} className="capitalize">
                            {c.sentiment.toLowerCase()}
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-700 text-sm ml-8 leading-relaxed">{c.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 py-2">No replies yet.</p>
                )}
              </div>
            )}

            {commentsData?.pages > 1 && (
              <div className="flex items-center justify-between gap-4 ml-8 mb-5">
                <span className="text-xs text-slate-500">Page {commentsPage} of {commentsData.pages}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={commentsPage <= 1}
                    onClick={() => setCommentsPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={commentsPage >= commentsData.pages}
                    onClick={() => setCommentsPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {user?.role === 'public' && (
          <form onSubmit={handleComment} className="flex gap-3 ml-8 mt-2">
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
