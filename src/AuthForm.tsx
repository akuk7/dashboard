import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from './lib/supabase'; // Ensure this path is correct

export default function AuthForm() {
  return (
    <div className="w-[90vw] max-w-[400px] md:w-[30vw] md:max-w-none mx-auto md:mx-0 mt-12 p-5">
      <Auth
        // 1. Pass the pre-initialized Supabase client
        supabaseClient={supabase}

        // 2. No OAuth providers are configured, so don't render their buttons
        providers={[]}

        // 3. Define the appearance/theme (dark variant so input text is visible
        //    against this app's black background)
        appearance={{ theme: ThemeSupa }}
        theme="dark"

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