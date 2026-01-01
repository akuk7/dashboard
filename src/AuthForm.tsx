import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from './lib/supabase'; // Ensure this path is correct

export default function AuthForm() {
  return (
    <div 
      style={{
        width: '30vw',
  
        marginTop: '50px',
        padding: '20px',
      }}
    >
      <Auth
        // 1. Pass the pre-initialized Supabase client
        supabaseClient={supabase} 
        
        // 2. 💡 FIX: REMOVE the providers prop entirely 
        //    (or set providers={[]}) to show email/password/magic link.
        // providers={['email']} <--- REMOVE THIS LINE
        
        // 3. Define the appearance/theme
        appearance={{ theme: ThemeSupa }}
        
        // 4. Set the initial view 
        view="sign_in" 
        
        // 5. Localization (optional)
        localization={{
          variables: {
            sign_in: {
              email_label: 'Email Address',
              password_label: 'Your Password',
            },
            // You can also add more views like 'sign_up' or 'forgotten_password' here
          },
        }}
      />
    </div>
  );
}