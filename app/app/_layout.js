import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/auth/AuthContext';

export default function LayoutRaiz() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerTitleAlign: 'center' }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
