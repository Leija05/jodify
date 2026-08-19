// Iconos para los botones del thumbar de Windows (barra de tarea).
// Se dibujan como glifos monocromos (blanco con alpha) con supersampling 4x
// y se codifican como PNG puro (sin dependencias), listos para nativeImage.
const zlib = require('zlib');
const { nativeImage } = require('electron');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(rgba, w, h) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filtro None por fila
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---- geometría (coordenadas raw 0..1; el margen se define en cada glifo) ----
function inRect(nx, ny, x0, y0, x1, y1) {
  return nx >= x0 && nx <= x1 && ny >= y0 && ny <= y1;
}

function sign(px, py, ax, ay, bx, by) {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by);
}

function inTriangle(nx, ny, ax, ay, bx, by, cx, cy) {
  const d1 = sign(nx, ny, ax, ay, bx, by);
  const d2 = sign(nx, ny, bx, by, cx, cy);
  const d3 = sign(nx, ny, cx, cy, ax, ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function inHeart(nx, ny) {
  const x = (nx - 0.5) * 2.7;
  const y = (0.5 - ny) * 2.6;
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0;
}

// ---- glifos ----
function glyphPlay(nx, ny) {
  return inTriangle(nx, ny, 0.3, 0.18, 0.3, 0.82, 0.84, 0.5);
}

function glyphPause(nx, ny) {
  return inRect(nx, ny, 0.26, 0.18, 0.44, 0.82) || inRect(nx, ny, 0.56, 0.18, 0.74, 0.82);
}

function glyphPrev(nx, ny) {
  return inRect(nx, ny, 0.2, 0.16, 0.32, 0.84) || inTriangle(nx, ny, 0.78, 0.16, 0.78, 0.84, 0.4, 0.5);
}

function glyphNext(nx, ny) {
  return inRect(nx, ny, 0.68, 0.16, 0.8, 0.84) || inTriangle(nx, ny, 0.22, 0.16, 0.22, 0.84, 0.6, 0.5);
}

function glyphHeart(nx, ny) {
  return inHeart(nx, ny);
}

// ---- render con supersampling 4x y downsample a 32x32 ----
const SS = 4;
const SIZE = 32;

function renderGlyph(glyph) {
  const ss = SIZE * SS;
  const rgba = Buffer.alloc(ss * ss * 4);
  for (let y = 0; y < ss; y++) {
    for (let x = 0; x < ss; x++) {
      if (glyph((x + 0.5) / ss, (y + 0.5) / ss)) {
        const o = (y * ss + x) * 4;
        rgba[o] = 255;
        rgba[o + 1] = 255;
        rgba[o + 2] = 255;
        rgba[o + 3] = 255;
      }
    }
  }
  const out = Buffer.alloc(SIZE * SIZE * 4);
  const n = SS * SS;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let b = 0;
      let g = 0;
      let r = 0;
      let a = 0;
      for (let dy = 0; dy < SS; dy++) {
        for (let dx = 0; dx < SS; dx++) {
          const o = ((y * SS + dy) * ss + (x * SS + dx)) * 4;
          b += rgba[o];
          g += rgba[o + 1];
          r += rgba[o + 2];
          a += rgba[o + 3];
        }
      }
      const o = (y * SIZE + x) * 4;
      out[o] = Math.round(b / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(r / n);
      out[o + 3] = Math.round(a / n);
    }
  }
  return nativeImage.createFromBuffer(encodePng(out, SIZE, SIZE));
}

function createTaskbarIcons() {
  return {
    play: renderGlyph(glyphPlay),
    pause: renderGlyph(glyphPause),
    prev: renderGlyph(glyphPrev),
    next: renderGlyph(glyphNext),
    heart: renderGlyph(glyphHeart),
  };
}

module.exports = { createTaskbarIcons };