import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import { Footer, Header } from './components/Layout.jsx';
import { LoadingBlock } from './components/ui.jsx';
import Home from './pages/Home.jsx';

// Everything except the landing page is split out, so the first paint only
// carries what the home route actually needs.
const Hospitals = lazy(() => import('./pages/Hospitals.jsx'));
const HospitalDetail = lazy(() => import('./pages/HospitalDetail.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Intake = lazy(() => import('./pages/Intake.jsx'));
const BookAppointment = lazy(() => import('./pages/BookAppointment.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

export function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <Suspense fallback={<LoadingBlock />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/hospitals" element={<Hospitals />} />
            <Route path="/hospitals/:id" element={<HospitalDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/intake" element={<Intake />} />
            <Route path="/book" element={<BookAppointment />} />
            <Route path="/book/:hospitalId" element={<BookAppointment />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}