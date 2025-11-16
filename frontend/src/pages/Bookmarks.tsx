import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';

interface Bookmark {
  id: string;
  work_id: string;
  work_title: string;
  work_author_username: string;
  work_genre: string | null;
  work_summary: string | null;
  work_word_count: number;
  created_at: string;
}

export function Bookmarks() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      const response = await apiClient.get('/engagement/bookmarks');
      setBookmarks(response.data.bookmarks);
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBookmark = async (workId: string) => {
    try {
      await apiClient.delete(`/engagement/bookmarks/${workId}`);
      setBookmarks(bookmarks.filter(b => b.work_id !== workId));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to remove bookmark');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-gray-900">Writers Community</Link>
            <nav className="space-x-4">
              <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">Browse</Link>
              <Link to="/profile/me" className="text-blue-600 hover:text-blue-700 font-medium">Profile</Link>
              <Link to="/bookmarks" className="text-blue-600 hover:text-blue-700 font-medium">Bookmarks</Link>
              <Link to="/upload" className="text-blue-600 hover:text-blue-700 font-medium">Upload</Link>
              <button onClick={logout} className="text-red-600 hover:text-red-700 font-medium">Logout</button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Bookmarks</h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600">Loading bookmarks...</div>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-xl text-gray-600 mb-4">No bookmarks yet</div>
            <p className="text-gray-500 mb-6">
              Bookmark works you want to read later by clicking the bookmark button on any work.
            </p>
            <Link
              to="/"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Browse Works
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookmarks.map((bookmark) => (
              <div key={bookmark.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start">
                  <Link to={`/works/${bookmark.work_id}`} className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600">
                      {bookmark.work_title}
                    </h3>
                    <div className="text-sm text-gray-600 mb-2">
                      by {bookmark.work_author_username}
                    </div>
                    {bookmark.work_genre && (
                      <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full mb-3">
                        {bookmark.work_genre}
                      </span>
                    )}
                    {bookmark.work_summary && (
                      <p className="text-gray-600 mb-3 line-clamp-2">{bookmark.work_summary}</p>
                    )}
                    <div className="text-sm text-gray-500">
                      {bookmark.work_word_count} words • Bookmarked on{' '}
                      {new Date(bookmark.created_at).toLocaleDateString()}
                    </div>
                  </Link>

                  <button
                    onClick={() => handleRemoveBookmark(bookmark.work_id)}
                    className="ml-4 text-red-600 hover:text-red-700 font-medium text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
