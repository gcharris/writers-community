import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { UploadWork } from './pages/UploadWork';
import { ViewWork } from './pages/ViewWork';
import { Browse } from './pages/Browse';
import { Profile } from './pages/Profile';
import { Bookmarks } from './pages/Bookmarks';
import { Dashboard } from './pages/Dashboard';
import { Notifications } from './pages/Notifications';
import { ProfessionalDiscover } from './pages/ProfessionalDiscover';
import { ProfessionalInbox } from './pages/ProfessionalInbox';
import { MySubmissions } from './pages/MySubmissions';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Browse />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/upload" element={<UploadWork />} />
          <Route path="/works/:id" element={<ViewWork />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/profile/me" element={<Profile />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/professional/discover" element={<ProfessionalDiscover />} />
          <Route path="/professional/inbox" element={<ProfessionalInbox />} />
          <Route path="/my-submissions" element={<MySubmissions />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
