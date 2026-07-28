import { createClient } from '@supabase/supabase-js'

// Vite 语法：import.meta.env，不是 process.env。
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 配了 Supabase 但想继续用本地假数据调 UI 时，在 .env.local 里加 VITE_USE_MOCK=1。
const forceMock = import.meta.env.VITE_USE_MOCK === '1'

/** 没配 .env.local（或强制 mock）时整个 App 走本地 mock 模式。 */
export const isSupabaseConfigured = Boolean(url && anonKey) && !forceMock

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null
