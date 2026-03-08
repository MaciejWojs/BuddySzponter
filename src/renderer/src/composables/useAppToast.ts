export function useAppToast(): {
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  custom: (title: string, description?: string) => void
} {
  const toast = useToast()

  function success(title: string, description?: string): void {
    toast.add({
      ui: { root: 'bg-[#a749fc] border-none text-white' },
      title,
      description,
      icon: 'i-lucide-check-circle'
    })
  }

  function error(title: string, description?: string): void {
    toast.add({
      ui: { root: 'bg-red-600 border-none text-white' },
      title,
      description,
      icon: 'i-lucide-x-circle'
    })
  }

  function custom(title: string, description?: string): void {
    toast.add({
      ui: {
        root: `bg-[#0E004D] text-white shadow-[0_0_5px_0_rgba(255,255,255,0.1)]`,
        icon: 'text-white',
        title: 'text-white font-bold ',
        description: 'text-gray-400 font-light'
      },
      title,
      description,
      icon: 'i-lucide-wifi',
      color: 'neutral'
    })
  }

  return { success, error, custom }
}
