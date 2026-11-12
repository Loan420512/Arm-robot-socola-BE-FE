import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { activeTemplates, money, platesForTemplate, useCatalog } from '../src/catalog';
import { useSelection } from '../src/selection';
import { styles } from '../src/theme';

export default function StudioScreen() {
  const router = useRouter();
  const catalog = useCatalog();
  const selection = useSelection();
  const templates = catalog.status === 'ready' ? activeTemplates(catalog.catalog) : [];
  const template = templates.find((item) => item.id === selection.templateId);
  const plates = catalog.status === 'ready' ? platesForTemplate(catalog.catalog, template) : [];
  const plate = plates.find((item) => item.id === selection.plateId);
  const ready = Boolean(template && plate);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.body}>Chọn mẫu đang dùng, rồi chọn dĩa còn hàng cùng loại. Giá lấy từ danh mục của xưởng.</Text>
        {catalog.status === 'loading' ? <Text style={styles.meta}>Đang tải thư viện…</Text> : null}
        {catalog.status === 'error' ? (
          <>
            <Text style={styles.error}>{catalog.message}</Text>
            <Pressable style={styles.ghost} onPress={catalog.reload}><Text style={styles.ghostText}>Thử lại</Text></Pressable>
          </>
        ) : null}
        <Text style={styles.section}>Mẫu</Text>
        {catalog.status === 'ready' && templates.length === 0 ? <Text style={styles.meta}>Chưa có mẫu đang sử dụng.</Text> : null}
        {templates.map((item) => (
          <Pressable key={item.id} style={[styles.card, item.id === template?.id ? styles.cardOn : null]} onPress={() => selection.chooseTemplate(item.id)}>
            <Text style={styles.cardTitle}>{item.templateName?.trim() || `Mẫu #${item.id}`}</Text>
            <Text style={styles.meta}>{catalog.status === 'ready' ? catalog.catalog.types.find((type) => type.id === item.plateTypeId)?.typeName || 'Loại dĩa' : ''}</Text>
          </Pressable>
        ))}
        <Text style={styles.section}>Dĩa còn hàng</Text>
        {!template ? <Text style={styles.meta}>Hãy chọn một mẫu trước.</Text> : null}
        {template && plates.length === 0 ? <Text style={styles.meta}>Chưa có dĩa còn hàng cùng loại với mẫu này.</Text> : null}
        {plates.map((item) => {
          const color = catalog.status === 'ready' ? catalog.catalog.colors.find((entry) => entry.id === item.colorId && entry.isActive === true) : undefined;
          return (
            <Pressable key={item.id} style={[styles.card, item.id === plate?.id ? styles.cardOn : null]} onPress={() => selection.choosePlate(item.id)}>
              <Text style={styles.cardTitle}>{item.sku || `Dĩa #${item.id}`}</Text>
              <Text style={styles.meta}>{color?.colorName || item.colorName || 'Màu chưa rõ'} · còn {item.stockQuantity}</Text>
              <Text style={styles.price}>{money(item.price)}</Text>
            </Pressable>
          );
        })}
        <Pressable style={[styles.button, ready ? null : styles.disabled]} disabled={!ready} onPress={() => router.push('/checkout')}>
          <Text style={styles.buttonText}>Tiếp tục thanh toán</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
