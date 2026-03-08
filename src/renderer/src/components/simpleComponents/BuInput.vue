<script setup lang="ts">
const emit = defineEmits(['update:modelValue'])

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
  },
  width: {
    type: String,
    default: '250px'
  },
  error: {
    type: Boolean,
    default: false
  }
})
</script>
<template>
  <div>
    <div
      class="bu-input-wrapper"
      :class="{
        'bu-input-error': props.error,
        shake: props.error,
        'bu-input-normal': !props.error
      }"
      :style="{ width: props.width }"
    >
      <div v-if="$slots.prefix" class="prefix-wrapper">
        <span class="bu-input-icon">
          <slot name="prefix" />
        </span>
      </div>
      <input
        :type="props.type"
        :placeholder="props.placeholder"
        :value="props.modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <div v-if="$slots.suffix" class="suffix-wrapper">
        <span class="bu-input-icon">
          <slot name="suffix" />
        </span>
      </div>
    </div>
  </div>
</template>
<style>
.shake {
  animation: shake 0.5s;
}
@keyframes shake {
  0% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-4px);
  }
  40% {
    transform: translateX(4px);
  }
  60% {
    transform: translateX(-4px);
  }
  80% {
    transform: translateX(4px);
  }
  100% {
    transform: translateX(0);
  }
}
.prefix-wrapper {
  display: flex;
  align-items: center;
  margin-right: 8px;
}
.suffix-wrapper {
  display: flex;
  align-items: center;
  margin-left: 8px;
}
.bu-input-wrapper {
  display: flex;
  align-items: center;
  background-color: #06001f;
  border-radius: 10px;
  padding: 0 10px;
  box-shadow: 0 2px 12px rgba(167, 73, 252, 0.5);
}
.bu-input-error {
  box-shadow: 0 2px 8px rgba(255, 0, 0, 0.3);
  box-shadow: 0 2px 12px rgba(255, 0, 0, 0.3);
  border: 1px solid #ff4d4f;
}
.bu-input-error:focus-within {
  outline: red 2px solid;
}
.bu-input-normal:focus-within {
  outline: var(--color-accent) 2px solid;
}
.bu-input-icon {
  display: flex;
  align-items: center;
  font-size: 1.2em;
}
input {
  background: transparent;
  color: white;
  padding: 10px 0;
  border: none;
  outline: none;
  flex: 1;
  width: 100%;
  font-family: 'jetbrains mono', monospace;
}
input:focus {
  outline: none;
}
</style>
