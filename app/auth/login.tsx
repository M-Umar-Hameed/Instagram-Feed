import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

export default function LoginScreen() {
    const { session, signIn, signUp } = useAuth();
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto-redirect if session exists
    useEffect(() => {
        console.log('LoginScreen: session status changed:', !!session);
        if (session) {
            console.log('LoginScreen: Session detected, redirecting to Home...');
            router.replace('/(tabs)/Home');
        }
    }, [session, router]);

    const handleSubmit = async () => {
        console.log('LoginScreen: handleSubmit triggered, isLogin:', isLogin);
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (!isLogin && !username.trim()) {
            Alert.alert('Error', 'Please enter a username');
            return;
        }

        setLoading(true);
        try {
            console.log(`LoginScreen: Attempting ${isLogin ? 'login' : 'signup'} for:`, email.trim());
            if (isLogin) {
                const { error } = await signIn(email.trim(), password);
                console.log('LoginScreen: Login result error:', error);
                if (error) {
                    Alert.alert('Login Failed', error.message || 'Check your credentials');
                } else {
                    console.log('LoginScreen: Login successful call completed');
                    // router.replace will be handled by useEffect
                }
            } else {
                const { error } = await signUp(email.trim(), password, username.trim());
                console.log('LoginScreen: Signup result error:', error);
                if (error) {
                    Alert.alert('Sign Up Failed', error.message || 'Something went wrong');
                } else {
                    Alert.alert('Success', 'Account created! Check your email to verify your account.');
                    setIsLogin(true);
                }
            }
        } catch (err: any) {
            console.error('LoginScreen: Unexpected submit error:', err);
            Alert.alert('Error', err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <Text style={styles.logo}>🎬</Text>
                    <Text style={styles.title}>Reels Feed</Text>
                    <Text style={styles.subtitle}>
                        {isLogin ? 'Welcome back!' : 'Create your account'}
                    </Text>
                </View>

                <View style={styles.form}>
                    {!isLogin && (
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Username</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Choose a username"
                                placeholderTextColor="#666"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email"
                            placeholderTextColor="#666"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your password"
                            placeholderTextColor="#666"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>
                                {isLogin ? 'Log In' : 'Sign Up'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.switchButton}
                        onPress={() => setIsLogin(!isLogin)}
                    >
                        <Text style={styles.switchText}>
                            {isLogin ? "Don't have an account? " : 'Already have an account? '}
                            <Text style={styles.switchTextBold}>
                                {isLogin ? 'Sign Up' : 'Log In'}
                            </Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: wp('8%'),
    },
    header: {
        alignItems: 'center',
        marginBottom: hp('5%'),
    },
    logo: {
        fontSize: wp('15%'),
        marginBottom: hp('1%'),
    },
    title: {
        fontSize: wp('8%'),
        fontWeight: '800',
        color: '#fff',
        marginBottom: hp('0.5%'),
    },
    subtitle: {
        fontSize: wp('4%'),
        color: '#999',
    },
    form: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: hp('2%'),
    },
    label: {
        color: '#ccc',
        fontSize: wp('3.5%'),
        marginBottom: hp('0.5%'),
        fontWeight: '600',
    },
    input: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        paddingHorizontal: wp('4%'),
        paddingVertical: hp('1.8%'),
        color: '#fff',
        fontSize: wp('4%'),
        borderWidth: 1,
        borderColor: '#333',
    },
    button: {
        backgroundColor: '#fe2c55',
        borderRadius: 12,
        paddingVertical: hp('2%'),
        alignItems: 'center',
        marginTop: hp('1%'),
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: wp('4.5%'),
        fontWeight: '700',
    },
    switchButton: {
        marginTop: hp('2.5%'),
        alignItems: 'center',
    },
    switchText: {
        color: '#999',
        fontSize: wp('3.5%'),
    },
    switchTextBold: {
        color: '#fe2c55',
        fontWeight: '700',
    },
});
