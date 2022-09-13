async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

async function copyToClipboard(data, { onMessage }) {
  let currentTab = await getCurrentTab();
  if (!currentTab) {
    return;
  }
  chrome.scripting.executeScript(
    {
      target: { tabId: currentTab.id },
      args: [data],
      func: (reviewData) => {
        const { size, urgency, ccReviewers } = reviewData;
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
                if (!supported) {
                  showButterBar(
                    'It looks like copying to the clipboard is not supported :-/',
                    'yellow'
                  );
                }
                cleanUp();
              };

              const valueToStarEmoji = (value) => {
                return (
                  [...Array(3).keys()]
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
                    // This separator is needed for stars not to disappear in
                    // certain mobile browsers.
                    .join('\u200a')
                );
              };

              const decorateSizeAndUrgency = () => {
                let result = 'Size: ';
                result += valueToStarEmoji(size);
                result += '  Urgency: ';
                result += valueToStarEmoji(urgency);

                return result;
              };

              const decorateCcReviewers = () => {
                if (!ccReviewers?.length) {
                  return '';
                }

                const reviewers = ccReviewers.map((r) => '@' + r).join(' ');

                return `<div>cc ${reviewers}</div>`;
              };

              let tryHtml = true;

              const title =
                document.querySelector(PHAB_TITLE_SELECTOR).textContent;

              const markup = `
              <a href=${document.location.href}>
                <b>${title}</b>
              </a>
              <br />
              <div>${decorateSizeAndUrgency()}</div>
              ${decorateCcReviewers()}`;

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
    },
    (injectionResults) => {
      if (injectionResults.length) {
        onMessage({
          event: 'clipboard.created',
        });
      }
    }
  );
}

// this function is serialized to text and run in the main window,
// so everything it references must be inside this closure scope
function main() {
  function $(selector, node = document) {
    return Array.from(node.querySelectorAll(selector));
  }

  function getRequestedReviewers() {
    try {
      // it's a little ugly, but we scrape reviwer name from the dom text,
      // and then get reviewer status by associating it with preloaded phab data
      // form the tooltip

      const phabData = JSON.parse(
        $('data')?.[0].getAttribute('data-javelin-init-data') || '{data: {}}'
      ).data;

      function getPhabTooltip(node) {
        const dataId = node.getAttribute('data-meta').replace('0_', '');
        return phabData[dataId].tip;
      }

      const reviewersList = $('.phui-property-list-properties').filter(
        (n) => n.children[0]?.textContent.trim() === 'Reviewers'
      )?.[0];

      const requestedReviewers = $('.phui-link-person', reviewersList)
        .filter((node) => {
          // some things that should be groups are erroneously classed as users,
          // skip them
          return !node.textContent.startsWith('web-');
        })
        .map((node) => {
          const name = node.textContent;
          const status = $('[data-sigil=has-tooltip]', node.parentNode).map(
            getPhabTooltip
          )[0];

          return { name, status };
        })
        .filter((r) => r.status === 'Review Requested')
        .map((r) => r.name);

      return requestedReviewers;
    } catch (e) {
      return [];
    }
  }

  function sizeFromNumberOflinesChanged(lineCount) {
    switch (true) {
      case lineCount === 0: {
        // If we find 0 changed lines, it probably means we weren't able to
        // detect the real number. Let's use the default size then.
        // One full star.
        return 2;
      }
      case lineCount <= 100: {
        return 1;
      }
      case lineCount <= 200: {
        return 2;
      }
      case lineCount <= 250: {
        return 3;
      }
      case lineCount <= 400: {
        return 4;
      }
      case lineCount <= 700: {
        return 5;
      }
      default: {
        return 6;
      }
    }
  }

  function getLineCount() {
    const DIFF_TABLE_ROW_SELECTOR =
      '.diff-toc-changeset-row, .alt-diff-toc-changeset-row';

    const numberOfLinesChanged = $(DIFF_TABLE_ROW_SELECTOR).reduce(
      (agg, el) => {
        const linesMatch = el.textContent.match(/(\d+) lines?/);
        return (!!linesMatch ? Number(linesMatch[1]) : 0) + agg;
      },
      0
    );

    return numberOfLinesChanged;
  }

  const lineCount = getLineCount();
  const size = sizeFromNumberOflinesChanged(lineCount);
  const requestedReviewers = getRequestedReviewers();

  return { lineCount, size, requestedReviewers };
}

async function getReviewData({ onMessage }) {
  let currentTab = await getCurrentTab();
  chrome.scripting.executeScript(
    {
      target: { tabId: currentTab.id },
      func: main,
    },
    (injectionResults) => {
      for (const frameResult of injectionResults) {
        const data = frameResult.result;
        console.log(data);
        onMessage({
          event: 'review_data.result',
          data,
        });
      }
    }
  );
}

chrome.runtime.onConnect.addListener(function (port) {
  port.onMessage.addListener(function (msg) {
    if (msg.event === 'review_form.mounted') {
      getReviewData({
        onMessage(message) {
          const { event, data } = message;

          if (event === 'review_data.result') {
            port.postMessage({ event, data });
          }
        },
      });
    } else if (msg.event === 'review_form.submitted') {
      copyToClipboard(msg.data, {
        onMessage(message) {
          const { event, data } = message;

          if (event === 'clipboard.created') {
            port.postMessage({ event });
          }
        },
      });
    }
  });
});
