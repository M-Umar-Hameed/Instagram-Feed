import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#fe2c55" />
      </View>
    );
  }

  // If not logged in, go to login
  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  // If logged in, go to feed
  return <Redirect href="/(tabs)/Home" />;
}
