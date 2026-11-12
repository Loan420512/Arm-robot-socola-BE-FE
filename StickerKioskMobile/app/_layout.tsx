import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
              headerTintColor: colors.ink,
              headerStyle: { backgroundColor: colors.panel },
              headerTitleStyle: { fontWeight: '600' },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.page },
            }}
          >
            <Stack.Screen name="index" options={{ title: 'ChocoRobot' }} />
            <Stack.Screen name="studio" options={{ title: 'Chọn mẫu và dĩa' }} />
            <Stack.Screen name="checkout" options={{ title: 'Thanh toán' }} />
            <Stack.Screen name="admin/login" options={{ title: 'Đăng nhập' }} />
            <Stack.Screen name="admin/index" options={{ title: 'Đơn hàng' }} />
          </Stack>
        </SelectionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
