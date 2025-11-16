import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
  actor_username: string | null;
}

export function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, logout } = useAuthStore();

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['all-notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications?limit=50');
      return res.data;
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await apiClient.put('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.put(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  if (!isAuthenticated()) {
    navigate('/login');
    return null;
  }

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

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
              <button onClick={logout} className="text-red-600 hover:text-red-700 font-medium">Logout</button>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Mark all as read ({unreadCount})
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600">Loading notifications...</div>
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-xl text-gray-600 mb-4">No notifications yet</div>
            <p className="text-gray-500">
              We'll notify you when someone comments on your work, follows you, or rates your content.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow-md p-4 ${
                  !notification.read ? 'border-l-4 border-blue-600 bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          notification.type === 'comment'
                            ? 'bg-blue-100 text-blue-800'
                            : notification.type === 'rating'
                            ? 'bg-yellow-100 text-yellow-800'
                            : notification.type === 'follow'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {notification.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(notification.created_at).toLocaleDateString()} at{' '}
                        {new Date(notification.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1">{notification.title}</h3>
                    <p className="text-gray-700">{notification.message}</p>

                    <div className="mt-2 flex items-center gap-4">
                      {notification.link && (
                        <Link
                          to={notification.link}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          onClick={() => {
                            if (!notification.read) {
                              markAsRead.mutate(notification.id);
                            }
                          }}
                        >
                          View →
                        </Link>
                      )}
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead.mutate(notification.id)}
                          className="text-gray-600 hover:text-gray-700 text-sm"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
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
