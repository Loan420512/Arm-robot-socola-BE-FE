import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_POSE, turnPose, type AssetPose } from '../../../StickerKiosk/src/kiosk/sheet';
import { resolve, useKiosk, useSession } from '../../src/kiosk-context';
import { saveCaseFit, updateCaseModel, uploadAsset } from '../../src/admin-api';
import { colors, styles } from '../../src/theme';

export default function AdminCasesScreen() {
  const session = useSession();
  const kiosk = useKiosk();
  const { model, offer } = resolve(session);
  const catalog = session.catalog.status === 'ready' ? session.catalog.catalog : null;
  const [pose, setPose] = useState<AssetPose>(offer?.fit?.pose ?? DEFAULT_POSE);
  const [url, setUrl] = useState(offer?.fit?.modelUrl ?? '');
  const [heightMm, setHeightMm] = useState(String(offer?.fit?.sheet.heightMm ?? 150));
  const [widthMm, setWidthMm] = useState(String(offer?.fit?.sheet.widthMm ?? 75));
  const [inset, setInset] = useState(String(offer?.fit?.nest.insetMm ?? 1.5));
  const [scale, setScale] = useState(String(offer?.fit?.nest.scale ?? 0.97));
  const [message, setMessage] = useState<string | null>(null);

  async function pickGlb() {
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets[0]) return;
    const file = picked.assets[0];
    const uploaded = await uploadAsset('case', { uri: file.uri, name: file.name || 'case.glb', type: 'model/gltf-binary' });
    if (!uploaded.ok) {
      setMessage(uploaded.message);
      return;
    }
    setUrl(uploaded.data);
    setMessage('Đã tải file ốp lên. Lưu khớp máy để khách thấy.');
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        {catalog?.models.map((item) => (
          <Pressable key={item.id} style={[styles.card, item.id === model?.id ? styles.cardOn : null]} onPress={() => kiosk.dispatch({ type: 'chooseModel', id: item.id })}>
            <Text style={styles.cardTitle}>{item.label}</Text>
            <Text style={styles.meta}>{item.phone ? 'Đã có model máy' : 'Chưa có model máy'}</Text>
          </Pressable>
        ))}
        {model?.cases.map((item) => (
          <Pressable key={item.id} style={[styles.card, item.id === offer?.id ? styles.cardOn : null]} onPress={() => {
            kiosk.dispatch({ type: 'chooseCase', id: item.id });
            setPose(item.fit?.pose ?? DEFAULT_POSE);
            setUrl(item.fit?.modelUrl ?? '');
            setHeightMm(String(item.fit?.sheet.heightMm ?? 150));
            setWidthMm(String(item.fit?.sheet.widthMm ?? 75));
          }}>
            <Text style={styles.cardTitle}>{item.label}</Text>
          </Pressable>
        ))}
        <Pressable style={styles.ghost} onPress={() => void pickGlb()}><Text style={styles.ghostText}>Tải file GLB ốp</Text></Pressable>
        <Text style={styles.meta}>{url || 'Chưa có file'}</Text>
        <ViewRow label="Trục ngang" onPress={() => setPose(turnPose(pose, 'y'))} />
        <ViewRow label="Trục dọc" onPress={() => setPose(turnPose(pose, 'x'))} />
        <ViewRow label="Trục trong mặt" onPress={() => setPose(turnPose(pose, 'z'))} />
        <Text style={styles.meta}>Đã chọn: lưng {pose.back}, trên {pose.up}</Text>
        <TextInput style={styles.input} value={heightMm} onChangeText={setHeightMm} keyboardType="decimal-pad" placeholder="Cao mm" placeholderTextColor={colors.ink3} />
        <TextInput style={styles.input} value={widthMm} onChangeText={setWidthMm} keyboardType="decimal-pad" placeholder="Rộng mm" placeholderTextColor={colors.ink3} />
        <TextInput style={styles.input} value={inset} onChangeText={setInset} keyboardType="decimal-pad" placeholder="Độ lún mm" placeholderTextColor={colors.ink3} />
        <TextInput style={styles.input} value={scale} onChangeText={setScale} keyboardType="decimal-pad" placeholder="Tỉ lệ máy" placeholderTextColor={colors.ink3} />
        {message ? <Text style={styles.body}>{message}</Text> : null}
        <Pressable
          style={styles.button}
          onPress={() => {
            if (!offer || !model || !url) return;
            void (async () => {
              const moved = await updateCaseModel(offer.id, model.id, offer.sku ?? '', offer.material, offer.color, offer.price, offer.stock ?? 0);
              if (!moved.ok) {
                setMessage(moved.message);
                return;
              }
              const saved = await saveCaseFit({
                id: offer.id,
                modelUrl: url,
                pose,
                heightMm: Number(heightMm),
                widthMm: Number(widthMm),
                insetMm: Number(inset),
                scale: Number(scale),
              });
              setMessage(saved.ok ? 'Đã lưu ốp khớp với máy này.' : saved.message);
              if (saved.ok) kiosk.reloadCatalog();
            })();
          }}
        >
          <Text style={styles.buttonText}>Lưu khớp ốp với máy</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ViewRow(props: { readonly label: string; readonly onPress: () => void }) {
  return (
    <Pressable style={[styles.ghost, { marginBottom: 8 }]} onPress={props.onPress}>
      <Text style={styles.ghostText}>{props.label}</Text>
    </Pressable>
  );
}
