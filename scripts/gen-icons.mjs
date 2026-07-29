// 生成 PWA 图标。playwright 只是开发时用来把 SVG 光栅化成 PNG 的，
// 不在项目依赖里 —— 需要时 `npm i -D playwright` 再跑：
//   node scripts/gen-icons.mjs
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const BROWN = '#6b4f34'
const PAPER = '#fbf8f2'
const INK = '#7a5c3e'
const OK = '#4f9d5d'

// 故意画歪一点，要的就是儿童画那种手抖的味道
const wob = (n, amp) => Math.sin(n * 12.9898) * amp

/** 一条待办：左边一个点，右边一根手画的横线。做完了就变成对勾 + 划掉的线。 */
function row(i, y, x0, len, done) {
  const cx = x0 + 17
  const cy = y + wob(i + 1, 4)
  const lx = x0 + 44
  const ly = y + wob(i + 2, 4)
  const end = lx + len
  const sag = wob(i + 3, 7)
  const curve = `M${lx} ${ly} Q ${(lx + end) / 2} ${ly + sag} ${end} ${ly + wob(i + 4, 4)}`

  if (done) {
    return (
      `<path d="M${cx - 15} ${cy - 1} l 10 13 l 19 -25" fill="none" stroke="${OK}"
        stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${curve}" fill="none" stroke="${OK}" stroke-width="12"
        stroke-linecap="round" opacity="0.5"/>`
    )
  }
  return (
    `<circle cx="${cx}" cy="${cy}" r="12" fill="${INK}"/>` +
    `<path d="${curve}" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>`
  )
}

/** 一张纸上三条待办，第一条已经打勾。 */
function mark() {
  return (
    `<rect width="360" height="360" rx="46" fill="${PAPER}"/>` +
    row(0, 100, 44, 176, true) +
    row(1, 180, 44, 122, false) +
    row(2, 260, 44, 152, false)
  )
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
