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
            window.setTimeout(function () {
              let tryHtml = false;

              const title = document.querySelector(
                ".phui-header-header"
              ).textContent;
              const anchor =
                '<a href="' + document.location.href + '">' + title + "</a>";
              let clipboardItemInput, data;
              console.log('Created markup ' + anchor);
              document.querySelector(".phui-header-header").focus();

              try {
                if (tryHtml) {
                  const blob = new Blob([anchor], { type: "text/html" });
                  clipboardItemInput = new ClipboardItem({"text/html": blob});
                } else {
                  const blob = new Blob([anchor], { type: "text/plain;charset=utf-8" });
                  clipboardItemInput = new ClipboardItem({"text/plain": blob});
                }
                navigator.clipboard.write([clipboardItemInput]).then(() => {
                  console.log("Wrote to clipboard");
                  console.log(clipboardItemInput);
                }).catch((e) => {
                  console.log('Exception', e);
                });
              } catch (e) {
                console.log('Also exception', e);
              }
            }, 1000);
          } else {
            alert("Could not get permission to write to the clipboard.");
          }
        });
    },
  });
}

chrome.action.onClicked.addListener(copyDescriptionToClipboard);
