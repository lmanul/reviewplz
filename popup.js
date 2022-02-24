((global) => {
  const port = chrome.runtime.connect({ name: 'knockknock' });

  const form = document.querySelector('.js-review-form');
  const sizeStarContainer = document.querySelector('.js-size-stars');
  const urgencyStarContainer = document.querySelector('.js-urgency-stars');
  const copyToClipboardButton = document.querySelector('.btn-submit');

  const copyToClipboardButtonInitialText = 'Copy to clipboard';
  const copyToClipboardButtonSubmittedText = 'Copied!';

  const copyToClipboardButtonSubmittedClassName = 'btn-submitted';

  const StarFill = {
    EMPTY: 'empty',
    HALF: 'half',
    FULL: 'full',
  };

  function getStarSvg(pathFillMode = StarFill.EMPTY) {
    return `<svg width="30" height="30" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink">
    <path class="star-path star-path--${pathFillMode}" d="M9.5 14.25l-5.584 2.936 1.066-6.218L.465 6.564l6.243-.907L9.5 0l2.792 5.657 6.243.907-4.517 4.404 1.066 6.218 -5.957 -2.936" stroke="black" stroke-width="0.5px" />
  </svg>`;
  }

  function renderStars(container, newValue) {
    container.innerHTML = '';
    container.offsetHeight;

    requestAnimationFrame(() => {
      [...Array(3).keys()]
        .map((value) => value + 1)
        .forEach((index) => {
          const svgContainer = document.createElement('span');
          if (newValue >= index * 2) {
            svgContainer.innerHTML = getStarSvg(StarFill.FULL);
          } else {
            const starFill =
              Math.abs(newValue - index * 2) === 1
                ? StarFill.HALF
                : StarFill.EMPTY;
            svgContainer.innerHTML = getStarSvg(starFill);
          }
          container.append(svgContainer);
        });
    });

    // re-trigger half star animations
    document
      .getElementById('star-gradient-defs')
      .querySelectorAll('animate')[0]
      .beginElement();
  }

  function initPopup() {
    copyToClipboardButton.textContent = copyToClipboardButtonInitialText;

    form.elements.urgency.addEventListener('input', (e) => {
      renderStars(urgencyStarContainer, Number(e.target.value));
    });

    form.elements.size.addEventListener('input', (e) => {
      renderStars(sizeStarContainer, Number(e.target.value));
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const urgency = Number(form.elements.urgency.value);
      const size = Number(form.elements.size.value);

      port.postMessage({
        event: 'review_form.submitted',
        data: { urgency, size },
      });
    });

    port.onMessage.addListener(function (msg) {
      if (msg.event === 'clipboard.created') {
        console.log('Clipboard created', msg);
        copyToClipboardButton.textContent = copyToClipboardButtonSubmittedText;
        copyToClipboardButton.classList.add(
          copyToClipboardButtonSubmittedClassName);

        // Restore the initial button after a delay.
        window.setTimeout(() => {
          copyToClipboardButton.textContent = copyToClipboardButtonInitialText;
          copyToClipboardButton.classList.remove(
            copyToClipboardButtonSubmittedClassName);
        }, 2000);
      }
    });

    renderStars(sizeStarContainer, Number(form.elements.size.value));
    renderStars(urgencyStarContainer, Number(form.elements.urgency.value));
  }

  initPopup();
})(window);
