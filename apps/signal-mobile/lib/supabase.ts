import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Implicit flow: Supabase puts tokens directly in URL fragment so we don't
    // need PKCE code exchange (which requires signal:// to be in Supabase's
    // allowed redirect URLs). The web callback at signalgenie.ai relays the
    // fragment tokens to signal:// which ASWebAuthenticationSession intercepts.
    flowType: 'implicit',
  },
});
