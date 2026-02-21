// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { json_ } from "@visualizer/filters";

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
    plan: null, // Simulate parsing error
    parse: vi.fn().mockResolvedValue(false),
    stats: {
      executionTime: 0,
    },
    nodeById: new Map(),
    query: "SELECT * FROM users",
  }),
  StoreKey: Symbol("StoreKey"),
}));

// Mock other components to avoid rendering issues
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
  rootLinks: { value: [] },
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

describe("Plan.vue XSS", () => {
  const globalOptions = {
    stubs: {
      Teleport: true,
    },
  };

  it("prevents XSS vulnerability when plan parsing fails", async () => {
    const maliciousSource = '<img src=x onerror=alert("XSS")>';
    const wrapper = mount(Plan, {
      props: {
        planSource: maliciousSource,
        planQuery: "SELECT ...",
      },
      global: globalOptions,
    });

    // Wait for async parse (it will fail/return null as mocked)
    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    // The component should render the error card
    expect(wrapper.text()).toContain("Couldn't parse plan");

    // Check if the malicious HTML is rendered directly
    const codeBlock = wrapper.find("code");
    expect(codeBlock.exists()).toBe(true);

    // The content should be escaped, so innerHTML should NOT contain the raw tag
    expect(codeBlock.element.innerHTML).not.toContain('<img');

    // It should contain the escaped version
    expect(codeBlock.text()).toBe(maliciousSource);
    expect(codeBlock.element.innerHTML).toContain('&lt;img');
  });

  it("ensures json_ filter escapes HTML", () => {
    const maliciousSource = '<img src=x onerror=alert("XSS")>';
    const result = json_(maliciousSource);
    // highlight.js should escape HTML entities
    expect(result).not.toContain('<img');
    expect(result).toContain('&lt;img');
  });
});
