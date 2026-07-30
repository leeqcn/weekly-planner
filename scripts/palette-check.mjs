// 量调色板里两两之间的感知差异（CIEDE2000），别靠眼睛估。
//   node scripts/palette-check.mjs
// 经验阈值：ΔE < 5 基本分不出，5–10 要盯着看，> 10 一眼能分开。
const srgbToLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const linToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)

function hexToLab(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => srgbToLin(parseInt(hex.slice(i, i + 2), 16) / 255))
  // sRGB -> XYZ (D65)
  const X = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
  const Y = r * 0.2126729 + g * 0.7151522 + b * 0.072175
  const Z = r * 0.0193339 + g * 0.119192 + b * 0.9503041
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29)
  const fx = f(X / 0.95047)
  const fy = f(Y / 1)
  const fz = f(Z / 1.08883)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

function labToHex([L, a, bb]) {
  const fy = (L + 16) / 116
  const fx = fy + a / 500
  const fz = fy - bb / 200
  const inv = (t) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (841 / 108))
  const X = inv(fx) * 0.95047
  const Y = L > 8 ? fy ** 3 : L / (841 / 108)
  const Z = inv(fz) * 1.08883
  const rgb = [
    X * 3.2404542 + Y * -1.5371385 + Z * -0.4985314,
    X * -0.969266 + Y * 1.8760108 + Z * 0.041556,
    X * 0.0556434 + Y * -0.2040259 + Z * 1.0572252,
  ].map((v) => Math.round(Math.min(1, Math.max(0, linToSrgb(v))) * 255))
  return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('')
}

export const lch = (L, C, h) =>
  labToHex([L, C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)])

/** CIEDE2000 */
export function deltaE(hex1, hex2) {
  const [L1, a1, b1] = hexToLab(hex1)
  const [L2, a2, b2] = hexToLab(hex2)
  const C1 = Math.hypot(a1, b1)
  const C2 = Math.hypot(a2, b2)
  const Cb = (C1 + C2) / 2
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)))
  const ap1 = a1 * (1 + G)
  const ap2 = a2 * (1 + G)
  const Cp1 = Math.hypot(ap1, b1)
  const Cp2 = Math.hypot(ap2, b2)
  const deg = (r) => ((r * 180) / Math.PI + 360) % 360
  const hp1 = Cp1 === 0 ? 0 : deg(Math.atan2(b1, ap1))
  const hp2 = Cp2 === 0 ? 0 : deg(Math.atan2(b2, ap2))
  const dLp = L2 - L1
  const dCp = Cp2 - Cp1
  let dhp = 0
  if (Cp1 * Cp2 !== 0) {
    dhp = hp2 - hp1
    if (dhp > 180) dhp -= 360
    else if (dhp < -180) dhp += 360
  }
  const dHp = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dhp * Math.PI) / 360)
  const Lb = (L1 + L2) / 2
  const Cpb = (Cp1 + Cp2) / 2
  let hpb = hp1 + hp2
  if (Cp1 * Cp2 !== 0) {
    if (Math.abs(hp1 - hp2) > 180) hpb += hp1 + hp2 < 360 ? 360 : -360
    hpb /= 2
  }
  const T =
    1 -
    0.17 * Math.cos(((hpb - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * hpb * Math.PI) / 180) +
    0.32 * Math.cos(((3 * hpb + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * hpb - 63) * Math.PI) / 180)
  const dTh = 30 * Math.exp(-(((hpb - 275) / 25) ** 2))
  const Rc = 2 * Math.sqrt(Cpb ** 7 / (Cpb ** 7 + 25 ** 7))
  const Sl = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2)
  const Sc = 1 + 0.045 * Cpb
  const Sh = 1 + 0.015 * Cpb * T
  const Rt = -Math.sin((2 * dTh * Math.PI) / 180) * Rc
  return Math.sqrt(
    (dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh),
  )
}

export function contrast(h1, h2) {
  const lum = (h) => {
    const [r, g, b] = [1, 3, 5].map((i) => srgbToLin(parseInt(h.slice(i, i + 2), 16) / 255))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [x, y] = [lum(h1), lum(h2)].sort((a, b) => b - a)
  return (x + 0.05) / (y + 0.05)
}

/** 两两之间最小的 ΔE，以及最接近的那一对 */
export function worstPair(entries) {
  let worst = { d: Infinity }
  for (let i = 0; i < entries.length; i++)
    for (let j = i + 1; j < entries.length; j++) {
      const d = deltaE(entries[i][1], entries[j][1])
      if (d < worst.d) worst = { d, a: entries[i][0], b: entries[j][0] }
    }
  return worst
}

export function report(title, entries) {
  console.log(`\n${title}`)
  const pairs = []
  for (let i = 0; i < entries.length; i++)
    for (let j = i + 1; j < entries.length; j++)
      pairs.push([deltaE(entries[i][1], entries[j][1]), entries[i][0], entries[j][0]])
  pairs.sort((x, y) => x[0] - y[0])
  for (const [d, a, b] of pairs.slice(0, 6)) {
    const flag = d < 5 ? '✗ 分不出' : d < 10 ? '⚠ 要盯着看' : '✓'
    console.log(`  ${a} ↔ ${b}`.padEnd(24), `ΔE ${d.toFixed(1).padStart(5)}  ${flag}`)
  }
  console.log(`  最小 ΔE = ${pairs[0][0].toFixed(1)}`)
}

// 直接跑就检查当前这版调色板
if (import.meta.url === `file://${process.argv[1]}`) {
  const { COLORS } = await import('../src/lib/colors.js')
  const entries = Object.values(COLORS)
  report(
    '块底（时间轴上真正看到的那一档）:',
    entries.map((c) => [c.label, c.block]),
  )
  report('圆点:', entries.map((c) => [c.label, c.dot]))
  console.log(
    '\n块底压深色标题的最低对比度:',
    Math.min(...entries.map((c) => contrast(c.block, '#3c3733'))).toFixed(1),
  )
}
