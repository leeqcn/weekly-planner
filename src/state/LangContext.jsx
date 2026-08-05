import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { initialLang, makeT, saveLang, setActiveLang } from '../lib/i18n'

const Ctx = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang)

  // 在 render 阶段同步给模块级的 t()，保证子树这一帧就用新语言
  setActiveLang(lang)

  // <html lang> 也要跟着：影响断行、屏幕朗读、以及浏览器要不要弹「翻译此页」。
  // 首次加载也得设 —— index.html 里写死的是 zh-CN
  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'
  }, [lang])

  const value = useMemo(
    () => ({
      lang,
      t: makeT(lang),
      setLang: (next) => {
        saveLang(next)
        setLangState(next)
      },
    }),
    [lang],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** 任何组件里 `const { t, lang } = useLang()`。 */
export function useLang() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLang 必须放在 <LangProvider> 里面')
  return v
}
