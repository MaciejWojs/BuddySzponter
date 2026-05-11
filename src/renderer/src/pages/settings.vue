<script setup lang="ts">
import MenuAppShell from '@renderer/components/menu/MenuAppShell.vue'
</script>

<template>
  <MenuAppShell>
    <div class="menu-subpage" aria-label="Settings" />
  </MenuAppShell>
</template>

<style scoped>
.menu-subpage {
  flex: 1;
  min-height: 120px;
}
</style>
