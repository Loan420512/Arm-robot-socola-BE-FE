import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login } from '../../src/admin-api';
import { colors, styles } from '../../src/theme';

export default function AdminLoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('seed.admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Text style={styles.title}>Quản trị</Text>
      <Text style={styles.body}>Cùng tài khoản với website. Mật khẩu mẫu là Admin123!.</Text>
      <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="Tên đăng nhập" placeholderTextColor={colors.ink3} />
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Mật khẩu" placeholderTextColor={colors.ink3} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={styles.button}
        onPress={() => {
          void login(username.trim(), password).then((result) => {
            if (!result.ok) {
              setError(result.message);
              return;
            }
            router.replace('/admin');
          });
        }}
      >
        <Text style={styles.buttonText}>Đăng nhập</Text>
      </Pressable>
    </SafeAreaView>
  );
}
