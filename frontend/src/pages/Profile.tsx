import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';

interface Profile {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  website: string | null;
  role: string;
  works_count: number;
  followers_count: number;
  following_count: number;
  created_at: string;
  is_following: boolean | null;
}

interface Work {
  id: string;
  title: string;
  genre: string | null;
  word_count: number;
  rating_average: number;
  rating_count: number;
  views_count: number;
  created_at: string;
}

export function Profile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    bio: '',
    location: '',
    website: '',
  });

  useEffect(() => {
    fetchProfile();
    fetchWorks();
  }, [username]);

  const fetchProfile = async () => {
    try {
      const endpoint = username === 'me' || !username ? '/profile/me' : `/profile/${username}`;
      const response = await apiClient.get(endpoint);
      setProfile(response.data);
      setIsOwnProfile(username === 'me' || !username);
      setEditData({
        bio: response.data.bio || '',
        location: response.data.location || '',
        website: response.data.website || '',
      });
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      if (err.response?.status === 404) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchWorks = async () => {
    try {
      const actualUsername = username === 'me' || !username ? profile?.username : username;
      if (!actualUsername && (!profile || !profile.username)) return;

      const response = await apiClient.get(`/profile/${actualUsername || profile?.username}/works`);
      setWorks(response.data.works);
    } catch (err) {
      console.error('Failed to load works:', err);
    }
  };

  const handleFollow = async () => {
    if (!profile) return;

    try {
      if (profile.is_following) {
        await apiClient.delete(`/profile/${profile.username}/follow`);
        setProfile({ ...profile, is_following: false, followers_count: profile.followers_count - 1 });
      } else {
        await apiClient.post(`/profile/${profile.username}/follow`);
        setProfile({ ...profile, is_following: true, followers_count: profile.followers_count + 1 });
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update follow status');
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const response = await apiClient.put('/profile/me', editData);
      setProfile(response.data);
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Profile not found</div>
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
              {isAuthenticated() && (
                <>
                  <Link to="/profile/me" className="text-blue-600 hover:text-blue-700 font-medium">Profile</Link>
                  <Link to="/bookmarks" className="text-blue-600 hover:text-blue-700 font-medium">Bookmarks</Link>
                  <Link to="/upload" className="text-blue-600 hover:text-blue-700 font-medium">Upload</Link>
                  <button onClick={logout} className="text-red-600 hover:text-red-700 font-medium">Logout</button>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex gap-6">
              <div className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center text-4xl font-bold">
                {profile.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.username}</h1>
                <div className="flex gap-6 text-sm text-gray-600 mb-3">
                  <div><span className="font-semibold">{profile.works_count}</span> works</div>
                  <div><span className="font-semibold">{profile.followers_count}</span> followers</div>
                  <div><span className="font-semibold">{profile.following_count}</span> following</div>
                </div>
                {!isEditing && profile.bio && <p className="text-gray-700 mb-2">{profile.bio}</p>}
                {!isEditing && profile.location && <p className="text-gray-600 text-sm">📍 {profile.location}</p>}
                {!isEditing && profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">
                    🔗 {profile.website}
                  </a>
                )}
              </div>
            </div>

            <div>
              {isOwnProfile ? (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium"
                >
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              ) : isAuthenticated() && (
                <button
                  onClick={handleFollow}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    profile.is_following
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {profile.is_following ? 'Unfollow' : 'Follow'}
                </button>
              )}
            </div>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className="mt-6 border-t pt-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={editData.bio}
                    onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Tell us about yourself..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={editData.location}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="City, Country"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={editData.website}
                    onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>
                <button
                  onClick={handleUpdateProfile}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Works */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Published Works</h2>

          {works.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              {isOwnProfile ? "You haven't published any works yet" : "No published works yet"}
            </div>
          ) : (
            <div className="space-y-4">
              {works.map((work) => (
                <Link
                  key={work.id}
                  to={`/works/${work.id}`}
                  className="block bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{work.title}</h3>
                      {work.genre && (
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mb-2">
                          {work.genre}
                        </span>
                      )}
                      <div className="text-sm text-gray-600">
                        {work.word_count} words
                        {work.rating_count > 0 && ` • ⭐ ${work.rating_average.toFixed(1)} (${work.rating_count})`}
                        {' • 👁 '}{work.views_count} views
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(work.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
