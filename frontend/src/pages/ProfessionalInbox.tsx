import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export function ProfessionalInbox() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, logout } = useAuthStore();

  const [filter, setFilter] = useState<string>('');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responseStatus, setResponseStatus] = useState<string>('reviewing');

  const { data: submissions, isLoading } = useQuery<Submission[]>({
    queryKey: ['professional-inbox', filter],
    queryFn: async () => {
      const params = filter ? `?status=${filter}` : '';
      const res = await apiClient.get(`/professional/inbox${params}`);
      return res.data;
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, status, response }: { id: string; status: string; response: string }) => {
      await apiClient.put(`/professional/submissions/${id}/respond`, { status, response });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional-inbox'] });
      setSelectedSubmission(null);
      setResponseText('');
      setResponseStatus('reviewing');
    },
  });

  if (!isAuthenticated()) {
    navigate('/login');
    return null;
  }

  const handleRespond = () => {
    if (selectedSubmission) {
      respondMutation.mutate({
        id: selectedSubmission.id,
        status: responseStatus,
        response: responseText,
      });
    }
  };

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
              <Link to="/professional/discover" className="text-blue-600 hover:text-blue-700 font-medium">Discover Talent</Link>
              <Link to="/professional/inbox" className="text-blue-600 hover:text-blue-700 font-medium">Inbox</Link>
              <Link to="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">Dashboard</Link>
              <button onClick={logout} className="text-red-600 hover:text-red-700 font-medium">Logout</button>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Submission Inbox</h1>

        {/* Filter */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex items-center gap-4">
            <label className="font-medium text-gray-700">Filter by status:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="reviewing">Reviewing</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
            </select>
          </div>
        </div>

        {/* Submissions */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600">Loading submissions...</div>
          </div>
        ) : !submissions || submissions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-xl text-gray-600 mb-4">No submissions found</div>
            <p className="text-gray-500">
              Writers will be able to submit their work to you for review.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Submissions ({submissions.length})</h2>
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  onClick={() => setSelectedSubmission(submission)}
                  className={`bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow ${
                    selectedSubmission?.id === submission.id ? 'ring-2 ring-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{submission.work_title}</h3>
                      <p className="text-sm text-gray-600">by {submission.author_username}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(submission.status)}`}>
                      {submission.status}
                    </span>
                  </div>

                  {submission.message && (
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                      <span className="font-medium">Pitch:</span> {submission.message}
                    </p>
                  )}

                  <div className="text-xs text-gray-500">
                    Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Detail Panel */}
            <div className="bg-white rounded-lg shadow-md p-6">
              {selectedSubmission ? (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedSubmission.work_title}</h2>

                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-700">Status: </span>
                    <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(selectedSubmission.status)}`}>
                      {selectedSubmission.status}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Author:</p>
                    <Link
                      to={`/profile/${selectedSubmission.author_username}`}
                      className="text-blue-600 hover:underline"
                    >
                      {selectedSubmission.author_username}
                    </Link>
                  </div>

                  {selectedSubmission.message && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">Writer's Pitch:</p>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded">{selectedSubmission.message}</p>
                    </div>
                  )}

                  {selectedSubmission.response && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">Your Response:</p>
                      <p className="text-gray-700 bg-blue-50 p-3 rounded">{selectedSubmission.response}</p>
                    </div>
                  )}

                  <div className="mb-6">
                    <Link
                      to={`/works/${selectedSubmission.work_id}`}
                      className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
                    >
                      View Work
                    </Link>
                  </div>

                  {/* Response Form */}
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Respond to Submission</h3>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={responseStatus}
                        onChange={(e) => setResponseStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="reviewing">Reviewing</option>
                        <option value="accepted">Accept</option>
                        <option value="declined">Decline</option>
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        rows={4}
                        placeholder="Send a message to the writer..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <button
                      onClick={handleRespond}
                      disabled={respondMutation.isPending}
                      className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                    >
                      {respondMutation.isPending ? 'Sending...' : 'Send Response'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Select a submission to view details and respond
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
