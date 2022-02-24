async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

async function copyDescriptionToClipboard({ urgency, size }) {
  let currentTab = await getCurrentTab();
  chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    args: [{ urgency, size }],
    func: (reviewData) => {
      const { size, urgency } = reviewData;
      const PHAB_TITLE_SELECTOR = '.phui-header-header';

      navigator.permissions
        .query({ name: 'clipboard-write' })
        .then((result) => {
          if (result.state === 'granted' || result.state === 'prompt') {
            const BUTTER_BAR_ID = 'reviewplz-notif';
            const COPY_ELEMENT_ID = 'reviewplz-cpy';

            const clearButterBar = () => {
              const el = document.getElementById(BUTTER_BAR_ID);
              if (!!el) {
                document.body.removeChild(el);
              }
            };

            const showButterBar = (message, bgColor) => {
              clearButterBar();
              const el = document.createElement('div');
              el.style.position = 'fixed';
              el.style.backgroundColor = bgColor;
              el.style.borderRadius = '1ex';
              el.style.padding = '2ex';
              el.style.margin = 'auto';
              el.style.maxWidth = '200px';
              el.style.top = '40px';
              el.style.right = '0';
              el.style.left = '0';
              el.style.zIndex = '100';
              el.setAttribute('id', BUTTER_BAR_ID);
              el.textContent = message;
              document.body.appendChild(el);

              window.setTimeout(clearButterBar, 4000);
            };

            const cleanUp = () => {
              // Clean up any previous elements
              let previous = document.getElementById(COPY_ELEMENT_ID);
              while (!!previous) {
                previous.parentNode.removeChild(previous);
                previous = document.getElementById(COPY_ELEMENT_ID);
              }
            };

            const createElementWithMarkup = (markup) => {
              cleanUp();
              const el = document.createElement('span');
              el.setAttribute('id', COPY_ELEMENT_ID);
              // el.style.visibility = 'hidden';
              el.innerHTML = markup;
              document.body.appendChild(el);
            };

            const performCopy = () => {
              var el = document.getElementById(COPY_ELEMENT_ID);
              let selection = window.getSelection();
              let range = document.createRange();
              range.selectNodeContents(el);
              selection.removeAllRanges();
              selection.addRange(range);

              const supported = document.execCommand('copy', false, null);
              if (supported) {
                showButterBar('Copied to clipboard', '#5eff8f');
              } else {
                showButterBar(
                  'It looks like copying to the clipboard is not supported :-/',
                  'yellow'
                );
              }
              cleanUp();
            };

            const valueToStarEmoji = (value) => {
              return [...Array(3).keys()]
                .map((value) => value + 1)
                .map((index) => {
                  if (value >= index * 2) {
                    return ':filled_star:';
                  } else {
                    return Math.abs(value - index * 2) === 1
                      ? ':half_star:'
                      : ':empty_star:';
                  }
                })
                .join('');
            };

            const decorateSizeAndUrgency = () => {
              let result = 'Size: ';
              result += valueToStarEmoji(size);
              result += '  Urgency: ';
              result += valueToStarEmoji(urgency);

              return result;
            };

            let tryHtml = true;

            const title =
              document.querySelector(PHAB_TITLE_SELECTOR).textContent;

            const markup = `
              <a href=${document.location.href}>
                <b>${title}</b>
              </a>
              <br />
              <div>${decorateSizeAndUrgency()}</div>`;

            const mimeType = 'text/' + (tryHtml ? 'html' : 'plain');
            const mimeTypeWithCharset =
              mimeType + (tryHtml ? '' : ';charset=utf-8');

            if (tryHtml) {
              createElementWithMarkup(markup);
              performCopy();
              return;
            }

            // The Clipboard API doesn't seem to support HTML content yet.
            // Leaving this unreachable code around for when it works better.
            try {
              const blob = new Blob([markup], { type: mimeTypeWithCharset });
              const clipboardItemInput = new ClipboardItem({
                [mimeType]: blob,
              });
              navigator.clipboard
                .write([clipboardItemInput])
                .then(() => {
                  showButterBar('Copied to clipboard', '#5eff8f');
                  console.log(clipboardItemInput);
                })
                .catch((err) => {
                  const errString = '' + err;
                  if (
                    errString.includes('NotAllowedError') &&
                    errString.includes('not focused')
                  ) {
                    showButterBar(
                      'Please click anywhere on the page to focus it first, then try again.',
                      'yellow'
                    );
                  } else {
                    showButterBar('Unknown error: ' + errString, 'yellow');
                  }
                });
            } catch (e) {
              console.log('Also exception', e);
            }
          } else {
            alert('Could not get permission to write to the clipboard.');
          }
        });
    },
  });
}

chrome.runtime.onConnect.addListener(function (port) {
  port.onMessage.addListener(function (msg) {
    if (msg.event === 'review_form.submitted') {
      copyDescriptionToClipboard(msg.data);
      port.postMessage({ event: 'clipboard.created' });
    }
  });
});
