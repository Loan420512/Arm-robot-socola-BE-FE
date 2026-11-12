import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_POSE, turnPose, type AssetPose } from '../../../StickerKiosk/src/kiosk/sheet';
import { savePhoneFit, uploadAsset } from '../../src/admin-api';
import { resolve, useKiosk, useSession } from '../../src/kiosk-context';
import { styles } from '../../src/theme';

export default function AdminPhonesScreen() {
  const session = useSession();
  const kiosk = useKiosk();
  const { model } = resolve(session);
  const catalog = session.catalog.status === 'ready' ? session.catalog.catalog : null;
  const [pose, setPose] = useState<AssetPose>(model?.phone?.pose ?? DEFAULT_POSE);
  const [url, setUrl] = useState(model?.phone?.modelUrl ?? '');
  const [message, setMessage] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        {catalog?.models.map((item) => (
          <Pressable key={item.id} style={[styles.card, item.id === model?.id ? styles.cardOn : null]} onPress={() => {
            kiosk.dispatch({ type: 'chooseModel', id: item.id });
            setPose(item.phone?.pose ?? DEFAULT_POSE);
            setUrl(item.phone?.modelUrl ?? '');
          }}>
            <Text style={styles.cardTitle}>{item.label}</Text>
          </Pressable>
        ))}
        <Pressable
          style={styles.ghost}
          onPress={() => {
            void DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true }).then(async (picked) => {
              if (picked.canceled || !picked.assets[0]) return;
              const file = picked.assets[0];
              const uploaded = await uploadAsset('phone', { uri: file.uri, name: file.name || 'phone.glb', type: 'model/gltf-binary' });
              setUrl(uploaded.ok ? uploaded.data : '');
              setMessage(uploaded.ok ? 'Đã tải model máy.' : uploaded.message);
            });
          }}
        >
          <Text style={styles.ghostText}>Tải GLB máy</Text>
        </Pressable>
        <Text style={styles.meta}>{url || 'Chưa có file'}</Text>
        <Pressable style={[styles.ghost, { marginTop: 8 }]} onPress={() => setPose(turnPose(pose, 'y'))}><Text style={styles.ghostText}>Xoay ngang</Text></Pressable>
        <Pressable style={[styles.ghost, { marginTop: 8 }]} onPress={() => setPose(turnPose(pose, 'x'))}><Text style={styles.ghostText}>Xoay dọc</Text></Pressable>
        <Text style={styles.meta}>Lưng {pose.back}, trên {pose.up}</Text>
        {message ? <Text style={styles.body}>{message}</Text> : null}
        <Pressable
          style={[styles.button, { marginTop: 12 }]}
          onPress={() => {
            if (!model || !url) return;
            void savePhoneFit(model.id, url, pose).then((result) => {
              setMessage(result.ok ? 'Đã lưu model máy.' : result.message);
              if (result.ok) kiosk.reloadCatalog();
            });
          }}
        >
          <Text style={styles.buttonText}>Lưu model máy</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
