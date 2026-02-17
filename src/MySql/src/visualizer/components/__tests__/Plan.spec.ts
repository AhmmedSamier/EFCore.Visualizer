// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, it, expect, vi } from "vitest";

// Stub global constants
vi.stubGlobal("__APP_VERSION__", "1.0.0");

import Plan from "../Plan.vue";

// Mock Vuetify useTheme
vi.mock("vuetify", () => ({
  useTheme: () => ({
    global: {
      name: { value: "light" },
    },
  }),
}));

// Mock dependencies
vi.mock("@visualizer/store.ts", () => ({
  createStore: () => ({
    plan: {
      content: {
        Plan: {
          children: [],
          size: [100, 100],
          descendants: () => [],
        },
      },
    },
    parse: vi.fn().mockResolvedValue(true),
    stats: {
      executionTime: 0,
    },
    nodeById: new Map(),
  }),
  StoreKey: Symbol("StoreKey"),
}));

vi.mock("../PlanStats.vue", () => ({
  default: { template: '<div class="plan-stats">Stats</div>' },
}));
vi.mock("../Diagram.vue", () => ({
  default: { template: '<div class="diagram">Diagram</div>' },
}));
vi.mock("../Copy.vue", () => ({ default: { template: "<div>Copy</div>" } }));
vi.mock("../LogoImage.vue", () => ({
  default: { template: "<div>Logo</div>" },
}));
vi.mock("../PlanNode.vue", () => ({
  default: { template: "<div>Node</div>" },
}));
vi.mock("../AnimatedEdge.vue", () => ({
  default: { template: "<div>Edge</div>" },
}));
vi.mock("../KeyboardShortcuts.vue", () => ({
  default: { template: "<div>Shortcuts</div>", methods: { show: vi.fn() } },
}));
vi.mock("splitpanes", () => ({
  Splitpanes: { template: '<div class="splitpanes"><slot></slot></div>' },
  Pane: { template: '<div class="pane"><slot></slot></div>' },
}));

// Mock composables with real refs
vi.mock("@visualizer/composables/usePlanLayout", async () => {
  const { ref } = await import("vue");

  const layoutMock = {
    transform: {},
    scale: {},
    edgeWeight: vi.fn().mockReturnValue(1),
    layoutRootNode: ref({ descendants: () => [] }),
    ctes: ref([]),
    toCteLinks: ref([]),
    tree: ref({ descendants: () => [] }),
    rootDescendants: ref([]),
    rootLinks: ref([]),
    doLayout: vi.fn(),
    initZoom: vi.fn(),
    fitToScreen: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    lineGen: vi.fn(),
    centerNode: vi.fn(),
    updateNodeSize: vi.fn(),
    getNodeX: vi.fn(),
    getNodeY: vi.fn(),
    getNodeWidth: vi.fn(),
    getLayoutExtent: vi.fn(),
    buildTree: vi.fn(),
  };

  return {
    usePlanLayout: () => layoutMock,
  };
});

// Also mock with relative path
vi.mock("../../composables/usePlanLayout", async () => {
  const vue = await import("vue");
  const ref = vue.ref;
  const layoutMock = {
    transform: {},
    scale: {},
    edgeWeight: vi.fn().mockReturnValue(1),
    layoutRootNode: ref({ descendants: () => [] }),
    ctes: ref([]),
    toCteLinks: ref([]),
    tree: ref({ descendants: () => [] }),
    rootDescendants: ref([]),
    rootLinks: ref([]),
    doLayout: vi.fn(),
    initZoom: vi.fn(),
    fitToScreen: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    lineGen: vi.fn(),
    centerNode: vi.fn(),
    updateNodeSize: vi.fn(),
    getNodeX: vi.fn(),
    getNodeY: vi.fn(),
    getNodeWidth: vi.fn(),
    getLayoutExtent: vi.fn(),
    buildTree: vi.fn(),
  };
  return {
    usePlanLayout: () => layoutMock,
  };
});

// Mock FontAwesome
vi.mock("@fortawesome/vue-fontawesome", () => ({
  FontAwesomeIcon: { template: '<i class="fa-icon"></i>' },
}));

// Mock html-to-image
vi.mock("html-to-image", () => ({
  toPng: vi.fn(),
}));

// Mock clipboard
vi.mock("@visualizer/services/share-service", () => ({
  compressPlanToUrl: vi.fn(),
  copyToClipboard: vi.fn(),
}));

describe("Plan.vue", () => {
  const globalOptions = {
    stubs: {
      Teleport: true,
    },
  };

  it("renders correctly and does NOT show Share/Export buttons", async () => {
    const wrapper = mount(Plan, {
      props: {
        planSource: "EXPLAIN ...",
        planQuery: "SELECT ...",
      },
      global: globalOptions,
    });

    // Wait for async parse
    await wrapper.vm.$nextTick();

    const planContainer = wrapper.find(".plan-container");
    expect(planContainer.exists()).toBe(true);

    const buttons = wrapper.findAll("button");
    const buttonTexts = buttons.map((b) => b.text().trim()).filter((t) => t);

    expect(buttonTexts).not.toContain("Share");
    expect(buttonTexts).not.toContain("Export PNG");

    expect(wrapper.find(".plan-stats").exists()).toBe(true);
  });
});
