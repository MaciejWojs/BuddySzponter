export const toolbarButtonStyles = {
  active: 'text-violet-400 hover:text-violet-200',
  inactive: 'text-[#6b6b78] hover:text-white',
  unread: 'text-violet-300 hover:text-violet-100',
  disabled: 'text-[#2a2a3a] cursor-not-allowed'
} as const

export const disconnectBubbleStyles =
  'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-7 px-2 rounded-full bg-[#1b0d12] border border-rose-400/60 text-rose-300 hover:text-rose-100 hover:border-rose-300 transition-colors flex items-center justify-center text-[11px] font-semibold tracking-wide opacity-0 pointer-events-none'
