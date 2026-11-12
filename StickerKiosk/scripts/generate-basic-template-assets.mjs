import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

// Original vector artwork for database-backed catalog entries. The application
// must load these URLs from API records, never use this manifest as a fallback.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetRoot = join(projectRoot, 'public', 'catalog', 'basic');
const documentRoot = join(projectRoot, 'docs');
const imageSize = 600;
const supersampling = 3;
const canvasSize = imageSize * supersampling;
const ink = [91, 47, 32];
const highlight = [161, 103, 73];

function sample(count, pointAt) {
  return Array.from({ length: count + 1 }, (_, index) => pointAt(index / count));
}

function fit(points, radius = 0.98) {
  const xMin = Math.min(...points.map(point => point.x));
  const xMax = Math.max(...points.map(point => point.x));
  const yMin = Math.min(...points.map(point => point.y));
  const yMax = Math.max(...points.map(point => point.y));
  const centerX = (xMin + xMax) / 2;
  const centerY = (yMin + yMax) / 2;
  const extent = Math.max(...points.map(point => Math.hypot(point.x - centerX, point.y - centerY)));
  return points.map(point => ({ x: (point.x - centerX) / extent * radius, y: (point.y - centerY) / extent * radius }));
}

const drawings = [
  {
    slug: 'heart',
    name: 'Trái tim cơ bản',
    description: 'Một đường chocolate khép kín tạo hình trái tim.',
    paths: [fit(sample(200, value => {
      const angle = value * Math.PI * 2;
      return { x: 16 * Math.sin(angle) ** 3, y: -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)) };
    }), 0.92)],
  },
  {
    slug: 'flower',
    name: 'Bông hoa năm cánh',
    description: 'Bông hoa năm cánh cùng vòng nhụy nhỏ ở giữa.',
    paths: [
      sample(240, value => {
        const angle = value * Math.PI * 2;
        const radius = 0.71 + 0.23 * Math.cos(angle * 5);
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      }),
      sample(64, value => ({ x: Math.cos(value * Math.PI * 2) * 0.14, y: Math.sin(value * Math.PI * 2) * 0.14 })),
    ],
  },
  {
    slug: 'spiral',
    name: 'Xoắn ốc chocolate',
    description: 'Nét chocolate xoắn ba vòng từ tâm dĩa ra ngoài.',
    paths: [sample(300, value => {
      const angle = value * Math.PI * 6;
      const radius = 0.04 + value * 0.9;
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    })],
  },
  {
    slug: 'waves',
    name: 'Ba đường sóng',
    description: 'Ba nét sóng song song, bố cục nhẹ ở giữa dĩa.',
    paths: [-0.38, 0, 0.38].map(offset => sample(140, value => ({ x: (value * 2 - 1) * 0.79, y: offset + Math.sin(value * Math.PI * 4) * 0.13 }))),
  },
];

function distanceSquared(x, y, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - start.x) * dx + (y - start.y) * dy) / lengthSquared));
  return (x - start.x - ratio * dx) ** 2 + (y - start.y - ratio * dy) ** 2;
}

function lineMask(paths, width, offsetX = 0, offsetY = 0) {
  const mask = new Uint8Array(canvasSize * canvasSize);
  const radius = width * supersampling / 2;
  const radiusSquared = radius * radius;
  for (const path of paths) {
    const pixels = path.map(point => ({ x: (300 + point.x * 240 + offsetX) * supersampling, y: (300 + point.y * 240 + offsetY) * supersampling }));
    for (let index = 1; index < pixels.length; index++) {
      const start = pixels[index - 1];
      const end = pixels[index];
      const xMin = Math.max(0, Math.floor(Math.min(start.x, end.x) - radius));
      const xMax = Math.min(canvasSize - 1, Math.ceil(Math.max(start.x, end.x) + radius));
      const yMin = Math.max(0, Math.floor(Math.min(start.y, end.y) - radius));
      const yMax = Math.min(canvasSize - 1, Math.ceil(Math.max(start.y, end.y) + radius));
      for (let y = yMin; y <= yMax; y++) for (let x = xMin; x <= xMax; x++) {
        if (distanceSquared(x + 0.5, y + 0.5, start, end) <= radiusSquared) mask[y * canvasSize + x] = 255;
      }
    }
  }
  return mask;
}

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ crc >>> 1 : crc >>> 1;
  return crc >>> 0;
});
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const value of buffer) crc = crcTable[(crc ^ value) & 0xff] ^ crc >>> 8;
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(name, payload) {
  const type = Buffer.from(name);
  const length = Buffer.alloc(4); length.writeUInt32BE(payload.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([type, payload])));
  return Buffer.concat([length, type, payload, checksum]);
}

function png(paths) {
  const bodyMask = lineMask(paths, 8.5);
  const lightMask = lineMask(paths, 2.3, -1.1, -1.2);
  const scanlines = Buffer.alloc((imageSize * 4 + 1) * imageSize);
  for (let y = 0; y < imageSize; y++) {
    const rowOffset = y * (imageSize * 4 + 1);
    for (let x = 0; x < imageSize; x++) {
      let coverage = 0; let light = 0;
      for (let sy = 0; sy < supersampling; sy++) for (let sx = 0; sx < supersampling; sx++) {
        const index = (y * supersampling + sy) * canvasSize + x * supersampling + sx;
        coverage += bodyMask[index];
        light += bodyMask[index] ? lightMask[index] : 0;
      }
      const alpha = Math.round(coverage / (supersampling * supersampling));
      const mix = coverage ? light / coverage * 0.55 : 0;
      const pixel = rowOffset + 1 + x * 4;
      for (let channel = 0; channel < 3; channel++) scanlines[pixel + channel] = Math.round(ink[channel] * (1 - mix) + highlight[channel] * mix);
      scanlines[pixel + 3] = alpha;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(imageSize, 0); header.writeUInt32BE(imageSize, 4);
  header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(scanlines)), chunk('IEND', Buffer.alloc(0))]);
}

