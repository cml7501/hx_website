// 解析 MP4 容器：定位 moov，报告视频轨编码 fourcc 与关键 box
import { readFileSync } from 'node:fs';

const file = process.argv[2];
const buf = readFileSync(file);

function findBox(buf, type, start = 0, end = buf.length) {
  for (let p = start; p + 8 <= end;) {
    const size32 = buf.readUInt32BE(p);
    const t = buf.toString('latin1', p + 4, p + 8);
    let size = size32, hdr = 8;
    if (size32 === 1) { size = Number(buf.readBigUInt64BE(p + 8)); hdr = 16; }
    else if (size32 === 0) { size = end - p; }
    if (t === type) return { start: p, size, contentStart: p + hdr };
    if (size < 8) break;
    p += size;
  }
  return null;
}

const ftyp = findBox(buf, 'ftyp');
const brands = ftyp ? buf.toString('latin1', ftyp.contentStart, ftyp.contentStart + 12).replace(/\0/g, ' ') : '?';
const moov = findBox(buf, 'moov');
console.log('file:', file);
console.log('ftyp brands:', brands);
if (!moov) { console.log('moov 不存在（可能流式媒体，元数据在末尾）'); process.exit(0); }

const moovBuf = buf.subarray(moov.start, moov.start + moov.size);
const codecs = ['avc1', 'avc3', 'hev1', 'hvc1', 'mp4v', 'vp09', 'av01', 'dvh1', 'dvhe', 's263'];
const markers = ['avcC', 'hvcC', 'vpcC', 'dvCC'];
for (const c of [...codecs, ...markers]) {
  const idx = moovBuf.indexOf(Buffer.from(c, 'latin1'));
  if (idx !== -1) console.log('moov 内出现:', c);
}
// 尝试逐 trak 找 stsd 的第一个条目 fourcc
let p = 8;
let track = 0;
while (p + 8 <= moovBuf.length) {
  const size = moovBuf.readUInt32BE(p);
  const t = moovBuf.toString('latin1', p + 4, p + 8);
  if (t === 'trak') {
    track++;
    const trakBuf = moovBuf.subarray(p, p + size);
    const stsd = findBox(trakBuf, 'stsd');
    if (stsd) {
      const entryFourcc = trakBuf.toString('latin1', stsd.contentStart + 8, stsd.contentStart + 12);
      console.log(`trak#${track} stsd 条目编码:`, entryFourcc);
    }
  }
  if (size < 8) break;
  p += size;
}
