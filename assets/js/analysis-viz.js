// Analysis Findings — interactive visualizations.
// Renders the two viz variants that need interactivity:
//   • Card 1 (Rate Card Effective Date): per-carrier 90-day coverage strips
//     (one discrete cell per day) + a linked gap table — click a strip OR a
//     gap row to cross-highlight the matching combo.
//   • Card 3 (Rate Card Quality): a per-card cleanliness scan — summary table
//     of every rate card + a switchable Zone×Weight detail matrix.
// Self-contained IIFE (no globals leaked); all values are static demo data,
// kept consistent with docs/ANALYSIS-FINDINGS-SECTIONS.md. The other seven
// cards render their visualizations as static HTML in index.html.
(function () {
  'use strict';
  var LOOKBACK = 90;

  // ===== Card 1: Effective Date — coverage strips + gap table =====
  // cov = covered day-ranges [startDay, endDay) within the 90-day window.
  // Each row is one carrier × service combo. `car` groups rows by carrier so the
  // strips and the gap table can show one carrier spanning its several services.
  var EFF_ROWS = [
    { car: 'UPS',      svc: 'Ground',        cov: [[0, 90]],           rate: 53 },
    { car: 'UPS',      svc: 'SurePost',      cov: [],                  rate: 37 },
    { car: 'USPS',     svc: 'Priority Mail', cov: [[0, 40], [55, 90]], rate: 17 },
    { car: 'FedEx',    svc: 'SmartPost',     cov: [[0, 30]],           rate: 2  },
    { car: 'DHL eCom', svc: 'SmartMail',     cov: [],                  rate: 4  }
  ];
  EFF_ROWS.forEach(function (r) { r.k = r.car + ' · ' + r.svc; }); // combined label kept for any back-refs
  function covDays(r) { return r.cov.reduce(function (s, x) { return s + (x[1] - x[0]); }, 0); }
  function gapsOf(r) {
    var g = [], cur = 0;
    r.cov.slice().sort(function (a, b) { return a[0] - b[0]; }).forEach(function (s) {
      if (s[0] > cur) g.push([cur, s[0]]);
      cur = Math.max(cur, s[1]);
    });
    if (cur < LOOKBACK) g.push([cur, LOOKBACK]);
    return g;
  }
  function renderEff() {
    var strips = document.getElementById('eff-strips');
    var table = document.getElementById('eff-gaps');
    if (!strips || !table) return;
    strips.innerHTML = EFF_ROWS.map(function (r, i) {
      var cells = '';
      for (var d = 0; d < LOOKBACK; d++) {
        var cov = r.cov.some(function (s) { return d >= s[0] && d < s[1]; });
        cells += '<i class="' + (cov ? 'have' : 'gap') + '"></i>';
      }
      var pct = Math.round(covDays(r) / LOOKBACK * 100);
      var first = (i === 0 || EFF_ROWS[i - 1].car !== r.car);
      return '<div class="dayrow' + (first ? ' car-first' : '') + '" data-combo="' + i + '">'
        + '<div class="dl">' + (first ? r.car : '') + '<span class="sl">' + r.svc + '</span></div>'
        + '<div class="daycells">' + cells + '</div><div class="dpct">' + pct + '%</div></div>';
    }).join('');
    // Gap table: group rows by carrier, then by service, so one carrier spans its services.
    // Only services that actually have gaps appear, so the carrier cell anchors to the
    // first gap-having service of each carrier and spans that carrier's total gap rows.
    var body = '';
    var carSeen = {};
    EFF_ROWS.forEach(function (r, i) {
      var gs = gapsOf(r);
      if (!gs.length) return;
      var carFirst = !carSeen[r.car];
      var carSpan = 0;
      if (carFirst) { carSeen[r.car] = true; EFF_ROWS.forEach(function (o) { if (o.car === r.car) carSpan += gapsOf(o).length; }); }
      gs.forEach(function (g, gi) {
        var days = g[1] - g[0];
        var carCell = (carFirst && gi === 0) ? '<td class="grp-cell" rowspan="' + carSpan + '">' + r.car + '</td>' : '';
        var svcCell = gi === 0 ? '<td class="grp-cell svc-cell" rowspan="' + gs.length + '">' + r.svc + '</td>' : '';
        body += '<tr data-combo="' + i + '">' + carCell + svcCell
          + '<td>day ' + (g[0] + 1) + '–' + g[1] + '</td><td>' + days + '</td><td>'
          + (days * r.rate).toLocaleString() + '</td></tr>';
      });
    });
    if (!body) body = '<tr><td colspan="5" class="muted">No gaps — every day covered.</td></tr>';
    var tbody = table.querySelector('tbody');
    if (tbody) tbody.innerHTML = body;

    // Cross-highlight: click a strip or a gap row to select that combo.
    var rows = [].slice.call(strips.querySelectorAll('.dayrow'));
    var trs = [].slice.call(table.querySelectorAll('tbody tr[data-combo]'));
    var cur = -1;
    function apply() {
      rows.forEach(function (el) { el.classList.toggle('sel', +el.dataset.combo === cur); });
      trs.forEach(function (el) { el.classList.toggle('gap-hi', +el.dataset.combo === cur); });
    }
    function pick(i) { cur = (cur === i ? -1 : i); apply(); }
    rows.forEach(function (el) { el.addEventListener('click', function () { pick(+el.dataset.combo); }); });
    trs.forEach(function (el) { el.addEventListener('click', function () { pick(+el.dataset.combo); }); });
  }

  // ===== Card 3: Quality — per-card scan (summary + switchable detail) =====
  var WTS = ['1 lb', '2 lb', '5 lb', '10 lb', '20 lb'];
  var ZN = [1, 2, 3, 4, 5, 6, 7, 8];
  function z1col() { return WTS.map(function (_, wi) { return [wi, 0]; }); } // zone-1 column not in 2-8 cards
  // bad = [weightIdx, zoneIdx] charged but missing from card; mut = in card, never charged.
  var QUAL_CARDS = [
    { name: 'UPS Ground 2026',            short: 'UPS Ground',      zones: '2–8', breaks: '1–70 lb continuous', uom: 'Yes (lb)',        verdict: 'clean',      bad: [],                          mut: z1col() },
    { name: 'UPS 2nd Day Air 2026',       short: 'UPS 2nd Day',     zones: '2–8', breaks: '1–70 lb continuous', uom: 'Yes (lb)',        verdict: 'clean',      bad: [],                          mut: z1col() },
    { name: 'FedEx Ground 2026',          short: 'FedEx Ground',    zones: '2–8', breaks: 'Gap 41–45 lb',       uom: 'Yes (lb)',        verdict: 'weightgap',  bad: [[4, 2], [4, 3], [4, 4], [4, 5]], mut: z1col() },
    { name: 'USPS Priority Mail 2026',    short: 'USPS Priority',   zones: '1–9', breaks: 'Flat-rate + per-lb',      uom: 'Ambiguous',       verdict: 'uomunclear', bad: [],                          mut: [] },
    { name: 'USPS Ground Advantage 2026', short: 'USPS Ground Adv.', zones: '1–9', breaks: 'oz <1lb, lb above',      uom: 'Mixed (labeled)', verdict: 'clean',      bad: [],                          mut: [[0, 7]] }
  ];
  var VERD = { clean: ['ok', 'Clean'], weightgap: ['warn', 'Weight gap'], uomunclear: ['neutral', 'UOM unclear'] };
  function stateOf(c, wi, zi) {
    if (c.bad.some(function (b) { return b[0] === wi && b[1] === zi; })) return 'bad';
    if (c.mut.some(function (b) { return b[0] === wi && b[1] === zi; })) return 'mut';
    return 'ok';
  }
  function qualSummaryRows() {
    return QUAL_CARDS.map(function (c, i) {
      var v = VERD[c.verdict];
      var wb = c.verdict === 'weightgap' ? '<b>' + c.breaks + '</b>' : c.breaks;
      var uom = c.verdict === 'uomunclear' ? '<b>' + c.uom + '</b>' : c.uom;
      return '<tr class="scan-row' + (c.verdict === 'clean' ? '' : ' flag') + '" data-i="' + i + '">'
        + '<td>' + c.name + '</td><td>' + c.zones + ' ✓</td><td>' + wb + '</td><td>' + uom + '</td>'
        + '<td><span class="pill ' + v[0] + '">' + v[1] + '</span></td></tr>';
    }).join('');
  }
  function qualDetail(c) {
    var bad = 0;
    WTS.forEach(function (_, wi) { ZN.forEach(function (_, zi) { if (stateOf(c, wi, zi) === 'bad') bad++; }); });
    var cov = Math.round((WTS.length * ZN.length - bad) / (WTS.length * ZN.length) * 100);
    var uomBad = /Ambiguous|^No/.test(c.uom);
    var head = '<div class="zrow"><div class="zl"></div>' + ZN.map(function (z) { return '<div class="zhead">Z' + z + '</div>'; }).join('') + '</div>';
    var grid = WTS.map(function (w, wi) {
      return '<div class="zrow"><div class="zl">' + w + '</div>' + ZN.map(function (_, zi) {
        var s = stateOf(c, wi, zi);
        var cls = s === 'ok' ? 'have' : s === 'bad' ? 'miss' : 'na';
        var mk = s === 'ok' ? '✓' : s === 'bad' ? '!' : '·';
        return '<div class="zcell ' + cls + '">' + mk + '</div>';
      }).join('') + '</div>';
    }).join('');
    return '<div class="viz-meta"><span>Zones present: <b>' + c.zones + '</b></span>'
      + '<span>Cell coverage: <b>' + cov + '%</b></span>'
      + '<span>UOM: <b style="' + (uomBad ? 'color:var(--bad)' : '') + '">' + c.uom + '</b></span></div>'
      + '<div class="zgrid">' + head + grid + '</div>'
      + '<p class="legend" style="margin-top:12px"><span class="ok"><span class="dot"></span>present</span>'
      + '<span class="miss"><span class="dot"></span>charged, missing in card</span>'
      + '<span class="opt"><span class="dot"></span>in card, never charged</span></p>';
  }
  function renderQual() {
    var tb = document.querySelector('#qual-scan tbody');
    var sel = document.getElementById('qual-scan-sel');
    var detail = document.getElementById('qual-scan-detail');
    if (!tb || !sel || !detail) return;
    tb.innerHTML = qualSummaryRows();
    sel.innerHTML = QUAL_CARDS.map(function (c, i) { return '<button data-i="' + i + '">' + c.short + '</button>'; }).join('');
    var rows = [].slice.call(tb.querySelectorAll('.scan-row'));
    var btns = [].slice.call(sel.querySelectorAll('button'));
    var curSel = QUAL_CARDS.findIndex(function (c) { return c.verdict !== 'clean'; });
    if (curSel < 0) curSel = 0;
    function render() {
      detail.innerHTML = qualDetail(QUAL_CARDS[curSel]);
      rows.forEach(function (el, i) { el.classList.toggle('on', i === curSel); });
      btns.forEach(function (el, i) { el.classList.toggle('on', i === curSel); });
    }
    rows.forEach(function (el, i) { el.addEventListener('click', function () { curSel = i; render(); }); });
    btns.forEach(function (el, i) { el.addEventListener('click', function () { curSel = i; render(); }); });
    render();
  }

  function init() { renderEff(); renderQual(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
