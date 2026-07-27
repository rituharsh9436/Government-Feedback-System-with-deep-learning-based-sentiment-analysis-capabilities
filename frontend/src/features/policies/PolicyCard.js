import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDeletePolicy, useAddComment, usePolicyAnalysis } from '../../hooks/usePolicies';
import { Button } from '../../components/common/Button';

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
    if (window.confirm(`Delete “${policy.title}”?`)) {
      deletePolicy(policy._id);
    }
  };

  const handleComment = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    addComment({ id: policy._id, content: comment }, {
      onSuccess: () => setComment('')
    });
  };

  return (
    <article className="card mb-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="text-sm font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded-full mb-2 inline-block">
            {policy.category}
          </span>
          <h2 className="text-xl font-bold">{policy.title}</h2>
          <p className="text-muted text-sm mt-1">
            {policy.location} · {new Date(policy.created_at).toLocaleDateString()}
          </p>
        </div>
        
        {canDelete && (
          <div className="flex gap-2">
            {ownsPolicy && (
              <Button variant="outline" onClick={() => onRepost(policy)}>
                Repost updates
              </Button>
            )}
            <Button variant="danger" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        )}
      </div>

      <p className="mb-6 whitespace-pre-wrap">{policy.description}</p>
      
      {ownsPolicy && (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-md">
          <Button variant="outline" onClick={() => setShowAnalysis(true)} disabled={showAnalysis || isAnalysisLoading}>
            {isAnalysisLoading ? 'Analyzing...' : 'View Sentiment Analysis'}
          </Button>
          {analysis && (
            <div className="mt-4">
              <p><strong>Replies:</strong> {analysis.comment_count}</p>
              <p><strong>Status:</strong> {analysis.analysis_status}</p>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-slate-200 pt-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">
          Public replies ({policy.comments?.length || 0})
        </h3>
        
        <div className="space-y-4 mb-6">
          {policy.comments?.map((c, index) => (
            <div key={`${c.author_email}-${c.created_at}-${index}`} className="bg-slate-50 p-4 rounded-md">
              <p className="font-semibold text-sm mb-1">{c.author_email}</p>
              <p className="text-slate-800">{c.content}</p>
            </div>
          ))}
        </div>

        {user?.role === 'public' && (
          <form onSubmit={handleComment} className="flex gap-4">
            <input 
              className="form-input flex-1"
              required 
              minLength="1" 
              maxLength="2000" 
              placeholder="Share your feedback" 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button type="submit" disabled={isCommenting}>
              {isCommenting ? 'Posting...' : 'Reply'}
            </Button>
          </form>
        )}
      </div>
    </article>
  );
};
