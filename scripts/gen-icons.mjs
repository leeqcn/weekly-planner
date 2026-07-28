// 生成 PWA 图标。playwright 只是开发时用来把 SVG 光栅化成 PNG 的，
// 不在项目依赖里 —— 需要时 `npm i -D playwright` 再跑：
//   node scripts/gen-icons.mjs
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const BROWN = '#6b4f34', PAGE = '#fbf8f2', BLOCK = '#a98a63', RULE = '#ddd3c0', OK = '#4f9d5d'

/** 一张纸 + 七根等高的列 = 一周七天，其中一天是绿色（已完成）。 */
function mark() {
  const W = 32, GAP = 14, X0 = 26
  let s = `<rect width="360" height="360" rx="44" fill="${PAGE}"/>`
  s += `<path d="M30 70 H330" stroke="${RULE}" stroke-width="11" stroke-linecap="round"/>`
  for (let i = 0; i < 7; i++)
    s += `<rect x="${X0 + i * (W + GAP)}" y="116" width="${W}" height="202" rx="13" fill="${i === 3 ? OK : BLOCK}"/>`
  return s
}

/** page = 内页边长（512 画布内）；radius = 外框圆角，0 = 满幅 */
const svg = ({ page, radius }) => {
  const off = (512 - page) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="${radius}" fill="${BROWN}"/>
  <g transform="translate(${off} ${off}) scale(${(page / 360).toFixed(4)})">${mark()}</g>
</svg>`
}

// 圆角版（普通图标 / favicon）、满幅版（maskable：内容要留在中间 80% 的安全区内）
const ROUNDED = svg({ page: 360, radius: 112 })
const MASKABLE = svg({ page: 288, radius: 0 })
const APPLE = svg({ page: 330, radius: 0 })

const out = new URL('../public', import.meta.url).pathname
writeFileSync(`${out}/favicon.svg`, ROUNDED + '\n')

const jobs = [
  ['icon-192.png', ROUNDED, 192],
  ['icon-512.png', ROUNDED, 512],
  ['icon-maskable-512.png', MASKABLE, 512],
  ['apple-touch-icon.png', APPLE, 180],
]

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
for (const [name, source, size] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${source}`,
  )
  await page.screenshot({ path: `${out}/${name}`, omitBackground: true })
  await page.close()
  console.log('wrote', name, size)
}
await browser.close()
