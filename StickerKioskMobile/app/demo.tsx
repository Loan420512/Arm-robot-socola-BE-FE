import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { activeTemplates, useCatalog, type CatalogColor } from '../src/catalog';
import { PlatePreview } from '../src/plate-preview';
import { useSelection } from '../src/selection';
import { styles } from '../src/theme';

export default function DemoScreen() {
  const router = useRouter();
  const catalog = useCatalog();
  const selection = useSelection();
  const templates = catalog.status === 'ready' ? activeTemplates(catalog.catalog) : [];
  const template = templates.find((item) => item.id === selection.templateId) ?? templates[0];
  const colors = catalog.status === 'ready' ? catalog.catalog.colors.filter((color) => color.isActive === true) : [];
  const [colorId, setColorId] = useState<number | null>(null);
  const selected = colors.find((color) => color.id === colorId) ?? colors[0];

  function openTemplate(id: number) {
    selection.chooseTemplate(id);
    setColorId(null);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.body}>Bản xem thử chỉ để hình dung mẫu trên dĩa. Chưa tạo đơn và chưa thu tiền.</Text>
        {catalog.status === 'loading' ? <Text style={styles.meta}>Đang tải mẫu…</Text> : null}
        {catalog.status === 'error' ? <Text style={styles.error}>{catalog.message}</Text> : null}
        <PlatePreview template={template} colorCode={selected?.colorCode} />
        <Text style={styles.cardTitle}>{template?.templateName?.trim() || 'Chưa có mẫu'}</Text>
        <Text style={styles.meta}>{selected ? `Dĩa màu ${selected.colorName}` : 'Chưa có màu dĩa để xem thử'}</Text>
        <Text style={styles.section}>Đổi màu dĩa</Text>
        <View style={styles.chipRow}>
          {colors.map((color) => (
            <ColorChip key={color.id} color={color} selected={color.id === selected?.id} onPress={() => setColorId(color.id)} />
          ))}
        </View>
        <Text style={styles.section}>Mẫu khác</Text>
        {templates.map((item) => (
          <Pressable key={item.id} style={[styles.card, item.id === template?.id ? styles.cardOn : null]} onPress={() => openTemplate(item.id)}>
            <View style={styles.row}>
              <PlatePreview template={item} colorCode={selected?.colorCode} size="thumb" />
              <Text style={styles.cardTitle}>{item.templateName?.trim() || `Mẫu #${item.id}`}</Text>
            </View>
          </Pressable>
        ))}
        <Pressable
          style={[styles.button, template ? null : styles.disabled]}
          disabled={!template}
          onPress={() => {
            if (!template) return;
            selection.chooseTemplate(template.id);
            router.push('/studio');
          }}
        >
          <Text style={styles.buttonText}>Đặt dĩa với mẫu này</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ColorChip(props: { color: CatalogColor; selected: boolean; onPress: () => void }) {
  const fill = /^#[0-9a-fA-F]{6}$/.test(props.color.colorCode) ? props.color.colorCode : '#5b2f20';
  return (
    <Pressable
      accessibilityLabel={props.color.colorName}
      onPress={props.onPress}
      style={[styles.chip, props.selected ? styles.chipOn : null, { backgroundColor: fill }]}
    />
  );
}
