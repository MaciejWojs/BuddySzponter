<script setup lang="ts"></script>

<template>
  <div class="w-full relative flex flex-col items-center">
    <transition name="widget-fade" mode="out-in">
      <slot />
    </transition>
  </div>
</template>

<style scoped>
.widget-fade-enter-active,
.widget-fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.widget-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}
.widget-fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
</style>
