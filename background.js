const browser = chrome;

const getReviewTitle = () => {
  return new Promise((resolve, reject) => {
    const executing = browser.tabs.executeScript({
      code: `document.querySelector('.phui-header-header').textContent`
    }, function(arr) {
      const title = arr[0];
      resolve(title);
    });
  });
}

const getActiveTabUrl = () => {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, function(tabs) {
      var tab = tabs[0];
      resolve(tab.url);
    });
  })
}

const copyDescriptionToClipboard = () => {
  getReviewTitle().then(function(title) {
    console.log(title);
  });
  getActiveTabUrl().then(function(url) {
    console.log(url);
  });
}

browser.browserAction.onClicked.addListener(copyDescriptionToClipboard);
