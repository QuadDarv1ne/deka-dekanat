// Генерация PNG-иконок PWA из public/icon.svg (sharp рендерит SVG через libvips).
// Запуск: node scripts/pwa-icons.mjs  (sharp уже в node_modules проекта)
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const svg = path.join(root, "public", "icon.svg");
const out = path.join(root, "public");
await mkdir(out, { recursive: true });

// 1) Обычные иконки (any)
for (const size of [180, 192, 512]) {
  await sharp(svg, { density: 400 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(out, size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`));
  console.log(`icon ${size}px ✓`);
}

// 2) Maskable: логотип на сплошном фирменном фоне, ~78% площади (safe zone)
const logo = await sharp(svg, { density: 400 }).resize(400, 400).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: { r: 15, g: 118, b: 110, alpha: 1 } }, // #0f766e
})
  .composite([{ input: logo, gravity: "centre" }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(out, "icon-maskable-512.png"));
console.log("maskable 512px ✓");
