import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { activeTemplates, money, useCatalog, type CatalogState } from '../src/catalog';
import { useSelection } from '../src/selection';
import { styles } from '../src/theme';

const steps = [
  'Chọn mẫu chocolate đang được xưởng dùng.',
  'Chọn dĩa còn hàng, cùng loại với mẫu.',
  'Mỗi lần tạo mã PayOS là một hóa đơn và một mã thanh toán riêng.',
];

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

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.eyebrow}>Chocolate plate studio</Text>
        <Text style={styles.title}>Một món quà rất riêng.</Text>
        <Text style={styles.body}>Một chiếc dĩa, vài nét chocolate, một lời thương. Thư viện mở cho khách, không cần tài khoản.</Text>
        <Pressable style={styles.button} onPress={() => router.push('/studio')}>
          <Text style={styles.buttonText}>Chọn mẫu trên dĩa</Text>
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
            <Text style={styles.cardTitle}>{template.templateName?.trim() || `Mẫu #${template.id}`}</Text>
            <Text style={styles.meta}>Xem dĩa còn hàng cùng loại</Text>
          </Pressable>
        ))}
        <Text style={styles.section}>Cách đặt</Text>
        {steps.map((step) => <Text key={step} style={styles.body}>{step}</Text>)}
        <Pressable style={styles.ghost} onPress={() => router.push('/admin/login')}>
          <Text style={styles.ghostText}>Đăng nhập Admin</Text>
        </Pressable>
        {catalog.status === 'ready' ? <Text style={styles.meta}>{templates.length} mẫu đang dùng · giá theo dĩa, ví dụ {money(catalog.catalog.plates.find((plate) => typeof plate.price === 'number')?.price)}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
