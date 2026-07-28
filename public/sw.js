// 手写的 service worker，没用 vite-plugin-pwa —— 依赖越少越好。
// 目标只有一个：装到桌面后离线还能打开外壳。数据本来就要联网。
// 下面这两行会在构建时被 vite.config.js 里的插件替换成真实的版本号和文件清单。
// 必须预缓存：service worker 是页面 load 之后才注册的，首次访问那批资源
// 根本没经过它的 fetch 处理，不预缓存的话第一次断网就是白屏。
const VERSION = 'dev'
const PRECACHE = ['/', '/index.html']

const CACHE = `weekly-planner-${VERSION}`
const SHELL = '/index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

function put(request, response) {
  caches.open(CACHE).then((cache) => cache.put(request, response)).catch(() => {})
}

/**
 * ignoreVary 是必须的：预缓存时 cache.addAll 发的请求不带 Origin，
 * 而页面上带 crossorigin 的 module / stylesheet 请求带 Origin。
 * 静态服务器（Vite preview、Vercel 都会）回一个 Vary: Origin，
 * 默认的匹配规则就会认为这两个请求对不上，缓存明明有也读不到。
 */
const lookup = (key) => caches.match(key, { ignoreVary: true })

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  // Supabase 是跨域请求 —— 一律直连，不拦截也不缓存。
  // 缓存登录态或接口数据只会带来过期数据和莫名其妙的 bug。
  if (new URL(request.url).origin !== self.location.origin) return

  event.respondWith(
    request.mode === 'navigate' ? handleNavigate(request) : handleAsset(request),
  )
})

/** 页面导航：优先联网拿最新的，断网时回落到缓存的外壳。 */
async function handleNavigate(request) {
  try {
    const response = await fetch(request)
    put(request, response.clone())
    return response
  } catch {
    const cached = await lookup(SHELL)
    return cached ?? new Response('离线，而且没有缓存的页面。', { status: 503 })
  }
}

/** 静态资源：缓存优先（Vite 文件名带 hash，不会拿到旧版本），后台再更新一份。 */
async function handleAsset(request) {
  const cached = await lookup(request)
  if (cached) {
    revalidate(request)
    return cached
  }
  try {
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') put(request, response.clone())
    return response
  } catch {
    return new Response('', { status: 504, statusText: 'offline' })
  }
}

function revalidate(request) {
  fetch(request)
    .then((response) => {
      if (response.ok && response.type === 'basic') put(request, response.clone())
    })
    .catch(() => {})
}
