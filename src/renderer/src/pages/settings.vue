<script setup lang="ts">
import '@renderer/components/settings/settings-layout.css'

import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import { storeToRefs } from 'pinia'
import MenuAppShell from '@renderer/components/menu/MenuAppShell.vue'
import {
  getFileTransferDownloadDirectory,
  setFileTransferDownloadDirectory
} from '@renderer/composables/channels/FileTransferChannel'
import { useAppToast } from '@renderer/composables/useAppToast'
import { useCaptureStore } from '@renderer/stores/captureStore'
import { useUserStore } from '@renderer/stores/userStore'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { useSettingsStore } from '@renderer/stores/settingsStore'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { applyDocumentTheme } from '@renderer/utils/themeDocument'
import type {
  AppThemeMode,
  CaptureBackendMode,
  VideoQualityPreset
} from '@shared/schemas/appPreferences'
import { isCaptureBackendMode } from '@shared/schemas/appPreferences'
import buddySzponterLogo from '@resources/buddyszponterLogo.png'
import {
  provideSettingsPage,
  QualityPresetItem
} from '@renderer/components/settings/settingsPageContext'

const { t } = useI18n()
const { custom, success } = useAppToast()

const userStore = useUserStore()
const { isAuthenticated, currentUser } = storeToRefs(userStore)

const captureStore = useCaptureStore()
const { activeVideoQuality } = storeToRefs(captureStore)

const webRtcStore = useWebRtcStore()

const settingsStore = useSettingsStore()
const { supportedVersions, versionStatus } = storeToRefs(settingsStore)

const deviceName = ref('')
const downloadPath = ref('')

const shouldUseCpuHint = ref<boolean | null>(null)

const openAtLogin = ref(false)
const closeToTray = ref(true)
const themeMode = ref<AppThemeMode>('dark')
const captureBackend = ref<CaptureBackendMode>('auto')

const appVersion = ref('')
const advancedOpen = ref(false)
const advBitrateKbps = ref(8000)
const advFps = ref(60)

const qualityPresets: QualityPresetItem[] = [
  { id: 'low', labelKey: 'settingsPage.qualityLow' },
  { id: 'medium', labelKey: 'settingsPage.qualityMedium' },
  { id: 'high', labelKey: 'settingsPage.qualityHigh' },
  { id: 'ultra', labelKey: 'settingsPage.qualityUltra' }
]

const captureModeLabel = computed(() => {
  if (shouldUseCpuHint.value === null) return '—'
  return shouldUseCpuHint.value
    ? t('settingsPage.capturePathCpu')
    : t('settingsPage.capturePathGpu')
})

const versionsLine = computed(() =>
  supportedVersions.value.length ? supportedVersions.value.map((v) => v.version).join(' | ') : '—'
)

const persistPrefs = async (partial: {
  videoQualityPreset?: VideoQualityPreset
  closeToTray?: boolean
  theme?: AppThemeMode
  captureBackend?: CaptureBackendMode
}): Promise<void> => {
  await window.api.app.setAppPreferences(partial)
}

const persistCaptureBackend = async (): Promise<void> => {
  await persistPrefs({ captureBackend: captureBackend.value })
}

const navItems = [
  { id: 'settings-general', labelKey: 'settingsPage.sectionGeneral' as const },
  { id: 'settings-audio', labelKey: 'settingsPage.sectionAudio' as const },
  { id: 'settings-display', labelKey: 'settingsPage.sectionDisplay' as const },
  { id: 'settings-video', labelKey: 'settingsPage.sectionVideo' as const },
  { id: 'settings-control', labelKey: 'settingsPage.sectionControl' as const },
  { id: 'settings-info', labelKey: 'settingsPage.sectionInfo' as const }
] as const

type SettingsNavId = (typeof navItems)[number]['id']

const THUMB_SIZE_PX = 16

const settingsContentRef = ref<HTMLElement | null>(null)
const scrollRailRef = ref<HTMLElement | null>(null)
const activeNavId = ref<SettingsNavId>('settings-general')

const showScrollThumb = ref(false)
const scrollThumbTop = ref(0)

let isDraggingThumb = false
let dragStartClientY = 0
let dragStartScrollTop = 0
let scrollResizeObserver: ResizeObserver | null = null
let scrollMutationObserver: MutationObserver | null = null
let scrollThumbRaf = 0

function scheduleScrollThumbUpdate(): void {
  cancelAnimationFrame(scrollThumbRaf)
  scrollThumbRaf = requestAnimationFrame(() => {
    scrollThumbRaf = 0
    updateScrollThumb()
  })
}

