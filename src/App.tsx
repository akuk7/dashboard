import { useState, useEffect } from 'react';
import { type Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase'; // Your Supabase client setup
import AuthForm from './AuthForm';   // <--- Import the new Auth page
import Dashboard from './Dashboard'; // <--- Your normal content component
import './App.css'; // Assuming you have some global styles

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
      {!session ? (
        // IF NO SESSION: Show the authentication form
        <AuthForm />
      ) : (
        // IF LOGGED IN: Show the normal content (e.g., your Dashboard)
        <Dashboard />
      )}
    </div>
  );
}

export default App;