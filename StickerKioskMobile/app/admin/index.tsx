import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminToken, listOrders, setOrderStatus } from '../../src/admin-api';
import type { PublicOrder } from '../../../StickerKiosk/src/kiosk/port';
import { styles } from '../../src/theme';

export default function AdminHomeScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<(PublicOrder & { id: number })[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminToken()) router.replace('/admin/login');
  }, [router]);

  useEffect(() => {
    void listOrders().then((result) => {
      if (!result.ok) setError(result.message);
      else setOrders(result.data);
    });
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>Quản trị</Text>
        <Link href="/admin/cases"><Text style={styles.cardTitle}>Ốp lưng và model 3D</Text></Link>
        <Link href="/admin/phones"><Text style={[styles.cardTitle, { marginTop: 12 }]}>Mẫu máy</Text></Link>
        <Link href="/admin/stickers"><Text style={[styles.cardTitle, { marginTop: 12, marginBottom: 20 }]}>Sticker</Text></Link>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {orders.map((order) => (
          <Pressable key={order.orderCode} style={styles.card} onPress={() => void setOrderStatus(order.id, 'Processing')}>
            <Text style={styles.cardTitle}>{order.orderCode}</Text>
            <Text style={styles.meta}>{order.status} · {order.stickerName}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
