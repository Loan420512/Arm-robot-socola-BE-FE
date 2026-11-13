import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from './theme';

export function BrandHeader() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
      <Image source={require('../assets/chef-hat.png')} style={{ width: 40, height: 40 }} contentFit="contain" accessibilityLabel="ChocoRobot" />
      <View style={{ marginLeft: 10, flexShrink: 1 }}>
        <Text style={{ fontSize: 22, lineHeight: 24 }} accessibilityRole="header">
          <Text style={{ fontWeight: '800', color: '#2b1810' }}>choco</Text>
          <Text style={{ fontWeight: '400', color: '#6e5a4f' }}>robot</Text>
        </Text>
        <Text style={{ fontSize: 12, lineHeight: 16, color: '#6e5a4f' }}>Chocolate plate studio</Text>
      </View>
    </View>
  );
}

export function ScreenHeader({ back }: { back: boolean }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: colors.panel, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingRight: 16, paddingLeft: back ? 4 : 16, paddingBottom: 8 }}>
        {back ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 32, lineHeight: 36, color: colors.ink }}>‹</Text>
          </Pressable>
        ) : null}
        <BrandHeader />
      </View>
    </View>
  );
}
