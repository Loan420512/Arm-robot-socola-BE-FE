import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { modelsWithCases, type StickerId } from '../../StickerKiosk/src/kiosk/catalog';
import { assetUrl } from '../src/api-origin';
import { CaseView } from '../src/case-view';
import { resolve, useKiosk, useSession } from '../src/kiosk-context';
import { colors, styles } from '../src/theme';

export default function StudioScreen() {
  const session = useSession();
  const kiosk = useKiosk();
  const router = useRouter();
  const { model, offer, placements, gate } = resolve(session);
  const catalog = session.catalog.status === 'ready' ? session.catalog.catalog : null;

  useEffect(() => {
    if (!catalog || model?.cases.length) return;
    const next = modelsWithCases(catalog)[0];
    if (next) kiosk.dispatch({ type: 'chooseModel', id: next.id });
  }, [catalog, model, kiosk]);
  const active = placements.find((item) => item.active) ?? placements.at(-1);
  const layerIndex = placements.findIndex((item) => item.active);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.stage}>
        {offer?.fit ? (
          <CaseView
            caseUrl={assetUrl(offer.fit.modelUrl)}
            pose={offer.fit.pose}
            sheetWidthMm={offer.fit.sheet.widthMm}
            sheetHeightMm={offer.fit.sheet.heightMm}
            editable
            placements={placements.map((item) => ({
              key: item.key,
              imageUrl: assetUrl(item.product.imageUrl),
              widthMm: item.product.widthMm,
              heightMm: item.product.heightMm,
              at: item.at,
              rotationDeg: item.rotationDeg,
              active: item.active,
            }))}
            onSelect={(key) => kiosk.dispatch({ type: 'select', key })}
            onMove={(key, at) => kiosk.dispatch({ type: 'commit', key, at })}
            onRotate={(key, rotationDeg) => kiosk.dispatch({ type: 'rotateTo', key, rotationDeg })}
          />
        ) : (
          <Text style={[styles.body, { padding: 16 }]}>Ốp này chưa có model 3D.</Text>
        )}
      </View>
      <ScrollView contentContainerStyle={styles.pad}>
        {active ? (
          <Text style={styles.meta}>
            Lớp {layerIndex + 1}/{placements.length} · xoay {active.rotationDeg}°
          </Text>
        ) : null}
        <View style={[styles.row, { marginVertical: 10 }]}>
          <Pressable style={styles.ghost} disabled={layerIndex < 0 || layerIndex === placements.length - 1} onPress={() => kiosk.dispatch({ type: 'stack', direction: 'up' })}>
            <Text style={styles.ghostText}>Lên trên</Text>
          </Pressable>
          <Pressable style={styles.ghost} disabled={layerIndex <= 0} onPress={() => kiosk.dispatch({ type: 'stack', direction: 'down' })}>
            <Text style={styles.ghostText}>Xuống dưới</Text>
          </Pressable>
          <Pressable style={styles.ghost} disabled={!active} onPress={() => kiosk.dispatch({ type: 'removeSticker' })}>
            <Text style={styles.ghostText}>Gỡ</Text>
          </Pressable>
        </View>
        <Text style={styles.cardTitle}>Mẫu máy</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
          {catalog ? modelsWithCases(catalog).map((item) => (
            <Pressable key={item.id} style={[styles.card, item.id === model?.id ? styles.cardOn : null, { marginRight: 8, width: 180 }]} onPress={() => kiosk.dispatch({ type: 'chooseModel', id: item.id })}>
              <Text style={styles.cardTitle}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.cardTitle}>Ốp</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
          {model?.cases.map((item) => (
            <Pressable key={item.id} style={[styles.card, item.id === offer?.id ? styles.cardOn : null, { marginRight: 8, width: 180 }]} onPress={() => kiosk.dispatch({ type: 'chooseCase', id: item.id })}>
              <Text style={styles.cardTitle}>{item.label}</Text>
              <Text style={styles.meta}>{item.price.toLocaleString('vi-VN')} đ</Text>
            </Pressable>
          ))}
        </ScrollView>
        <FlatList
          data={catalog?.stickers ?? []}
          horizontal
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Pressable style={[styles.card, { width: 120, marginRight: 8 }]} onPress={() => kiosk.dispatch({ type: 'chooseSticker', id: item.id as StickerId })}>
              <Image source={{ uri: assetUrl(item.imageUrl) }} style={{ width: 88, height: 88, borderRadius: 8 }} />
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.meta}>{item.price.toLocaleString('vi-VN')} đ</Text>
            </Pressable>
          )}
        />
        <Pressable style={[styles.button, { marginTop: 16 }]} disabled={!gate.open} onPress={() => { kiosk.dispatch({ type: 'openCheckout' }); router.push('/checkout'); }}>
          <Text style={styles.buttonText}>{gate.open ? 'Thanh toán' : 'Chọn ốp và sticker'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
