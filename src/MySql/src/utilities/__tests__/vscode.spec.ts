import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { VSCodeAPIWrapper } from '../vscode';

describe('VSCodeAPIWrapper', () => {
  let mockVsCodeApi: {
    postMessage: Mock;
    getState: Mock;
    setState: Mock;
  };

  beforeEach(() => {
    // Reset mocks before each test
    mockVsCodeApi = {
      postMessage: vi.fn(),
      getState: vi.fn(),
      setState: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('when acquireVsCodeApi is available', () => {
    beforeEach(() => {
      // Mock the global acquireVsCodeApi function
      vi.stubGlobal('acquireVsCodeApi', () => mockVsCodeApi);
    });

    it('should initialize with vsCodeApi', () => {
      const wrapper = new VSCodeAPIWrapper();
      expect(wrapper).toBeDefined();
    });

    it('should call postMessage on the api', () => {
      const wrapper = new VSCodeAPIWrapper();
      const message = { type: 'test' };
      wrapper.postMessage(message);
      expect(mockVsCodeApi.postMessage).toHaveBeenCalledWith(message);
    });

    it('should call getState on the api', () => {
      const wrapper = new VSCodeAPIWrapper();
      mockVsCodeApi.getState.mockReturnValue({ some: 'state' });
      const state = wrapper.getState();
      expect(mockVsCodeApi.getState).toHaveBeenCalled();
      expect(state).toEqual({ some: 'state' });
    });

    it('should call setState on the api', () => {
      const wrapper = new VSCodeAPIWrapper();
      const newState = { new: 'state' };
      const result = wrapper.setState(newState);
      expect(mockVsCodeApi.setState).toHaveBeenCalledWith(newState);
      expect(result).toEqual(newState);
    });
  });

  describe('when acquireVsCodeApi is NOT available', () => {
    beforeEach(() => {
      // Ensure acquireVsCodeApi is not defined
      // @ts-ignore
      delete global.acquireVsCodeApi;
    });

    it('should initialize without errors', () => {
      const wrapper = new VSCodeAPIWrapper();
      expect(wrapper).toBeDefined();
    });

    it('should log message to console instead of posting', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const wrapper = new VSCodeAPIWrapper();
      const message = { type: 'test' };
      wrapper.postMessage(message);

      expect(consoleSpy).toHaveBeenCalledWith(message);
    });

    it('should return undefined for getState', () => {
      const wrapper = new VSCodeAPIWrapper();
      const state = wrapper.getState();
      expect(state).toBeUndefined();
    });

    it('should return undefined for setState', () => {
      const wrapper = new VSCodeAPIWrapper();
      const newState = { new: 'state' };
      const result = wrapper.setState(newState);
      expect(result).toBeUndefined();
    });
  });
});
