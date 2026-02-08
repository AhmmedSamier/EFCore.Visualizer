<script lang="ts" setup>
import type { Node } from "@visualizer/interfaces"
import { NodeProp } from "@visualizer/enums"
import { duration } from "@visualizer/filters"
interface Props {
  node: Node
}
defineProps<Props>()
</script>

<template>
  Duration:
  <br />Exclusive: {{ duration(node[NodeProp.EXCLUSIVE_DURATION]) }}, Total:
  {{ duration(node[NodeProp.ACTUAL_TOTAL_TIME]) }}
</template>
