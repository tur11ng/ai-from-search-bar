const MODELS = {
  GPT: "https://chat.openai.com",
  GEMINI: "https://gemini.google.com",
  MISTRAL: "https://chat.mistral.ai",
};

chrome.omnibox.onInputEntered.addListener(
  (userInput: string, disposition: string) => {
    // Split user input to get keyword and sub-command
    let parts = userInput.split(" ");
    let subCommand = parts[0]?.toLowerCase();
    let searchText: string[];

    switch (subCommand) {
      case "g": // Gemini
        searchText = parts.slice(1);
        customSearch(MODELS.GPT, searchText);
        break;
      case "m": // Mistral
        searchText = parts.slice(1);
        customSearch(MODELS.MISTRAL, searchText);
        break;
      default: // ChatGPT
        searchText = parts.slice(1);
        customSearch(MODELS.GPT, searchText);
    }
  }
);

function customSearch(model: string, query: string[]) {
  console.log("Searching with model : ", model, " for : ", query);

  findOrCreateTab(model, (tab) => {
    sendPromptToTab(tab.id!, query.join(" "));
  });
}

function findOrCreateTab(
  model: string,
  callback: (tab: chrome.tabs.Tab) => void
) {
  chrome.tabs.query({ url: model + "/*" }, (tabs) => {
    console.log("Found tabs:", tabs);
    if (tabs.length > 0) {
      tabs.sort((a, b) => b.id! - a.id!);
      const targetTab = tabs[0];
      callback(targetTab);
      chrome.tabs.update(targetTab.id!, { active: true });
      chrome.windows.update(targetTab.windowId, { focused: true });
    } else {
      chrome.tabs.create({ url: model + "/" }, (newTab) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
          if (tabId === newTab.id && changeInfo.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            callback(newTab);
          }
        });
      });
    }
  });
}

function sendPromptToTab(tabId: number, prompt: string) {
  chrome.tabs.sendMessage(
    tabId,
    { type: "PROMPT", value: prompt },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
      } else {
        console.log("Prompt response:", response);
      }
    }
  );
}
