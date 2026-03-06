<template>
    <div class="bu-timer">
        <span
        >{{ formatted }}</span>
    </div>
</template>

<script setup lang="ts">

    const emit = defineEmits<{
        finish: []
        tick: [value: number]
    }>()

    const props = defineProps<{
        seconds?: number
    }>()

    const remaining = ref(props.seconds ?? 0)

    const formatted = computed(() => {
        const m = Math.floor(remaining.value / 60).toString().padStart(2, '0')
        const s = (remaining.value % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    })

    const { pause, resume, isActive } = useIntervalFn(() => {
        if (remaining.value > 0) {
            remaining.value--
            emit('tick', remaining.value)
        } else {
            pause()
            emit('finish')
        }
    }, 1000, { immediate: false })

    function setTime(seconds: number) {
        pause()
        remaining.value = seconds
        resume()
    }

    defineExpose({ remaining, isActive, pause, resume, setTime })
</script>

<style scoped>
    .bu-timer {
        font-weight: normal;
        font-family: 'JetBrains Mono', monospace;
    }
</style>