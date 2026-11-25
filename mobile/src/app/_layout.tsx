import { InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold } from '@expo-google-fonts/instrument-sans';
import { Newsreader_400Regular_Italic, Newsreader_500Medium } from '@expo-google-fonts/newsreader';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { loadNotes } from '@/data/notes';
import { usePalette } from '@/ui/theme';

export default function Root() {
  const c = usePalette();
  const [fonts] = useFonts({ Newsreader_500Medium, Newsreader_400Regular_Italic, InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold });
  useEffect(() => { loadNotes(); }, []);
  if (!fonts) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaProvider>
        <StatusBar style={c.dark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'default' }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
