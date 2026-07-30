import { COLOR_KEYS, colorOf } from '../lib/colors'

/** 一排小圆点选颜色。不选就是默认色。 */
export default function ColorPicker({ value, onChange, label = '颜色' }) {
  return (
    <div className="color-picker">
      <label>{label}</label>
      <div className="color-row">
        {COLOR_KEYS.map((key) => {
          const c = colorOf(key)
          const active = (value ?? 'default') === key
          return (
            <button
              type="button"
              key={key}
              className={`color-dot${active ? ' on' : ''}`}
              style={{ background: c.dot }}
              title={c.label}
              aria-label={c.label}
              onClick={() => onChange(key === 'default' ? null : key)}
            />
          )
        })}
      </div>
    </div>
  )
}
