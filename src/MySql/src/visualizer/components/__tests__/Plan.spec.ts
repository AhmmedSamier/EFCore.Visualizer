// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, it, expect, vi } from "vitest";

// Stub global constants
vi.stubGlobal("__APP_VERSION__", "1.0.0");

import Plan from "../Plan.vue";

// Mock dependencies
vi.mock("@visualizer/store.ts", () => ({
  createStore: () => ({
    plan: {
      content: {
        Plan: {
          // Add minimal node layout properties expected by usePlanLayout or components
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

// Mock composables
const layoutMock = {
  transform: {},
  scale: {},
  edgeWeight: vi.fn().mockReturnValue(1),
  layoutRootNode: { value: { descendants: () => [] } },
  ctes: { value: [] },
  toCteLinks: {},
  tree: { value: { descendants: () => [] } },
  rootDescendants: { value: [] },
  rootLinks: { value: [] }, // Explicitly empty
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

vi.mock("@visualizer/composables/usePlanLayout", () => ({
  usePlanLayout: () => layoutMock,
}));
// Also mock with relative path in case alias fails in test environment
vi.mock("../../composables/usePlanLayout", () => ({
  usePlanLayout: () => layoutMock,
}));

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
  // Stub global components or directives if needed
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

    // Wait for async parse if necessary (it's watched)
    await wrapper.vm.$nextTick();

    // It should render the plan container (since store.plan is mocked to exist)
    const planContainer = wrapper.find(".plan-container");
    expect(planContainer.exists()).toBe(true);

    // Check for buttons
    const buttons = wrapper.findAll("button");
    // We expect some buttons (zoom controls, search, etc.) but NOT Share/Export
    const buttonTexts = buttons.map((b) => b.text().trim()).filter((t) => t);

    // Log found buttons for debugging
    console.log("Found buttons:", buttonTexts);

    expect(buttonTexts).not.toContain("Share");
    expect(buttonTexts).not.toContain("Export PNG");

    // Verify PlanStats is rendered
    expect(wrapper.find(".plan-stats").exists()).toBe(true);
  });
});
