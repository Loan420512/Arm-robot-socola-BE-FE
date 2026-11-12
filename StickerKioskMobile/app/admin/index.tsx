import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminToken, clearAdmin, listOrders, type AdminOrder } from '../../src/auth';
import { money } from '../../src/catalog';
import { styles } from '../../src/theme';

const statusLabel: Record<string, string> = {
  Pending: 'Chờ thanh toán',
  Processing: 'Đang xử lý',
  Completed: 'Hoàn tất',
  Cancelled: 'Đã hủy',
};

export default function AdminOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminToken()) {
      router.replace('/admin/login');
      return;
    }
    let active = true;
    void listOrders().then(
      (rows) => { if (active) { setOrders(rows); setLoading(false); } },
      (cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Không tải được đơn.');
        setLoading(false);
      },
    );
    return () => { active = false; };
  }, [router]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.body}>Mỗi đơn gắn một dĩa, một mẫu và một số tiền theo giá dĩa lúc tạo hóa đơn.</Text>
        {loading ? <Text style={styles.meta}>Đang tải đơn…</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && orders.length === 0 && !error ? <Text style={styles.meta}>Chưa có đơn.</Text> : null}
        {orders.map((order) => (
          <View key={order.id} style={styles.card}>
            <Text style={styles.cardTitle}>{order.orderCode || `Đơn #${order.id}`}</Text>
            <Text style={styles.meta}>{order.status ? statusLabel[order.status] ?? order.status : 'Chưa rõ trạng thái'}</Text>
            <Text style={styles.price}>{money(order.totalAmount)}</Text>
          </View>
        ))}
        <Pressable
          style={styles.ghost}
          onPress={() => {
            clearAdmin();
            router.replace('/');
          }}
        >
          <Text style={styles.ghostText}>Đăng xuất</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
