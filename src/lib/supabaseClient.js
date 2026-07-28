import { createClient } from '@supabase/supabase-js'

// Vite 语法：import.meta.env，不是 process.env。
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** 没配 .env.local 时整个 App 自动退回本地 mock 模式。 */
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null
