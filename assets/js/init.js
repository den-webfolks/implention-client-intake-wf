// Block 7: business-impact toggle + DOMContentLoaded init
  function biMore(btn) {
    const ab = btn.closest('.ablock');
    const open = ab.classList.toggle('bi-open');
    btn.textContent = open ? '\u2212 Hide impact & risks' : '+ Show impact & risks';
  }
  document.addEventListener('DOMContentLoaded', function () { if (typeof updateOverview === 'function') updateOverview(); });
