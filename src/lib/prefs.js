/**
 * 本机偏好。不进数据库 —— 这些是「这台设备上我想怎么看」，不是数据。
 *
 * 用最小的订阅式 store 而不是 Context：提示开关散落在七八个组件里，
 * 为它套一层 Provider 不划算，而 useSyncExternalStore 天生就是干这个的。
 */

const KEY = 'weekly-planner:hints'

const read = () => {
  try {
    return localStorage.getItem(KEY) !== '0'
  } catch {
    return true // 隐私模式下读不到，当成开着
  }
}

let hintsOn = read()
const subs = new Set()

export const getHints = () => hintsOn

export const setHints = (on) => {
  hintsOn = on
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    // 存不下就只在这次会话里生效
  }
  subs.forEach((f) => f())
}

export const subscribeHints = (f) => {
  subs.add(f)
  return () => subs.delete(f)
}
