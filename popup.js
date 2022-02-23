const form = document.querySelector('.js-review-form');
const port = chrome.runtime.connect({ name: 'knockknock' });

port.onMessage.addListener(function (msg) {
  if (msg.event === 'clipboard.created') {
    console.log('Clipboard created', msg);
    form.reset();
  }
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const urgency = Number(form.elements.urgency.value);
  const size = Number(form.elements.size.value);

  // chrome.runtime.sendMessage(
  //   { msg: 'review_form.submitted', data: { urgency, size } },
  //   (response) => {
  //     if (response) {
  //       console.log('Received response', response);
  //     }
  //   }
  // );

  port.postMessage({ event: 'review_form.submitted', data: { urgency, size } });
});
