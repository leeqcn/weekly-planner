import { useEffect, useState } from 'react'
import { usePlanner } from '../state/usePlanner'
import WeekView from './WeekView'
import DayView from './DayView'
import Settings from './Settings'
import Help from './Help'

export default function Planner({ repo, onSignOut }) {
  const planner = usePlanner(repo)
  const [view, setView] = useState({ name: 'week' })

  // Ctrl/Cmd + Z 也能撤销
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        planner.undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [planner])

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

        <button
          className="ghost help-btn"
          onClick={() => setView({ name: 'help' })}
          title="手势和功能说明"
          aria-label="帮助"
        >
          ?
        </button>
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
        {view.name === 'help' && <Help onBack={() => setView({ name: 'week' })} />}
      </main>

      {/* 固定在右下角：撤销以前在顶栏，页面一长就得往上滑才找得到 */}
      {planner.canUndo && (
        <button
          className="undo-fab"
          onClick={planner.undo}
          title={`撤销：${planner.undoLabel}`}
          aria-label={`撤销：${planner.undoLabel}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9 5 4 10l5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 10h9a5.5 5.5 0 0 1 0 11h-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
