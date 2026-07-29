import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

/**
 * 把打包产物的文件清单写进 dist/sw.js。
 *
 * service worker 要到页面 load 之后才注册，首次访问加载的那批 JS/CSS
 * 不会经过它的 fetch 处理，所以只靠运行时缓存的话，装完当场断网就是白屏。
 * 清单的哈希同时当版本号用：资源一变，缓存名就变，旧缓存在 activate 里被清掉。
 */
function precacheServiceWorker() {
  let outDir = 'dist'
  return {
    name: 'precache-service-worker',
    apply: 'build',
    configResolved(config) {
      // 用真实的 outDir，不要写死 'dist' —— 临时的 --ssr 小打包输出到别处，
      // 写死的话会去处理上一次残留的 dist/sw.js，占位行早被替换过就报错
      outDir = config.build.outDir
    },
    closeBundle() {
      const dist = resolve(outDir)
      const swPath = join(dist, 'sw.js')
      // 只对正经的应用打包生效；临时的 --ssr 小打包没有 sw.js，跳过
      if (!existsSync(swPath)) return

      const files = []
      const walk = (dir) => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name)
          if (statSync(full).isDirectory()) walk(full)
          else files.push('/' + relative(dist, full).split(sep).join('/'))
        }
      }
      walk(dist)

      const precache = ['/', ...files.filter((f) => f !== '/sw.js')].sort()
      const version = createHash('sha256')
        .update(precache.join('\n'))
        .digest('hex')
        .slice(0, 12)

      const source = readFileSync(swPath, 'utf8')
      const out = source
        .replace(/^const VERSION = .*$/m, `const VERSION = '${version}'`)
        .replace(/^const PRECACHE = .*$/m, `const PRECACHE = ${JSON.stringify(precache)}`)

      if (out === source) {
        throw new Error('sw.js 里的 VERSION / PRECACHE 占位行没匹配上，预缓存会失效')
      }
      writeFileSync(swPath, out)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), precacheServiceWorker()],
})
