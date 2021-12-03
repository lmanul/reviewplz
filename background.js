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
        if (result.state === 'granted' || result.state === 'prompt') {
          window.setTimeout(function() {
            let tryHtml = false;

            const title = document.querySelector('.phui-header-header').textContent;
            const anchor = '<a href="' + document.location.href + '">' + title + '</a>';
            let blob, data;
            if (tryHtml) {
              blob = new Blob([anchor], { 'type': 'text/html;charset=utf-8' });
              data = [new ClipboardItem({ 'text/html': blob })];
            } else {
              blob = new Blob([anchor], { 'type': 'text/plain;charset=utf-8' });
              data = [new ClipboardItem({ 'text/plain': blob })];
            }

            document.querySelector('.phui-header-header').focus();
            navigator.clipboard.write(data).then(
              function() {
                console.log('Copied ' + title);
                if (tryHtml) {
                  navigator.clipboard.read({type: 'text/html'}).then((data) => {
                    for (let i = 0; i < data.length; i++) {
                      data[i].getType('text/html').then((blob) => {
                        console.log(blob);
                        const resp = new Response(blob);
                        console.log(resp);
                        resp.text().then(function(t) { console.log(t); });
                      });
                    }
                  })
                }
              }, function(err) {
                const errString = '' + err;
                if (errString.includes('NotAllowedError') && errString.includes('not focused')) {
                  alert('Please click anywhere on the page to focus it first, then try again.');
                } else {
                  alert('Unknown error: ' + err);
                }
              });
          }, 1000);
        } else {
          alert('Coud not get permission to write to the clipboard.');
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
