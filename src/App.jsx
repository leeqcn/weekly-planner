import { useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabaseClient'
import { createMockRepo } from './lib/repo/mock'
import { createSupabaseRepo } from './lib/repo/supabase'
import { buildSeed } from './lib/mockSeed'
import Auth from './components/Auth'
import Planner from './components/Planner'
import { LangProvider, useLang } from './state/LangContext'
import './app.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) =>
      setSession(next),
    )
    return () => data.subscription.unsubscribe()
  }, [])

  // 没配 Supabase 就用本地 mock 数据，UI 照样能跑。
  const repo = useMemo(() => {
    if (!isSupabaseConfigured) return createMockRepo(buildSeed())
    return session ? createSupabaseRepo(session.user.id) : null
  }, [session])

  return (
    <LangProvider>
      {checking ? (
        <Boot />
      ) : !repo ? (
        <Auth />
      ) : (
        <Planner
          key={session?.user.id ?? 'local'}
          repo={repo}
          onSignOut={isSupabaseConfigured ? () => supabase.auth.signOut() : null}
        />
      )}
    </LangProvider>
  )
}

function Boot() {
  const { t } = useLang()
  return <div className="boot">{t('载入中…')}</div>
}
