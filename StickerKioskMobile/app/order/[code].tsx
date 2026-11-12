import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PublicOrder } from '../../../StickerKiosk/src/kiosk/port';
import { useKiosk } from '../../src/kiosk-context';
import { styles } from '../../src/theme';

export default function OrderScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const kiosk = useKiosk();
  const [order, setOrder] = useState<PublicOrder | 'missing' | 'loading'>('loading');

  useEffect(() => {
    let live = true;
    void kiosk.backend.lookupOrder(String(code ?? '')).then((result) => {
      if (!live) return;
      setOrder(result === 'not-found' || result === 'unreachable' ? 'missing' : result);
    });
    return () => {
      live = false;
    };
  }, [code, kiosk]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Text style={styles.title}>{String(code ?? '')}</Text>
      {order === 'loading' ? <Text style={styles.body}>Đang tra…</Text> : null}
      {order === 'missing' ? <Text style={styles.body}>Không thấy đơn này.</Text> : null}
      {order !== 'loading' && order !== 'missing' ? (
        <>
          <Text style={styles.body}>{order.status} · {order.caseLabel}</Text>
          <Text style={styles.body}>{order.stickerName}</Text>
          {order.placements.map((item, index) => (
            <Text key={`${item.name}-${index}`} style={styles.meta}>
              {item.name} · xoay {item.rotationDeg}°
            </Text>
          ))}
        </>
      ) : null}
    </SafeAreaView>
  );
}
