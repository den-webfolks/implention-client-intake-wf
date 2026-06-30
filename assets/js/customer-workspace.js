// Block 8: Customer Intake Workspace — one continuous customer-facing surface.
// Renders States 2–5 into #cw-root (page-2) from the live customer-state machine
// and the official sent package snapshot. State 1 (initial upload) is page-1.
//
// State machine (cwState):
//   'initial'  — nothing submitted yet (page-1 owns the upload UI)
//   'received' — a version was submitted; Implentio is reviewing (States 2 & 4)
//   'action'   — manager sent a request package for this version (State 3)
//   'final'    — manager sent a final confirmation, no requests (State 5)
//
// Transitions are driven by events from both surfaces:
//   onInitialSubmit()        page-1 "Submit for review"  -> received (V1)
//   sendPackage()            manager send (report-workflow) -> action | final
//   cwConfirmSubmit()        customer "Submit updates"   -> received (V+1)
//
// NOTE (intentional demo simplification): the customer-facing version counter
// (Version 1, 2, …) is tracked here independently of the Internal Report's
// historical version selector. In a real product they would be one sequence;
// customer-facing demo dates are likewise independent of the legacy internal dates.

  // ----- customer-facing state -----
  let cwState = 'initial';
  let cwVer = 0;                 // current customer submission version (0 = none yet)
  let cwVersions = [];           // [{ n, date, state }]  state: review|requested|completed|final
  let cwResponses = {};          // request-index -> { kind:'file'|'replace'|'reply', file, reply }

  // Coherent, near-"today" customer-facing dates (independent of legacy internal dates).
  const CW_DATE = { submit1: 'Jun 24, 2026', review: 'Jun 27, 2026', submit2: 'Jun 30, 2026', final: 'Jul 2, 2026' };
  function cwToday(n) { return n <= 1 ? CW_DATE.submit1 : n === 2 ? CW_DATE.submit2 : 'Jul 1, 2026'; }

  // ----- submission receipt data (what each version included) -----
  // Version 1 = the initial upload. Mirrors the Customer Intake upload categories.
  const CW_SUBMISSION_V1 = [
    { group: 'Parcel', items: [
      { name: 'Parcel Rate Cards', meta: '4 files · 1.1 MB', count: '4 carriers', files: [
        ['UPS_RateCard_2025_Q2.xlsx', '312 KB · 4 service levels'],
        ['FedEx_RateCard_2025.xlsx', '298 KB · 3 service levels'],
        ['USPS_RateCard_2025.pdf', '241 KB · 2 service levels'],
        ['DHL_eCommerce_Rates_2025.xlsx', '189 KB · 1 service level'] ] },
      { name: 'Parcel Invoices', meta: '11 files · 24.8 MB', count: '14,892 shipments', files: [
        ['UPS_Invoice_W08-W19.csv (×6 weeks)', '9,412 shipments'],
        ['FedEx_Invoice_Feb-May_2025.csv (×3 files)', '3,128 shipments'],
        ['USPS_PCMiler_Invoice_Apr_2025.csv', '2,011 shipments'],
        ['DHL_Invoice_Mar2025.pdf', '341 shipments'] ] } ] },
    { group: 'Fulfillment', items: [
      { name: 'Fulfillment Rate Cards', meta: '3 files · 814 KB', count: '3 rate sheets', files: [
        ['ShipBob_Fulfillment_Rates_2025.pdf', 'pick/pack/receive'],
        ['ShipBob_Storage_Rates_2025.xlsx', 'monthly storage'],
        ['ShipBob_SpecialProjects_SOW.pdf', 'kitting, project work'] ] },
      { name: 'Fulfillment Invoices', meta: '4 files · 8.2 MB', count: '$126,497 billed', files: [
        ['ShipBob_Invoice_Feb_2025.pdf', '$42,180'],
        ['ShipBob_Invoice_Mar_2025.pdf', '$38,915'],
        ['ShipBob_Invoice_Apr_2025.pdf', '$45,402'],
        ['ShipBob_Activity_Detail_Q1.csv', '18,224 rows · line-item detail'] ] } ] },
    { group: 'Contracts & Reference', items: [
      { name: '3PL Contract', meta: '2.4 MB', count: '1 file', files: [
        ['ShipBob_MSA_2025_executed.pdf', '2.4 MB · 47 pages'] ] },
      { name: 'Product Master', meta: '842 KB', count: '1,247 SKUs', files: [
        ['product_master_full_v3.csv', '1,247 rows · 14 columns'] ] },
      { name: 'Bundle Map', meta: '86 KB', count: '142 bundles', files: [
        ['bundle_kit_mapping_2025.xlsx', '142 bundles · 318 components'] ] },
      { name: 'Other Files', meta: '2 files · 1.8 MB', count: '2 files', files: [
        ['packaging_guide_2025.pdf', '1.2 MB'],
        ['3pl_zone_warehouse_map.xlsx', '612 KB'] ] } ] },
  ];
  // The receipt for the version currently under review (V1 base; later versions add the update items).
  function cwSubmissionFor(n) { return CW_SUBMISSION_V1; }

  // ===== helpers =====
  function cwCustName() { return (typeof state !== 'undefined' ? state.customer : 'your team'); }
  function cwReqDesc(r) { return r.custDesc || r.desc || ''; }
  function cwSentReqs() { return (typeof requests !== 'undefined') ? requests.filter(r => r.sent) : []; }
  function cwReqTypeOf(r) { return r.reqType || (r.fileRequired ? 'upload' : 'clarify'); }
  function cwCompletedCount() { return Object.keys(cwResponses).length; }

  // ===== state transitions (called from events) =====
  function onInitialSubmit() {
    if (cwVer >= 1) { cwState = 'received'; renderCustomerWorkspace(); return; }
    cwVer = 1;
    cwState = 'received';
    cwVersions = [{ n: 1, date: CW_DATE.submit1, state: 'review' }];
    cwResponses = {};
    renderCustomerWorkspace();
  }
  // Called by report-workflow.sendPackage(): kind = 'requests' | 'final'
  function cwOnPackageSent(kind) {
    if (cwVer === 0) { cwVer = 1; cwVersions = [{ n: 1, date: CW_DATE.submit1, state: 'review' }]; }
    const cur = cwCurrentVersion();
    if (kind === 'final') { cwState = 'final'; if (cur) cur.state = 'final'; }
    else { cwState = 'action'; cwResponses = {}; if (cur) cur.state = 'requested'; }
    renderCustomerWorkspace();
  }
  function cwCurrentVersion() { return cwVersions.length ? cwVersions[cwVersions.length - 1] : null; }

  // ===== State 3: customer completes a request =====
  function cwUpload(i, kind) {
    if (cwState !== 'action') return;
    const live = cwSentReqs()[i];
    const fname = (typeof requestedFileName === 'function' && live) ? requestedFileName(live)
      : (kind === 'replace' ? 'corrected_file_v2.xlsx' : 'provided_file.xlsx');
    cwResponses[i] = { kind: kind === 'replace' ? 'replace' : 'file', file: fname };
    renderCustomerWorkspace();
    if (typeof showToast === 'function') showToast(kind === 'replace' ? 'Replacement added' : 'File added');
  }
  function cwSubmitClarify(i) {
    if (cwState !== 'action') return;
    const ta = document.getElementById('cw-reply-' + i);
    const val = ta ? ta.value.trim() : '';
    if (!val) { if (typeof showToast === 'function') showToast('Type a response first'); return; }
    cwResponses[i] = { kind: 'reply', reply: val };
    renderCustomerWorkspace();
    if (typeof showToast === 'function') showToast('Response saved');
  }
  function cwUndo(i) { delete cwResponses[i]; renderCustomerWorkspace(); }
  // Jump to the next not-yet-completed request (like the Internal Report's "jump to next unreviewed").
  function cwJumpToNext() {
    const root = document.getElementById('cw-root');
    const cards = root ? [].slice.call(root.querySelectorAll('.cw-req')) : [];
    const next = cards.find(c => !c.classList.contains('is-done'));
    if (!next) { if (typeof showToast === 'function') showToast('All requests completed — submit when you’re ready'); return; }
    next.scrollIntoView({ behavior: 'smooth', block: 'center' });
    next.classList.add('flash-highlight');
    setTimeout(() => next.classList.remove('flash-highlight'), 1600);
  }

  // ===== State 3 -> Submit updates -> new version =====
  function cwOpenSubmitModal() {
    const sent = cwSentReqs();
    if (cwCompletedCount() < sent.length) { if (typeof showToast === 'function') showToast('Complete every request before submitting'); return; }
    const m = document.getElementById('cw-submit-modal'); if (!m) return;
    let files = 0, repl = 0, clar = 0;
    Object.keys(cwResponses).forEach(k => { const r = cwResponses[k]; if (r.kind === 'file') files++; else if (r.kind === 'replace') repl++; else clar++; });
    const body = document.getElementById('cw-submit-body');
    if (body) body.innerHTML = 'You are about to submit your completed responses and uploaded files as <b>Version ' + (cwVer + 1) + '</b>. Our team will review this updated submission and return with next steps.'
      + '<ul class="cw-submit-list">'
      + '<li><b>' + sent.length + '</b> request' + (sent.length !== 1 ? 's' : '') + ' completed</li>'
      + '<li><b>' + files + '</b> file' + (files !== 1 ? 's' : '') + ' uploaded</li>'
      + '<li><b>' + repl + '</b> file' + (repl !== 1 ? 's' : '') + ' replaced</li>'
      + '<li><b>' + clar + '</b> clarification' + (clar !== 1 ? 's' : '') + ' provided</li></ul>';
    const btn = document.getElementById('cw-submit-confirm'); if (btn) btn.textContent = 'Submit Version ' + (cwVer + 1);
    m.classList.add('show');
  }
  function cwCloseSubmitModal() { const m = document.getElementById('cw-submit-modal'); if (m) m.classList.remove('show'); }

  function cwConfirmSubmit() {
    const sent = cwSentReqs();
    const date = cwToday(cwVer + 1);
    // Translate customer completions into the internal request model + summarize the change.
    let up = 0, rp = 0, cl = 0; const names = [];
    sent.forEach((r, i) => {
      const resp = cwResponses[i];
      names.push(r.name || 'Request');
      const t = cwReqTypeOf(r);
      if (t === 'replace') rp++; else if (t === 'clarify') cl++; else up++;
      if (!resp) return;
      if (resp.kind === 'reply') { r.respStatus = 'Acknowledged'; r.respNote = resp.reply; r.respFile = null; }
      else { r.respStatus = 'Done'; r.respFile = { name: resp.file, date: date }; r.respNote = resp.kind === 'replace' ? 'Replacement provided' : 'File provided'; }
      r.lastUpdated = date;
    });
    // Mark the just-completed version reviewed, create the next version under review.
    const prev = cwCurrentVersion(); if (prev) prev.state = 'completed';
    cwVer += 1;
    cwVersions.push({ n: cwVer, date: date, state: 'review', changed: { up: up, rp: rp, cl: cl, names: names } });
    cwApplyVersionBump(date);   // reads respStatus to apply file lifecycle, then reopens the review
    // Close this request cycle: the resolved requests belong to the previous version.
    // The manager's next review starts with a clean bucket (add new requests or send final).
    if (typeof requests !== 'undefined') requests.splice(0, requests.length);
    if (typeof renderRequests === 'function') renderRequests();
    cwState = 'received';
    cwResponses = {};
    cwCloseSubmitModal();
    renderCustomerWorkspace();
    if (typeof showToast === 'function') showToast('Version ' + cwVer + ' submitted — Implentio is reviewing your updates');
  }

  // Fold the customer update into the Internal Report: apply file lifecycle, add an
  // internal version, reopen analyses so the manager reviews the new submission.
  function cwApplyVersionBump(date) {
    // File lifecycle from fulfilled file requests (mirrors loadCustomerUpdate).
    if (typeof FILES !== 'undefined' && typeof requests !== 'undefined') {
      const nextLbl = cwNextInternalVerLabel();
      requests.forEach(r => {
        if (!r.sent || r.respStatus !== 'Done') return;
        if (r.reqType === 'replace' && r.targetFile) {
          const tgt = fileByName(r.targetFile);
          const newName = requestedFileName(r);
          if (tgt && tgt.status === 'active') { tgt.status = 'replaced'; tgt.replacedBy = newName; }
          if (!fileByName(newName)) FILES.push({ name: newName, type: tgt ? tgt.type : 'File', cat: tgt ? tgt.cat : 'Parcel', status: 'active', introduced: nextLbl, replaces: r.targetFile });
        } else if (r.reqType === 'upload') {
          const newName = requestedFileName(r);
          if (!fileByName(newName)) FILES.push({ name: newName, type: 'File', cat: 'Parcel', status: 'active', introduced: nextLbl });
        }
      });
    }
    cwAddInternalVersion(date);
    // Reopen the review for the manager; the ball is back with Implentio.
    document.querySelectorAll('#page-3 .acard[data-weight]').forEach(c => { c.dataset.reviewed = '0'; });
    if (typeof intakeSent !== 'undefined') intakeSent = false;
    if (typeof intakeFinal !== 'undefined') intakeFinal = false;
    // The customer submission already folded the updates in — no separate manager
    // "run new analysis" step in the new model.
    if (typeof responsesIn !== 'undefined') responsesIn = false;
    if (typeof refreshAll === 'function') refreshAll();
    if (typeof renderFiles === 'function') renderFiles();
    if (typeof renderVersionSummary === 'function') renderVersionSummary();
    if (typeof renderResponse === 'function') renderResponse();
  }
  function cwNextInternalVerLabel() {
    const sel = document.getElementById('intake-version');
    if (!sel) return 'V' + (cwVer);
    const cur = parseInt((sel.value || 'v4').slice(1), 10) || 4;
    return 'V' + (cur + 1);
  }
  // Add a fresh internal version option so the manager's selector reflects the new submission.
  function cwAddInternalVersion(date) {
    const sel = document.getElementById('intake-version'); if (!sel) return;
    const cur = parseInt((sel.value || 'v4').slice(1), 10) || 4;
    const nv = cur + 1, val = 'v' + nv;
    if ([...sel.options].some(o => o.value === val)) { sel.value = val; if (typeof switchIntake === 'function') switchIntake(sel); return; }
    [...sel.options].forEach(o => { o.textContent = o.textContent.replace(' — current', '').replace(' — current', ''); });
    const opt = document.createElement('option'); opt.value = val; opt.textContent = 'Version ' + nv + ' — current';
    sel.insertBefore(opt, sel.firstChild); sel.value = val;
    if (typeof INTAKE !== 'undefined') {
      INTAKE[val] = { status: 'In Review', date: date, by: (typeof state !== 'undefined' ? state.customerEmail : 'customer'), score: '84%', cls: 'warn', sum: [['new', '+4', 'New'], ['resolved', '−11', 'Resolved'], ['remain', '9', 'Unchanged'], ['open', 'open-live', 'Open requests']] };
      const prev = INTAKE['v' + cur]; if (prev) prev.status = 'Awaiting Customer Updates';
    }
    if (typeof INTAKE_DIFF !== 'undefined') INTAKE_DIFF[val] = '+4 new · −11 resolved · 9 unchanged';
    if (typeof switchIntake === 'function') switchIntake(sel);
  }

  // ===== rendering =====
  function cwBadge() {
    if (cwState === 'action') return ['Action required', 'cw-b-action'];
    if (cwState === 'final') return ['Ready for onboarding', 'cw-b-final'];
    if (cwState === 'initial') return ['Not submitted', 'cw-b-review'];
    return ['Under review', 'cw-b-review'];
  }
  function cwVerStatusLabel(v) {
    return v.state === 'review' ? 'Under review'
      : v.state === 'requested' ? 'Reviewed · updates requested'
      : v.state === 'final' ? 'Completed · ready for onboarding'
      : 'Reviewed';
  }
  // Per-state intro (headline + supporting copy). Identity / version / status / readiness
  // now live in the fixed combined header (cwOverviewHTML).
  function cwHeaderHTML(title, sub) {
    return '<div class="cw-head"><h1 class="cw-title">' + esc(title) + '</h1>'
      + (sub ? '<p class="cw-sub">' + sub + '</p>' : '') + '</div>';
  }
  // The readiness % is only shared once a package has been sent (Action / Final).
  function cwReadinessPkg() {
    if (cwState === 'action' || cwState === 'final') {
      if (typeof sentPackage !== 'undefined' && sentPackage) return sentPackage;
      if (typeof buildDraftPackage === 'function') return buildDraftPackage();
    }
    return null;
  }
  function cwScoreCls(o) { return o >= 85 ? 'ok' : o >= 60 ? 'warn' : 'bad'; }
  // Fixed combined header — mirrors the Internal Report's dark overview, customer-relevant.
  function cwOverviewHTML() {
    const b = cwBadge();
    const pkg = cwReadinessPkg();
    const cust = esc(cwCustName());
    const tpl = esc(typeof state !== 'undefined' ? (state.threePL || '') : '');
    const cur = cwCurrentVersion();
    const verN = cur ? ('Version ' + cur.n) : 'New intake';
    const verSub = cur ? ('Submitted ' + esc(cur.date)) : 'No version submitted yet';
    const score = pkg
      ? '<span class="n ' + cwScoreCls(pkg.overall) + '">' + pkg.overall + '%</span><span class="l">Readiness</span>'
      : '<span class="n muted">—</span><span class="l">Readiness</span>';
    return '<div class="cw-overview">'
      + '<div class="cwo-id">'
      + '<div class="cwo-eyebrow">Implentio Onboarding · Customer Workspace</div>'
      + '<h2 class="cwo-title">' + cust + (tpl ? ' × ' + tpl : '') + '</h2>'
      + '<div class="cwo-sub">Data intake · 90-day lookback · Feb 19 – May 20, 2026</div>'
      + '</div>'
      + '<div class="cwo-top">'
      + '<div class="cwo-ver"><span class="cwo-ver-n">' + esc(verN) + '</span><span class="cwo-ver-sub">' + esc(verSub) + '</span></div>'
      + '<div class="cwo-metrics"><div class="cwo-score">' + score + '</div>'
      + '<span class="cw-badge ' + b[1] + '">' + esc(b[0]) + '</span></div>'
      + '</div></div>';
  }
  // Intake Files table — same lifecycle model as the Internal Report.
  function cwIntakeFilesHTML() {
    if (typeof FILES === 'undefined' || typeof intakeFilesTableHTML !== 'function') return '';
    const summary = (typeof intakeFilesSummaryHTML === 'function') ? intakeFilesSummaryHTML(FILES) : '';
    return '<div class="cw-sec"><div class="cw-sec-h"><h2>Intake files</h2><div class="if-summary">' + summary + '</div></div>'
      + '<p class="cw-sec-lede">Every file on record for your account, including replacements made across versions.</p>'
      + '<div class="ds-tablewrap"><table><thead><tr><th>File name</th><th>Category</th><th>Status</th><th>Introduced</th><th>Relationship</th></tr></thead><tbody>'
      + intakeFilesTableHTML(FILES) + '</tbody></table></div></div>';
  }
  function cwVersionHistoryHTML() {
    if (!cwVersions.length) return '';
    const cur = cwVersions[cwVersions.length - 1];
    const prev = cwVersions.slice(0, -1).reverse();
    let h = '<div class="cw-verhist"><div class="cw-verhist-h">Version history</div>';
    h += '<div class="cw-ver cur"><div class="cw-ver-l"><span class="cw-ver-n">Version ' + cur.n + '</span>'
      + '<span class="cw-ver-meta">Submitted ' + esc(cur.date) + '</span></div>'
      + '<span class="cw-ver-st st-' + cur.state + '">' + esc(cwVerStatusLabel(cur)) + '</span></div>';
    if (prev.length) {
      h += '<div class="cw-verhist-sub">Previous</div>';
      prev.forEach(v => {
        h += '<div class="cw-ver"><div class="cw-ver-l"><span class="cw-ver-n">Version ' + v.n + '</span>'
          + '<span class="cw-ver-meta">Submitted ' + esc(v.date) + '</span></div>'
          + '<span class="cw-ver-st st-' + v.state + '">' + esc(cwVerStatusLabel(v)) + '</span></div>';
      });
    }
    return h + '</div>';
  }
  function cwReceiptHTML(n) {
    const groups = cwSubmissionFor(n);
    const date = cwVersions.length ? (cwVersions.find(v => v.n === n) || {}).date : CW_DATE.submit1;
    let h = '<div class="cw-sec"><div class="cw-sec-h"><h2>Submission summary</h2><span class="cw-sec-tag">Version ' + n + ' · submitted ' + esc(date || CW_DATE.submit1) + '</span></div>';
    h += '<p class="cw-sec-lede">A receipt of everything included in this version.</p>';
    groups.forEach(g => {
      h += '<div class="summary-section-label">' + esc(g.group) + '</div><div class="summary-list">';
      g.items.forEach(it => {
        h += '<div class="summary-item" onclick="toggleSummary(this, event)">'
          + '<div class="summary-row"><div class="check">✓</div><div>'
          + '<div class="file-name">' + esc(it.name) + '</div>'
          + '<div class="file-meta">Submitted ' + esc(date || CW_DATE.submit1) + ' · ' + esc(it.meta) + '</div></div>'
          + '<div class="right"><div class="count">' + esc(it.count) + '</div><div class="chev">▾</div></div></div>'
          + '<div class="summary-detail">'
          + it.files.map(f => '<div class="files-row"><span class="name">' + esc(f[0]) + '</span><span class="info">' + esc(f[1]) + '</span></div>').join('')
          + '</div></div>';
      });
      h += '</div>';
    });
    return h + '</div>';
  }
  // "What changed" for an update version (captured at submit from the requests it addressed).
  function cwChangedHTML() {
    const cur = cwCurrentVersion();
    const ch = cur && cur.changed;
    if (!ch) return '';
    let h = '<div class="cw-sec"><div class="cw-sec-h"><h2>Updates included in Version ' + cwVer + '</h2></div>'
      + '<div class="cw-changed">'
      + '<div class="cw-chg"><span class="n">' + ch.up + '</span> new file' + (ch.up !== 1 ? 's' : '') + ' uploaded</div>'
      + '<div class="cw-chg"><span class="n">' + ch.rp + '</span> file' + (ch.rp !== 1 ? 's' : '') + ' replaced</div>'
      + '<div class="cw-chg"><span class="n">' + ch.cl + '</span> clarification' + (ch.cl !== 1 ? 's' : '') + ' provided</div></div>';
    h += '<ul class="cw-changed-list">' + (ch.names || []).map(nm => '<li>' + esc(nm) + '</li>').join('') + '</ul>';
    return h + '</div>';
  }

  // ----- State 2 / 4: received / under review -----
  function cwReceivedHTML() {
    const first = cwVer <= 1;
    const title = first ? 'Your submission has been received.' : 'We’ve received your updates.';
    const sub = first
      ? 'We have received your files and are reviewing them now. We’ll return with next steps once the review is complete.'
      : 'Thanks — your updates are in. Our team is reviewing this submission and will return with next steps. The ball is back with Implentio.';
    let h = cwHeaderHTML(title, sub);
    h += '<div class="cw-wait"><div class="cw-wait-ic">⏱</div><div><b>No action is required from you at this time.</b>'
      + '<p>We’ll email you the moment there’s an update. You can close this page — your progress is saved.</p></div></div>';
    if (!first) h += cwChangedHTML();
    h += cwIntakeFilesHTML();
    return h;
  }

  // ----- State 3: action required -----
  function cwReadinessChips(pkg) {
    const r = pkg.readiness || {};
    const chips = [];
    chips.push(['Files can be reviewed', 'ok']);
    if (r.missing > 0 || (r.open || 0) > 0) chips.push(['Coverage needs attention', 'warn']);
    const hasClarify = cwSentReqs().some(x => cwReqTypeOf(x) === 'clarify');
    if (hasClarify) chips.push(['Some details need clarification', 'warn']);
    return '<div class="cw-area-chips">' + chips.map(c => '<span class="cw-chip ' + c[1] + '">' + esc(c[0]) + '</span>').join('') + '</div>';
  }
  function cwRequestCardHTML(r, i, readonly) {
    const sevLbl = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
    const t = cwReqTypeOf(r);
    const resp = cwResponses[i];
    const done = !!resp;
    // status pill
    const stLbl = !done ? 'Not started'
      : resp.kind === 'reply' ? 'Response provided'
      : resp.kind === 'replace' ? 'Replacement uploaded' : 'File uploaded';
    const stCls = done ? 'tr-done' : 'tr-pending';
    let control;
    if (done) {
      const shown = resp.kind === 'reply'
        ? '<span class="cw-done-v">“' + esc(resp.reply) + '”</span>'
        : '<span class="cw-done-v mono">' + esc(resp.file) + '</span>';
      control = '<div class="cw-control done"><div class="cw-done-line"><span class="cw-done-ic">✓</span>'
        + esc(stLbl) + ' ' + shown + '</div>'
        + (readonly ? '' : '<button class="cw-undo" onclick="cwUndo(' + i + ')">Undo</button>') + '</div>';
    } else if (t === 'clarify') {
      control = '<div class="cw-control"><div class="cw-control-k">Provide response</div>'
        + '<textarea class="cw-reply"' + (readonly ? ' disabled' : ' id="cw-reply-' + i + '"') + ' placeholder="Type your response…"></textarea>'
        + (readonly ? '' : '<button class="btn sm" onclick="cwSubmitClarify(' + i + ')">Submit response</button>') + '</div>';
    } else if (t === 'replace') {
      control = '<div class="cw-control"><div class="cw-control-k">Replace file</div>'
        + '<div class="cw-control-ctx">Current file: <span class="mono">' + esc(r.targetFile || 'existing file') + '</span><br>'
        + 'Your replacement will be reviewed together with your existing submission.</div>'
        + (readonly ? '<div class="cf-drop">⤓ Upload corrected replacement</div>' : '<button class="cf-drop" onclick="cwUpload(' + i + ',\'replace\')">⤓ Upload corrected replacement</button>') + '</div>';
    } else {
      control = '<div class="cw-control"><div class="cw-control-k">Upload file</div>'
        + '<div class="cw-control-ctx">Provide the requested file covering the period noted above.</div>'
        + (readonly ? '<div class="cf-drop">⤓ Upload file</div>' : '<button class="cf-drop" onclick="cwUpload(' + i + ',\'upload\')">⤓ Upload file</button>') + '</div>';
    }
    return '<div class="cw-req sev-' + esc(r.severity || 'medium') + (done ? ' is-done' : '') + '">'
      + '<div class="cw-req-top"><div class="cw-req-name">' + esc(r.name || 'Untitled request') + '</div>'
      + '<div class="cw-req-pills"><span class="pill sev-' + esc(r.severity || 'medium') + '">' + (sevLbl[r.severity] || 'Medium') + '</span>'
      + '<span class="tr ' + stCls + '">' + esc(stLbl) + '</span></div></div>'
      + (cwReqDesc(r) ? '<div class="cw-req-desc">' + esc(cwReqDesc(r)) + '</div>' : '')
      + control + '</div>';
  }
  function cwActionHTML(readonly) {
    const pkg = (typeof sentPackage !== 'undefined' && sentPackage) ? sentPackage : (typeof buildDraftPackage === 'function' ? buildDraftPackage() : { readiness: {}, requests: [] });
    const sent = cwSentReqs();
    const high = sent.filter(r => r.severity === 'critical' || r.severity === 'high').length;
    const completed = cwCompletedCount();
    let h = cwHeaderHTML('We reviewed your submission and need a few updates.',
      'Please complete the requests below and submit your updates when you’re ready.');
    // compact status summary
    h += '<div class="cw-statline"><span class="cw-stat"><b>' + sent.length + '</b>Request' + (sent.length !== 1 ? 's' : '') + '</span>'
      + '<span class="cw-stat"><b>' + high + '</b>High priority</span>'
      + '<span class="cw-stat"><b>' + completed + '</b>Completed</span></div>';
    // readiness summary (customer-safe)
    h += '<div class="cw-sec"><div class="cw-sec-h"><h2>Onboarding readiness</h2>'
      + '<span class="pill ' + esc(pkg.decisionCls || 'warn') + '">' + esc(pkg.decision || 'Additional Information Required') + '</span></div>'
      + '<p class="cw-readiness-copy">' + esc(pkg.exec || 'We were able to review most of the submitted data. A few files and details still need to be provided or corrected before onboarding can continue.') + '</p>'
      + cwReadinessChips(pkg) + '</div>';
    // manager message
    if (pkg.msg) h += '<div class="cw-sec cw-msg"><h3>A note from your onboarding manager</h3><p>' + esc(pkg.msg) + '</p></div>';
    // intake files
    h += cwIntakeFilesHTML();
    // requests + progress (process bar, like the Internal Report review bar) + submit
    const pct = sent.length ? Math.round(completed / sent.length * 100) : 0;
    const remaining = sent.length - completed;
    h += '<div class="cw-sec"><div class="cw-sec-h"><h2>Requested actions</h2></div>'
      + '<div class="cw-arb"><div class="arb-left">'
      + '<div class="arb-count"><b>' + completed + '</b> of <span>' + sent.length + '</span> request' + (sent.length !== 1 ? 's' : '') + ' completed</div>'
      + '<div class="arb-track"><div class="arb-fill" style="width:' + pct + '%"></div></div>'
      + '<div class="arb-legend">'
      + '<span class="alg st-reviewed"><b>' + completed + '</b> completed</span>'
      + '<span class="alg st-waiting"><b>' + remaining + '</b> remaining</span>'
      + '</div></div>'
      + (readonly ? '' : '<div class="arb-actions"><button class="btn sm" onclick="cwJumpToNext()">Jump to next →</button></div>')
      + '</div>'
      + '<p class="cw-sec-lede">Complete these in any order. Nothing is submitted until you click <b>Submit updates for review</b>.</p>'
      + '<div class="cw-reqlist">' + sent.map((r, i) => cwRequestCardHTML(r, i, readonly)).join('') + '</div></div>';
    if (!readonly) {
      const ready = completed === sent.length && sent.length > 0;
      h += '<div class="cw-submit-bar"><div class="cw-submit-info">'
        + (ready ? '<b>All requests completed.</b> Submit your updates as Version ' + (cwVer + 1) + ' for review.'
                 : 'Complete all ' + sent.length + ' requests to submit. <b>' + (sent.length - completed) + ' remaining.</b>')
        + '</div><button class="btn" ' + (ready ? '' : 'disabled') + ' onclick="cwOpenSubmitModal()">Submit updates for review</button></div>';
    }
    return h;
  }

  // ----- State 5: final confirmation -----
  function cwFinalHTML() {
    const pkg = (typeof sentPackage !== 'undefined' && sentPackage) ? sentPackage : { readiness: {}, msg: '' };
    let h = cwHeaderHTML('Your intake is complete.',
      'We’ve reviewed the latest submission and no further information is required at this time. Your onboarding can now move forward.');
    h += '<div class="cw-final-card"><div class="cw-final-ic">✓</div>'
      + '<div><div class="cw-final-h">Ready for onboarding</div>'
      + '<div class="cw-final-sub">Approved on Version ' + cwVer + ' · ' + esc(CW_DATE.final) + '</div></div></div>';
    // final readiness summary
    h += '<div class="cw-sec"><div class="cw-sec-h"><h2>What we reviewed</h2></div>'
      + '<div class="cw-area-chips">'
      + '<span class="cw-chip ok">Files reviewed</span>'
      + '<span class="cw-chip ok">Coverage confirmed</span>'
      + '<span class="cw-chip ok">Data quality acceptable</span></div>'
      + '<p class="cw-readiness-copy">' + esc(pkg.exec || 'All submitted data has been reviewed and meets the requirements to begin your audit. Thank you for completing the requested updates.') + '</p></div>';
    if (pkg.msg) h += '<div class="cw-sec cw-msg"><h3>A note from your onboarding manager</h3><p>' + esc(pkg.msg) + '</p></div>';
    h += cwIntakeFilesHTML();
    h += '<div class="cw-sec"><div class="cw-sec-h"><h2>What happens next</h2></div>'
      + '<p class="cw-sec-lede">Your Implentio onboarding manager will reach out to schedule kickoff and begin the reconciliation audit. No further uploads are needed.</p></div>';
    return h;
  }

  // ----- empty (navigated to workspace before submitting) -----
  function cwEmptyHTML() {
    return '<div class="cw-empty"><div class="cw-empty-ic">◷</div>'
      + '<h2>No submission yet</h2>'
      + '<p>Head to <b>Customer Intake</b> to upload your onboarding files. Once you submit, this workspace will track your review status and any requests.</p>'
      + '<button class="btn" onclick="cwGoToIntake()">Go to Customer Intake →</button></div>';
  }
  function cwGoToIntake() { if (typeof goTo === 'function') goTo(1); }

  // ----- dispatch -----
  function cwMarkup(readonly) {
    let body;
    if (cwState === 'action') body = cwActionHTML(readonly);
    else if (cwState === 'final') body = cwFinalHTML();
    else if (cwState === 'received') body = cwReceivedHTML();
    else body = cwEmptyHTML();
    return '<div class="cw-wrap' + (cwState === 'final' ? ' cw-is-final' : '') + '">' + cwOverviewHTML() + body + '</div>';
  }
  function renderCustomerWorkspace() {
    cwBindDemoBar();
    const root = document.getElementById('cw-root');
    if (root) root.innerHTML = cwDemoBarHTML() + cwMarkup(false);
    renderCustomerViewTab();
    cwRenderIntakeTop();
  }
  // The upload page (page-1) IS the workspace's initial state. Keep the demo bar
  // available there so every state stays testable from the combined surface.
  function cwRenderIntakeTop() {
    cwBindDemoBar();
    const el = document.getElementById('cw-intake-top');
    if (el) el.innerHTML = cwDemoBarHTML();
  }

  // ===== DEMO-ONLY state switcher (not part of the production customer UI) =====
  const CW_DEMO_STATES = [
    ['initial',   '① Upload (intake)'],
    ['received1', '② Under review · V1'],
    ['action',    '③ Action required'],
    ['received2', '④ Updates under review · V2'],
    ['final',     '⑤ Ready for onboarding'],
  ];
  function cwDemoActiveKey() {
    if (cwState === 'action') return 'action';
    if (cwState === 'final') return 'final';
    if (cwState === 'received') return cwVer >= 2 ? 'received2' : 'received1';
    return 'initial';
  }
  function cwDemoBarHTML() {
    const cur = cwDemoActiveKey();
    return '<div class="cw-demobar"><span class="cw-demobar-l">Demo · jump to state</span>'
      + CW_DEMO_STATES.map(s => '<button type="button" class="cw-demobtn' + (s[0] === cur ? ' on' : '') + '" data-cwdemo="' + s[0] + '">' + esc(s[1]) + '</button>').join('')
      + '<button type="button" class="cw-demobtn next" data-cwdemo="__next">Next step →</button>'
      + '</div>';
  }
  // Advance to the next state in the lifecycle (loops back to Empty after the final state).
  function cwDemoNext() {
    const order = CW_DEMO_STATES.map(s => s[0]);
    const i = order.indexOf(cwDemoActiveKey());
    cwDemoState(order[(i + 1) % order.length]);
  }
  // Delegated click handling for the demo bar — attached once to document so it
  // survives every re-render of #cw-root and never depends on inline onclick scope.
  let cwDemoBound = false;
  function cwBindDemoBar() {
    if (cwDemoBound) return;
    cwDemoBound = true;
    // Capture phase + document-level so it always fires regardless of inner stopPropagation.
    document.addEventListener('click', function (e) {
      const t = e.target && e.target.closest ? e.target.closest('[data-cwdemo]') : null;
      if (!t) return;
      e.preventDefault();
      e.stopPropagation();
      const v = t.getAttribute('data-cwdemo');
      try { if (v === '__next') cwDemoNext(); else cwDemoState(v); }
      catch (err) { if (window.console) console.error('Demo control error:', err); if (typeof showToast === 'function') showToast('Demo error: ' + (err && err.message)); }
    }, true);
  }
  // Seed two requests into the bucket if it's empty, so the action/final states have data.
  function cwDemoEnsureRequests() {
    if (typeof requests === 'undefined') return;
    if (requests.filter(r => !r.sent).length || requests.length) return;
    requests.push(
      { name: 'Provide UPS SurePost & DHL eCommerce rate cards',
        desc: 'No effective rate card exists for UPS SurePost or DHL eCom SmartMail anywhere in the 90-day lookback. Please supply current cards effective across the window.',
        severity: 'critical', fileRequired: true, reqType: 'upload',
        fileContext: { mode: 'upload', file: 'UPS SurePost + DHL eCommerce rate cards' },
        note: '', source: 'No effective card', analysis: 'ax-eff', status: 'queued' },
      { name: 'Re-export the invoice with standard service levels',
        desc: 'Some invoice rows use non-standard service-level codes that we can’t match to a rate. Please upload a corrected re-export of the invoice file.',
        severity: 'high', fileRequired: true, reqType: 'replace', targetFile: 'Invoice_Export_Jan.csv',
        fileContext: { mode: 'replace', file: 'Invoice_Export_Jan.csv' },
        note: '', source: 'Non-standard service level', analysis: 'ax-dq', status: 'queued' },
      { name: 'Confirm invoice billing frequency',
        desc: 'Please confirm whether you receive carrier invoices weekly, biweekly, or monthly so we can align the reconciliation windows.',
        severity: 'medium', fileRequired: false, reqType: 'clarify',
        fileContext: { mode: 'upload', file: '' },
        note: '', source: 'Billing cadence', analysis: 'ax-time', status: 'queued' });
  }
  function cwDemoBuildSnapshot(kind) {
    if (typeof buildDraftPackage !== 'function') return;
    try {
      sentPackage = JSON.parse(JSON.stringify(buildDraftPackage()));
      sentPackage.kind = kind;
      sentPackage.custVer = cwVer;
      sentPackage.sentDate = CW_DATE.review;
    } catch (e) { if (window.console) console.error('cwDemoBuildSnapshot failed:', e); }
  }
  function cwDemoState(name) {
    cwResponses = {};
    if (name === 'initial') {
      cwVer = 0; cwState = 'initial'; cwVersions = [];
      if (typeof intakeSent !== 'undefined') intakeSent = false;
      if (typeof intakeFinal !== 'undefined') intakeFinal = false;
      sentPackage = null;
    } else if (name === 'received1') {
      cwVer = 1; cwState = 'received';
      cwVersions = [{ n: 1, date: CW_DATE.submit1, state: 'review' }];
      if (typeof intakeSent !== 'undefined') intakeSent = false;
      if (typeof intakeFinal !== 'undefined') intakeFinal = false;
    } else if (name === 'action') {
      cwDemoEnsureRequests();
      requests.forEach(r => { r.sent = true; r.batch = 'demo'; r.sentDate = CW_DATE.review; r.respStatus = 'Pending'; if (r.respFile === undefined) r.respFile = null; });
      cwVer = 1; cwState = 'action';
      cwVersions = [{ n: 1, date: CW_DATE.submit1, state: 'requested' }];
      cwDemoBuildSnapshot('requests');
      if (typeof intakeSent !== 'undefined') intakeSent = true;
      if (typeof intakeFinal !== 'undefined') intakeFinal = false;
    } else if (name === 'received2') {
      if (typeof requests !== 'undefined') requests.splice(0, requests.length);   // previous cycle resolved
      cwVer = 2; cwState = 'received';
      cwVersions = [
        { n: 1, date: CW_DATE.submit1, state: 'completed' },
        { n: 2, date: CW_DATE.submit2, state: 'review', changed: { up: 1, rp: 1, cl: 1, names: ['Provide UPS SurePost & DHL eCommerce rate cards', 'Replace Support File', 'Confirm invoice billing frequency'] } },
      ];
      if (typeof intakeSent !== 'undefined') intakeSent = false;
      if (typeof intakeFinal !== 'undefined') intakeFinal = false;
    } else if (name === 'final') {
      if (typeof requests !== 'undefined') requests.splice(0, requests.length);   // empty bucket -> final confirmation
      cwVer = 2; cwState = 'final';
      cwVersions = [
        { n: 1, date: CW_DATE.submit1, state: 'completed' },
        { n: 2, date: CW_DATE.submit2, state: 'final' },
      ];
      cwDemoBuildSnapshot('final');
      if (typeof intakeSent !== 'undefined') intakeSent = false;
      if (typeof intakeFinal !== 'undefined') intakeFinal = true;
    }
    // VISIBLE FIRST: always update the customer workspace so the demo control is
    // reliable, even if an Internal Report sync call below errors. The initial state
    // is the upload (page-1); every other state lives on page-2.
    if (typeof goTo === 'function') { try { goTo(cwState === 'initial' ? 1 : 2); } catch (e) {} }
    try { renderCustomerWorkspace(); }
    catch (e) { const root = document.getElementById('cw-root'); if (root) root.innerHTML = cwDemoBarHTML() + cwMarkup(false); if (window.console) console.error('render error:', e); }
    // Best-effort: sync the Internal Report surfaces (non-fatal).
    try { if (typeof renderRequests === 'function') renderRequests(); } catch (e) {}
    try { if (typeof refreshAll === 'function') refreshAll(); } catch (e) {}
    try { if (typeof renderResponse === 'function') renderResponse(); } catch (e) {}
    if (typeof showToast === 'function') showToast('Demo: ' + name);
  }
  // Internal "Customer View" tab — exactly what the customer currently sees (read-only).
  function renderCustomerViewTab() {
    const root = document.getElementById('cust-root');
    if (!root) return;
    if (cwState === 'initial') {
      root.innerHTML = '<div class="cust-view-note">Nothing has been sent to the customer yet. Once you send a package, this tab mirrors the exact page the customer sees.</div>';
      return;
    }
    root.innerHTML = '<div class="cust-view-note">This is exactly what <b>' + esc(cwCustName()) + '</b> sees in their Customer Workspace right now — read-only.</div>'
      + '<div class="cw-readonly">' + cwMarkup(true) + '</div>';
  }

  // Keep the old entry point working: report-card / sendPackage call renderReportCard().
  function renderReportCard() { renderCustomerWorkspace(); }

  // Init
  cwBindDemoBar();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderCustomerWorkspace);
  else renderCustomerWorkspace();
