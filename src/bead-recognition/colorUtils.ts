/**
 * 颜色工具：RGB ↔ LAB，Delta-E 2000
 * 使用 D65 光源，CIE 标准
 */

/**
 * sRGB [0-255] 转线性 RGB [0-1]
 */
function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * 线性 RGB 转 XYZ（D65）
 */
function linearRgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const M = [
    [0.4124564, 0.3575761, 0.1804375],
    [0.2126729, 0.7151522, 0.072175],
    [0.0193339, 0.119192, 0.9503041],
  ];
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);
  const x = M[0][0] * rl + M[0][1] * gl + M[0][2] * bl;
  const y = M[1][0] * rl + M[1][1] * gl + M[1][2] * bl;
  const z = M[2][0] * rl + M[2][1] * gl + M[2][2] * bl;
  return [x, y, z];
}

/**
 * XYZ 转 LAB（D65 白点）
 */
function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const d65 = [0.95047, 1, 1.08883];
  const f = (t: number) => (t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116);
  const xn = x / d65[0];
  const yn = y / d65[1];
  const zn = z / d65[2];
  const L = 116 * f(yn) - 16;
  const a = 500 * (f(xn) - f(yn));
  const b = 200 * (f(yn) - f(zn));
  return [L, a, b];
}

/**
 * RGB [0-255] 转 LAB
 * @param rgb 长度为 3 的数组 [r, g, b]
 */
export function rgbToLab(rgb: number[]): [number, number, number] {
  const [r, g, b] = rgb;
  const [x, y, z] = linearRgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

/**
 * 十六进制颜色转 RGB [0-255]
 */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, "");
  const n = parseInt(h, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return [r, g, b];
}

/**
 * CIE Delta-E 2000
 * @param lab1 LAB [L, a, b]
 * @param lab2 LAB [L, a, b]
 */
export function deltaE2000(
  lab1: [number, number, number],
  lab2: [number, number, number]
): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + 6103515625)));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const h1p = Math.atan2(b1, a1p) * (180 / Math.PI);
  const h2p = Math.atan2(b2, a2p) * (180 / Math.PI);
  const H1p = h1p >= 0 ? h1p : h1p + 360;
  const H2p = h2p >= 0 ? h2p : h2p + 360;
  const dL = L2 - L1;
  const dC = C2p - C1p;
  let dH = H2p - H1p;
  if (Math.abs(dH) > 180) dH += dH > 0 ? -360 : 360;
  dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dH * Math.PI) / 360);

  const Lb = (L1 + L2) / 2;
  const Cb2 = (C1p + C2p) / 2;
  let Hb = H1p + H2p;
  if (Math.abs(H1p - H2p) > 180) Hb += 360;
  Hb /= 2;

  const T =
    1 -
    0.17 * Math.cos((Hb - 30) * (Math.PI / 180)) +
    0.24 * Math.cos(2 * Hb * (Math.PI / 180)) +
    0.32 * Math.cos((3 * Hb + 6) * (Math.PI / 180)) -
    0.2 * Math.cos((4 * Hb - 63) * (Math.PI / 180));
  const dTheta = 30 * Math.exp(-Math.pow((Hb - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(Cb2, 7) / (Math.pow(Cb2, 7) + 6103515625));
  const Sl = 1 + (0.015 * Math.pow(Lb - 50, 2)) / Math.sqrt(20 + Math.pow(Lb - 50, 2));
  const Sc = 1 + 0.045 * Cb2;
  const Sh = 1 + 0.015 * Cb2 * T;
  const Rt = -Math.sin((2 * dTheta * Math.PI) / 180) * Rc;

  const dE =
    Math.pow(dL / Sl, 2) + Math.pow(dC / Sc, 2) + Math.pow(dH / Sh, 2) + Rt * (dC / Sc) * (dH / Sh);
  return Math.sqrt(dE);
}

/**
 * RGB [0-255] 转十六进制
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const h = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return h.length === 1 ? "0" + h : h;
  };
  return "#" + toHex(r) + toHex(g) + toHex(b);
}
