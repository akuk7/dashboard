import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { type Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase'; // Your Supabase client setup
import AuthForm from './AuthForm';   // <--- Import the new Auth page
import { useIsMobile } from './hooks/useIsMobile';
import { completeGoogleCalendarConnect } from './lib/googleCalendar';
import './App.css'; // Assuming you have some global styles

const Dashboard = lazy(() => import('./Dashboard'));
const MobileApp = lazy(() => import('./mobile-components/MobileApp'));

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    // 1. Fetch the initial session state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    // Clean up the listener on unmount
    return () => subscription.unsubscribe();
  }, []);

  // Finish the Google Calendar OAuth round-trip if we just came back from Google's consent screen.
  useEffect(() => {
    if (!session) return;
    completeGoogleCalendarConnect()
      .then((done) => { if (done) window.dispatchEvent(new Event('gcal:connected')); })
      .catch((e) => alert(`Google Calendar connection failed: ${e.message}`));
  }, [session]);

  // Show a simple loading state while checking the session
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading Authentication...
      </div>
    );
  }
  return (
    <div className='w-100vw bg-[#000000]'>
      <BrowserRouter>
        <Suspense fallback={<div className="flex justify-center items-center h-screen text-gray-400">Loading...</div>}>
          {!session ? (
            // IF NO SESSION: Show the authentication form
            <AuthForm />
          ) : isMobile ? (
            // IF LOGGED IN ON A PHONE: Show the mobile app shell
            <MobileApp />
          ) : (
            // IF LOGGED IN ON DESKTOP: Show the normal content
            <Dashboard />
          )}
        </Suspense>
      </BrowserRouter>
    </div>
  );
}

export default App;