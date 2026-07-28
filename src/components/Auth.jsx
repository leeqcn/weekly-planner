import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/** Step1 只做邮箱 magic link 登录，够用就行。 */
export default function Auth() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState({ status: 'idle', message: '' })

  async function signIn(e) {
    e.preventDefault()
    setState({ status: 'sending', message: '' })
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setState(
      error
        ? { status: 'error', message: error.message }
        : { status: 'sent', message: '登录链接已发到邮箱，点开即可。' },
    )
  }

  return (
    <div className="auth">
      <form className="card auth-card" onSubmit={signIn}>
        <h1>Weekly Planner</h1>
        <p className="muted">用邮箱登录，链接会发到你的收件箱。</p>
        <label htmlFor="auth-email">邮箱</label>
        <input
          id="auth-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <button className="primary" type="submit" disabled={state.status === 'sending'}>
          {state.status === 'sending' ? '发送中…' : '发送登录链接'}
        </button>
        {state.message && (
          <p className={state.status === 'error' ? 'error-text' : 'muted'}>
            {state.message}
          </p>
        )}
      </form>
    </div>
  )
}
