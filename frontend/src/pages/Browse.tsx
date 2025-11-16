import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';

interface Work {
  id: string;
  title: string;
  author_username: string;
  genre: string;
  summary: string;
  word_count: number;
  rating_average: number;
  rating_count: number;
  bookmarks_count: number;
  views_count: number;
  created_at: string;
}

interface Genre {
  genre: string;
  count: number;
  avg_rating: number;
}

export function Browse() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState<Genre[]>([]);

  // Filters
  const [selectedGenre, setSelectedGenre] = useState('');
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  useEffect(() => {
    fetchGenres();
  }, []);

  useEffect(() => {
    fetchWorks();
  }, [selectedGenre, minRating, sortBy, sortOrder, page]);

  const fetchGenres = async () => {
    try {
      const response = await apiClient.get('/browse/genres');
      setGenres(response.data);
    } catch (err) {
      console.error('Failed to load genres:', err);
    }
  };

  const fetchWorks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      if (selectedGenre) params.append('genre', selectedGenre);
      if (minRating) params.append('min_rating', minRating);

      const response = await apiClient.get(`/browse/works?${params}`);
      setWorks(response.data.works);
      setTotal(response.data.total);
      setTotalPages(response.data.total_pages);
    } catch (err) {
      console.error('Failed to load works:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchWorks();
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        search_in: 'title,summary',
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      if (selectedGenre) params.append('genre', selectedGenre);
      if (minRating) params.append('min_rating', minRating);

      const response = await apiClient.get(`/browse/search?${params}`);
      setWorks(response.data.works);
      setTotal(response.data.total);
      setTotalPages(response.data.total_pages);
    } catch (err) {
      console.error('Failed to search works:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedGenre('');
    setMinRating('');
    setSortBy('created_at');
    setSortOrder('desc');
    setSearchQuery('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Writers Community</h1>
            <nav className="space-x-4">
              {isAuthenticated() ? (
                <>
                  <Link to="/profile/me" className="text-blue-600 hover:text-blue-700 font-medium">Profile</Link>
                  <Link to="/bookmarks" className="text-blue-600 hover:text-blue-700 font-medium">Bookmarks</Link>
                  <Link to="/upload" className="text-blue-600 hover:text-blue-700 font-medium">Upload Work</Link>
                  <button onClick={logout} className="text-red-600 hover:text-red-700 font-medium">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">Login</Link>
                  <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">Register</Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search works by title or summary..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Search
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
              <select
                value={selectedGenre}
                onChange={(e) => { setSelectedGenre(e.target.value); setPage(1); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Genres</option>
                {genres.map((g) => (
                  <option key={g.genre} value={g.genre}>
                    {g.genre} ({g.count})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Rating</label>
              <select
                value={minRating}
                onChange={(e) => { setMinRating(e.target.value); setPage(1); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any Rating</option>
                <option value="4">4+ stars</option>
                <option value="3">3+ stars</option>
                <option value="2">2+ stars</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="created_at">Newest</option>
                <option value="rating_average">Top Rated</option>
                <option value="views_count">Most Viewed</option>
                <option value="word_count">Word Count</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>

          <div className="mt-3 text-sm text-gray-600">
            Showing {works.length} of {total} works
          </div>
        </div>

        {/* Works Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600">Loading works...</div>
          </div>
        ) : works.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600 mb-4">No works found</div>
            {isAuthenticated() && !searchQuery && (
              <Link
                to="/upload"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Be the first to upload!
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {works.map((work) => (
                <Link
                  key={work.id}
                  to={`/works/${work.id}`}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{work.title}</h3>
                  <div className="text-sm text-gray-600 mb-2">by {work.author_username}</div>
                  {work.genre && (
                    <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full mb-3">
                      {work.genre}
                    </span>
                  )}
                  {work.summary && (
                    <p className="text-gray-600 mb-3 line-clamp-3">{work.summary}</p>
                  )}
                  <div className="text-sm text-gray-500 space-y-1">
                    <div>{work.word_count} words</div>
                    {work.rating_count > 0 && (
                      <div>⭐ {work.rating_average.toFixed(1)} ({work.rating_count} ratings)</div>
                    )}
                    <div>👁 {work.views_count} views • 🔖 {work.bookmarks_count} bookmarks</div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    page === 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    page === totalPages
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
