import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ScreenHeader } from '../src/brand';
import { SelectionProvider } from '../src/selection';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SelectionProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              header: ({ back }) => <ScreenHeader back={back != null} />,
              contentStyle: { backgroundColor: colors.page },
            }}
          >
            <Stack.Screen name="index" options={{ headerBackVisible: false }} />
            <Stack.Screen name="demo" />
            <Stack.Screen name="studio" />
            <Stack.Screen name="checkout" />
          </Stack>
        </SelectionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
