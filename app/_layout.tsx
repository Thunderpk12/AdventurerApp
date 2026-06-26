import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../utils/supabase';
import { validateEnv } from '../utils/env';

// Validate required environment variables on startup.
// Throws in development if any EXPO_PUBLIC_* vars are missing.
validateEnv();
import { useAuthStore } from '../store/authStore';
import { usePlayerStore } from '../store/playerStore';
import { useBossStore } from '../store/bossStore';
import { View } from 'react-native';
import { Colors } from '../constants/Colors';
import GameSplash from '../components/GameSplash';
import { requestNotificationPermission } from '../utils/notificationService';
import {
  useFonts,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { FredokaOne_400Regular } from '@expo-google-fonts/fredoka-one';
import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro';
import * as SplashScreen from 'expo-splash-screen';
import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, isLoading, setSession, setUser, setLoading } = useAuthStore();
  const { loadProfile, reset: resetPlayer } = usePlayerStore();
  const { loadBoss, subscribeToHpUpdates, reset: resetBoss } = useBossStore();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_700Bold,
    FredokaOne_400Regular,
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_700Bold,
  });

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((e) => {
      console.warn("Supabase session error:", e);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Hide splash once fonts are ready
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // Bootstrap player data after sign-in
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      resetPlayer();
      resetBoss();
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    } else if (session && !inAuthGroup) {
      const userId = session.user.id;
      loadProfile(userId);
      loadBoss();
      const unsubBoss = subscribeToHpUpdates();
      requestNotificationPermission().catch(() => {});
      return () => { unsubBoss(); };
    }
  }, [session, isLoading, segments]);

  if (!fontsLoaded || isLoading) {
    return <GameSplash />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen
        name="new-quest"
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="edit-quest"
        options={{ headerShown: false, presentation: 'modal' }}
      />
    </Stack>
  );
}
