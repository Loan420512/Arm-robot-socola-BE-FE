# Basic chocolate template artwork

Four original geometric designs: heart, five-petal flower, spiral and waves. Each PNG is 600 × 600 RGBA on a transparent background; each SVG remains editable. The PNG, SVG and reference G-code use the same sampled centerline geometry.

Regenerate from the frontend project directory:

```powershell
node scripts/generate-basic-template-assets.mjs
```

These files are original project assets prepared for real database catalog records. The application must obtain their URLs from API responses; do not import the manifest as fallback catalog data. The manifest is at `docs/basic-templates-manifest.json`.

The `*-preview.gcode` files are **visual reference only**, not calibrated or safe to execute on a robot. They contain millimeter geometry for a reference 200 mm round plate, with travel/drawing Z levels, and no heater, valve or extrusion commands. They do not define machine calibration, limits, a tool or a production process. Validate and generate hardware-specific instructions separately before production.

No external image, font or model is used to generate this artwork.
