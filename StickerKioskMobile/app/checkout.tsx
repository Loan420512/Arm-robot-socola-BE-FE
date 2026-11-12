import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PaymentMethod } from '../../StickerKiosk/src/kiosk/checkout';
import { resolve, useKiosk, useSession } from '../src/kiosk-context';
import { colors, styles } from '../src/theme';

const METHODS: readonly PaymentMethod[] = ['Cash', 'Momo', 'VNPay', 'ZaloPay'];

export default function CheckoutScreen() {
  const session = useSession();
  const kiosk = useKiosk();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [error, setError] = useState<string | null>(null);
  const resolved = resolve(session);

  useEffect(() => {
    if (session.now.phase === 'paid') router.replace(`/order/${session.now.orderCode}`);
  }, [session.now, router]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>Thanh toán</Text>
        <Text style={styles.body}>
          {resolved.offer?.label} · {resolved.placements.map((item) => item.product.name).join(', ')}
        </Text>
        <Text style={styles.cardTitle}>{resolved.total ? `${resolved.total.toLocaleString('vi-VN')} đ` : ''}</Text>
        {resolved.placements.map((item) => (
          <Text key={item.key} style={styles.meta}>
            {item.product.name}: xoay {item.rotationDeg}°, tâm {item.at.x / 10} mm / {item.at.y / 10} mm
          </Text>
        ))}
        <TextInput style={[styles.input, { marginTop: 16 }]} value={fullName} onChangeText={setFullName} placeholder="Họ tên" placeholderTextColor={colors.ink3} />
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Số điện thoại" keyboardType="phone-pad" placeholderTextColor={colors.ink3} />
        {METHODS.map((item) => (
          <Pressable key={item} style={[styles.card, method === item ? styles.cardOn : null]} onPress={() => setMethod(item)}>
            <Text style={styles.cardTitle}>{item}</Text>
          </Pressable>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {session.now.phase === 'paying' ? <Text style={styles.meta}>Đang ghi đơn…</Text> : null}
        {session.now.phase === 'failed' ? <Text style={styles.error}>Đơn chưa ghi được. Thử lại.</Text> : null}
        <Pressable
          style={styles.button}
          onPress={() => {
            const errors = kiosk.pay({ fullName, phone, method });
            setError(errors ? 'Kiểm tra lại tên hoặc số điện thoại.' : null);
          }}
        >
          <Text style={styles.buttonText}>Đặt đơn</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
