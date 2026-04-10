export function useAppToast(): {
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  custom: (title: string, description?: string) => void
} {
  const toast = useToast()

  const baseUi = {
    root: 'backdrop-blur-md bg-[#120A2A]/94 border border-[#9b7ef8]/35 rounded-xl text-white shadow-[0_14px_40px_-18px_rgba(83,34,148,0.95)]',
    icon: 'text-[#c9b2ff]',
    title: 'text-white font-semibold tracking-[0.01em]',
    description: 'text-[#c8bddf] font-normal'
  }

  function success(title: string, description?: string): void {
    toast.add({
      ui: {
        ...baseUi,
        root: `${baseUi.root} border-[#49d4a8]/45 shadow-[0_14px_40px_-18px_rgba(28,166,124,0.95)]`,
        icon: 'text-[#7af0c6]'
      },
      title,
      description,
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
  }

  function error(title: string, description?: string): void {
    toast.add({
      ui: {
        ...baseUi,
        root: `${baseUi.root} border-[#ff7a94]/45 shadow-[0_14px_40px_-18px_rgba(184,38,78,0.95)]`,
        icon: 'text-[#ff8fa6]'
      },
      title,
      description,
      icon: 'i-lucide-x-circle',
      color: 'error'
    })
  }

  function custom(title: string, description?: string): void {
    toast.add({
      ui: {
        ...baseUi,
        root: `${baseUi.root} border-[#9b7ef8]/45`,
        icon: 'text-[#bda4ff]'
      },
      title,
      description,
      icon: 'i-lucide-wifi',
      color: 'neutral'
    })
  }

  return { success, error, custom }
}
