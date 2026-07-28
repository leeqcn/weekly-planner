import { useState } from 'react'
import { usePlanner } from '../state/usePlanner'
import WeekView from './WeekView'
import DayView from './DayView'
import Settings from './Settings'

export default function Planner({ repo, onSignOut }) {
  const planner = usePlanner(repo)
  const [view, setView] = useState({ name: 'week' })

  return (
    <div className="app">
      <header className="app-bar">
        <span className="brand">Weekly Planner</span>
        {planner.mode === 'mock' && (
          <span className="badge" title="没有配置 .env.local，数据存在浏览器本地">
            本地模式
          </span>
        )}
        <span className="spacer" />
        {planner.loading && <span className="muted small">载入中…</span>}
        <button className="ghost" onClick={() => setView({ name: 'settings' })}>
          设置
        </button>
        {onSignOut && (
          <button className="ghost" onClick={onSignOut}>
            退出
          </button>
        )}
      </header>

      {planner.error && (
        <div className="error-bar">
          <span>{planner.error}</span>
          <button className="ghost" onClick={planner.clearError}>
            ✕
          </button>
        </div>
      )}

      <main>
        {view.name === 'week' && (
          <WeekView
            planner={planner}
            onOpenDay={(date) => setView({ name: 'day', date })}
          />
        )}
        {view.name === 'day' && (
          <DayView
            planner={planner}
            date={view.date}
            onBack={() => setView({ name: 'week' })}
          />
        )}
        {view.name === 'settings' && (
          <Settings planner={planner} onBack={() => setView({ name: 'week' })} />
        )}
      </main>
    </div>
  )
}
