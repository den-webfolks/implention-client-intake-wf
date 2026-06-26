// Block 2: Internal Report decision workflow, requests, versions, intake status (Page 3)
  // ===== Internal Report — decision workflow (Page 3) ================
  const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  // ---- Analysis card expand / collapse ----
  function toggleCard(el) {
    const card = el.closest('.acard');
    const willOpen = !card.classList.contains('open');
    if (willOpen) document.querySelectorAll('#page-3 .acard.open').forEach(c => { if (c !== card) c.classList.remove('open'); });
    card.classList.toggle('open');
  }
  function collapseAllCards() { document.querySelectorAll('#page-3 .acard.open').forEach(c => c.classList.remove('open')); }
  function jumpToNextUnreviewed() {
    const cards = [...document.querySelectorAll('#page-3 .acard[data-weight]')];
    const next = cards.find(c => statusOf(c) === 'not');
    if (!next) { if (typeof showToast === 'function') showToast('All analyses reviewed \u2014 nice work'); return; }
    document.querySelectorAll('#page-3 .acard.open').forEach(c => { if (c !== next) c.classList.remove('open'); });
    next.classList.add('open');
    const y = next.getBoundingClientRect().top + window.pageYOffset - 120;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
  // ===== Per-analysis review status (reviewed / not reviewed) =====
  const STMETA = {
    not:      { lbl: 'Not reviewed', cls: 'st-not' },
    reviewed: { lbl: 'Reviewed',     cls: 'st-reviewed' },
  };
  const IS_META = {
    reviewing:  { lbl: 'Reviewing',                cls: 'is-reviewing' },
    ready:      { lbl: 'Ready to Send Requests',   cls: 'is-ready' },
    awaiting:   { lbl: 'Awaiting Customer Update',  cls: 'is-awaiting' },
    onboarding: { lbl: 'Ready for Onboarding',     cls: 'is-onboarding' },
  };
  let intakeSent = false;
  let responsesIn = false;

  function requestsFromAnalysis(id) {
    return (typeof requests !== 'undefined') ? requests.filter(r => r.analysis === id).length : 0;
  }
  function statusOf(card) { return card.dataset.reviewed === '1' ? 'reviewed' : 'not'; }

  function initCards() {
    document.querySelectorAll('#page-3 .acard[data-weight]').forEach(card => {
      if (card.dataset.reviewed === undefined) card.dataset.reviewed = '0';
      const tools = card.querySelector('.acard-tools');
      if (tools && !tools.querySelector('[data-role="badge"]')) {
        const b = document.createElement('span');
        b.setAttribute('data-role', 'badge');
        b.className = 'ax-badge st-not';
        b.textContent = 'Not reviewed';
        tools.insertBefore(b, tools.firstChild);
      }
    });
  }

  function renderFoot(card) {
    const foot = card.querySelector('.acard-foot');
    if (!foot) return;
    const reviewed = statusOf(card) === 'reviewed';
    const reqN = requestsFromAnalysis(card.id);
    const reqNote = reqN > 0
      ? '<span class="foot-help"><span class="fh-dot"></span>' + reqN + ' request' + (reqN !== 1 ? 's' : '') + ' for the customer from this analysis</span>'
      : '';
    let html;
    if (reviewed) {
      html = '<div class="foot-lead"><span class="foot-state st-reviewed"><span class="fs-dot"></span>Reviewed</span>' + reqNote + '</div>'
           + '<button class="fa" onclick="reopenCard(this)">Mark not reviewed</button>';
    } else {
      html = '<div class="foot-lead"><button class="ct-review" onclick="markReviewed(this)">Mark reviewed</button>' + reqNote + '</div>';
    }
    foot.innerHTML = html;
  }

  function refreshCard(card) {
    const st = statusOf(card);
    card.classList.remove('card-st-not', 'card-st-reviewed', 'card-st-waiting', 'card-st-deferred');
    card.classList.add('card-' + STMETA[st].cls);
    const badge = card.querySelector('[data-role="badge"]');
    if (badge) { badge.className = 'ax-badge ' + STMETA[st].cls; badge.textContent = STMETA[st].lbl; }
    renderFoot(card);
  }
  function refreshAll() {
    document.querySelectorAll('#page-3 .acard[data-weight]').forEach(refreshCard);
    updateOverview();
  }

  // ---- Analysis-level review toggle ("Mark reviewed" = checked) ----
  function markReviewed(btn) { btn.closest('.acard').dataset.reviewed = '1'; refreshAll(); }
  function reopenCard(btn)   { btn.closest('.acard').dataset.reviewed = '0'; refreshAll(); }
  function markAllReviewed() {
    document.querySelectorAll('#page-3 .acard[data-weight]').forEach(c => { c.dataset.reviewed = '1'; });
    refreshAll();
    if (typeof showToast === 'function') showToast('All analyses marked reviewed (demo)');
  }

  // ---- Report-level review metrics + intake status ----
  function openRequests() { return (typeof requests !== 'undefined') ? requests.filter(r => !['Done', 'Acknowledged', 'Deflected'].includes(r.respStatus)).length : 0; }
  function computeIntakeStatus() {
    const cards = [...document.querySelectorAll('#page-3 .acard[data-weight]')];
    const reviewed = cards.filter(c => statusOf(c) === 'reviewed').length;
    const notReviewed = cards.length - reviewed;
    const openN = openRequests();
    if (intakeSent) return 'awaiting';
    if (openN === 0 && notReviewed === 0) return 'onboarding';
    if (openN > 0) return 'ready';
    return 'reviewing';
  }
  function updateOverview() {
    const cards = [...document.querySelectorAll('#page-3 .acard[data-weight]')];
    const total = cards.length;
    let reviewed = 0, waiting = 0;
    cards.forEach(cd => { if (statusOf(cd) === 'reviewed') reviewed++; if (requestsFromAnalysis(cd.id) > 0) waiting++; });
    const notReviewed = total - reviewed;
    const openN = openRequests();
    const setT = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    setT('arb-done', reviewed); setT('arb-total', total);
    const fill = document.getElementById('arb-fill'); if (fill) fill.style.width = (total ? Math.round(reviewed / total * 100) : 0) + '%';
    setT('arb-reviewed', reviewed); setT('arb-waiting', waiting); setT('arb-not', notReviewed);
    const stt = computeIntakeStatus();
    const isb = document.getElementById('intake-status');
    if (isb) { isb.className = 'intake-status ' + IS_META[stt].cls; isb.textContent = IS_META[stt].lbl; }
    const canSend = openN > 0 && notReviewed === 0;
    const sb = document.getElementById('send-close-btn');
    if (sb) { if (intakeSent) { sb.disabled = true; sb.textContent = 'Package sent \u00b7 awaiting update'; } else { sb.disabled = !canSend; sb.textContent = (openN > 0 && notReviewed > 0) ? 'Review all analyses to continue' : 'Review Customer Package'; } }
    const lu = document.getElementById('load-update-btn'); if (lu) { lu.style.display = responsesIn ? 'inline-flex' : 'none'; lu.textContent = 'Run new analysis \u2192'; }
    const sc = document.getElementById('send-client-btn'); if (sc) { sc.disabled = intakeSent || !canSend; sc.textContent = intakeSent ? 'Package sent' : 'Review Customer Package'; }
    renderReqMetrics(); applyAwaiting();
  }

  // ---- Customer Package: review -> send ----
  // The customer-facing package is a formal deliverable generated from the
  // Internal Report. Managers review the full package before it is sent; sending
  // creates an immutable snapshot (sentPackage) that the Customer View mirrors.
  let sentPackage = null;                          // snapshot of the last package sent
  let packageDraft = { exec: '', msg: '' };        // editable exec summary + manager message
  const DEFAULT_EXEC = 'We reviewed your onboarding submission and identified several items that require clarification or additional files before onboarding can continue.';
  const PKG_DATE = 'May 24, 2026';

  // Per-analysis readiness verdict (shared by every surface).
  function analysisStatus(score) {
    return score >= 85 ? { k: 'Ready', c: 'ok' } : score >= 60 ? { k: 'Needs Attention', c: 'warn' } : { k: 'Blocked', c: 'bad' };
  }
  // Overall readiness decision (shared by every surface).
  function rcDecision(overall, missing, openCritical, blocked, openReq) {
    if (overall < 50) return { lbl: 'Intake Incomplete', cls: 'bad' };
    if (missing > 0 || openCritical > 0 || blocked > 0 || overall < 75) return { lbl: 'Additional Information Required', cls: 'warn' };
    if (openReq > 0 || overall < 90) return { lbl: 'Ready Pending Minor Updates', cls: 'accent' };
    return { lbl: 'Ready for Audit', cls: 'ok' };
  }

  // The single customer-package data structure. Built from live state and shared
  // (after a deep-copy snapshot at send) by the Customer Package, the customer-
  // experience preview, the Customer View tab, and the client Report Card.
  function buildDraftPackage() {
    const groups = (typeof RC_GROUPS !== 'undefined') ? RC_GROUPS : [];
    const fileRows = (typeof RC_FILES !== 'undefined') ? RC_FILES : [];
    const analyses = groups.flatMap(g => g.items.map(it => Object.assign({ group: g.label }, it)));
    const aTotal = analyses.length;
    const overall = aTotal ? Math.round(analyses.reduce((a, x) => a + x.score, 0) / aTotal) : 0;
    const ready = analyses.filter(x => analysisStatus(x.score).k === 'Ready').length;
    const attention = aTotal - ready;
    const blocked = analyses.filter(x => analysisStatus(x.score).k === 'Blocked').length;
    const received = fileRows.filter(f => f.status === 'received').length;
    const missing = fileRows.filter(f => f.status === 'missing').length;
    const optional = fileRows.filter(f => f.status === 'optional').length;
    const reqs = (typeof requests !== 'undefined') ? requests : [];
    const open = reqs.length;
    const openCritical = reqs.filter(r => r.severity === 'critical').length;
    const dec = rcDecision(overall, missing, openCritical, blocked, open);
    const cards = [...document.querySelectorAll('#page-3 .acard[data-weight]')];
    const reviewed = cards.filter(c => statusOf(c) === 'reviewed').length;
    return {
      version: currentVerLabel(),
      customer: (typeof state !== 'undefined' ? state.customer : 'the customer'),
      threePL: (typeof state !== 'undefined' ? (state.threePL || '') : ''),
      date: PKG_DATE,
      urgency: bucketUrgency,
      overall, decision: dec.lbl, decisionCls: dec.cls,
      exec: packageDraft.exec || DEFAULT_EXEC,
      msg: packageDraft.msg || '',
      readiness: { filesReceived: received, missing, optional, open, reviewed, reviewTotal: cards.length, ready, attention, analysisTotal: aTotal, status: dec.lbl, statusCls: dec.cls },
      analyses,
      files: fileRows.slice(),
      // Intake-files lifecycle model (same source as the Review-tab Intake Files table).
      intakeFiles: (typeof FILES !== 'undefined' ? FILES.map(f => Object.assign({}, f)) : []),
      requests: reqs.map(r => ({
        name: r.name, desc: r.desc, severity: r.severity,
        reqType: r.reqType || (r.fileRequired ? 'upload' : 'clarify'),
        fileRequired: r.fileRequired, targetFile: r.targetFile || '',
      })),
    };
  }

  // Entry point for the primary CTA "Review Customer Package".
  function openPackageReview() {
    if (intakeSent) { if (typeof showToast === 'function') showToast('A package is already awaiting customer updates'); return; }
    if (!requests.length) { if (typeof showToast === 'function') showToast('Add at least one request before preparing the package'); return; }
    const notReviewed = [...document.querySelectorAll('#page-3 .acard[data-weight]')].filter(c => statusOf(c) === 'not').length;
    if (notReviewed > 0) { if (typeof showToast === 'function') showToast('Mark every analysis reviewed before preparing the package'); return; }
    if (!packageDraft.exec) packageDraft.exec = DEFAULT_EXEC;
    renderPackageReview();
    const ov = document.getElementById('package-review'); if (ov) ov.classList.add('show');
    document.body.classList.add('pkg-open');
  }
  function closePackageReview() {
    const ov = document.getElementById('package-review'); if (ov) ov.classList.remove('show');
    document.body.classList.remove('pkg-open');
  }
  function pkgEditExec(v) { packageDraft.exec = v; }
  function pkgEditMsg(v) { packageDraft.msg = v; }

  // Manager Customer Package = the shared customer experience, made editable,
  // plus the "view customer experience" handoff to the read-only preview.
  function renderPackageReview() {
    const root = document.getElementById('pkg-body'); if (!root) return;
    const p = buildDraftPackage();
    root.innerHTML = customerExperienceHTML(p, { audience: 'manager', editable: true, live: false })
      + '<div class="pkg-preview-row">'
      + '<button class="btn secondary" onclick="previewCustomerExperience()">View customer experience \u2197</button>'
      + '<span class="pkg-preview-help">See the exact page ' + esc(p.customer) + ' will receive before sending.</span>'
      + '</div>';
  }

  // Manager preview = the exact client Report Card, read-only, from the draft.
  function previewCustomerExperience() {
    const ov = document.getElementById('customer-preview'); if (!ov) return;
    const body = document.getElementById('cprev-body');
    if (body) body.innerHTML = customerExperienceHTML(buildDraftPackage(), { audience: 'client', editable: false, live: false });
    ov.classList.add('show');
  }
  function closeCustomerPreview() { const ov = document.getElementById('customer-preview'); if (ov) ov.classList.remove('show'); }

  // ---- Send the package ----
  function sendPackage() {
    const p = buildDraftPackage();
    const d = p.date;
    requests.forEach(r => {
      if (!r.sent) { r.sent = true; r.batch = 'original'; r.sentDate = d; if (!r.respStatus) r.respStatus = 'Pending'; if (r.respFile === undefined) r.respFile = null; r.lastUpdated = d; }
    });
    // Immutable snapshot \u2014 the official customer communication for this version.
    sentPackage = JSON.parse(JSON.stringify(p));
    sentPackage.sentDate = d;
    intakeSent = true;
    refreshAll();
    renderResponse();
    if (typeof renderReportCard === 'function') renderReportCard();
    closePackageReview();
    switchVTab('response');
    if (typeof showToast === 'function') showToast('Package sent to ' + p.customer + ' \u00b7 ' + p.requests.length + ' request' + (p.requests.length !== 1 ? 's' : '') + ' \u00b7 status \u2192 Awaiting Customer Updates');
  }

  function confirmRunNewAnalysis() { const m = document.getElementById('newanalysis-modal'); if (m) m.classList.add('show'); }
  function closeNewAnalysisModal() { const m = document.getElementById('newanalysis-modal'); if (m) m.classList.remove('show'); }
  function doRunNewAnalysis() { closeNewAnalysisModal(); loadCustomerUpdate(); }
  let _newVerCreated = false;
  function loadCustomerUpdate() {
    requests.forEach(r => { if (r.sent && !['Done', 'Acknowledged', 'Deflected'].includes(r.respStatus)) { r.respStatus = 'Done'; r.lastUpdated = 'May 24, 2026'; if (!r.respNote) r.respNote = 'Provided in updated submission'; } });
    responsesIn = false;
    const sel = document.getElementById('intake-version');
    if (sel && !_newVerCreated) {
      _newVerCreated = true;
      [...sel.options].forEach(o => { o.textContent = o.textContent.replace(' \u2014 current', ''); });
      const opt = document.createElement('option'); opt.value = 'v5'; opt.textContent = 'Version 5 \u2014 current';
      sel.insertBefore(opt, sel.firstChild); sel.value = 'v5';
      if (typeof INTAKE !== 'undefined') { INTAKE.v5 = { status: 'In Review', date: 'May 24, 2026', by: 'ben@hellotushy.com', score: '81%', cls: 'warn' }; if (INTAKE.v4) INTAKE.v4.status = 'Awaiting Customer Updates'; }
      if (typeof INTAKE_DIFF !== 'undefined') INTAKE_DIFF.v5 = '+4 new \u00b7 \u221211 resolved \u00b7 9 unchanged';
      if (typeof switchIntake === 'function') switchIntake(sel);
      // carry forward + apply fulfilled file requests into Version 5
      requests.forEach(r => {
        if (!r.sent || r.respStatus !== 'Done') return;
        if (r.reqType === 'replace' && r.targetFile) {
          const tgt = fileByName(r.targetFile);
          const newName = requestedFileName(r);
          if (tgt && tgt.status === 'active') { tgt.status = 'replaced'; tgt.replacedBy = newName; }
          if (!fileByName(newName)) FILES.push({ name: newName, type: tgt ? tgt.type : 'File', cat: tgt ? tgt.cat : 'Provided', status: 'active', introduced: 'V5', replaces: r.targetFile });
        } else if (r.reqType === 'upload') {
          const newName = requestedFileName(r);
          if (!fileByName(newName)) FILES.push({ name: newName, type: 'File', cat: 'Provided', status: 'active', introduced: 'V5' });
        }
      });
    }
    intakeSent = false;
    document.querySelectorAll('#page-3 .acard[data-weight]').forEach(card => { card.dataset.reviewed = '0'; });
    switchVTab('review');
    refreshAll();
    renderFiles(); renderVersionSummary();
    if (typeof showToast === 'function') showToast('New analysis run on Version 5 \u2014 updated files incorporated \u00b7 analyses reopened for review');
  }

  // ===== Tabbed workspace =====
  let bucketAutoCollapsed = false;
  function switchVTab(name) {
    document.querySelectorAll('#page-3 .vtab').forEach(b => b.classList.toggle('active', b.dataset.vtab === name));
    document.querySelectorAll('#page-3 .vtab-panel').forEach(pn => pn.classList.remove('active'));
    const panel = document.getElementById('tab-' + name); if (panel) panel.classList.add('active');
    if (name === 'response') renderResponse();
    const tabs = document.getElementById('vtabs'); if (tabs) tabs.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function applyAwaiting() {
    const wrap = document.querySelector('#page-3 .container.wide');
    if (wrap) wrap.classList.toggle('awaiting', intakeSent);
    const ab = document.getElementById('await-banner'); if (ab) ab.style.display = intakeSent ? 'flex' : 'none';
    const addBtn = document.querySelector('.ca-add');
    if (addBtn) { addBtn.style.display = intakeSent ? 'none' : ''; addBtn.classList.remove('supp'); }
    const rd = document.querySelector('#page-3 .vtab[data-vtab="response"]'); if (rd) rd.classList.toggle('has-data', requests.some(r => r.sent));
    // The bucket is collapsible at any time. Sending the package auto-collapses it ONCE
    // as a convenience; after that the user controls it freely.
    if (intakeSent && !bucketAutoCollapsed) { bucketAutoCollapsed = true; setBucketCollapsed(true); }
  }
  function setBucketCollapsed(collapsed) {
    const layout = document.querySelector('#page-3 .ir-layout');
    if (layout) layout.classList.toggle('bucket-collapsed', collapsed);
    const btn = document.getElementById('bucket-toggle');
    if (btn) { btn.textContent = collapsed ? 'Show bucket' : 'Hide bucket'; btn.classList.toggle('is-collapsed', collapsed); }
  }
  function bucketIsCollapsed() { const l = document.querySelector('#page-3 .ir-layout'); return !!(l && l.classList.contains('bucket-collapsed')); }
  function toggleBucket() { setBucketCollapsed(!bucketIsCollapsed()); }

  // ---- Request lifecycle stats (Done / Acknowledged / Deflected) ----
  const CST = { 'Pending': 'cst-pending', 'Done': 'cst-done', 'Acknowledged': 'cst-ack', 'Deflected': 'cst-deflected' };
  const SUBMIT_DATE = 'May 22, 2026';
  function isHandled(r) { return ['Done', 'Acknowledged', 'Deflected'].includes(r.respStatus); }
  function computeReqStats() {
    const sent = requests.filter(r => r.sent);
    const done = sent.filter(r => r.respStatus === 'Done').length;
    const ack = sent.filter(r => r.respStatus === 'Acknowledged').length;
    const deflected = sent.filter(r => r.respStatus === 'Deflected').length;
    const pending = sent.filter(r => !isHandled(r)).length;
    const files = sent.filter(r => r.respFile).length;
    return { sentN: sent.length, done, ack, deflected, pending, files, addressed: done + ack + deflected, open: openRequests() };
  }
  function renderReqMetrics() {
    const box = document.getElementById('req-metrics'); if (!box) return;
    const c = computeReqStats();
    if (c.sentN === 0) { box.style.display = 'none'; box.innerHTML = ''; return; }
    box.style.display = 'flex';
    box.innerHTML = [['Open requests', c.open], ['Done', c.done], ['Acknowledged', c.ack], ['Deflected', c.deflected]]
      .map(x => '<span class="rqm"><b>' + x[1] + '</b>' + x[0] + '</span>').join('');
  }


  // ---- Requests tab (operational tracking workspace) ----
  function statCell(n, l) { return '<div class="resp-stat"><span class="n">' + n + '</span><span class="l">' + l + '</span></div>'; }
  function reqType(r) { return r.reqType === 'replace' ? 'Replace existing' : (r.reqType === 'clarify' || !r.fileRequired ? 'Clarification' : 'Upload missing'); }
  // Richer customer-progress status used in the tracking table.
  const TRACK_CLS = { 'Pending': 'cst-pending', 'In Progress': 'cst-progress', 'File Uploaded': 'cst-uploaded', 'Submitted': 'cst-uploaded', 'Under Review': 'cst-review', 'Resolved': 'cst-resolved', 'Closed': 'cst-deflected' };
  function trackStatusLabel(r) {
    if (!isHandled(r)) return (r.respStatus && r.respStatus !== 'Pending') ? r.respStatus : 'Pending';
    if (r.respStatus === 'Done') return r.respFile ? 'File Uploaded' : 'Submitted';
    if (r.respStatus === 'Acknowledged') return 'Resolved';
    if (r.respStatus === 'Deflected') return 'Closed';
    return 'Pending';
  }
  function trackRow(r, i) {
    const sevLbl = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
    const lbl = trackStatusLabel(r);
    const main = '<tr class="rt-row" onclick="toggleTrackRow(' + i + ')">'
      + '<td class="rt-name"><span class="rt-caret" id="rt-caret-' + i + '">\u203a</span>' + esc(r.name || 'Untitled request') + '</td>'
      + '<td>' + (sevLbl[r.severity] || 'Medium') + '</td>'
      + '<td><span class="cst ' + (TRACK_CLS[lbl] || 'cst-pending') + '">' + esc(lbl) + '</span></td>'
      + '<td class="rt-upd">' + esc(isHandled(r) ? (r.lastUpdated || SUBMIT_DATE) : '\u2014') + '</td></tr>';
    return main + '<tr class="rt-detail" id="rt-detail-' + i + '"><td colspan="4">' + trackDetailHTML(r) + '</td></tr>';
  }
  // Expanded detail for a tracking row \u2014 surfaces the full builder data the columns can't show.
  function trackDetailHTML(r) {
    const typeLbl = r.reqType === 'replace' ? 'Replace existing file'
      : (r.reqType === 'clarify' || !r.fileRequired ? 'Provide clarification (no file)' : 'Upload missing file');
    let h = '<div class="rt-det">';
    if (r.desc) h += '<div class="rt-det-row"><span class="rt-det-k">Description</span><div class="rt-det-v">' + esc(r.desc) + '</div></div>';
    h += '<div class="rt-det-row"><span class="rt-det-k">Request type</span><div class="rt-det-v">' + esc(typeLbl)
      + '<div class="rt-det-hint">' + esc(reqTypeHint(r.reqType || (r.fileRequired ? 'upload' : 'clarify'))) + '</div></div></div>';
    if (r.reqType === 'replace' && r.targetFile)
      h += '<div class="rt-det-row"><span class="rt-det-k">File being replaced</span><div class="rt-det-v"><span class="mono">' + esc(r.targetFile) + '</span></div></div>';
    if (r.note)
      h += '<div class="rt-det-row"><span class="rt-det-k">Internal note</span><div class="rt-det-v"><span class="rt-det-int">Internal \u00b7 not shown to customer</span>' + esc(r.note) + '</div></div>';
    h += '<div class="rt-det-row"><span class="rt-det-k">Source finding</span><div class="rt-det-v">'
      + (r.analysis
        ? '<a class="rq-source" href="#" data-analysis="' + esc(r.analysis) + '" data-source="' + esc(r.source || '') + '" onclick="gotoFindingFromTrack(this);return false;">\u21b3 source finding: ' + esc(r.source || r.analysis) + '</a>'
        : '<span class="rq-source none">\u21b3 no linked finding</span>')
      + '</div></div>';
    return h + '</div>';
  }
  function toggleTrackRow(i) {
    const det = document.getElementById('rt-detail-' + i);
    const car = document.getElementById('rt-caret-' + i);
    if (!det) return;
    const open = det.classList.toggle('show');
    if (car) car.classList.toggle('open', open);
  }
  // Customer-response activity entry (type-aware) for a handled request.
  function activityFor(r) {
    if (r.reqType === 'replace') return { lbl: 'File Replaced', cls: 'up' };
    if (r.reqType === 'clarify' || !r.fileRequired) return { lbl: 'Clarification Provided', cls: 'ack' };
    if (r.respFile) return { lbl: 'File Uploaded', cls: 'up' };
    return { lbl: 'Response Submitted', cls: 'up' };
  }
  function renderResponse() {
    const root = document.getElementById('resp-root'); if (!root) return;
    const sent = requests.filter(r => r.sent);
    if (!sent.length) {
      root.innerHTML = '<div class="resp-empty"><div class="re-ic">\u25f7</div><h3>No package sent yet</h3>'
        + '<p>Review every analysis and build the request bucket in the Review tab, then choose <b>Review Customer Package</b> and send it. Customer progress is tracked here.</p></div>';
      return;
    }
    const c = computeReqStats();
    const handled = sent.some(r => isHandled(r));
    const cust = esc(typeof state !== 'undefined' ? state.customer : 'the customer');
    const pkg = sentPackage || {};
    const statusLbl = intakeSent ? 'Awaiting Customer Updates' : 'In review';
    const head = '<div class="resp-head"><div><h2 class="resp-h">Request tracking</h2>'
      + '<p class="resp-sub">Track how ' + cust + ' is progressing on the sent package.</p></div>'
      + '<div class="resp-head-actions">'
      + '<button class="btn secondary sm" onclick="openCustomerPage()">View customer page ↗</button>'
      + (handled ? '' : '<button class="btn secondary sm" onclick="simulateResponses()">Simulate customer response</button>')
      + '</div></div>';
    const cta = handled
      ? '<div class="resp-cta"><div><b>' + cust + ' has responded.</b> Review the progress below, then run a new analysis to fold the updated files into a fresh review cycle.</div>'
        + '<button class="btn sm" onclick="confirmRunNewAnalysis()">Run new analysis \u2192</button></div>'
      : '';
    // Request Package Summary
    const summary = '<div class="rt-summary">'
      + '<div class="rts"><span class="l">Package Sent</span><span class="v">' + esc(sent[0].sentDate || pkg.sentDate || '\u2014') + '</span></div>'
      + '<div class="rts"><span class="l">Version</span><span class="v">' + esc(pkg.version || currentVerLabel()) + '</span></div>'
      + '<div class="rts"><span class="l">Requests</span><span class="v">' + sent.length + '</span></div>'
      + '<div class="rts"><span class="l">Response urgency</span><span class="v">' + esc(pkg.urgency || bucketUrgency) + '</span></div>'
      + '<div class="rts"><span class="l">Status</span><span class="v"><span class="cst cst-review">' + esc(statusLbl) + '</span></span></div>'
      + '</div>';
    // Request Tracking Table
    const table = '<div class="resp-pkg">'
      + '<div class="rp-head"><b>Request tracking</b><span>' + sent.length + ' request' + (sent.length !== 1 ? 's' : '') + '</span></div>'
      + '<table class="resp-table"><thead><tr><th>Request</th><th>Severity</th><th>Status</th><th>Last Updated</th></tr></thead><tbody>'
      + sent.map((r, i) => trackRow(r, i)).join('') + '</tbody></table></div>';
    // Customer Response Activity
    const acted = sent.filter(r => isHandled(r));
    let act = '<div class="resp-pkg"><div class="rp-head"><b>Customer response activity</b><span>'
      + (acted.length ? acted.length + ' update' + (acted.length !== 1 ? 's' : '') + ' \u00b7 ' + esc(acted[0].lastUpdated || SUBMIT_DATE) : 'No activity yet') + '</span></div>';
    if (!acted.length) act += '<p class="resp-note">Customer updates appear here as files are uploaded and responses are submitted.</p>';
    else act += '<div class="ca-activity">'
      + acted.map(r => { const a = activityFor(r); return '<div class="cact"><span class="cact-st ' + a.cls + '">' + a.lbl + '</span><span class="cact-file">' + esc(r.respFile ? r.respFile.name : (r.name || 'request')) + '</span><span class="cact-meta">for \u201c' + esc(r.name || 'request') + '\u201d \u00b7 ' + esc(r.lastUpdated || SUBMIT_DATE) + ' \u00b7 ' + esc(trackStatusLabel(r)) + '</span></div>'; }).join('')
      + '</div>';
    act += '</div>';
    root.innerHTML = head + cta + summary + table + act;
  }
  function simulateResponses() {
    const sent = requests.filter(r => r.sent);
    if (!sent.length) { if (typeof showToast === 'function') showToast('No package sent yet'); return; }
    sent.forEach((r, i) => {
      if (!r.fileRequired) {
        r.respStatus = 'Acknowledged';
        r.respNote = 'Confirmed \u2014 noted on our side, no file needed';
        r.respFile = null;
      } else if (i % 4 === 3) {
        r.respStatus = 'Deflected';
        r.respNote = 'we no longer retain this document for the requested period';
        r.respFile = null;
      } else {
        r.respStatus = 'Done';
        const nm = (r.fileContext && r.fileContext.file) ? r.fileContext.file : (r.name || 'file').replace(/[^a-z0-9]+/gi, '_').slice(0, 26) + '.xlsx';
        r.respFile = { name: nm, date: SUBMIT_DATE };
        r.respNote = 'File provided';
      }
      r.lastUpdated = SUBMIT_DATE;
    });
    responsesIn = true;
    renderResponse(); if (typeof renderReportCard === 'function') renderReportCard(); refreshAll();
    const up = sent.filter(r => r.respFile).length;
    if (typeof showToast === 'function') showToast('Customer responded \u00b7 ' + up + ' file' + (up !== 1 ? 's' : '') + ' uploaded in one submission');
  }
  // Client-side submit on the Report Card page: the customer sends their uploads /
  // replies back to Implentio. In this demo it drives the customer-response flow.
  function submitCustomerResponses() {
    if (!sentPackage) { if (typeof showToast === 'function') showToast('This report hasn\u2019t been sent to you yet'); return; }
    const sent = requests.filter(r => r.sent);
    if (sent.length && sent.every(isHandled)) { if (typeof showToast === 'function') showToast('Your responses were already submitted'); return; }
    simulateResponses();
    if (typeof showToast === 'function') showToast('Responses submitted to Implentio \u2014 thank you');
  }

  // ---- Customer-facing portal HTML (shared: Customer View tab + preview) ----
  // Maps a live sent request to the status the customer sees.
  function liveTrackStatus(r) {
    if (!r || !isHandled(r)) return { lbl: 'Awaiting your upload', cls: 'tr-pending' };
    if (r.respStatus === 'Done') return r.respFile ? { lbl: 'File uploaded', cls: 'tr-done' } : { lbl: 'Submitted', cls: 'tr-done' };
    if (r.respStatus === 'Acknowledged') return { lbl: 'Resolved', cls: 'tr-done' };
    if (r.respStatus === 'Deflected') return { lbl: 'Closed', cls: 'tr-closed' };
    return { lbl: 'Pending', cls: 'tr-pending' };
  }
  // -- shared section renderers --
  function filesTableHTML(files) {
    return files.map(f => {
      const pill = f.status === 'received' ? '<span class="pill ok">Received</span>'
        : f.status === 'missing' ? '<span class="pill bad">Missing</span>' : '<span class="pill neutral">Optional</span>';
      return '<tr><td>' + esc(f.file) + '</td><td>' + esc(f.cat) + '</td><td>' + pill + '</td></tr>';
    }).join('');
  }
  function requestedActionsHTML(pkg, live) {
    const sevLbl = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    const reqs = (pkg.requests || []).slice().sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
    if (!reqs.length) return '<p class="cx-sub2">No open requests \u2014 nothing further is needed from your team at this time.</p>';
    return reqs.map(r => {
      const fileBlock = r.reqType === 'replace'
        ? '<div class="cf-upload"><div class="cf-up-k">Replace</div><div class="cf-up-v"><span class="mono">' + esc(r.targetFile || 'existing file') + '</span> \u2014 upload corrected version</div><div class="cf-drop">\u2913 Upload file</div></div>'
        : (r.reqType === 'clarify' || !r.fileRequired
          ? '<div class="cf-upload"><div class="cf-up-k">Response</div><div class="cf-up-v">Reply with the requested information \u2014 no file needed</div><textarea class="cf-reply" placeholder="Type your response\u2026"></textarea></div>'
          : '<div class="cf-upload"><div class="cf-up-k">Upload</div><div class="cf-up-v">Provide the requested file</div><div class="cf-drop">\u2913 Upload file</div></div>');
      const ts = live ? liveTrackStatus(requests.find(x => x.sent && x.name === r.name)) : { lbl: 'Awaiting your upload', cls: 'tr-pending' };
      return '<div class="cf-req sev-' + esc(r.severity) + '">'
        + '<div class="cf-req-top"><div class="cf-req-name">' + esc(r.name || 'Untitled request') + '</div>'
        + '<div class="cf-req-pills"><span class="pill sev-' + esc(r.severity) + '">' + (sevLbl[r.severity] || 'Medium') + '</span>'
        + '<span class="tr ' + ts.cls + '">' + esc(ts.lbl) + '</span></div></div>'
        + (r.desc ? '<div class="cf-req-desc">' + esc(r.desc) + '</div>' : '')
        + fileBlock + '</div>';
    }).join('');
  }

  // ===== THE shared customer experience =====
  // One view + one data structure behind the Customer Package (manager, editable),
  // the customer-experience preview (manager, read-only) and the client Report Card.
  //   opts.audience: 'manager' | 'client'   opts.editable: bool   opts.live: bool
  function customerExperienceHTML(pkg, opts) {
    opts = opts || {};
    const manager = opts.audience === 'manager';
    const editable = !!opts.editable, live = !!opts.live;
    const reqN = (pkg.requests || []).length;
    const eyebrow = manager
      ? 'Customer Package \u00b7 Generated from Intake Version \u00b7 Internal Report Findings \u00b7 Request Bucket'
      : 'Implentio Onboarding \u00b7 ' + esc(pkg.version);
    const title = manager ? 'Customer Package' : 'Onboarding Readiness Report';
    const r = pkg.readiness;
    const head = '<div class="cx-head"><div class="cx-head-l">'
      + '<h1 class="cx-title">' + title + '</h1>'
      + '<div class="cx-meta"><span><b>' + esc(pkg.version) + '</b>Version</span><span><b>' + esc(pkg.customer) + '</b>Customer</span><span><b>' + esc(pkg.date) + '</b>Prepared</span><span><b>' + reqN + '</b>Request' + (reqN !== 1 ? 's' : '') + '</span></div>'
      + '</div><div class="cx-head-r"><div class="rc-overall ' + esc(pkg.decisionCls) + '">' + pkg.overall + '%</div><div class="cx-decision">' + esc(pkg.decision) + '</div>'
      + '<div class="cx-urg"><span class="cx-urg-lbl">Response urgency</span><span class="pill urg">' + esc(pkg.urgency) + '</span></div></div></div>';

    const execSec = '<div class="cx-sec"><div class="cx-sec-h"><h2>Executive summary</h2>' + (editable ? '<span class="pkg-edit-tag">Editable \u00b7 shown to customer</span>' : '') + '</div>'
      + (editable
        ? '<textarea class="pkg-exec" oninput="pkgEditExec(this.value)" placeholder="Introduce the onboarding status for the customer\u2026">' + esc(pkg.exec) + '</textarea>'
        : '<p class="rc-exec">' + esc(pkg.exec) + '</p>') + '</div>';

    let msgSec = '';
    if (editable) msgSec = '<div class="cx-sec"><div class="cx-sec-h"><h2>Manager message</h2><span class="pkg-edit-tag">Optional \u00b7 shown to customer</span></div>'
      + '<textarea class="pkg-msg" oninput="pkgEditMsg(this.value)" placeholder="e.g. Please prioritize the DHL rate card and support file requests, as these items currently block several onboarding analyses.">' + esc(pkg.msg) + '</textarea></div>';
    else if (pkg.msg) msgSec = '<div class="cx-sec cf-msg"><h3>A note from your onboarding manager</h3><p>' + esc(pkg.msg) + '</p></div>';



    // Files summary — identical to the Review-tab Intake Files table (lifecycle model).
    const filesSec = pkg.intakeFiles && pkg.intakeFiles.length
      ? '<div class="cx-sec"><div class="cx-sec-h"><h2>Files summary</h2><div class="if-summary">' + intakeFilesSummaryHTML(pkg.intakeFiles) + '</div></div>'
      + '<div class="ds-tablewrap"><table><thead><tr><th>File name</th><th>Category</th><th>Status</th><th>Introduced</th><th>Relationship</th></tr></thead><tbody>' + intakeFilesTableHTML(pkg.intakeFiles) + '</tbody></table></div></div>'
      : '';

    // Manager side: the same editable Client Request Bucket cards (review & edit in place).
    // Client side: read-only customer-facing request blocks.
    const actionsBody = (manager && editable)
      ? '<div class="pkg-bucket">' + (requests.length ? requests.map((rr, ii) => requestBucketCardHTML(rr, ii)).join('') : '<div class="ca-empty">No requests staged yet.</div>') + '</div>'
        + '<button class="ca-add pkg-add" onclick="addBlankRequest()">+ Add custom request</button>'
      : requestedActionsHTML(pkg, live);
    const actionsSec = '<div class="cx-sec"><div class="cx-sec-h"><h2>Requested actions</h2>' + (manager ? '<span class="pkg-edit-tag">Editable \u00b7 ' + reqN + ' item' + (reqN !== 1 ? 's' : '') + '</span>' : '') + '</div>'
      + '<p class="cx-sub2">' + (manager ? 'Review and edit the requests ' + esc(pkg.customer) + ' will receive \u2014 changes save in place.' : (reqN + ' item' + (reqN !== 1 ? 's' : '') + ' to address before a complete audit can begin.')) + '</p>' + actionsBody + '</div>';

    return '<div class="cx-doc">' + head + execSec + msgSec + filesSec + actionsSec + '</div>';
  }

  // ---- Customer page (the client Report Card) \u2014 opened from the Requests tab ----
  // Replaces the old Customer View tab: a button now jumps to the Report Card page,
  // which renders the same shared customer experience from the latest sent package.
  function openCustomerPage() {
    if (typeof goTo === 'function') goTo(4);
    if (typeof renderReportCard === 'function') renderReportCard();
  }
  function addAnalysisNote(ev) { ev.stopPropagation(); showToast('Internal note added to this analysis'); }

  // ---- Finding actions ----
  function ignoreFinding(btn) {
    const f = btn.closest('.finding');
    const on = f.classList.toggle('is-ignored');
    f.classList.remove('is-resolved');
    f.querySelectorAll('.fa.on').forEach(b => b.classList.remove('on'));
    if (on) btn.classList.add('on');
  }
  function resolveFinding(btn) {
    const f = btn.closest('.finding');
    const on = f.classList.toggle('is-resolved');
    f.classList.remove('is-ignored');
    f.querySelectorAll('.fa.on').forEach(b => b.classList.remove('on'));
    if (on) btn.classList.add('on');
  }
  function toggleFindingNote(btn) {
    const w = btn.closest('.finding').querySelector('.fnote-wrap');
    const open = w.classList.toggle('show');
    btn.textContent = open ? 'Hide note' : 'Add note';
    if (open) w.querySelector('textarea').focus();
  }

  // ===== Client Request Bucket =====
  const SEV_OPTS = [['critical', 'Critical'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']];
  const SEV_RANK = { critical: 4, high: 3, medium: 2, low: 1 };
  let bucketUrgency = 'This Week';
  function setBucketUrgency(v) { bucketUrgency = v; if (typeof showToast === 'function') showToast('Response urgency for package: ' + v); }

  let requests = [
    { name: 'Provide UPS SurePost & DHL eCommerce rate cards',
      desc: 'No effective rate card exists for UPS SurePost (3,341 shipments) or DHL eCom SmartMail (341 shipments) anywhere in the 90-day lookback. Please supply current cards effective across the window so these shipments can be priced.',
      severity: 'critical', fileRequired: true, reqType: 'upload',
      fileContext: { mode: 'upload', file: 'UPS SurePost + DHL eCommerce rate cards' },
      note: 'Two largest coverage gaps — follow up if the cards are not received.',
      source: 'No effective card', analysis: 'ax-eff', status: 'queued' },
    { name: 'Provide 2026 FedEx SmartPost rate card',
      desc: 'The FedEx SmartPost card expired 12/31/2025 — there is no effective card after that date for 200 SmartPost shipments. Please supply a 2026 card.',
      severity: 'medium', fileRequired: true, reqType: 'upload',
      fileContext: { mode: 'upload', file: 'FedEx SmartPost 2026 rate card' },
      note: '', source: 'Expired SmartPost card', analysis: 'ax-eff', status: 'queued' },
  ];

  function renderRequests() {
    const list = document.getElementById('ca-list');
    if (!requests.length) {
      list.innerHTML = '<div class="ca-empty"><span class="ic">⊕</span>No requests staged yet.<br>Use <b>Create client request</b> on any finding, or add a custom one below.</div>';
      updateRequestCounts();
      refreshAll();
      maybeRerenderPackage();
      return;
    }
    list.innerHTML = requests.map((r, i) => requestBucketCardHTML(r, i)).join('');
    updateRequestCounts();
    refreshAll();
    maybeRerenderPackage();
  }
  // Keep an open Customer Package in sync when requests are edited from either place.
  function maybeRerenderPackage() {
    const ov = document.getElementById('package-review');
    if (ov && ov.classList.contains('show') && typeof renderPackageReview === 'function') renderPackageReview();
  }
  // One editable request card — shared by the Review-tab Client Request Bucket and
  // the manager Customer Package's "Requested actions" section (edit in place).
  function requestBucketCardHTML(r, i) {
      const srcLink = r.analysis
        ? `<a class="rq-source" href="#" data-analysis="${esc(r.analysis)}" data-source="${esc(r.source || '')}" onclick="gotoFindingFromEl(this);return false;">↳ source finding: ${esc(r.source || r.analysis)}</a>`
        : `<span class="rq-source none">↳ no linked finding</span>`;
      return `
      <div class="rq-card sev-${esc(r.severity)}">
        <div class="rq-top">
          <span class="rq-num">${i + 1}</span>
          <span class="rq-status ${r.status === 'queued' ? 'queued' : ''}">${r.status === 'queued' ? 'Queued' : 'Draft'}</span>
          <span class="rq-ctrls">
            <button title="Move up" onclick="moveRequest(${i},-1)" ${i === 0 ? 'disabled style="opacity:.3"' : ''}>↑</button>
            <button title="Move down" onclick="moveRequest(${i},1)" ${i === requests.length - 1 ? 'disabled style="opacity:.3"' : ''}>↓</button>
            <button class="del" title="Delete" onclick="removeRequest(${i})">×</button>
          </span>
        </div>

        <label class="rq-flabel">Request name</label>
        <input class="rq-title" value="${esc(r.name)}" placeholder="e.g. Upload missing DHL invoice" oninput="updateRequest(${i},'name',this.value)">

        <label class="rq-flabel">Request description</label>
        <textarea class="rq-desc" placeholder="Explain what is needed and why…" oninput="updateRequest(${i},'desc',this.value)">${esc(r.desc)}</textarea>

        <div class="rq-grid rq-onecol">
          <div>
            <label>Severity</label>
            <select onchange="updateRequest(${i},'severity',this.value)">
              ${SEV_OPTS.map(o => `<option value="${o[0]}" ${r.severity === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}
            </select>
          </div>
        </div>

        <label class="rq-flabel">Request type</label>
        <select class="rq-type" onchange="setReqType(${i}, this.value)">
          <option value="upload" ${(r.reqType||'upload')==='upload'?'selected':''}>Upload missing file</option>
          <option value="replace" ${r.reqType==='replace'?'selected':''}>Replace existing file</option>
          <option value="clarify" ${r.reqType==='clarify'?'selected':''}>Provide clarification (no file)</option>
        </select>
        ${r.reqType==='replace' ? `<label class="rq-flabel">File being replaced</label><select class="rq-target" onchange="updateRequest(${i},'targetFile',this.value)"><option value="">Select a file\u2026</option>${activeFileNames().map(fn => `<option value="${esc(fn)}" ${r.targetFile===fn?'selected':''}>${esc(fn)}</option>`).join('')}</select>` : ''}
        <div class="rq-typehint">${reqTypeHint(r.reqType||'upload')}</div>

        <div class="rq-internal ${r.note ? 'open' : ''}">
          <button class="rq-note-toggle" onclick="toggleNote(this)">+ Internal note</button>
          <div class="rq-note-wrap">
            <div class="rq-int-label">Internal · not shown to customer</div>
            <textarea class="rq-note" placeholder="Internal onboarding context…" oninput="updateRequest(${i},'note',this.value)">${esc(r.note)}</textarea>
          </div>
          ${srcLink}
        </div>

      </div>`;
  }

  function updateRequestCounts() {
    const n = requests.length;
    const cnt = sev => requests.filter(r => r.severity === sev).length;
    document.getElementById('rs-total').textContent = n;
    document.getElementById('rs-high').textContent = cnt('high') + cnt('critical');
    document.getElementById('rs-med').textContent = cnt('medium');
    document.getElementById('rs-low').textContent = cnt('low');
    document.getElementById('ca-count').textContent = n;
    const _io = document.getElementById('ivm-open'); if (_io) _io.textContent = n;
    { const _nr = [...document.querySelectorAll('#page-3 .acard[data-weight]')].filter(c => c.dataset.reviewed !== '1').length; document.getElementById('send-client-btn').disabled = n === 0 || _nr > 0 || (typeof intakeSent !== 'undefined' && intakeSent); }
    if (typeof renderFiles === 'function') renderFiles();
    const byA = {};
    requests.forEach(r => { if (r.analysis) byA[r.analysis] = (byA[r.analysis] || 0) + 1; });
    document.querySelectorAll('#page-3 .acard[id^="ax-"]').forEach(card => {
      const span = document.getElementById('rc-' + card.id.slice(3));
      if (span) span.textContent = byA[card.id] || 0;
    });
  }

  function updateRequest(i, field, val) { requests[i][field] = val; if (field === 'severity') renderRequests(); }
  function removeRequest(i) { requests.splice(i, 1); renderRequests(); }
  function moveRequest(i, dir) {
    const j = i + dir; if (j < 0 || j >= requests.length) return;
    [requests[i], requests[j]] = [requests[j], requests[i]]; renderRequests();
  }
  function toggleFileReq(i) {
    requests[i].fileRequired = !requests[i].fileRequired;
    renderRequests();
  }
  function updateFileCtx(i, key, val) {
    if (!requests[i].fileContext) requests[i].fileContext = { mode: 'upload', file: '' };
    requests[i].fileContext[key] = val;
    if (key === 'mode') renderRequests();
  }
  function toggleNote(btn) {
    const wrap = btn.closest('.rq-internal');
    wrap.classList.add('open');
    const ta = wrap.querySelector('.rq-note'); if (ta) ta.focus();
  }
  // Same as gotoFindingFromEl but invoked from the Requests tab — switch to Review first.
  function gotoFindingFromTrack(el) {
    if (typeof switchVTab === 'function') switchVTab('review');
    setTimeout(() => gotoFindingFromEl(el), 60);
  }
  function gotoFindingFromEl(el) {
    const analysis = el.dataset.analysis, source = el.dataset.source;
    if (!analysis) return;
    const card = document.getElementById(analysis);
    if (!card) return;
    card.classList.add('open');
    let target = card;
    card.querySelectorAll('.finding').forEach(fn => { if (fn.dataset.source === source) target = fn; });
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('flash-highlight');
    setTimeout(() => target.classList.remove('flash-highlight'), 1600);
  }
  function focusLastRequest() {
    const cards = document.querySelectorAll('#ca-list .rq-card');
    const last = cards[cards.length - 1];
    if (!last) return;
    last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = last.querySelector('.rq-title'); if (t) t.focus({ preventScroll: true });
    last.classList.add('flash-highlight');
    setTimeout(() => last.classList.remove('flash-highlight'), 1600);
  }
  function mergeRequest(i) {
    const prev = requests[i - 1], cur = requests[i];
    prev.desc = (prev.desc + '\n• ' + (cur.name || '') + (cur.desc ? ' — ' + cur.desc : '')).trim();
    if (cur.note) prev.note = (prev.note ? prev.note + ' ' : '') + cur.note;
    if ((SEV_RANK[cur.severity] || 0) > (SEV_RANK[prev.severity] || 0)) prev.severity = cur.severity;
    prev.fileRequired = prev.fileRequired || cur.fileRequired;
    requests.splice(i, 1); renderRequests();
    if (typeof showToast === 'function') showToast('Requests merged');
  }
  function addBlankRequest() {
    requests.push({ name: '', desc: '', severity: 'medium', fileRequired: true, reqType: 'upload', targetFile: '', fileContext: { mode: 'upload', file: '' }, note: '', source: '', analysis: '', status: 'draft' });
    renderRequests();
    focusLastRequest();
  }
  function createClientRequest(btn) {
    if (intakeSent) { if (typeof showToast === 'function') showToast('The review is locked while awaiting customer updates'); return; }
    const f = btn.closest('.finding');
    const m = f.className.match(/sev-(critical|high|medium|low)/);
    const sev = m ? m[1] : 'medium';
    const attach = f.dataset.attach || '';
    requests.push({
      name: f.dataset.title || '',
      desc: f.dataset.desc || '',
      severity: sev,
      fileRequired: !!attach,
      reqType: attach ? 'upload' : 'clarify',
      targetFile: '',
      fileContext: { mode: 'upload', file: attach },
      note: '',
      source: f.dataset.source || '',
      analysis: f.dataset.analysis || '',
      status: 'queued',
    });
    btn.classList.add('queued'); btn.textContent = '✓ In bucket';
    f.classList.add('req-made');
    renderRequests();
    focusLastRequest();
    if (typeof showToast === 'function') showToast('Added to client request bucket');
  }


  // ===== Save =====
  function saveDraft() { showToast('Draft saved — findings, notes & requests preserved'); }
  function saveAnalysis() { showToast('Analysis saved & associated with Version 4'); }

  // ===== Intake version switching =====
  const INTAKE = {
    v4: { status: 'In Review', date: 'May 21, 2026', by: 'ben@hellotushy.com', score: '73%', cls: 'warn', sum: [['new','+12','New'],['resolved','−8','Resolved'],['remain','14','Unchanged'],['open','open-live','Open requests']] },
    v3: { status: 'Awaiting Customer Updates', date: 'May 8, 2026', by: 'ben@hellotushy.com', score: '63%', cls: 'bad', sum: [['new','+9','New'],['resolved','−5','Resolved'],['remain','19','Unchanged'],['open','open-live','Open requests']] },
    v2: { status: 'Finalized intake', date: 'Apr 30, 2026', by: 'ops@hellotushy.com', score: '58%', cls: 'bad', sum: [['new','+7','New'],['resolved','−3','Resolved'],['remain','22','Unchanged'],['open','open-live','Open requests']] },
    v1: { status: 'First submission', date: 'Apr 24, 2026', by: 'ben@hellotushy.com', score: '49%', cls: 'bad', sum: [['new','24','Found'],['resolved','0','Resolved'],['remain','24','Total'],['open','open-live','Open requests']] },
  };
  const INTAKE_DIFF = {
    v4: '+12 new \u00b7 \u22128 resolved \u00b7 14 unchanged',
    v3: '+9 new \u00b7 \u22125 resolved \u00b7 19 unchanged',
    v2: '+7 new \u00b7 \u22123 resolved \u00b7 22 unchanged',
    v1: '24 found \u00b7 0 resolved \u00b7 24 total',
  };
  function switchIntake(sel) {
    const v = INTAKE[sel.value];
    document.getElementById('ivm-date').textContent = v.date;
    document.getElementById('ivm-by').textContent = v.by;
    const score = document.getElementById('ov-score');
    score.textContent = v.score; score.className = 'n ' + v.cls;
    const diff = document.getElementById('irc-diff'); if (diff && INTAKE_DIFF[sel.value]) diff.textContent = INTAKE_DIFF[sel.value];
    if (typeof renderVersionSummary === 'function') renderVersionSummary();
  }

  // ===== File lifecycle model (audit trail across intake versions) =====
  let FILES = [
    { name: 'UPS_Rate_Card.xlsx',      type: 'Rate Card', cat: 'Pricing', status: 'active',   introduced: 'V2' },
    { name: 'FedEx_Rate_Card.xlsx',    type: 'Rate Card', cat: 'Pricing', status: 'active',   introduced: 'V2' },
    { name: 'USPS_Priority.pdf',       type: 'Rate Card', cat: 'Pricing', status: 'active',   introduced: 'V3' },
    { name: 'Invoice_Export_Jan.csv',  type: 'Invoice',   cat: 'Billing', status: 'active',   introduced: 'V4' },
    { name: 'Master_Carrier_List.csv', type: 'Reference', cat: 'Catalog', status: 'active',   introduced: 'V2' },
    { name: 'DHL_Rate_Card.xlsx',      type: 'Rate Card', cat: 'Pricing', status: 'replaced', introduced: 'V2', replacedBy: 'DHL_Rate_Card_v2.xlsx' },
    { name: 'DHL_Rate_Card_v2.xlsx',   type: 'Rate Card', cat: 'Pricing', status: 'active',   introduced: 'V4', replaces: 'DHL_Rate_Card.xlsx' },
  ];
  const FST = { active: { lbl: 'Active', cls: 'fst-active' }, replaced: { lbl: 'Replaced', cls: 'fst-replaced' }, ignored: { lbl: 'Ignored', cls: 'fst-ignored' }, missing: { lbl: 'Missing', cls: 'fst-missing' } };
  function activeFileNames() { return FILES.filter(f => f.status === 'active').map(f => f.name); }
  function fileByName(n) { return FILES.find(f => f.name === n); }
  function currentVerLabel() { const sel = document.getElementById('intake-version'); return sel ? 'V' + sel.value.slice(1) : 'V4'; }
  function requestedFileName(r) {
    if (r.fileContext && r.fileContext.file) return r.fileContext.file;
    if (r.reqType === 'replace' && r.targetFile) return r.targetFile.replace(/(\.\w+)$/, '_v2$1');
    return (r.name || 'requested_file');
  }
  function missingFiles() {
    if (typeof requests === 'undefined') return [];
    return requests
      .filter(r => r.name && r.reqType !== 'clarify' && (r.fileRequired || r.reqType === 'upload' || r.reqType === 'replace') && !['Done', 'Acknowledged', 'Deflected'].includes(r.respStatus))
      .map(r => ({ name: requestedFileName(r), cat: r.reqType === 'replace' ? 'Replacement' : 'New file', status: 'missing', introduced: '\u2014', _req: r }));
  }
  // Intake Files table \u2014 shared by the Review tab and the customer-package Files summary.
  function intakeFileRowHTML(f) {
    let rel = '\u2014';
    if (f.status === 'replaced' && f.replacedBy) rel = 'Replaced by <span class="mono">' + esc(f.replacedBy) + '</span>';
    else if (f.status === 'active' && f.replaces) rel = 'Replaces <span class="mono">' + esc(f.replaces) + '</span>';
    const m = FST[f.status] || FST.active;
    return '<tr class="fr-' + f.status + '"><td class="mono">' + esc(f.name) + '</td><td>' + esc(f.cat || f.type || '\u2014') + '</td>'
      + '<td><span class="fst ' + m.cls + '">' + m.lbl + '</span></td><td>' + esc(f.introduced || '\u2014') + '</td>'
      + '<td class="fr-rel">' + rel + '</td></tr>';
  }
  function intakeFilesTableHTML(files) { return (files || []).map(intakeFileRowHTML).join(''); }
  function intakeFilesSummaryHTML(files) {
    const a = (files || []).filter(f => f.status === 'active').length, rp = (files || []).filter(f => f.status === 'replaced').length;
    return '<span class="if-stat"><span class="n">' + a + '</span> Active</span>'
      + (rp ? '<span class="if-stat"><span class="n">' + rp + '</span> Replaced</span>' : '');
  }
  function renderFiles() {
    const tb = document.getElementById('if-tbody'); if (!tb) return;
    tb.innerHTML = intakeFilesTableHTML(FILES);
    const sumEl = document.getElementById('if-summary');
    if (sumEl) sumEl.innerHTML = intakeFilesSummaryHTML(FILES);
  }
  function renderVersionSummary() {
    const box = document.getElementById('version-summary'); if (!box) return;
    const ver = currentVerLabel();
    const neu = FILES.filter(f => f.status === 'active' && f.introduced === ver);
    const rep = FILES.filter(f => f.status === 'replaced');
    const unch = FILES.filter(f => f.status === 'active' && f.introduced !== ver);
    const grp = (icon, title, items, render) => '<div class="vs-grp"><div class="vs-h">' + icon + ' ' + title + ' <span class="vs-n">' + items.length + '</span></div>'
      + (items.length ? '<ul>' + items.map(render).join('') + '</ul>' : '<div class="vs-empty">None</div>') + '</div>';
    box.innerHTML = '<div class="vs-head"><b>Version Change Summary</b><span>What changed entering ' + ver + '</span></div><div class="vs-grid">'
      + grp('+', 'New files', neu, f => '<li><span class="mono">' + esc(f.name) + '</span></li>')
      + grp('\u21bb', 'Replaced', rep, f => '<li><span class="mono">' + esc(f.name) + '</span> \u2192 <span class="mono">' + esc(f.replacedBy || '') + '</span></li>')
      + grp('\u2713', 'Unchanged', unch, f => '<li><span class="mono">' + esc(f.name) + '</span></li>')
      + '</div>';
  }
  function setReqType(i, val) {
    requests[i].reqType = val;
    requests[i].fileRequired = (val !== 'clarify');
    if (val !== 'replace') requests[i].targetFile = '';
    renderRequests();
  }
  function reqTypeHint(t) {
    if (t === 'replace') return 'Customer uploads a corrected version of an existing file \u2014 the old file becomes Replaced and the new one Active in the next version.';
    if (t === 'clarify') return 'Customer answers a question or provides context. No file is created or replaced.';
    return 'Customer provides a file that does not yet exist. It is added as Active in the next version.';
  }

  // ===== Init =====
  initCards();
  renderRequests();
  refreshAll();
  renderFiles();
  renderVersionSummary();
