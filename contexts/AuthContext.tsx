import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, setCachedUser, setCachedSession, clearUserCache, getSupabaseUrl } from '../utils/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    // Verify if the user profile actually exists in public.users
                    const { data: profile, error: profileError } = await supabase
                        .from('users')
                        .select('id')
                        .eq('id', session.user.id)
                        .single();

                    if (profileError || !profile) {
                        console.warn('[Auth] Session exists but no public profile found. Attempting to create one...');

                        // Self-healing: Create profile if missing (helps with manual Supabase users)
                        const { error: createError } = await supabase.from('users').upsert({
                            id: session.user.id,
                            username: session.user.email?.split('@')[0] || `user_${session.user.id.slice(0, 5)}`,
                            email: session.user.email,
                            created_at: new Date().toISOString(),
                        });

                        if (createError) {
                            console.error('[Auth] Failed to self-heal profile:', createError);
                            // If we truly can't create a profile, we must sign out to avoid app crashes
                            await clearUserCache();
                            await supabase.auth.signOut();
                            setSession(null);
                            setUser(null);
                        } else {
                            console.log('[Auth] Profile self-healed successfully');
                            setSession(session);
                            setUser(session.user);
                            setCachedSession(session);
                            setCachedUser(session.user);
                        }
                    } else {
                        setSession(session);
                        setUser(session.user);
                        setCachedSession(session);
                        setCachedUser(session.user);
                    }
                }
            } catch (err) {
                console.error('[Auth] Error checking initial session:', err);
            } finally {
                setLoading(false);
            }
        };

        checkSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[Auth] Auth mapping event:', event);

            if (session) {
                // On sign in or initial load, verify profile
                const { data: profile } = await supabase
                    .from('users')
                    .select('id')
                    .eq('id', session.user.id)
                    .single();

                if (!profile && event !== 'SIGNED_OUT') {
                    console.warn('[Auth] No profile found for session user. Attempting to create one...');

                    // Self-healing for missing profiles during sign-in
                    const { error: createError } = await supabase.from('users').upsert({
                        id: session.user.id,
                        username: session.user.email?.split('@')[0] || `user_${session.user.id.slice(0, 5)}`,
                        email: session.user.email,
                        created_at: new Date().toISOString(),
                    });

                    if (createError) {
                        console.error('[Auth] Failed to self-heal profile during sign-in:', createError);
                    } else {
                        console.log('[Auth] Profile self-healed successfully');
                    }
                }

                setSession(session);
                setUser(session.user);
                setCachedSession(session);
                setCachedUser(session.user);
            } else {
                setSession(null);
                setUser(null);
                clearUserCache();
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        console.log('[Auth] Attempting signIn with email:', email);
        if (getSupabaseUrl().includes('placeholder')) {
            const error = { message: 'Supabase is not configured. Please add your credentials to the .env file.' };
            console.error('[Auth] signIn failed: Missing config');
            return { error };
        }
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                console.error('[Auth] signIn error:', error.message);
            } else {
                console.log('[Auth] signIn successful');
            }
            return { error };
        } catch (err: any) {
            console.error('[Auth] signIn unexpected error:', err);
            return { error: err };
        }
    };

    const signUp = async (email: string, password: string, username: string) => {
        console.log('[Auth] Attempting signUp with email:', email, 'username:', username);
        if (getSupabaseUrl().includes('placeholder')) {
            const error = { message: 'Supabase is not configured. Please add your credentials to the .env file.' };
            console.error('[Auth] signUp failed: Missing config');
            return { error };
        }
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { username } },
            });

            if (error) {
                console.error('[Auth] signUp error:', error.message);
                return { error };
            }

            if (data.user) {
                console.log('[Auth] signUp successful, creating profile...');
                // Create user profile in users table
                const { error: profileError } = await supabase.from('users').upsert({
                    id: data.user.id,
                    username,
                    email,
                    created_at: new Date().toISOString(),
                });
                if (profileError) {
                    console.error('[Auth] Error creating user profile:', profileError);
                } else {
                    console.log('[Auth] User profile created successfully');
                }
            }

            return { error: null };
        } catch (err: any) {
            console.error('[Auth] signUp unexpected error:', err);
            return { error: err };
        }
    };

    const signOut = async () => {
        clearUserCache();
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

// This satisfies Expo Router's requirement for files in the app directory
export default function AuthContextDummy() {
    return null;
}
