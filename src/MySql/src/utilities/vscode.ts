export class VSCodeAPIWrapper {
  private readonly vsCodeApi: ReturnType<typeof acquireVsCodeApi> | undefined;

  constructor() {
    // Check if the acquireVsCodeApi function exists in the current context
    if (typeof acquireVsCodeApi === "function") {
      this.vsCodeApi = acquireVsCodeApi();
    }
  }

  /**
   * Post a message to the extension
   * @param message The message to send
   */
  public postMessage(message: unknown) {
    if (this.vsCodeApi) {
      this.vsCodeApi.postMessage(message);
    } else {
      console.log(message);
    }
  }

  /**
   * Get the persistent state stored for this webview
   */
  public getState(): unknown | undefined {
    if (this.vsCodeApi) {
      return this.vsCodeApi.getState();
    }
    return undefined;
  }

  /**
   * Set the persistent state stored for this webview
   * @param newState The new state to store
   */
  public setState<T>(newState: T): T | undefined {
    if (this.vsCodeApi) {
      this.vsCodeApi.setState(newState);
      return newState;
    }
    return undefined;
  }
}

export const vscode = new VSCodeAPIWrapper();
