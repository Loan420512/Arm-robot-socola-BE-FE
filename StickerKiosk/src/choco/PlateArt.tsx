import { useId, type CSSProperties } from 'react';

interface PlateArtProps {
  color?: string | null;
  shape?: string | null;
  className?: string;
  decorated?: boolean;
}

/** A ceramic illustration, independent of product assets or robot geometry. */
export function PlateArt({ color, shape, className, decorated = false }: PlateArtProps) {
  const id = useId().replaceAll(':', '');
  const normalizedShape = (shape ?? '').toLocaleLowerCase('vi');
  const rectangular = /square|rectang|vuông|chữ nhật/.test(normalizedShape);
  const oval = /oval|ellipse|bầu dục/.test(normalizedShape);
  const plateColor = color && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : undefined;
  const style = plateColor ? ({ '--art-plate': plateColor } as CSSProperties) : undefined;

  return (
    <svg className={className ?? 'plate-art'} viewBox="0 0 360 280" fill="none" aria-hidden="true" style={style}>
      <defs>
        <radialGradient id={`glaze-${id}`} cx="0" cy="0" r="1" gradientTransform="translate(139 77) rotate(52) scale(210)">
          <stop stopColor="var(--art-highlight)" stopOpacity=".65" />
          <stop offset=".62" stopColor="var(--art-highlight)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--art-line)" stopOpacity=".14" />
        </radialGradient>
      </defs>
      <ellipse cx="184" cy="246" rx={oval ? 116 : 94} ry="10" fill="var(--art-shadow)" opacity=".18" />
      {rectangular ? (
        <>
          <rect x="68" y="29" width="224" height="214" rx="29" fill="var(--art-plate)" />
          <rect x="68" y="29" width="224" height="214" rx="29" fill={`url(#glaze-${id})`} />
          <rect x="83" y="44" width="194" height="184" rx="22" stroke="var(--art-line)" strokeOpacity=".2" />
          <rect x="103" y="64" width="154" height="144" rx="15" stroke="var(--art-line)" strokeOpacity=".12" />
          <path d="M91 58C91 49 96 47 105 47H253" stroke="var(--art-highlight)" strokeWidth="3" strokeLinecap="round" opacity=".7" />
        </>
      ) : (
        <>
          <ellipse cx="180" cy="134" rx={oval ? 128 : 109} ry={oval ? 92 : 109} fill="var(--art-plate)" />
          <ellipse cx="180" cy="134" rx={oval ? 128 : 109} ry={oval ? 92 : 109} fill={`url(#glaze-${id})`} />
          <ellipse cx="180" cy="134" rx={oval ? 114 : 96} ry={oval ? 79 : 96} stroke="var(--art-line)" strokeOpacity=".2" />
          <ellipse cx="180" cy="134" rx={oval ? 94 : 76} ry={oval ? 60 : 76} stroke="var(--art-line)" strokeOpacity=".13" />
          <path d={oval ? 'M76 111C90 75 131 59 176 59' : 'M105 89C118 61 143 47 171 46'} stroke="var(--art-highlight)" strokeWidth="3" strokeLinecap="round" opacity=".8" />
        </>
      )}
      {decorated && (
        <g stroke="var(--art-chocolate)" strokeLinecap="round" strokeLinejoin="round">
          <path d="M137 151C151 132 174 135 180 152C187 130 210 133 221 149C235 172 195 191 181 203C165 190 125 172 137 151Z" strokeWidth="5.5" transform="translate(0 -28)" />
          <path d="M141 170C154 182 167 186 179 194" strokeWidth="2" opacity=".55" transform="translate(0 -28)" />
          <path d="M131 90C124 80 125 69 127 64M127 76C117 73 114 66 114 61M128 80C140 79 144 72 144 67" strokeWidth="3" />
          <path d="M222 176C230 184 233 194 232 203M228 190C217 187 213 192 212 197M230 184C241 180 245 185 247 189" strokeWidth="3" />
          <circle cx="151" cy="84" r="2" fill="var(--art-chocolate)" stroke="none" />
          <circle cx="219" cy="95" r="3" fill="var(--art-chocolate)" stroke="none" />
          <circle cx="146" cy="185" r="2.5" fill="var(--art-chocolate)" stroke="none" />
        </g>
      )}
    </svg>
  );
}