const fixed = value => Number(value.toFixed(3));
function svgPath(points) { return points.map((point, index) => `${index ? 'L' : 'M'}${fixed(300 + point.x * 240)},${fixed(300 + point.y * 240)}`).join(' '); }
function svg(drawing) {
  const paths = drawing.paths.map(points => `<path d="${svgPath(points)}"/>`).join('\n    ');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" role="img" aria-labelledby="title description">\n  <title id="title">${drawing.name}</title>\n  <desc id="description">${drawing.description} Artwork on a transparent background.</desc>\n  <g fill="none" stroke="#5b2f20" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round">\n    ${paths}\n  </g>\n  <g transform="translate(-1.1 -1.2)" fill="none" stroke="#a16749" stroke-opacity="0.55" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">\n    ${paths}\n  </g>\n</svg>\n`;
}
function gcode(drawing) {
  const lines = [
    '; VISUAL PREVIEW ONLY - NOT MACHINE CALIBRATED - DO NOT RUN ON HARDWARE',
    '; Original ChocoRobot basic catalog artwork: ' + drawing.slug,
    '; Reference plate: round, diameter 200 mm; origin at lower-left of a 200 x 200 mm bounding square.',
    '; XY points stay inside an 80 mm radius around X100 Y100.',
    '; Y is inverted relative to the PNG/SVG screen coordinates.',
    '; Z levels distinguish travel and drawing for preview only; there are no heater, valve, motor or extrusion commands.',
    '; This file does not define a real machine, work offset, tool, calibration or production-safe process.',
    'G21', 'G90',
  ];
  for (const [index, points] of drawing.paths.entries()) {
    const millimeters = points.map(point => ({ x: fixed(100 + point.x * 80), y: fixed(100 - point.y * 80) }));
    lines.push('; Stroke ' + (index + 1), 'G0 Z5', `G0 X${millimeters[0].x} Y${millimeters[0].y}`, 'G1 Z1 F300');
    for (const point of millimeters.slice(1)) lines.push(`G1 X${point.x} Y${point.y} F600`);
    lines.push('G0 Z5');
  }
  return lines.join('\n') + '\n';
}

mkdirSync(assetRoot, { recursive: true });
mkdirSync(documentRoot, { recursive: true });
const templates = drawings.map(drawing => {
  for (const points of drawing.paths) for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || Math.hypot(point.x, point.y) > 1) throw new Error('Invalid drawing bounds: ' + drawing.slug);
  }
  writeFileSync(join(assetRoot, drawing.slug + '.png'), png(drawing.paths));
  writeFileSync(join(assetRoot, drawing.slug + '.svg'), svg(drawing));
  writeFileSync(join(assetRoot, drawing.slug + '-preview.gcode'), gcode(drawing));
  return {
    name: drawing.name, slug: drawing.slug, description: drawing.description,
    imagePath: '/catalog/basic/' + drawing.slug + '.png',
    svgPath: '/catalog/basic/' + drawing.slug + '.svg',
    gcodePath: '/catalog/basic/' + drawing.slug + '-preview.gcode',
    pointCount: drawing.paths.reduce((total, points) => total + points.length, 0),
    strokeCount: drawing.paths.length,
    image: { width: imageSize, height: imageSize, transparent: true },
    geometry: { units: 'mm', referencePlateDiameter: 200, center: { x: 100, y: 100 }, maximumRadius: 80, previewOnly: true },
  };
});
writeFileSync(join(documentRoot, 'basic-templates-manifest.json'), JSON.stringify({
  version: 1,
  generatedBy: 'scripts/generate-basic-template-assets.mjs',
  purpose: 'Original assets for persisted database catalog records served through the API. Not an application fallback or mock API.',
  previewOnly: true,
  templates,
}, null, 2) + '\n');
writeFileSync(join(assetRoot, 'README.md'), `# Basic chocolate template artwork\n\nFour original geometric designs: heart, five-petal flower, spiral and waves. Each PNG is 600 × 600 RGBA on a transparent background; each SVG remains editable. The PNG, SVG and reference G-code use the same sampled centerline geometry.\n\nRegenerate from the frontend project directory:\n\n\`\`\`powershell\nnode scripts/generate-basic-template-assets.mjs\n\`\`\`\n\nThese files are original project assets prepared for real database catalog records. The application must obtain their URLs from API responses; do not import the manifest as fallback catalog data. The manifest is at \`docs/basic-templates-manifest.json\`.\n\nThe \`*-preview.gcode\` files are **visual reference only**, not calibrated or safe to execute on a robot. They contain millimeter geometry for a reference 200 mm round plate, with travel/drawing Z levels, and no heater, valve or extrusion commands. They do not define machine calibration, limits, a tool or a production process. Validate and generate hardware-specific instructions separately before production.\n\nNo external image, font or model is used to generate this artwork.\n`);
console.log(JSON.stringify(templates.map(({ name, slug, pointCount, strokeCount }) => ({ name, slug, pointCount, strokeCount })), null, 2));
