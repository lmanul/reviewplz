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
            const anchor = '<a href="' + document.location.href + '">' + title + '</a>';
            var data = [new ClipboardItem({ "text/plain": new Blob(
                [title], { type: "text/plain" }) })];

            document.querySelector('.phui-header-header').focus();
            navigator.clipboard.write(data).then(
              function() {
                console.log('Copied ' + title);
              }, function(err) {
                if (('' + err).includes('NotAllowedError')) {
                  alert('Please click anywhere on the page to focus it first, then try again.');
                } else {
                  alert('Unknown error: ' + err);
                }
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

chrome.action.onClicked.addListener(copyDescriptionToClipboard);
