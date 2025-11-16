import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';

interface WorkStat {
  work_id: string;
  title: string;
  views: number;
  reads: number;
  comments: number;
  ratings: number;
  average_rating: number;
  bookmarks: number;
}

interface DashboardStats {
  total_works: number;
  total_views: number;
  total_reads: number;
  total_ratings: number;
  average_rating: number;
  total_followers: number;
  work_stats: WorkStat[];
}

interface Activity {
  type: string;
  message: string;
  timestamp: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/stats');
      return res.data;
    },
  });

  const { data: activity } = useQuery<Activity[]>({
    queryKey: ['dashboard-activity'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/activity?days=7');
      return res.data;
    },
  });

  if (!isAuthenticated()) {
    navigate('/login');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-gray-900">Writers Community</Link>
            <nav className="space-x-4">
              <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">Browse</Link>
              <Link to="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">Dashboard</Link>
              <Link to="/profile/me" className="text-blue-600 hover:text-blue-700 font-medium">Profile</Link>
              <Link to="/upload" className="text-blue-600 hover:text-blue-700 font-medium">Upload</Link>
              <button onClick={logout} className="text-red-600 hover:text-red-700 font-medium">Logout</button>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Writer Dashboard</h1>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm mb-1">Total Works</div>
            <div className="text-3xl font-bold text-gray-900">{stats?.total_works || 0}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm mb-1">Total Views</div>
            <div className="text-3xl font-bold text-gray-900">
              {stats?.total_views?.toLocaleString() || 0}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm mb-1">Total Reads</div>
            <div className="text-3xl font-bold text-gray-900">
              {stats?.total_reads?.toLocaleString() || 0}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm mb-1">Average Rating</div>
            <div className="text-3xl font-bold text-gray-900">
              {stats?.average_rating?.toFixed(1) || '0.0'} ⭐
            </div>
          </div>
        </div>

        {/* Individual Work Stats */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Works</h2>

          {!stats?.work_stats || stats.work_stats.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">You haven't published any works yet</p>
              <Link
                to="/upload"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                Upload Your First Work
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Title</th>
                    <th className="text-right p-2">Views</th>
                    <th className="text-right p-2">Reads</th>
                    <th className="text-right p-2">Comments</th>
                    <th className="text-right p-2">Rating</th>
                    <th className="text-right p-2">Bookmarks</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.work_stats.map((work) => (
                    <tr key={work.work_id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <Link
                          to={`/works/${work.work_id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {work.title}
                        </Link>
                      </td>
                      <td className="text-right p-2">{work.views}</td>
                      <td className="text-right p-2">{work.reads}</td>
                      <td className="text-right p-2">{work.comments}</td>
                      <td className="text-right p-2">
                        {work.average_rating.toFixed(1)} ({work.ratings})
                      </td>
                      <td className="text-right p-2">{work.bookmarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Activity (Last 7 Days)</h2>

          {!activity || activity.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No recent activity</div>
          ) : (
            <div className="space-y-3">
              {activity.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.type === 'comment' ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}
                    ></span>
                    <span>{item.message}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
