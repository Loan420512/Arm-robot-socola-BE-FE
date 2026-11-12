import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createSticker, uploadAsset } from '../../src/admin-api';
import { useSession } from '../../src/kiosk-context';
import { colors, styles } from '../../src/theme';

export default function AdminStickersScreen() {
  const session = useSession();
  const catalog = session.catalog.status === 'ready' ? session.catalog.catalog : null;
  const [name, setName] = useState('');
  const [width, setWidth] = useState('40');
  const [height, setHeight] = useState('40');
  const [price, setPrice] = useState('35000');
  const [imageUrl, setImageUrl] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        {catalog?.stickers.map((item) => (
          <Text key={item.id} style={styles.body}>{item.name} · {item.widthMm}×{item.heightMm} mm</Text>
        ))}
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Tên sticker" placeholderTextColor={colors.ink3} />
        <TextInput style={styles.input} value={width} onChangeText={setWidth} keyboardType="decimal-pad" placeholder="Rộng mm" placeholderTextColor={colors.ink3} />
        <TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="Cao mm" placeholderTextColor={colors.ink3} />
        <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="Giá" placeholderTextColor={colors.ink3} />
        <Pressable
          style={styles.ghost}
          onPress={() => {
            void ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] }).then(async (picked) => {
              if (picked.canceled || !picked.assets[0]) return;
              const file = picked.assets[0];
              const uploaded = await uploadAsset('sticker', { uri: file.uri, name: 'sticker.png', type: 'image/png' });
              setImageUrl(uploaded.ok ? uploaded.data : '');
              setMessage(uploaded.ok ? 'Đã tải ảnh.' : uploaded.message);
            });
          }}
        >
          <Text style={styles.ghostText}>Chọn ảnh sticker</Text>
        </Pressable>
        {message ? <Text style={styles.meta}>{message}</Text> : null}
        <Pressable
          style={[styles.button, { marginTop: 12 }]}
          onPress={() => {
            void createSticker({ name, imageUrl, widthMm: Number(width), heightMm: Number(height), price: Number(price) }).then((result) => {
              setMessage(result.ok ? 'Đã thêm sticker.' : result.message);
            });
          }}
        >
          <Text style={styles.buttonText}>Thêm sticker</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
