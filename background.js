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

const copyLinkToClipboard = (link) => {
  var type = "text/html";
  var blob = new Blob(['haha'], { type });
  var data = [new ClipboardItem({ [type]: blob })];
  navigator.clipboard.write(data).then(
    function() { console.log('Copied'); }).catch(
    function(err) { console.log('Failed' + err); }
    );
}

const copyDescriptionToClipboard = () => {
  Promise.all([getReviewTitle(), getActiveTabUrl()]).then(function(results) {
    const title = results[0];
    const url = results[1];
    const link = '<a href="' + url + '">' + title + '</a>';
    copyLinkToClipboard(link);
  });
}

browser.browserAction.onClicked.addListener(copyDescriptionToClipboard);
