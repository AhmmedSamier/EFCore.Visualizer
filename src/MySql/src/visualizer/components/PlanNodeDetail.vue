<script lang="ts" setup>
import { computed, inject, onBeforeMount, reactive, ref, watch } from "vue"
import { directive as vTippy } from "vue-tippy"
import type { Node, ViewOptions } from "@visualizer/interfaces"
import { EstimateDirection, NodeProp } from "@visualizer/enums"
import useNode from "@visualizer/node"
import MiscDetail from "@visualizer/components/MiscDetail.vue"
import { StoreKey, ViewOptionsKey } from "@visualizer/symbols"
import type { Store } from "@visualizer/store"
import _ from "lodash"
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome"
import {
  faAlignJustify,
  faArrowDown,
  faArrowUp,
  faClock,
  faDollarSign,
  faExchangeAlt,
  faFilter,
  faInfoCircle,
  faUndo,
} from "@fortawesome/free-solid-svg-icons"

const viewOptions = inject(ViewOptionsKey) as ViewOptions
const store = inject(StoreKey) as Store

interface Props {
  node: Node
}
const props = defineProps<Props>()

const updateSize = inject<(node: Node) => null>("updateSize")

const node = props.node

// UI flags
const activeTab = ref<string>("general")

const {
  costClass,
  durationClass,
  estimationClass,
  executionTimePercent,
  filterDetailTooltip,
  formattedProp,
  heapFetchesClass,
  indexRecheckTooltip,
  plannerRowEstimateDirection,
  plannerRowEstimateValue,
  rowsRemoved,
  rowsRemovedClass,
  rowsRemovedPercentString,
  rowsRemovedProp,
  tilde,
} = useNode(node, viewOptions)

const shouldShowPlannerEstimate = computed(() => {
  return (
    estimationClass.value &&
    plannerRowEstimateDirection.value !== EstimateDirection.none &&
    plannerRowEstimateValue.value
  )
})

watch(activeTab, () => {
  window.setTimeout(() => updateSize && updateSize(node), 1)
})
</script>

