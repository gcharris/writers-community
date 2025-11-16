import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { worksApi } from '../api/client';
import { useAuthStore } from '../stores/authStore';

interface Work {
  id: string;
  title: string;
  genre: string;
  content: string;
  summary: string;
  word_count: number;
  created_at: string;
  author_id: string;
}

export function ViewWork() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchWork = async () => {
      try {
        const response = await worksApi.get(id!);
        setWork(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load work');
      } finally {
        setLoading(false);
      }
    };

    fetchWork();
  }, [id]);

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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="text-blue-600 hover:text-blue-700">&larr; Back to Browse</Link>
          <div className="space-x-4">
            <Link to="/upload" className="text-blue-600 hover:text-blue-700">Upload Work</Link>
            <button onClick={logout} className="text-red-600 hover:text-red-700">Logout</button>
          </div>
        </div>

        <article className="bg-white rounded-lg shadow-md p-8">
          <header className="mb-8 border-b pb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{work.title}</h1>
            <div className="flex gap-4 text-sm text-gray-600">
              {work.genre && <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{work.genre}</span>}
              <span>{work.word_count} words</span>
              <span>{new Date(work.created_at).toLocaleDateString()}</span>
            </div>
            {work.summary && (
              <p className="mt-4 text-gray-700 italic">{work.summary}</p>
            )}
          </header>

          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
              {work.content}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
