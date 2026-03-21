<template>
  <div class="user-container" @mouseenter="menuOpen = true" @mouseleave="menuOpen = false">
    <div :class="['dropdown-bg', { 'is-open': menuOpen }]" />

    <div class="user-content">
      <div class="avatar-wrapper">
        <UserIconSvg class="user-avatar" />
      </div>

      <div class="user-name">Gość</div>

      <Transition name="fade-slide">
        <div v-if="menuOpen" class="menu-items">
          <button class="menu-item" @click="goToLogin">{{ $t('userMenu1.login') }}</button>
          <button class="menu-item" @click="goToRegister">{{ $t('userMenu1.register') }}</button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import UserIconSvg from '@renderer/assets/images/components/Usericon2.svg?component'

const menuOpen = ref(false)
const router = useRouter()

function goToLogin(): void {
  router.push('/login')
}

function goToRegister(): void {
  router.push('/register')
}
</script>

<style scoped>
.user-container {
  position: fixed;
  top: 20px;
  right: 40px;
  z-index: 1000;
  width: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.dropdown-bg {
  position: absolute;
  top: -10px;
  left: 0;
  right: 0;
  bottom: 100%;
  background-color: #0a0514;
  border-radius: 150px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: -1;
  opacity: 0;
}

.dropdown-bg.is-open {
  height: 370px;
  bottom: auto;
  opacity: 1;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.user-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10px;
}

.avatar-wrapper {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  padding: 6px;
  background: rgba(30, 16, 60, 0.18);
  box-shadow: 0 4px 24px 0 rgba(0, 0, 0, 0.18);
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.3s ease;
}

.user-container:hover .avatar-wrapper {
  transform: scale(1.05);
}

.user-avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  object-fit: cover;
  background: #1e103c;
}

.user-name {
  color: #b794f4;
  font-size: 1.4rem;
  font-weight: 600;
  margin-top: 24px;
  text-align: center;
  pointer-events: none;
}

.menu-items {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-top: 20px;
  gap: 12px;
}

.menu-item {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 0.95rem;
  cursor: pointer;
  transition: color 0.2s;
  padding: 5px 10px;
  white-space: nowrap;
}

.menu-item:hover {
  color: #b794f4;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease-out;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
