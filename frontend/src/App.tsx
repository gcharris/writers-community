import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { UploadWork } from './pages/UploadWork';
import { ViewWork } from './pages/ViewWork';
import { Browse } from './pages/Browse';

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
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
