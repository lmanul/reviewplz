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

const copyDescriptionToClipboard = () => {
  getReviewTitle().then(function(title) {
    console.log(title);
  });
}

browser.browserAction.onClicked.addListener(copyDescriptionToClipboard);
