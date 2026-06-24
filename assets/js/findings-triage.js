// Blocks 4+5: finding triage (ignore-with-reason), business impact, section-level request
  // ===== Finding triage: Create Client Request (existing) + Ignore-with-reason =====
  function onIgnoreReason(ta) {
    const btn = ta.closest('.ignore-flow').querySelector('.confirm-ignore');
    btn.disabled = ta.value.trim() === '';
  }
  function startIgnore(btn) {
    const f = btn.closest('.finding');
    f.classList.add('ignoring');
    const ta = f.querySelector('.if-reason');
    if (ta) ta.focus();
  }
  function cancelIgnore(btn) {
    const f = btn.closest('.finding');
    f.classList.remove('ignoring');
    const ta = f.querySelector('.if-reason');
    if (ta) { ta.value = ''; f.querySelector('.confirm-ignore').disabled = true; }
  }
  function confirmIgnore(btn) {
    const f = btn.closest('.finding');
    const reason = f.querySelector('.if-reason').value.trim();
    if (!reason) return;
    f.querySelector('.ig-reason').textContent = '\u201c' + reason + '\u201d';
    f.classList.remove('ignoring');
    f.classList.add('is-ignored');
    if (typeof showToast === 'function') showToast('Finding ignored \u2014 rationale saved');
  }
  function undoIgnore(btn) {
    btn.closest('.finding').classList.remove('is-ignored');
  }
  // ===== Findings: optional business impact + section-level request =====
  function toggleBiz(btn) {
    const biz = btn.nextElementSibling;
    const on = biz.classList.toggle('show');
    btn.textContent = on ? 'Hide business impact' : 'Show business impact';
  }
  function createSectionRequest(btn) {
    if (intakeSent) { if (typeof showToast === 'function') showToast('The review is locked while awaiting customer updates'); return; }
    const card = btn.closest('.acard');
    const name = card.querySelector('.acard-titles .t').textContent.trim();
    requests.push({ name: '', desc: '', severity: 'medium', fileRequired: true, reqType: 'upload', targetFile: '', fileContext: { mode: 'upload', file: '' }, note: '', source: name + ' (analysis)', analysis: card.id, status: 'draft' });
    renderRequests();
    focusLastRequest();
    if (typeof showToast === 'function') showToast('Draft request added — ' + name);
  }
