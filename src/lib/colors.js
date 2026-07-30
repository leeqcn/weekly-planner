/**
 * 事项配色。不选就是默认色（跟着纸张的暖棕），
 * 选了就用这一组 —— 睡觉一个色、工作一个色，一眼分得开。
 *
 * 每个色给两档：block 是块的底色，dot 是选色器和小圆点用的实色。
 */
export const COLORS = {
  default: { label: '默认', block: 'var(--accent-soft)', edge: 'var(--rule-strong)', dot: '#a98a63' },
  blue: { label: '蓝', block: '#dde8f2', edge: '#93b4d2', dot: '#5b8cb8' },
  green: { label: '绿', block: '#dcebdd', edge: '#9dc5a2', dot: '#5b9c63' },
  amber: { label: '黄', block: '#f5e7c8', edge: '#d9bd7a', dot: '#c99a2e' },
  rose: { label: '粉', block: '#f3dde2', edge: '#d59fae', dot: '#c2708a' },
  violet: { label: '紫', block: '#e5dff2', edge: '#b2a3d6', dot: '#8672b8' },
  teal: { label: '青', block: '#d7e9e8', edge: '#8fc0bd', dot: '#4e968f' },
  grey: { label: '灰', block: '#e6e3dd', edge: '#b8b2a7', dot: '#8d867a' },
}

export const COLOR_KEYS = Object.keys(COLORS)

export const colorOf = (key) => COLORS[key] ?? COLORS.default
