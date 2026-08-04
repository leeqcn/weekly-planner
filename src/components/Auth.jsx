import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Google 登录为主，邮箱 magic link 兜底。
 *
 * 注意：redirectTo 必须出现在 Supabase 的 Authentication → URL Configuration
 * → Redirect URLs 白名单里，否则 Supabase 会**静默忽略**它、退回到 Site URL。
 * 「点了登录链接却回不到本站」几乎都是这个原因 —— 不会报错，只是回错地方。
 */
export default function Auth() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState({ status: 'idle', message: '' })

  const redirectTo = window.location.origin

  async function signInWithGoogle() {
    setState({ status: 'redirecting', message: '' })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) setState({ status: 'error', message: error.message })
  }

  async function signInWithEmail(e) {
    e.preventDefault()
    setState({ status: 'sending', message: '' })
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    setState(
      error
        ? { status: 'error', message: error.message }
        : {
            status: 'sent',
            message: '登录链接已发到邮箱。如果点开后跳到了别的站点，看下面那行说明。',
          },
    )
  }

  const busy = state.status === 'redirecting' || state.status === 'sending'

  return (
    <div className="auth">
      <div className="card auth-card">
        <h1>Weekly Planner</h1>

        <button
          className="google-btn"
          type="button"
          onClick={signInWithGoogle}
          disabled={busy}
        >
          <GoogleMark />
          {state.status === 'redirecting' ? '跳转中…' : '用 Google 登录'}
        </button>

        <div className="auth-divider">
          <span>或</span>
        </div>

        <form className="auth-email" onSubmit={signInWithEmail}>
          <label htmlFor="auth-email">邮箱登录链接</label>
          <div className="row-gap">
            <input
              id="auth-email"
              className="grow"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <button type="submit" disabled={busy}>
              {state.status === 'sending' ? '发送中…' : '发送'}
            </button>
          </div>
        </form>

        {state.message && (
          <p className={state.status === 'error' ? 'error-text' : 'muted'}>
            {state.message}
          </p>
        )}

        <p className="muted small auth-hint">
          点了登录链接却没回到这里？去 Supabase → Authentication → URL
          Configuration → Redirect URLs，把 <code>{redirectTo}/**</code> 加进白名单。
          不在白名单里的地址会被静默忽略，直接退回 Site URL。
        </p>
      </div>
    </div>
  )
}

/** Google 的官方 G 标，按品牌规范登录按钮要用彩色版本。 */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}
