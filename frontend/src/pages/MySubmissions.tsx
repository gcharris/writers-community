import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';

interface Submission {
  id: string;
  work_id: string;
  author_id: string;
  professional_id: string;
  status: string;
  message: string | null;
  response: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  responded_at: string | null;
  work_title: string | null;
  author_username: string | null;
}

export function MySubmissions() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();

  const { data: submissions, isLoading } = useQuery<Submission[]>({
    queryKey: ['my-submissions'],
    queryFn: async () => {
      const res = await apiClient.get('/professional/submissions');
      return res.data;
    },
  });

  if (!isAuthenticated()) {
    navigate('/login');
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewing':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
              <Link to="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">Dashboard</Link>
              <Link to="/my-submissions" className="text-blue-600 hover:text-blue-700 font-medium">My Submissions</Link>
              <Link to="/profile/me" className="text-blue-600 hover:text-blue-700 font-medium">Profile</Link>
              <button onClick={logout} className="text-red-600 hover:text-red-700 font-medium">Logout</button>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Submissions to Professionals</h1>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600">Loading submissions...</div>
          </div>
        ) : !submissions || submissions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-xl text-gray-600 mb-4">No submissions yet</div>
            <p className="text-gray-500 mb-6">
              You haven't submitted any works to professionals yet. When you find agents, editors, or publishers interested in your genre, you can submit your work directly to them.
            </p>
            <Link
              to="/"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Browse Works
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map((submission) => (
              <div key={submission.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link
                        to={`/works/${submission.work_id}`}
                        className="text-xl font-bold text-gray-900 hover:text-blue-600"
                      >
                        {submission.work_title}
                      </Link>
                      <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(submission.status)}`}>
                        {submission.status}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 mb-3">
                      Submitted on {new Date(submission.submitted_at).toLocaleDateString()} at{' '}
                      {new Date(submission.submitted_at).toLocaleTimeString()}
                    </div>

                    {submission.message && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700">Your pitch:</p>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded mt-1">{submission.message}</p>
                      </div>
                    )}

                    {submission.response && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700">Professional's response:</p>
                        <p className="text-gray-700 bg-blue-50 p-3 rounded mt-1 border-l-4 border-blue-600">
                          {submission.response}
                        </p>
                        {submission.responded_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Responded on {new Date(submission.responded_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

                    {submission.reviewed_at && !submission.responded_at && (
                      <div className="text-sm text-blue-600 mb-2">
                        Under review since {new Date(submission.reviewed_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="ml-6">
                    <Link
                      to={`/works/${submission.work_id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm inline-block"
                    >
                      View Work
                    </Link>
                  </div>
                </div>

                {submission.status === 'accepted' && (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-green-800 font-medium">
                      Congratulations! This submission was accepted. The professional may reach out to you directly.
                    </p>
                  </div>
                )}

                {submission.status === 'declined' && !submission.response && (
                  <div className="bg-gray-50 border border-gray-200 rounded p-3">
                    <p className="text-gray-700">
                      This submission was not selected at this time. Keep writing and submitting!
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
