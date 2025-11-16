import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';

interface Work {
  id: string;
  title: string;
  description: string;
  genre: string;
  word_count: number;
  author_username: string;
  average_rating: number;
  rating_count: number;
  view_count: number;
  created_at: string;
}

export function ProfessionalDiscover() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();

  const [filters, setFilters] = useState({
    genres: '',
    min_word_count: '',
    max_word_count: '',
    min_rating: '',
    min_views: '',
  });

  const { data: works, isLoading, refetch } = useQuery<Work[]>({
    queryKey: ['professional-discover', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.genres) params.append('genres', filters.genres);
      if (filters.min_word_count) params.append('min_word_count', filters.min_word_count);
      if (filters.max_word_count) params.append('max_word_count', filters.max_word_count);
      if (filters.min_rating) params.append('min_rating', filters.min_rating);
      if (filters.min_views) params.append('min_views', filters.min_views);

      const res = await apiClient.get(`/professional/discover?${params.toString()}`);
      return res.data;
    },
  });

  if (!isAuthenticated()) {
    navigate('/login');
    return null;
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    refetch();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-gray-900">Writers Community</Link>
            <nav className="space-x-4">
              <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">Browse</Link>
              <Link to="/professional/discover" className="text-blue-600 hover:text-blue-700 font-medium">Discover Talent</Link>
              <Link to="/professional/inbox" className="text-blue-600 hover:text-blue-700 font-medium">Inbox</Link>
              <Link to="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">Dashboard</Link>
              <button onClick={logout} className="text-red-600 hover:text-red-700 font-medium">Logout</button>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Discover Talent</h1>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Search Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Genres (comma-separated)</label>
              <input
                type="text"
                value={filters.genres}
                onChange={(e) => handleFilterChange('genres', e.target.value)}
                placeholder="e.g., Fantasy, Science Fiction"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Word Count</label>
              <input
                type="number"
                value={filters.min_word_count}
                onChange={(e) => handleFilterChange('min_word_count', e.target.value)}
                placeholder="e.g., 50000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Word Count</label>
              <input
                type="number"
                value={filters.max_word_count}
                onChange={(e) => handleFilterChange('max_word_count', e.target.value)}
                placeholder="e.g., 120000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Rating</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={filters.min_rating}
                onChange={(e) => handleFilterChange('min_rating', e.target.value)}
                placeholder="e.g., 4.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Views</label>
              <input
                type="number"
                value={filters.min_views}
                onChange={(e) => handleFilterChange('min_views', e.target.value)}
                placeholder="e.g., 100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600">Loading works...</div>
          </div>
        ) : !works || works.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-xl text-gray-600 mb-4">No works found</div>
            <p className="text-gray-500">
              Try adjusting your search filters to discover more talent.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {works.map((work) => (
              <div key={work.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link
                        to={`/works/${work.id}`}
                        className="text-2xl font-bold text-gray-900 hover:text-blue-600"
                      >
                        {work.title}
                      </Link>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {work.genre}
                      </span>
                    </div>

                    <Link
                      to={`/profile/${work.author_username}`}
                      className="text-gray-600 hover:text-blue-600 mb-3 inline-block"
                    >
                      by {work.author_username}
                    </Link>

                    <p className="text-gray-700 mb-4 line-clamp-3">{work.description}</p>

                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <span>{work.word_count.toLocaleString()} words</span>
                      <span>
                        ⭐ {work.average_rating.toFixed(1)} ({work.rating_count} ratings)
                      </span>
                      <span>{work.view_count} views</span>
                      <span className="text-gray-400">
                        {new Date(work.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="ml-6">
                    <Link
                      to={`/works/${work.id}`}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium inline-block"
                    >
                      View Work
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
