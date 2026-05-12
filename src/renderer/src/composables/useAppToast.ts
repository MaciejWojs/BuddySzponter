import { useI18n } from 'vue-i18n'

export function useAppToast(): {
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  custom: (title: string, description?: string) => void
} {
  const toast = useToast()
  const { t } = useI18n()

  function resolveText(text?: string): string | undefined {
    if (!text?.trim()) return undefined
    // Jeśli wygląda jak klucz i18n, tłumacz
    const looksLikeI18nKey = /^[a-z0-9_-]+(?:\.[a-z0-9_-]+)+$/i.test(text.trim())
    return looksLikeI18nKey ? t(text) : text
  }

  const baseUi = {
    root: [
      'backdrop-blur-xl',
      'bg-[#18102c]/92',
      'border border-[#ffffff]/10',
      'rounded-xl',
      'shadow-[0_4px_14px_-10px_rgba(62,42,120,0.34)]',
      'text-white',
      'px-4 py-2.5',
      'min-w-[220px]',
      'max-w-[min(420px,92vw)]',
      'before:absolute before:top-1.5 before:left-3.5 before:right-3.5 before:h-px before:rounded-full before:bg-white/22',
      'after:absolute after:bottom-1.5 after:left-3.5 after:right-3.5 after:h-px after:rounded-full after:bg-white/22'
    ].join(' '),
    title:
      'text-white font-medium text-[1.08rem] leading-tight tracking-[0.003em] drop-shadow-[0_1px_3px_rgba(255,255,255,0.1)]',
    description: 'text-[#d7d0e6] font-normal text-[0.72rem] mt-0.5 opacity-75',
    icon: 'text-white/75 size-[18px] shrink-0 mt-0.5'
  }

  function success(title: string, description?: string): void {
    toast.add({
      ui: {
        ...baseUi,
        root: `${baseUi.root} border-[#62cfae]/18 shadow-[0_4px_12px_-10px_rgba(24,122,92,0.26)]`,
        icon: 'text-[#9be6cd]/78 size-[18px] shrink-0 mt-0.5'
      },
      title: resolveText(title),
      description: resolveText(description),
      icon: 'i-lucide-info',
      color: 'success'
    })
  }

  function error(title: string, description?: string): void {
    toast.add({
      ui: {
        ...baseUi,
        root: `${baseUi.root} border-[#ff9aae]/18 shadow-[0_4px_12px_-10px_rgba(148,52,79,0.26)]`,
        icon: 'text-[#ffc2cf]/78 size-[18px] shrink-0 mt-0.5'
      },
      title: resolveText(title),
      description: resolveText(description),
      icon: 'i-lucide-info',
      color: 'error'
    })
  }

  function custom(title: string, description?: string): void {
    toast.add({
      ui: {
        ...baseUi,
        root: `${baseUi.root} border-[#8cc6ff]/18 shadow-[0_4px_12px_-10px_rgba(46,96,158,0.26)]`,
        icon: 'text-[#c6e2ff]/78 size-[18px] shrink-0 mt-0.5'
      },
      title: resolveText(title),
      description: resolveText(description),
      icon: 'i-lucide-info',
      color: 'neutral'
    })
  }

  return { success, error, custom }
}
