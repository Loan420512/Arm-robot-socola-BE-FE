import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resolve, useSession } from '../src/kiosk-context';
import { assetUrl } from '../src/api-origin';
import { colors, styles } from '../src/theme';

export default function HomeScreen() {
  const session = useSession();
  const router = useRouter();
  const [code, setCode] = useState('');
  const catalog = session.catalog.status === 'ready' ? session.catalog.catalog : null;
  const { placements } = resolve(session);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>StikerKiosk</Text>
        <Pressable style={styles.button} onPress={() => router.push('/studio')}>
          <Text style={styles.buttonText}>{placements.length ? `Tiếp tục ${placements.length} sticker` : 'Bắt đầu thiết kế'}</Text>
        </Pressable>
        <Text style={[styles.cardTitle, { marginTop: 28, marginBottom: 10 }]}>Tra cứu đơn</Text>
        <TextInput style={styles.input} value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="Mã đơn" placeholderTextColor={colors.ink3} />
        <Pressable style={styles.ghost} onPress={() => code.trim() && router.push(`/order/${code.trim().toUpperCase()}`)}>
          <Text style={styles.ghostText}>Xem đơn</Text>
        </Pressable>
        <Text style={[styles.cardTitle, { marginTop: 28, marginBottom: 10 }]}>Ốp đang bán</Text>
        {session.catalog.status === 'loading' ? <Text style={styles.meta}>Đang tải danh mục…</Text> : null}
        {session.catalog.status === 'unreachable' ? <Text style={styles.error}>Không tới được API tại máy này.</Text> : null}
        {catalog?.models.flatMap((model) => model.cases.filter((item) => item.fit).map((item) => (
          <Link key={item.id} href="/studio" asChild>
            <Pressable style={styles.card}>
              <Text style={styles.cardTitle}>{item.label}</Text>
              <Text style={styles.meta}>{model.label} · {item.price.toLocaleString('vi-VN')} đ</Text>
            </Pressable>
          </Link>
        )))}
        {catalog?.stickers[0] ? (
          <Image source={{ uri: assetUrl(catalog.stickers[0].imageUrl) }} style={{ width: 72, height: 72, borderRadius: 12, marginTop: 8 }} />
        ) : null}
        <Link href="/admin/login" style={{ marginTop: 24 }}>
          <Text style={{ color: colors.moss, fontSize: 16 }}>Khu quản trị</Text>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}
