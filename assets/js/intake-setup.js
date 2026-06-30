// Block 1: State, navigation, link/password generation, file upload flow (Pages 0-2)
  // ===== State =====
  const state = {
    customer: 'Tushy',
    threePL: 'ShipBob',
    customerEmail: 'ben@hellotushy.com',
    engineer: 'Youssef Zayed',
    modules: ['parcel', 'fulfillment'],
    linkId: 'tushy-shipbob-3k9p2x',
    password: 'tushy-rabbit-foxtrot-2614',
    linkGenerated: false,
  };

  // ===== Navigation =====
  function goTo(n) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + n).classList.add('active');
    // The single "Customer Workspace" nav entry covers both the upload (page-1) and the live states (page-2).
    document.querySelectorAll('.step-btn').forEach(b => {
      const s = b.dataset.step;
      b.classList.toggle('active', s == n || (s === 'customer' && (n == 1 || n == 2)));
    });
    document.getElementById('ctx-strip').style.display = n == 0 ? 'none' : 'flex';
    syncContext();
    // Keep the Customer Workspace surfaces in sync with the current state whenever shown.
    if (n == 1 && typeof cwRenderIntakeTop === 'function') cwRenderIntakeTop();
    if (n == 2 && typeof renderCustomerWorkspace === 'function') renderCustomerWorkspace();
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
  // The Customer Workspace entry routes to the upload (initial) or the live states by submission status.
  document.querySelectorAll('.step-btn').forEach(b => b.addEventListener('click', () => {
    const s = b.dataset.step;
    if (s === 'customer') goTo((typeof cwVer !== 'undefined' && cwVer > 0) ? 2 : 1);
    else goTo(s);
  }));

  // ===== Sync customer/3PL across all pages =====
  function syncContext() {
    state.customer = document.getElementById('adm-customer').value || 'Tushy';
    state.threePL = document.getElementById('adm-3pl').value || 'ShipBob';
    state.customerEmail = document.getElementById('adm-email').value || 'ben@hellotushy.com';
    state.engineer = document.getElementById('adm-name').value || 'Youssef Zayed';

    document.getElementById('ctx-customer').textContent = state.customer;
    document.getElementById('ctx-3pl').textContent = state.threePL;
    document.getElementById('ctx-linkid').textContent = state.linkGenerated ? state.linkId : '— (not generated)';
    const mods = document.getElementById('ctx-modules');
    mods.innerHTML = state.modules.map(m => {
      const label = { parcel: 'Parcel', fulfillment: 'Fulfillment', lcc: 'LCC', ops: 'Ops Intel' }[m];
      return `<span class="pill-mini">${label}</span>`;
    }).join(' ');

    // Page 1
    document.getElementById('up-customer').textContent = state.customer;
    document.getElementById('up-customer-2').textContent = state.customer;
    document.getElementById('up-3pl').textContent = state.threePL;
    document.getElementById('up-3pl-2').textContent = state.threePL;

    // Page 2 (Customer Workspace) is rendered dynamically by customer-workspace.js — no static fields to sync.

    // Page 3 (Internal Report) — guarded in case an element is absent.
    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setTxt('int-customer', state.customer);
    setTxt('int-3pl', state.threePL);
    setTxt('int-eng', state.engineer.split(' ').map((w,i,a) => i === a.length - 1 ? w[0] + '.' : w).join(' '));

    // Customer-name placeholders used across surfaces (.cust-name / .rep-3pl-name).
    document.querySelectorAll('.cust-name').forEach(e => e.textContent = state.customer);
    document.querySelectorAll('.rep-3pl-name').forEach(e => e.textContent = state.threePL);
  }

  // Wire up admin form changes
  ['adm-customer', 'adm-3pl', 'adm-email', 'adm-name'].forEach(id => {
    document.getElementById(id).addEventListener('input', syncContext);
    document.getElementById(id).addEventListener('change', syncContext);
  });

  // ===== Admin module toggle =====
  function toggleModule(el) {
    el.classList.toggle('selected');
    const mod = el.dataset.module;
    if (el.classList.contains('selected')) {
      if (!state.modules.includes(mod)) state.modules.push(mod);
    } else {
      state.modules = state.modules.filter(m => m !== mod);
    }
    syncContext();
  }

  // ===== Generate magic link =====
  function generateLink() {
    const customerSlug = state.customer.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const tplSlug = state.threePL.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const rand = Math.random().toString(36).slice(2, 8);
    state.linkId = `${customerSlug}-${tplSlug}-${rand}`;
    state.password = generatePassword();
    state.linkGenerated = true;

    document.getElementById('generated-url').textContent = `https://intake.implentio.com/u/${state.linkId}`;
    document.getElementById('generated-pw').textContent = state.password;
    document.getElementById('link-pending').style.display = 'none';
    document.getElementById('link-block').style.display = 'block';
    document.getElementById('continue-btn').disabled = false;

    // Update the generate button label to match the chosen 3PL
    document.querySelector('button[onclick="generateLink()"]').textContent = `↻ Regenerate link for ${state.threePL}`;
    syncContext();
  }

  function generatePassword() {
    const words = ['rabbit','foxtrot','prairie','harbor','meadow','tundra','ember','quartz','vellum','cipher','marlin','bramble'];
    const slug = state.customer.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const w1 = words[Math.floor(Math.random() * words.length)];
    const w2 = words[Math.floor(Math.random() * words.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${slug}-${w1}-${w2}-${num}`;
  }

  function regenPw() {
    state.password = generatePassword();
    document.getElementById('generated-pw').textContent = state.password;
  }

  function copyLink() {
    const url = document.getElementById('generated-url').textContent;
    navigator.clipboard?.writeText(`${url}\nPassword: ${state.password}`);
    showToast('Link + password copied to clipboard');
  }

  // Reflect 3PL change on the generate button label
  document.getElementById('adm-3pl').addEventListener('change', () => {
    const btn = document.querySelector('button[onclick="generateLink()"]');
    if (btn) btn.textContent = state.linkGenerated
      ? `↻ Regenerate link for ${state.threePL}`
      : `Generate upload link for ${state.threePL}`;
  });

  // ===== Upload tile clicks: open OS file picker =====
  let activeTile = null;
  document.querySelectorAll('.upload-tile').forEach(t => {
    t.addEventListener('click', (e) => {
      activeTile = t;
      document.getElementById('real-file-picker').click();
    });
  });

  function handleRealFiles(input) {
    if (!activeTile || !input.files.length) return;
    // Mark the tile as loaded and show real file names
    activeTile.classList.add('loaded');
    activeTile.querySelector('.status').textContent = `✓ ${input.files.length} file${input.files.length > 1 ? 's' : ''}`;
    const fl = activeTile.querySelector('.file-list');
    fl.innerHTML = Array.from(input.files).slice(0, 3).map(f => `${f.name} · ${(f.size/1024).toFixed(0)} KB`).join('<br>')
      + (input.files.length > 3 ? `<br>+ ${input.files.length - 3} more` : '');
    input.value = ''; // reset so the same file can be reselected
    activeTile = null;
    refreshSubmit();
  }

  // Demo helper: pretend the tiles are loaded with their pre-canned file lists
  function loadAll() {
    document.querySelectorAll('.upload-tile').forEach(t => {
      t.classList.add('loaded');
      const files = JSON.parse(t.dataset.files || '[]');
      t.querySelector('.status').textContent = `✓ ${files.length} file${files.length > 1 ? 's' : ''}`;
      const fl = t.querySelector('.file-list');
      fl.innerHTML = files.slice(0, 3).map(f => `${f.name} · ${f.size}`).join('<br>')
        + (files.length > 3 ? `<br>+ ${files.length - 3} more` : '');
    });
    refreshSubmit();
  }

  function refreshSubmit() {
    const loaded = document.querySelectorAll('.upload-tile.loaded').length;
    const total = document.querySelectorAll('.upload-tile').length;
    const btn = document.getElementById('submit-btn');
    btn.disabled = loaded < 2;
    btn.innerHTML = loaded < 2
      ? `Upload at least 2 categories (${loaded}/${total}) →`
      : `Submit for review — ${loaded} loaded →`;
  }

  // ===== Submit: simulate upload progress =====
  function startUpload() {
    const tiles = Array.from(document.querySelectorAll('.upload-tile.loaded'));
    const allFiles = [];
    tiles.forEach(t => {
      const files = JSON.parse(t.dataset.files || '[]');
      files.forEach(f => allFiles.push({ name: f.name, size: f.size, tile: t.dataset.type }));
    });

    const modal = document.getElementById('upload-modal');
    const list = document.getElementById('progress-list');
    const status = document.getElementById('modal-status');
    const pct = document.getElementById('modal-pct');
    list.innerHTML = '';

    allFiles.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'prog-row';
      row.innerHTML = `
        <span class="name" title="${f.name}">${f.name}</span>
        <div class="bar"><div class="bar-fill" id="bar-${i}"></div></div>
        <span class="pct" id="pct-${i}">0%</span>
      `;
      list.appendChild(row);
    });

    modal.classList.add('show');
    status.textContent = `0 of ${allFiles.length} files complete`;
    pct.textContent = '0%';

    // Animate progress
    let done = 0;
    const perFileDuration = Math.max(200, 1200 / allFiles.length);
    allFiles.forEach((f, i) => {
      const startDelay = i * (perFileDuration * 0.35);
      const bar = document.getElementById('bar-' + i);
      const pctEl = document.getElementById('pct-' + i);
      let p = 0;
      setTimeout(() => {
        const tick = setInterval(() => {
          p += 8 + Math.random() * 18;
          if (p >= 100) {
            p = 100;
            clearInterval(tick);
            done++;
            pctEl.parentElement.classList.add('done');
            status.textContent = `${done} of ${allFiles.length} files complete`;
            pct.textContent = `${Math.round(100 * done / allFiles.length)}%`;
            if (done === allFiles.length) {
              setTimeout(() => {
                modal.classList.remove('show');
                // Initial customer submission -> create Version 1 and enter the workspace (State 2).
                if (typeof onInitialSubmit === 'function') onInitialSubmit();
                goTo(2);
              }, 500);
            }
          }
          bar.style.width = p + '%';
          pctEl.textContent = Math.round(p) + '%';
        }, perFileDuration / 6);
      }, startDelay);
    });
  }

  // ===== Summary expand =====
  function toggleSummary(el, evt) {
    if (evt) evt.stopPropagation();
    el.classList.toggle('open');
  }

  // ===== Toast =====
  function showToast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
  }
  function sendReport() {
    showToast(`Sent to ${state.customerEmail} and 2 others`);
  }

  // ===== Init =====
  syncContext();
  refreshSubmit();
