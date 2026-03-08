/// <reference types="vite/client" />
/// <reference path="../auto-imports.d.ts" />
/// <reference path="../components.d.ts" />

declare module '*.svg?component' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}
