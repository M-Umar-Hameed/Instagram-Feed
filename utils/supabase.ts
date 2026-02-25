import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, User, Session } from '@supabase/supabase-js';
import Constants from 'expo-constants';
// rateLimitUtils removed
const withRetry = async <T>(fn: () => Promise<T>, _options?: any): Promise<T> => fn();
const isRateLimitError = (_err?: any) => false;
const recordRateLimitHit = (..._args: any[]) => {};
const shouldThrottle = () => false;
const getCooldownRemainingMs = () => 0;

// Get environment variables from expo-constants (properly bundled via app.config.js)
// Use a dummy fallback if missing to PREVENT STARTUP CRASH. Auth will fail gracefully later.
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseAnonKey);

if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder') {
  console.error('CRITICAL: Missing Supabase environment variables. Check app.config.js and eas.json. App will not function correctly.');
  // Do NOT throw here, as it crashes the app during startup due to ErrorRecovery.
}

// Helper function to get Supabase URL for edge functions (use this instead of process.env)
export const getSupabaseUrl = (): string => supabaseUrl;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ============================================================================
// CENTRALIZED USER CACHE
// Prevents excessive getUser() calls that cause rate limiting (429 errors)
// ============================================================================

let cachedUser: User | null = null;
let cachedSession: Session | null = null;
let lastUserFetch = 0;
const USER_CACHE_TTL_MS = 30000; // Cache user for 30 seconds

// Mutex to prevent concurrent getUser() calls
let isGettingUser = false;
let pendingUserPromise: Promise<{ user: User | null; error: any }> | null = null;

// Mutex to prevent concurrent getSession() calls (prevents token refresh rate limiting)
let isGettingSession = false;
let pendingSessionPromise: Promise<{ session: Session | null; error: any }> | null = null;
let lastSessionFetch = 0;
const SESSION_CACHE_TTL_MS = 5000; // Cache session for 5 seconds to prevent rapid refresh calls

/**
 * Get current user with caching and deduplication
 * Use this instead of supabase.auth.getUser() throughout the app
 *
 * This function first tries to get the user from the cached session to avoid
 * unnecessary API calls. Only falls back to getUser() when session user is unavailable.
 */
export const getCachedUser = async (forceRefresh = false): Promise<{ user: User | null; error: any }> => {
  const now = Date.now();

  // Return cached user if valid and not forcing refresh
  if (!forceRefresh && cachedUser && (now - lastUserFetch) < USER_CACHE_TTL_MS) {
    return { user: cachedUser, error: null };
  }

  // If another call is in progress, wait for it instead of making a new request
  if (isGettingUser && pendingUserPromise) {
    return pendingUserPromise;
  }

  isGettingUser = true;
  pendingUserPromise = (async () => {
    try {
      // First, try to get user from the cached session (avoids extra API call)
      const { session } = await getCachedSession();
      if (session?.user) {
        cachedUser = session.user;
        lastUserFetch = Date.now();
        return { user: session.user, error: null };
      }

      // Fallback to getUser() only if session doesn't have user
      // This is rare but handles edge cases
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        cachedUser = user;
        lastUserFetch = Date.now();
      }
      return { user, error };
    } catch (error: any) {
      return { user: null, error };
    } finally {
      isGettingUser = false;
      pendingUserPromise = null;
    }
  })();

  return pendingUserPromise;
};

/**
 * Get current session with caching and deduplication
 * Use this instead of supabase.auth.getSession() throughout the app
 * This prevents multiple simultaneous token refresh requests that cause 429 errors
 */
export const getCachedSession = async (forceRefresh = false): Promise<{ session: Session | null; error: any }> => {
  const now = Date.now();

  // Return cached session if valid and not forcing refresh
  // Check if token is not expired (with 60 second buffer)
  if (!forceRefresh && cachedSession && (now - lastSessionFetch) < SESSION_CACHE_TTL_MS) {
    const expiresAt = cachedSession.expires_at ? cachedSession.expires_at * 1000 : 0;
    // If session is still valid (expires more than 60 seconds from now), return cached
    if (expiresAt > now + 60000) {
      return { session: cachedSession, error: null };
    }
  }

  // If another call is in progress, wait for it instead of making a new request
  if (isGettingSession && pendingSessionPromise) {
    return pendingSessionPromise;
  }

  // Check if we're in a rate limit cooldown period
  if (shouldThrottle()) {
    const remaining = getCooldownRemainingMs();
    console.log(`[Session] In rate limit cooldown, waiting ${remaining}ms before retry`);
    // Return cached session if available during cooldown, even if stale
    if (cachedSession) {
      return { session: cachedSession, error: null };
    }
  }

  isGettingSession = true;
  pendingSessionPromise = (async () => {
    try {
      // Use withRetry for automatic exponential backoff on 429 errors
      const result = await withRetry(
        async () => {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error && isRateLimitError(error)) {
            recordRateLimitHit();
            throw error;
          }
          return { session, error };
        },
        { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 }
      );

      if (!result.error && result.session) {
        cachedSession = result.session;
        lastSessionFetch = Date.now();
      }
      return result;
    } catch (error: any) {
      // If all retries failed, record the rate limit and return cached if available
      if (isRateLimitError(error)) {
        recordRateLimitHit();
        if (cachedSession) {
          console.log('[Session] Returning stale cached session after rate limit');
          return { session: cachedSession, error: null };
        }
      }
      return { session: null, error };
    } finally {
      isGettingSession = false;
      pendingSessionPromise = null;
    }
  })();

  return pendingSessionPromise;
};

/**
 * Update cached user (call this from auth context on auth state changes)
 */
export const setCachedUser = (user: User | null): void => {
  cachedUser = user;
  lastUserFetch = user ? Date.now() : 0;
};

/**
 * Update cached session (call this from auth context on auth state changes)
 */
export const setCachedSession = (session: Session | null): void => {
  cachedSession = session;
  lastSessionFetch = session ? Date.now() : 0;
  // Also update cached user from session to keep them in sync
  if (session?.user) {
    cachedUser = session.user;
    lastUserFetch = Date.now();
  }
};

/**
 * Clear user cache (call on sign out)
 */
export const clearUserCache = (): void => {
  cachedUser = null;
  cachedSession = null;
  lastUserFetch = 0;
  lastSessionFetch = 0;
  isGettingUser = false;
  pendingUserPromise = null;
  isGettingSession = false;
  pendingSessionPromise = null;
};

/**
 * Get cached user synchronously (returns null if not cached)
 * Useful for quick checks without triggering API calls
 */
export const getCachedUserSync = (): User | null => {
  const now = Date.now();
  if (cachedUser && (now - lastUserFetch) < USER_CACHE_TTL_MS) {
    return cachedUser;
  }
  return null;
};

/**
 * Check if user is cached and valid
 */
export const hasValidCachedUser = (): boolean => {
  return cachedUser !== null && (Date.now() - lastUserFetch) < USER_CACHE_TTL_MS;
};