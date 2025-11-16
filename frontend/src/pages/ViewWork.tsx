import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useReadingTracker } from '../hooks/useReadingTracker';

interface Work {
  id: string;
  title: string;
  genre: string;
  content: string;
  summary: string;
  word_count: number;
  created_at: string;
  author_id: string;
  rating_average: number;
  rating_count: number;
  comment_count: number;
}

interface Comment {
  id: string;
  username: string;
  content: string;
  created_at: string;
}

export function ViewWork() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, logout } = useAuthStore();
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [canInteract, setCanInteract] = useState({ canComment: false, canRate: false });
  const [validationMessage, setValidationMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);

  const { metrics, completeSession } = useReadingTracker(id!);

  useEffect(() => {
    const fetchWork = async () => {
      try {
        const response = await apiClient.get(`/works/${id}`);
        setWork(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load work');
      } finally {
        setLoading(false);
      }
    };

    fetchWork();
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated()) return;

    const fetchComments = async () => {
      try {
        const response = await apiClient.get(`/comments/works/${id}`);
        setComments(response.data);
      } catch (err) {
        console.error('Failed to load comments:', err);
      }
    };

    const checkValidation = async () => {
      try {
        const response = await apiClient.get(`/reading/validation/${id}`);
        setCanInteract({
          canComment: response.data.can_comment,
          canRate: response.data.can_rate,
        });
        setValidationMessage(response.data.message);
      } catch (err) {
        console.error('Failed to check validation:', err);
      }
    };

    const checkBookmark = async () => {
      try {
        const response = await apiClient.get(`/engagement/bookmarks/check/${id}`);
        setIsBookmarked(response.data.is_bookmarked);
      } catch (err) {
        console.error('Failed to check bookmark:', err);
      }
    };

    fetchComments();
    checkValidation();
    checkBookmark();
  }, [id, isAuthenticated]);

  const handleCompleteReading = async () => {
    const result = await completeSession();
    if (result) {
      alert(result.message);
      setCanInteract({
        canComment: result.can_comment,
        canRate: result.can_rate,
      });
      setValidationMessage(result.message);
    }
  };

  const handleSubmitComment = async () => {
    if (!canInteract.canComment) {
      alert('You must read the work to unlock commenting');
      return;
    }

    try {
      await apiClient.post(`/comments/works/${id}`, { content: commentContent });
      setCommentContent('');
      setShowCommentForm(false);

      // Refresh comments
      const response = await apiClient.get(`/comments/works/${id}`);
      setComments(response.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit comment');
    }
  };

  const handleSubmitRating = async () => {
    if (!canInteract.canRate) {
      alert('You must read the entire work to unlock rating');
      return;
    }

    try {
      await apiClient.post(`/ratings/works/${id}`, { score: rating, review });
      alert('Rating submitted successfully!');
      setRating(0);
      setReview('');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit rating');
    }
  };

  const handleToggleBookmark = async () => {
    try {
      if (isBookmarked) {
        await apiClient.delete(`/engagement/bookmarks/${id}`);
        setIsBookmarked(false);
        alert('Bookmark removed');
      } else {
        await apiClient.post(`/engagement/bookmarks/${id}`);
        setIsBookmarked(true);
        alert('Work bookmarked!');
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update bookmark');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !work) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">{error || 'Work not found'}</div>
          <Link to="/" className="text-blue-600 hover:text-blue-700">Back to Browse</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Reading Progress Indicator */}
      {isAuthenticated() && metrics.isTracking && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-3 text-sm z-50 shadow-md">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div>
              📖 Reading tracked: {metrics.timeOnPage}s · Scroll: {metrics.scrollDepth}%
            </div>
            <button
              onClick={handleCompleteReading}
              className="bg-white text-blue-600 px-4 py-1 rounded font-medium hover:bg-gray-100"
            >
              Finish Reading
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 pt-20">
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="text-blue-600 hover:text-blue-700">&larr; Back to Browse</Link>
          <div className="flex items-center gap-4">
            {isAuthenticated() && (
              <button
                onClick={handleToggleBookmark}
                className={`px-4 py-2 rounded-lg font-medium ${
                  isBookmarked
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {isBookmarked ? '🔖 Bookmarked' : '🔖 Bookmark'}
              </button>
            )}
            {isAuthenticated() ? (
              <>
                <Link to="/upload" className="text-blue-600 hover:text-blue-700">Upload Work</Link>
                <button onClick={logout} className="text-red-600 hover:text-red-700">Logout</button>
              </>
            ) : (
              <Link to="/login" className="text-blue-600 hover:text-blue-700">Login to Comment</Link>
            )}
          </div>
        </div>

        {/* Work Content */}
        <article className="bg-white rounded-lg shadow-md p-8 mb-8">
          <header className="mb-8 border-b pb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{work.title}</h1>
            <div className="flex gap-4 text-sm text-gray-600 flex-wrap">
              {work.genre && <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{work.genre}</span>}
              <span>{work.word_count} words</span>
              <span>{new Date(work.created_at).toLocaleDateString()}</span>
              {work.rating_count > 0 && (
                <span>⭐ {work.rating_average.toFixed(1)} ({work.rating_count} ratings)</span>
              )}
            </div>
            {work.summary && (
              <p className="mt-4 text-gray-700 italic bg-gray-50 p-4 rounded">{work.summary}</p>
            )}
          </header>

          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-lg">
              {work.content}
            </div>
          </div>
        </article>

        {/* Comments Section */}
        {isAuthenticated() && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4">Comments ({comments.length})</h2>

            {!canInteract.canComment && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="text-yellow-800 font-medium">
                  🔒 {validationMessage || 'Read the work to unlock commenting'}
                </p>
              </div>
            )}

            {canInteract.canComment && (
              <button
                onClick={() => setShowCommentForm(!showCommentForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded mb-4 hover:bg-blue-700"
              >
                {showCommentForm ? 'Cancel' : 'Add Comment'}
              </button>
            )}

            {showCommentForm && (
              <div className="mb-6 border border-gray-200 rounded p-4">
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Share your thoughts..."
                />
                <button
                  onClick={handleSubmitComment}
                  className="bg-blue-600 text-white px-4 py-2 rounded mt-2 hover:bg-blue-700"
                >
                  Submit Comment
                </button>
              </div>
            )}

            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 p-4 rounded border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-gray-900">{comment.username}</div>
                    <div className="text-gray-500 text-sm">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rating Section */}
        {isAuthenticated() && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold mb-4">Rate This Work</h2>

            {!canInteract.canRate && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="text-yellow-800 font-medium">
                  🔒 {validationMessage || 'Read the entire work to unlock rating'}
                </p>
              </div>
            )}

            {canInteract.canRate && (
              <div className="border border-gray-200 rounded p-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Rating
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`text-3xl ${
                          star <= rating ? 'text-yellow-400' : 'text-gray-300'
                        } hover:text-yellow-400`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review (Optional)
                  </label>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Write a review..."
                  />
                </div>

                <button
                  onClick={handleSubmitRating}
                  disabled={rating === 0}
                  className={`px-4 py-2 rounded ${
                    rating > 0
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Submit Rating
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
