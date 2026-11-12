import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KioskProvider } from '../src/kiosk-context';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KioskProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerTintColor: colors.ink,
              headerStyle: { backgroundColor: colors.panel },
              headerTitleStyle: { fontWeight: '600' },
              contentStyle: { backgroundColor: colors.page },
            }}
          >
            <Stack.Screen name="index" options={{ title: 'StikerKiosk' }} />
            <Stack.Screen name="studio" options={{ title: 'Thiết kế' }} />
            <Stack.Screen name="checkout" options={{ title: 'Thanh toán' }} />
            <Stack.Screen name="order/[code]" options={{ title: 'Đơn hàng' }} />
            <Stack.Screen name="admin/login" options={{ title: 'Đăng nhập' }} />
            <Stack.Screen name="admin/index" options={{ title: 'Quản trị' }} />
            <Stack.Screen name="admin/cases" options={{ title: 'Ốp lưng' }} />
            <Stack.Screen name="admin/stickers" options={{ title: 'Sticker' }} />
            <Stack.Screen name="admin/phones" options={{ title: 'Mẫu máy' }} />
          </Stack>
        </KioskProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
