// Block 3: View Mode — real data <-> template/blueprint
  // ===== View Mode: Real Data <-> Template (blueprint) ===============
  const TPL_PAGE = [
    { tag: 'Page Header', name: 'Intake Version Management',
      purpose: 'Track iterative onboarding cycles so managers can compare submissions and verify that requested fixes were applied.',
      source: ['Submission history', 'Versioning system', 'Review workflow'],
      outputs: ['Version selector', 'Current status', 'Date submitted', 'Submitted by', 'New / Resolved / Unchanged findings', 'Open requests'],
      actions: ['Switch between versions', 'Compare progress', 'Verify requested fixes'] },
    { tag: 'Page Header', name: 'Report Overview',
      purpose: 'Give a one-glance readiness summary and gate whether the report is ready to send.',
      source: ['Scoring engine', 'Per-analysis review status', 'Client Request Bucket'],
      outputs: ['Overall score', 'Intake review status', 'Reviewed / Waiting / Deferred / Not reviewed counts', 'Open requests'],
      actions: ['Send requests & close review', 'Continue after customer update'] },
  ];
  const TPL_ANALYSIS = [
    { tag: 'Analysis Header', name: 'Analysis Header',
      purpose: 'Provides a quick overview of the analysis status and importance.',
      source: ['Analysis configuration', 'Scoring engine', 'Review workflow'],
      outputs: ['Score', 'Weight', 'Priority', 'Review status', 'Finding count', 'Request count'],
      actions: ['Mark reviewed', 'Expand / collapse section'] },
    { tag: 'Section 1', name: 'Business Impact & Overview',
      purpose: 'Help managers understand whether fixing issues in this area is worthwhile.',
      source: ['Analysis scoring engine', 'AI summary generation'],
      outputs: ['Analysis score', 'Weight contribution', 'Potential score improvement', 'Business impact summary', 'Executive summary'],
      actions: ['Determine review priority', 'Assess business value'] },
    { tag: 'Section 2', name: 'Analysis Inputs',
      purpose: 'Explain what information was available to run the analysis and whether there is enough data to trust the results.',
      source: ['Uploaded customer files', 'File classification system', 'Data quality engine', 'Confidence model'],
      outputs: ['Available inputs', 'Missing inputs (with severity)', 'Analysis confidence (score + reason)', 'Limitations'],
      actions: ['Verify data completeness', 'Identify missing customer inputs', 'Judge how far to trust the results'] },
    { tag: 'Section 3', name: 'Findings',
      purpose: 'Present analysis-specific issues discovered by the system.',
      source: ['Analysis engine'],
      outputs: ['Analysis-specific findings', 'Severity levels', 'Estimated impact', 'Supporting evidence'],
      viz: ['Tables', 'Charts', 'Timelines', 'Coverage maps', 'Heatmaps', 'Validation summaries'],
      actions: ['Review findings', 'Create client requests'],
      note: 'This section intentionally changes depending on the analysis type.' },
    { tag: 'Section 4', name: 'AI Insights',
      purpose: 'Provide recommendations based on detected findings.',
      source: ['AI recommendation engine', 'Analysis results'],
      outputs: ['High-priority recommendations', 'Medium-priority recommendations', 'Additional observations'],
      actions: ['Review recommendations', 'Decide whether recommendations should become customer requests'] },
  ];
  const TPL_SIDEBAR = { tag: 'Sidebar', name: 'Client Request Bucket',
    purpose: 'Collect customer-facing requests before sending them in one consolidated package.',
    source: ['Manager-selected findings', 'Custom manager requests'],
    outputs: ['Request list', 'Priority assignments', 'ETA requests', 'Supporting explanations'],
    actions: ['Create requests', 'Edit requests', 'Prioritize requests', 'Send requests to customer'] };

  function tplChips(items, cls) { return `<div class="tpl-chips">${items.map(i => `<span class="tpl-chip ${cls || ''}">${i}</span>`).join('')}</div>`; }
  function tplCard(s) {
    return `
      <div class="tpl-card">
        <div class="tc-head">
          <span class="tc-tag">${s.tag}</span>
          <span class="tc-name">${s.name}</span>
          <span class="tpl-skel"><span></span><span></span><span></span></span>
        </div>
        <div class="tc-body">
          <div class="tpl-row"><div class="k"><span class="sq"></span>Purpose</div><div class="tpl-purpose">${s.purpose}</div></div>
          <div class="tpl-row"><div class="k src"><span class="sq"></span>Information source</div>${tplChips(s.source, 'src')}</div>
          <div class="tpl-row"><div class="k out"><span class="sq"></span>Outputs</div>${tplChips(s.outputs, 'out')}</div>
          ${s.viz ? `<div class="tpl-row"><div class="k viz"><span class="sq"></span>Possible visualizations</div>${tplChips(s.viz, 'viz')}</div>` : ''}
          <div class="tpl-row"><div class="k act"><span class="sq"></span>Manager actions</div>${tplChips(s.actions, 'act')}</div>
          ${s.note ? `<div class="tpl-note-line">${s.note}</div>` : ''}
        </div>
      </div>`;
  }

  let tplRendered = false;
  function renderTemplate() {
    if (tplRendered) return;
    const root = document.getElementById('ir-template');
    root.innerHTML = `
      <div class="tpl-banner">
        <span class="ic">▦</span>
        <div>
          <div class="t">Template View — analysis blueprint</div>
          <p>Structure, data flow, and manager responsibilities only — no example values. Use this mode for product, UX, and stakeholder reviews. Switch back to <b>Real Data</b> for the populated report.</p>
        </div>
      </div>
      <div class="tpl-grid">
        <div>
          <div class="tpl-group"><span class="lbl">Page</span><div class="line"></div></div>
          ${TPL_PAGE.map(tplCard).join('')}
          <div class="tpl-group"><span class="lbl">Analysis Card — repeated per analysis</span><div class="line"></div></div>
          <p class="tpl-subnote">Every analysis follows the same five-part structure. This intake renders <b>9 analyses</b> — 3 rate-card, 5 invoice &amp; support, and 1 AI cross-review. Only the <b>Findings</b> section changes per analysis; everything else stays identical.</p>
          ${TPL_ANALYSIS.map(tplCard).join('')}
        </div>
        <aside class="tpl-side">
          <div class="tpl-group"><span class="lbl">Sidebar</span><div class="line"></div></div>
          ${tplCard(TPL_SIDEBAR)}
        </aside>
      </div>`;
    tplRendered = true;
  }

  function setViewMode(mode) {
    const wrap = document.querySelector('#page-3 .container.wide');
    document.querySelectorAll('.vm-opt').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    if (mode === 'template') { renderTemplate(); wrap.classList.add('tpl-on'); }
    else { wrap.classList.remove('tpl-on'); }
  }
