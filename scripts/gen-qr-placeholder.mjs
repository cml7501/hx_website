// 生成微信二维码占位 PNG（浅灰底），用户把自己的二维码覆盖 public/assets/img/wechat-qr.png 即可
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 240, H = 240;
const raw = Buffer.alloc(H * (1 + W * 3) + 1);
let off = 0;
for (let y = 0; y < H; y++) {
  raw[off++] = 0; // filter none
  for (let x = 0; x < W; x++) {
    const border = x < 4 || y < 4 || x >= W - 4 || y >= H - 4;
    const c = border ? [10, 77, 163] : [238, 243, 249];
    raw[off++] = c[0]; raw[off++] = c[1]; raw[off++] = c[2];
  }
}
const crc32 = (buf) => {
  let c, table = [];
  for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);
writeFileSync('public/assets/img/wechat-qr.png', png);
console.log('wechat-qr.png 占位已生成');
