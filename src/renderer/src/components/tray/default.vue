<script setup lang="ts">
const props = defineProps<{
  connectionCode?: string
}>()

const handleOpenApp = async (): Promise<void> => {
  await window.api.app.showApp()
}

const handleCopyCode = async (): Promise<void> => {
  if (props.connectionCode) {
    await navigator.clipboard.writeText(props.connectionCode)
  }
}

const handleQuit = async (): Promise<void> => {
  await window.api.app.quitApp()
}
</script>

<template>
  <main>
    <header>
      <h1>BuddySzponter</h1>
    </header>

    <section>
      <div
        v-if="connectionCode"
        class="code-box"
        title="Kliknij, by skopiować"
        @click="handleCopyCode"
      >
        Twój kod: <strong class="user-code">{{ connectionCode }}</strong>
      </div>

      <button type="button" class="btn" @click="handleOpenApp">Otwórz aplikację</button>
      <button type="button" class="btn btn-danger" @click="handleQuit">Zamknij całkowicie</button>
    </section>
  </main>
</template>

<style scoped>
html,
body,
#app {
  background: transparent !important;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  user-select: none;
}

main {
  width: calc(100% - 16px);
  height: calc(100% - 16px);
  margin: 8px;

  background: rgba(25, 25, 28, 0.85);

  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  border-radius: 16px;

  border: 1px solid rgba(255, 255, 255, 0.1);

  overflow: hidden;

  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;

  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  padding: 16px 0;
}

header h1 {
  font-size: 18px;
  color: #fff;
  font-weight: 600;
  margin: 0 0 20px 0;
}

section {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 0 16px;
  box-sizing: border-box;
}

.code-box {
  background: rgba(0, 0, 0, 0.4);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
  color: rgba(255, 255, 255, 0.7);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  width: 100%;
  box-sizing: border-box;
}

.code-box:hover {
  background: rgba(0, 0, 0, 0.6);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.code-box:active {
  transform: translateY(1px);
}

.user-code {
  color: #d0f224;
  font-size: 24px;
  letter-spacing: 2px;
  display: block;
  margin-top: 8px;
  font-weight: 700;
}

.btn {
  width: 100%;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn.btn-danger {
  margin-top: 12px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.btn.btn-danger:hover {
  background: rgba(239, 68, 68, 0.2);
}
</style>
