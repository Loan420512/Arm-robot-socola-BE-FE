import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { assetUrl } from './api-origin';
import type { CatalogTemplate } from './catalog';
import { colors, styles } from './theme';

const chocolate = '#5b2f20';

function plateColor(code: string | null | undefined): string {
  return typeof code === 'string' && /^#[0-9a-fA-F]{6}$/.test(code) ? code : '#fffdf8';
}

function imageSource(url: string | null | undefined): string | null {
  const source = assetUrl(url ?? '');
  if (!source || !/\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(source)) return null;
  return source;
}

function mark(name: string | null | undefined): string {
  const words = (name || 'Mẫu').trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => word[0] ?? '').join('');
  return letters.toUpperCase() || 'M';
}

export function PlatePreview(props: {
  template: CatalogTemplate | undefined;
  colorCode?: string | null;
  size?: 'hero' | 'thumb';
}) {
  const source = imageSource(props.template?.imagePreviewUrl);
  const plate = props.size === 'thumb' ? styles.thumb : styles.preview;
  const ink = plateColor(props.colorCode);
  return (
    <View style={[plate, { backgroundColor: '#fffdf8', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }]}>
      {source ? <Image source={{ uri: source }} style={{ width: '72%', height: '72%' }} contentFit="contain" /> : (
        <Text style={{ color: ink === '#fffdf8' ? chocolate : ink, fontWeight: '700', fontSize: props.size === 'thumb' ? 18 : 28 }}>{mark(props.template?.templateName)}</Text>
      )}
    </View>
  );
}
