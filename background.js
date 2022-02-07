async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

async function copyDescriptionToClipboard() {
  let currentTab = await getCurrentTab();
  chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    func: function () {
      navigator.permissions
        .query({ name: "clipboard-write" })
        .then((result) => {
          if (result.state === "granted" || result.state === "prompt") {
            const BUTTER_BAR_ID = 'reviewplz-notif';
            
            const clearButterBar = () => {
              const el = document.getElementById(BUTTER_BAR_ID);
              if (!!el) {
                document.body.removeChild(el);
              }
            };
            
            const showButterBar = (message) => {
              clearButterBar();
              const el = document.createElement('div');
              el.style.position = 'fixed';
              el.style.backgroundColor = 'yellow';
              el.style.width = '200px';
              el.style.padding = '2ex';
              el.style.margin = '0px auto';
              el.style.top = '100px';
              el.style.left = '100px';
              el.style.zIndex = '100';
              el.style.textAlign = 'center';
              el.setAttribute('id', BUTTER_BAR_ID);
              el.textContent = message;
              document.body.appendChild(el);
              
              window.setTimeout(clearButterBar, 4000);
            };
            
            let tryHtml = false;
            
            const title = document.querySelector(".phui-header-header").textContent;
            const anchor = '<a href="' + document.location.href + '">' + title + "</a>";
            
            console.log('Created markup ' + anchor);
            
            const mimeType = "text/" + (tryHtml ? "html" : "plain");
            const mimeTypeWithCharset = mimeType + (tryHtml ? '' : ';charset=utf-8');
            
            try {
              const blob = new Blob([anchor], { type: mimeTypeWithCharset });
              const clipboardItemInput = new ClipboardItem({[mimeType]: blob});
              navigator.clipboard.write([clipboardItemInput]).then(() => {
                showButterBar('Copied to clipboard');
                console.log(clipboardItemInput);
              }).catch((err) => {
                const errString = '' + err;
                if (errString.includes('NotAllowedError') && errString.includes('not focused')) {
                  showButterBar('Please click anywhere on the page to focus it first, then try again.');
                } else {
                  showButterBar('Unknown error: ' + errString);
                }
              });
            } catch (e) {
              console.log('Also exception', e);
            }
          } else {
            alert("Could not get permission to write to the clipboard.");
          }
        });
    },
  });
}

chrome.action.onClicked.addListener(copyDescriptionToClipboard);