function updateScrollThumb(): void {
  const el = settingsContentRef.value
  const rail = scrollRailRef.value
  if (!el || !rail) {
    showScrollThumb.value = false
    return
  }
  const maxScroll = el.scrollHeight - el.clientHeight
  showScrollThumb.value = maxScroll > 4
  if (!showScrollThumb.value) return
  const usable = Math.max(0, rail.clientHeight - THUMB_SIZE_PX)
  const ratio = maxScroll > 0 ? el.scrollTop / maxScroll : 0
  scrollThumbTop.value = ratio * usable
}

function onScrollInner(): void {
  if (!isDraggingThumb) updateScrollThumb()
  updateActiveNavFromScroll()
}

function onThumbPointerDown(e: PointerEvent): void {
  const el = settingsContentRef.value
  if (!el) return
  isDraggingThumb = true
  dragStartClientY = e.clientY
  dragStartScrollTop = el.scrollTop
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onThumbPointerMove(e: PointerEvent): void {
  if (!isDraggingThumb) return
  const el = settingsContentRef.value
  const rail = scrollRailRef.value
  if (!el || !rail) return
  const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight)
  const usable = Math.max(1, rail.clientHeight - THUMB_SIZE_PX)
  const delta = ((e.clientY - dragStartClientY) / usable) * maxScroll
  el.scrollTop = Math.max(0, Math.min(maxScroll, dragStartScrollTop + delta))
}

function onThumbPointerUp(e: PointerEvent): void {
  if (!isDraggingThumb) return
  isDraggingThumb = false
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
  updateScrollThumb()
}

