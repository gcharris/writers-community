import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { worksApi } from '../api/client';
import { useAuthStore } from '../stores/authStore';

interface Work {
  id: string;
  title: string;
  genre: string;
  summary: string;
  word_count: number;
  created_at: string;
}

export function Browse() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorks = async () => {
      try {
        const response = await worksApi.list();
        setWorks(response.data);
      } catch (err) {
        console.error('Failed to load works:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorks();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Writers Community</h1>
            <nav className="space-x-4">
              {isAuthenticated() ? (
                <>
                  <Link to="/upload" className="text-blue-600 hover:text-blue-700 font-medium">
                    Upload Work
                  </Link>
                  <button onClick={logout} className="text-red-600 hover:text-red-700 font-medium">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                    Login
                  </Link>
                  <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                    Register
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Published Works</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600">Loading works...</div>
          </div>
        ) : works.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600 mb-4">No published works yet</div>
            {isAuthenticated() && (
              <Link
                to="/upload"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Be the first to upload!
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {works.map((work) => (
              <Link
                key={work.id}
                to={`/works/${work.id}`}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">{work.title}</h3>
                {work.genre && (
                  <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full mb-3">
                    {work.genre}
                  </span>
                )}
                {work.summary && (
                  <p className="text-gray-600 mb-3 line-clamp-3">{work.summary}</p>
                )}
                <div className="text-sm text-gray-500">
                  {work.word_count} words • {new Date(work.created_at).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
