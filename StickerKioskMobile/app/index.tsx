import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { activeTemplates, useCatalog, type CatalogState } from '../src/catalog';
import { PlatePreview } from '../src/plate-preview';
import { useSelection } from '../src/selection';
import { styles } from '../src/theme';

function CatalogNote({ state, onRetry }: { state: CatalogState; onRetry: () => void }) {
  switch (state.status) {
    case 'loading':
      return <Text style={styles.meta}>Đang tải thư viện mẫu…</Text>;
    case 'error':
      return (
        <>
          <Text style={styles.error}>{state.message}</Text>
          <Pressable style={styles.ghost} onPress={onRetry}>
            <Text style={styles.ghostText}>Thử lại</Text>
          </Pressable>
        </>
      );
    case 'ready':
      return null;
    default: {
      const unexpected: never = state;
      return unexpected;
    }
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const catalog = useCatalog();
  const { chooseTemplate } = useSelection();
  const templates = catalog.status === 'ready' ? activeTemplates(catalog.catalog) : [];
  const previewColor = catalog.status === 'ready'
    ? catalog.catalog.colors.find((color) => color.isActive === true)?.colorCode
    : null;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>Một món quà rất riêng.</Text>
        <Text style={styles.body}>Xem thử mẫu trên dĩa trước. Khi muốn đặt, chọn dĩa còn hàng. Không cần tài khoản.</Text>
        <Pressable
          style={styles.button}
          onPress={() => {
            const first = templates[0];
            if (first) chooseTemplate(first.id);
            router.push('/studio');
          }}
        >
          <Text style={styles.buttonText}>Tự vẽ và mô phỏng 3D</Text>
        </Pressable>
        <Text style={styles.section}>Mẫu của xưởng</Text>
        <CatalogNote state={catalog} onRetry={catalog.reload} />
        {catalog.status === 'ready' && templates.length === 0 ? <Text style={styles.meta}>Xưởng chưa có mẫu chocolate đang sử dụng.</Text> : null}
        {templates.map((template) => (
          <Pressable
            key={template.id}
            style={styles.card}
            onPress={() => {
              chooseTemplate(template.id);
              router.push('/studio');
            }}
          >
            <View style={styles.row}>
              <PlatePreview template={template} colorCode={previewColor} size="thumb" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{template.templateName?.trim() || `Mẫu #${template.id}`}</Text>
                <Text style={styles.meta}>Mở mô phỏng 3D của mẫu này</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