function scrollToSection(id: SettingsNavId): void {
  activeNavId.value = id
  const el = document.getElementById(id)
  const root = settingsContentRef.value
  if (el && root) {
    const top = el.offsetTop - 8
    root.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  } else {
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const updateActiveNavFromScroll = (): void => {
  const root = settingsContentRef.value
  if (!root) return
  const marker = root.scrollTop + 32
  let next: SettingsNavId = navItems[0].id
  for (const item of navItems) {
    const el = document.getElementById(item.id)
    if (!el) continue
    if (el.offsetTop <= marker) next = item.id
  }
  activeNavId.value = next
}

const onQualityPreset = async (preset: VideoQualityPreset): Promise<void> => {
  await captureStore.applyQualityPreset(preset)
  await persistPrefs({ videoQualityPreset: preset })
}

const animatePresetClick = (e: MouseEvent): void => {
  const el = e.currentTarget as HTMLElement | null
  if (!el) return
  gsap.fromTo(el, { scale: 0.96 }, { scale: 1, duration: 0.22, ease: 'back.out(3)' })
}

const onQualityPresetClick = async (e: MouseEvent, preset: VideoQualityPreset): Promise<void> => {
  animatePresetClick(e)
  await onQualityPreset(preset)
}

const onCloseToTrayChange = async (value: boolean): Promise<void> => {
  await persistPrefs({ closeToTray: value })
}

const onThemeChange = async (mode: AppThemeMode): Promise<void> => {
  themeMode.value = mode
  applyDocumentTheme(mode)
  await persistPrefs({ theme: mode })
}

const onOpenAtLoginChange = async (value: boolean): Promise<void> => {
  await window.api.app.setOpenAtLogin(value)
}

const applyAdvancedLimits = async (): Promise<void> => {
  if (webRtcStore.rtcStatus !== 'connected') {
    custom(t('settingsPage.advancedTitle'), t('settingsPage.advancedNeedConnection'))
    return
  }
  const br = Math.max(200, Math.min(50000, advBitrateKbps.value))
  const fps = Math.max(1, Math.min(240, advFps.value))
  advBitrateKbps.value = br
  advFps.value = fps
  const ok = await webRtcService.setVideoQualityLimits(br, fps)
  if (ok) {
    success(t('settingsPage.advancedApply'), t('settingsPage.advancedAppliedHint'))
  }
}

const pickFolder = async (): Promise<void> => {
  const picked = await window.api?.fileTransfer?.pickDirectory?.()
  if (picked) downloadPath.value = picked
}

const savePath = (): void => {
  const trimmed = downloadPath.value.trim()
  if (!trimmed) return
  setFileTransferDownloadDirectory(trimmed)
}

provideSettingsPage({
  deviceName,
  isAuthenticated,
  currentUser,
  shouldUseCpuHint,
  captureModeLabel,
  captureBackend,
  qualityPresets,
  activeVideoQuality,
  advancedOpen,
  advBitrateKbps,
  advFps,
  openAtLogin,
  closeToTray,
  themeMode,
  downloadPath,
  appVersion,
  versionsLine,
  versionStatus,
  persistCaptureBackend,
  onQualityPresetClick,
  applyAdvancedLimits,
  onCloseToTrayChange,
  onThemeChange,
  onOpenAtLoginChange,
  pickFolder,
  savePath
})

onMounted(async () => {
  try {
    deviceName.value = (await window.api.settings.getDeviceName()).trim()
  } catch {
    deviceName.value = ''
  }

  if (window.screenCapture?.shouldUseCpu) {
    try {
      shouldUseCpuHint.value = await window.screenCapture.shouldUseCpu()
    } catch {
      shouldUseCpuHint.value = null
    }
  }

  try {
    const prefs = await window.api.app.getAppPreferences()
    closeToTray.value = prefs.closeToTray
    themeMode.value = prefs.theme
    applyDocumentTheme(prefs.theme)
    if (isCaptureBackendMode(prefs.captureBackend)) {
      captureBackend.value = prefs.captureBackend
    }
  } catch {
    /* keep defaults */
  }

  try {
    openAtLogin.value = await window.api.app.getOpenAtLogin()
  } catch {
    openAtLogin.value = false
  }

  try {
    appVersion.value = await settingsStore.getCurrentVersion()
    await settingsStore.checkVersionStatus()
  } catch {
    appVersion.value = ''
  }

  const saved = getFileTransferDownloadDirectory()
  if (saved) {
    downloadPath.value = saved
  } else if (window.api?.fileTransfer?.getDownloadsPath) {
    try {
      downloadPath.value = await window.api.fileTransfer.getDownloadsPath()
    } catch {
      downloadPath.value = ''
    }
  }

  await nextTick()
  const root = settingsContentRef.value
  if (root) {
    updateScrollThumb()
    updateActiveNavFromScroll()
    scrollResizeObserver = new ResizeObserver(() => {
      scheduleScrollThumbUpdate()
    })
    scrollResizeObserver.observe(root)
    scrollMutationObserver = new MutationObserver(() => {
      scheduleScrollThumbUpdate()
    })
    scrollMutationObserver.observe(root, { childList: true, subtree: true, attributes: true })
    window.addEventListener('resize', scheduleScrollThumbUpdate)
    const sections = root.querySelectorAll('.settings-dc__section')
    gsap.fromTo(
      sections,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.32, stagger: 0.04, ease: 'power2.out' }
    )
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', scheduleScrollThumbUpdate)
  cancelAnimationFrame(scrollThumbRaf)
  scrollResizeObserver?.disconnect()
  scrollResizeObserver = null
  scrollMutationObserver?.disconnect()
  scrollMutationObserver = null
})
</script>

<template>
  <MenuAppShell>
    <div class="settings-page settings-page--dc">
      <div class="settings-dc">
        <aside class="settings-dc__sidebar" aria-label="Settings navigation">
          <p class="settings-dc__sidebar-label">{{ $t('settingsPage.sidebarGroup') }}</p>
          <nav class="settings-dc__nav">
            <button
              v-for="item in navItems"
              :key="item.id"
              type="button"
              class="settings-dc__nav-item"
              :class="{ 'settings-dc__nav-item--active': activeNavId === item.id }"
              @click="scrollToSection(item.id)"
            >
              <span class="settings-dc__nav-bar" aria-hidden="true" />
              <span class="settings-dc__nav-text">{{ $t(item.labelKey) }}</span>
            </button>
          </nav>
        </aside>

        <div class="settings-dc__main">
          <div
            class="settings-dc__bg"
            :style="{ backgroundImage: `url(${buddySzponterLogo})` }"
            aria-hidden="true"
          />
          <div class="settings-dc__scroll-wrap">
            <div
              ref="settingsContentRef"
              class="settings-dc__scroll-inner"
              @scroll.passive="onScrollInner"
            >
              <SettingsSectionGeneral />
              <hr class="settings-dc__rule" />
              <SettingsSectionAudio />
              <hr class="settings-dc__rule" />
              <SettingsSectionDisplay />
              <hr class="settings-dc__rule" />
              <SettingsSectionVideo />
              <hr class="settings-dc__rule" />
              <SettingsSectionControl />
              <hr class="settings-dc__rule" />
              <SettingsSectionInformation />
            </div>
            <div ref="scrollRailRef" class="settings-dc__scroll-custom" aria-hidden="true">
              <div
                v-show="showScrollThumb"
                class="settings-dc__scroll-custom-thumb"
                :style="{ top: `${scrollThumbTop}px` }"
                @pointerdown="onThumbPointerDown"
                @pointermove="onThumbPointerMove"
                @pointerup="onThumbPointerUp"
                @pointercancel="onThumbPointerUp"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </MenuAppShell>
</template>