<template>
  <div class="plan-node-detail">
    <div class="card-header border-top">
      <ul class="nav nav-tabs card-header-tabs">
        <li class="nav-item">
          <a
            class="nav-link"
            :class="{ active: activeTab === 'general' }"
            @click.prevent.stop="activeTab = 'general'"
            href=""
            >General</a
          >
        </li>
        <li class="nav-item">
          <a
            class="nav-link"
            :class="{
              active: activeTab === 'output',
              disabled: !node[NodeProp.OUTPUT] && !node[NodeProp.USED_COLUMNS],
            }"
            @click.prevent.stop="activeTab = 'output'"
            href=""
            >Output</a
          >
        </li>
        <li class="nav-item">
          <a
            class="nav-link"
            :class="{ active: activeTab === 'misc' }"
            @click.prevent.stop="activeTab = 'misc'"
            href=""
            >Misc</a
          >
        </li>
      </ul>
    </div>
    <div class="card-body tab-content">
      <div class="tab-pane" :class="{ 'show active': activeTab === 'general' }">
        <!-- general -->
        <div v-if="store.plan?.isAnalyze && !_.isUndefined(node[NodeProp.EXCLUSIVE_DURATION])">
          <FontAwesomeIcon
            fixed-width
            :icon="faClock"
            class="text-secondary"
          ></FontAwesomeIcon>
          <b>Timing:</b>
          <span
            class="p-0 px-1 rounded alert"
            :class="durationClass"
            v-html="formattedProp('EXCLUSIVE_DURATION')"
          ></span>
          <template
            v-if="executionTimePercent && executionTimePercent !== Infinity"
          >
            |
            <strong>{{ executionTimePercent }}</strong
          ><span class="text-secondary">%</span>
          </template>
        </div>
        <div>
          <FontAwesomeIcon
            fixed-width
            :icon="faAlignJustify"
            class="text-secondary"
          ></FontAwesomeIcon>
          <b>Rows:</b>
          <span class="px-1" v-if="!_.isUndefined(node[NodeProp.ACTUAL_ROWS_REVISED])">{{
            tilde + formattedProp("ACTUAL_ROWS_REVISED")
          }}</span>
          <span class="px-1" v-else>{{
            tilde + formattedProp("PLAN_ROWS_REVISED")
          }}</span>
          <span class="text-secondary" v-if="node[NodeProp.PLAN_ROWS] && !_.isUndefined(node[NodeProp.ACTUAL_ROWS_REVISED])"
            >(Planned: {{ tilde + formattedProp("PLAN_ROWS_REVISED") }})</span
          >
          <span
            v-if="
              plannerRowEstimateDirection !== EstimateDirection.none &&
              shouldShowPlannerEstimate
            "
          >
            |
            <span v-if="plannerRowEstimateDirection === EstimateDirection.over"
              ><FontAwesomeIcon :icon="faArrowUp"></FontAwesomeIcon> over</span
            >
            <span v-if="plannerRowEstimateDirection === EstimateDirection.under"
              ><FontAwesomeIcon :icon="faArrowDown"></FontAwesomeIcon> under</span
            >
            estimated
            <span v-if="plannerRowEstimateValue != Infinity">
              by
              <span
                class="p-0 px-1 alert"
                :class="estimationClass"
                v-html="formattedProp('PLANNER_ESTIMATE_FACTOR')"
              ></span>
            </span>
          </span>
        </div>
        <div v-if="rowsRemoved">
          <FontAwesomeIcon
            fixed-width
            :icon="faFilter"
            class="text-secondary"
          ></FontAwesomeIcon>
          <b> {{ NodeProp[rowsRemovedProp] }}: </b>
          <span>
            <span class="px-1">{{ tilde + formattedProp(rowsRemovedProp) }}</span
            >|
            <span class="p-0 px-1 alert" :class="rowsRemovedClass"
              >{{ rowsRemovedPercentString }}%</span
            >
          </span>
          <FontAwesomeIcon
            fixed-width
            :icon="faInfoCircle"
            class="text-muted"
            v-tippy="{ allowHTML: true, content: indexRecheckTooltip }"
            v-if="rowsRemovedProp == 'ROWS_REMOVED_BY_INDEX_RECHECK_REVISED'"
          ></FontAwesomeIcon>
          <FontAwesomeIcon
            fixed-width
            :icon="faInfoCircle"
            class="text-muted"
            v-tippy="{ allowHTML: true, content: filterDetailTooltip }"
            v-else
          ></FontAwesomeIcon>
        </div>
        <div v-if="node[NodeProp.HEAP_FETCHES]">
          <FontAwesomeIcon
            fixed-width
            :icon="faExchangeAlt"
            class="text-secondary"
          ></FontAwesomeIcon>
          <b>Heap Fetches:</b>
          <span
            class="p-0 px-1 rounded alert"
            :class="heapFetchesClass"
            v-html="formattedProp('HEAP_FETCHES')"
          ></span>
          <FontAwesomeIcon
            :icon="faInfoCircle"
            fixed-width
            class="text-secondary"
            v-if="heapFetchesClass"
            v-tippy="{
              arrow: true,
              content:
                'Visibility map may be out-of-date. Consider using VACUUM or change autovacuum settings.',
            }"
          ></FontAwesomeIcon>
        </div>
        <div v-if="!_.isUndefined(node[NodeProp.EXCLUSIVE_COST])">
          <FontAwesomeIcon
            fixed-width
            :icon="faDollarSign"
            class="text-secondary"
          ></FontAwesomeIcon>
          <b>Cost:</b>
          <span class="p-0 px-1 me-1 alert" :class="costClass">{{
            formattedProp("EXCLUSIVE_COST")
          }}</span>
          <span class="text-secondary"
            >(Total: {{ formattedProp("TOTAL_COST") }})</span
          >
        </div>
        <div v-if="node[NodeProp.ACTUAL_LOOPS] > 1">
          <FontAwesomeIcon
            fixed-width
            :icon="faUndo"
            class="text-secondary"
          ></FontAwesomeIcon>
          <b>Loops:</b>
          <span class="px-1">{{ formattedProp("ACTUAL_LOOPS") }} </span>
        </div>
        <!-- general tab -->
      </div>
      <div
        class="tab-pane overflow-auto font-monospace"
        :class="{ 'show active': activeTab === 'output' }"
        style="max-height: 200px"
        @mousewheel.stop
      >
        <div v-if="node[NodeProp.OUTPUT]" v-html="formattedProp('OUTPUT')"></div>
        <div v-if="node[NodeProp.USED_COLUMNS]">
          <b>Used Columns:</b>
          <ul class="list-unstyled mb-0">
            <li v-for="col in (node[NodeProp.USED_COLUMNS] as string[])" :key="col">{{ col }}</li>
          </ul>
        </div>
      </div>
      <div class="tab-pane" :class="{ 'show active': activeTab === 'misc' }">
        <!-- misc tab -->
        <MiscDetail :node="node" />
      </div>
    </div>
  </div>
</template>
