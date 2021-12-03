async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

async function copyDescriptionToClipboard() {
  let currentTab = await getCurrentTab();
  chrome.scripting.executeScript({
    target: {tabId: currentTab.id},
    func: function() {

      navigator.permissions.query({ name: 'clipboard-write' }).then(result => {
        if (result.state === 'granted') {
          window.setTimeout(function() {
            const title = document.querySelector('.phui-header-header').textContent;
            document.querySelector('.phui-header-header').focus();
            var type = "text/html";
            var blob = new Blob([title], { type });
            var data = [new window.ClipboardItem({ [type]: blob })];
            // navigator.clipboard.write(data).then(
            navigator.clipboard.writeText(title).then(
              function() {
                console.log('Copied ' + title);
              }, function(err) {
                console.log('Failed', err);
              });
          }, 1000);
        }
      });
    }});
}

function getActiveTabUrl() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, function(tabs) {
      var tab = tabs[0];
      resolve(tab.url);
    });
  })
}

// const link = '<a href="' + url + '">' + title + '</a>';

chrome.action.onClicked.addListener(copyDescriptionToClipboard);
console.log('Loaded');
