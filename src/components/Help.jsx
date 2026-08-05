import { useLang } from '../state/LangContext'
import HelpZh from './HelpZh'
import HelpEn from './HelpEn'

/**
 * 帮助页按语言分成两份，不走 tr() 的字典。
 *
 * 别处的界面文案是一个词一个短句，逐条翻没问题；这一页是整篇说明文，
 * 逐句翻出来的英文会又生硬又啰嗦。所以中英各写一份，各自说得自然。
 * 代价是加功能时两份都要改 —— 那也是应该的，本来就得两边都讲清楚。
 */
export default function Help({ onBack }) {
  const { lang } = useLang()
  return lang === 'en' ? <HelpEn onBack={onBack} /> : <HelpZh onBack={onBack} />
}
