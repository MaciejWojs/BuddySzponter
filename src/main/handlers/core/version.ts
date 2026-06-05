import { app } from 'electron'

export function getVersion(): string {
  return app.getVersion()
}
