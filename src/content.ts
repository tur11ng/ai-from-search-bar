// This is the content script that runs in the context of the page

// Manage the prompt requests. Only one prompt can be active at a time.
let latestPrompt: string | null = null;
let latestSendResponse: ((response: any) => void) | null = null;

//
function pushPrompt(
  prompt: string,
  sendResponse: (response: any) => void
): void {
  if (latestSendResponse) {
    latestSendResponse({ error: "Ignored an outdated prompt." });
  }
  latestPrompt = prompt;
  latestSendResponse = sendResponse;
}

//
function popPrompt(): string | null {
  const prompt = latestPrompt;
  if (latestSendResponse
  ) {
    latestSendResponse({ error: null });
  }
  latestPrompt = null;
  latestSendResponse = null;
  return prompt;
}

// Wait for the page and scripts to be fully loaded.
let pageReadyResolve: () => void;
const pageReady = new Promise<void>((resolve) => {
  pageReadyResolve = resolve;
});

// TODO Check if an observation timeout is needed, if such a thing exists
function waitForElement(
  selector: string,
  callback: (element: Element) => void
): void {
  const element = document.querySelector(selector);

  if (element) {
    callback(element);
  } else {
    const observer = new MutationObserver((mutations, observerInstance) => {
      const element = document.querySelector(selector);
      if (element) {
        callback(element);
        observerInstance.disconnect(); // Stop observing once the element is found
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }
}

// Wait for an element to appear and then call the callback function
function waitForElementStable(
  selector: string,
  callback: (element: Element) => void
): void {
  pageReady.then(() => {
    waitForElement(selector, callback);
  });
}

// Listen for messages from the background script.
chrome.runtime.onMessage.addListener(
  (
    request: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ) => {
    if (request.type === "PROMPT") {
      console.log("Prompt request received:", request.value);
      pushPrompt(request.value, sendResponse);

      waitForElementStable("textarea", (textarea) => {
        let form = textarea.closest("form");
        if (!form) {
          console.error("No form found for textarea");
          return;
        }

        const prompt = popPrompt();
        if (!prompt) {
          console.error("No prompt found");
          return;
        }

        console.log("Form found, submit prompt:", prompt);
        dispatchText(textarea as HTMLTextAreaElement, prompt);
        dispatchSubmit(form);
      });
    }

    return true;
  }
);

// DOM and React helper functions.
function dispatchText(element: HTMLTextAreaElement, value: string): void {
  // Set the input value
  element.value = value;

  // Create and dispatch an input event
  const event = new Event("input", { bubbles: true, cancelable: true });
  element.dispatchEvent(event);
}

// Dispatch the submit button clicked event
function dispatchSubmit(form: HTMLFormElement): void {
  // Create and dispatch a submit event
  const event = new Event("submit", { bubbles: true, cancelable: true });
  form.dispatchEvent(event);
}

// Wait for the page load, for an element to appear, and another moment to make sure the page is fully loaded.
window.addEventListener("load", () => {
  waitForElement("textarea", (_textarea: Element) => {
    setTimeout(() => {
      pageReadyResolve();
    }, 1 * 1000);
  });
});

console.log("Content script loaded");
