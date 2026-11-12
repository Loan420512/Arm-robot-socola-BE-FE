import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login } from '../../src/auth';
import { colors, styles } from '../../src/theme';

export default function AdminLoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Quản trị</Text>
      <Text style={styles.body}>Đăng nhập tài khoản Admin của xưởng. Ứng dụng chỉ xem đơn. Sửa mẫu và dĩa vẫn trên website.</Text>
      <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="Tên đăng nhập" placeholderTextColor={colors.ink3} />
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Mật khẩu" placeholderTextColor={colors.ink3} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={[styles.button, busy ? styles.disabled : null]}
        disabled={busy}
        onPress={() => {
          setBusy(true);
          setError('');
          void login(username.trim(), password).then(
            () => router.replace('/admin'),
            (cause: unknown) => {
              setError(cause instanceof Error ? cause.message : 'Không đăng nhập được.');
              setBusy(false);
            },
          );
        }}
      >
        <Text style={styles.buttonText}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</Text>
      </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
