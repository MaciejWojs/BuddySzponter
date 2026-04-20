import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface LogEntry {
  id: number
  timestamp: number
  action: string
  data: unknown
  source: 'api' | 'socket' | 'system'
}

export const useLogStore = defineStore('logs', () => {
  const logs = ref<LogEntry[]>([])
  let nextId = 0

  const addLog = (
    action: string,
    data: unknown,
    source: 'api' | 'socket' | 'system' = 'system'
  ): void => {
    logs.value.push({
      id: nextId++,
      timestamp: Date.now(),
      action,
      data,
      source
    })
    // Możesz tu też zostawić console.log dla łatwego debugowania w devtoolsach:
    console.log(`[${source.toUpperCase()}] ${action}:`, data)
  }

  const clearLogs = (): void => {
    logs.value = []
  }

  return { logs, addLog, clearLogs }
})
