document.addEventListener('DOMContentLoaded', function () {
  const allBingoCardsDiv = document.getElementById('allBingoCards');
  if (!allBingoCardsDiv) {
    console.error('Element with ID "allBingoCards" not found.');
    return;
  }

  const dataStr = allBingoCardsDiv.textContent.trim();
  try {
    const jsonStr = dataStr
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
      .replace(/'/g, '"');
    const bingoCards = JSON.parse(jsonStr);

    const checkBoxContainer = document.getElementById('checkBoxContainer');
    if (!checkBoxContainer) {
      console.error('Element with ID "checkBoxContainer" not found.');
      return;
    }

    checkBoxContainer.innerHTML = '';
    bingoCards.forEach(card => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `card_${card.id}`;
      checkbox.value = card.id;

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = `${card.id}`;
      
      const wrapper = document.createElement('div');
      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);

      checkBoxContainer.appendChild(wrapper);
    });

    const selectInput = document.getElementById('selectCartela');
    if (selectInput) {
      const handleSelection = () => {
        const rawValue = String(selectInput.value || '').trim();
        if (!rawValue) { return; }

        const selectedId = parseInt(rawValue, 10);
        if (Number.isNaN(selectedId)) { return; }

        const targetCheckbox = document.getElementById(`card_${selectedId}`);
        if (!targetCheckbox) {
          alert('Card not found.');
          return;
        }

        if (targetCheckbox.checked) {
          alert('Card already selected.');
        } else {
          targetCheckbox.checked = true;
        }

        selectInput.value = '';
      };

      selectInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleSelection();
        }
      });
    }

    const startBtn = document.getElementById('startGame');
    if (startBtn) {
      startBtn.addEventListener('click', function (event) {
        // Prevent form submission if inside a form
        event.preventDefault();

        // Build arrays from selected checkboxes
        const checkedInputs = Array.from(checkBoxContainer.querySelectorAll('input[type="checkbox"]:checked'));
        const activeCards = checkedInputs.map(input => {
          const label = checkBoxContainer.querySelector(`label[for="${input.id}"]`);
          return label ? label.textContent : String(input.value);
        });

        const selectedIds = checkedInputs.map(input => parseInt(String(input.value), 10)).filter(n => !Number.isNaN(n));
        const activeCartdsBinogoNumber = bingoCards.filter(card => selectedIds.includes(parseInt(String(card.id), 10)));

        // Read inputs (no pre-calculation stored)
        const playersCount = activeCards.length;
        const priceInput = document.getElementById('cartelaPrice');
        const priceValue = priceInput ? parseFloat(String(priceInput.value || '').trim()) : NaN;
        const patternInput = document.getElementById('pattern');
        const patternValueStr = patternInput ? String((patternInput.value || '')).trim() : '';

        if (playersCount < 2) {
          alert('Not enough players. You must select at least 2.');
          return;
        }

        // Persist to sessionStorage
        try {
          sessionStorage.setItem('activeCartdsBinogoNumber', JSON.stringify(activeCartdsBinogoNumber));
          sessionStorage.setItem('activeCards', JSON.stringify(activeCards));
          sessionStorage.setItem('cartelaPrice', String(Number.isFinite(priceValue) ? priceValue : 0));
          sessionStorage.setItem('pattern', patternValueStr);
          // Navigate to game page after saving
          window.location.href = '/game';
        } catch (e) {
          console.error('Failed to write sessionStorage:', e && e.message ? e.message : e);
        }
      });
    }
  } catch (error) {
    console.error('Failed to parse JSON:', error.message);
  }
});
