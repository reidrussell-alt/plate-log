import { state, saveData, migrateToLatest, applyImportedData } from './data.js';
import { PROGRAM_TEMPLATES, buildProgramFromTemplate } from './programTemplates.js';
import { showToast } from './utils.js';

const onboardingData = {};

export function showOnboarding() {
  const container = document.getElementById('onboardingContainer');
  if (!container) return;
  container.classList.add('active');
  renderStep(welcomeStepHtml());
}

export function hideOnboarding() {
  const container = document.getElementById('onboardingContainer');
  if (container) container.classList.remove('active');
}

function renderStep(html) {
  document.getElementById('onboardingBody').innerHTML = html;
}

function welcomeStepHtml() {
  return `
    <div class="ob-step">
      <div class="ob-big-icon">🏋️</div>
      <h1 class="ob-title">Welcome to<br>Lift Tracker</h1>
      <p class="ob-sub">Let's get you set up in a few quick steps.</p>
      <button class="ob-btn-primary" onclick="obGoTo('name')">Get Started</button>
    </div>
  `;
}

function nameStepHtml() {
  return `
    <div class="ob-step">
      <div class="ob-step-num">1 of 3</div>
      <h2 class="ob-title">What's your name?</h2>
      <input type="text" id="obNameInput" class="ob-input" placeholder="Your name"
             value="${onboardingData.name || ''}" maxlength="40" autocomplete="given-name">
      <button class="ob-btn-primary" onclick="obGoTo('mode')">Continue</button>
    </div>
  `;
}

function modeStepHtml() {
  return `
    <div class="ob-step">
      <div class="ob-step-num">2 of 3</div>
      <h2 class="ob-title">How do you train?</h2>
      <div class="ob-mode-options">
        <div class="ob-mode-option" onclick="obSelectMode('structured')">
          <div class="ob-mode-icon">📋</div>
          <div class="ob-mode-title">Structured Plan</div>
          <div class="ob-mode-desc">Set up a weekly schedule with specific exercises for each day</div>
        </div>
        <div class="ob-mode-option" onclick="obSelectMode('trackAsYouGo')">
          <div class="ob-mode-icon">⚡</div>
          <div class="ob-mode-title">Track As You Go</div>
          <div class="ob-mode-desc">Log whatever you do each session — no preset schedule needed</div>
        </div>
      </div>
      <div class="ob-import-link">
        <a href="#" onclick="obGoTo('import')">Already have data? Import it →</a>
      </div>
    </div>
  `;
}

function templateStepHtml() {
  const templateCards = PROGRAM_TEMPLATES.map(t => `
    <div class="ob-template-card" onclick="obSelectTemplate('${t.id}')">
      <div class="ob-template-header">
        <div class="ob-template-name">${t.name}</div>
        <div class="ob-template-days-badge">${t.daysPerWeek}×/wk</div>
      </div>
      <div class="ob-template-desc">${t.description}</div>
      <div class="ob-day-chips">
        ${t.days.slice(0, 4).map(d => `<span class="ob-day-chip">${d.name}</span>`).join('')}
        ${t.days.length > 4 ? `<span class="ob-day-chip ob-day-chip--more">+${t.days.length - 4}</span>` : ''}
      </div>
    </div>
  `).join('');

  return `
    <div class="ob-step">
      <div class="ob-step-num">3 of 3</div>
      <h2 class="ob-title">Choose a template</h2>
      <p class="ob-sub">Pick a program to start with. You can always switch in Settings.</p>
      <div class="ob-templates-list">${templateCards}</div>
      <button class="ob-btn-secondary" onclick="obGoTo('mode')">← Back</button>
    </div>
  `;
}

function trackConfirmStepHtml() {
  return `
    <div class="ob-step">
      <div class="ob-step-num">3 of 3</div>
      <div class="ob-big-icon" style="margin: 24px 0;">⚡</div>
      <h2 class="ob-title">Ready to track!</h2>
      <p class="ob-sub">Log workouts as you go. After you've built up some history, you can create a structured plan from Settings.</p>
      <button class="ob-btn-primary" onclick="obFinish('trackAsYouGo', null)">Start Tracking</button>
      <button class="ob-btn-secondary" onclick="obGoTo('mode')">← Back</button>
    </div>
  `;
}

function importStepHtml() {
  return `
    <div class="ob-step">
      <h2 class="ob-title">Import Your Data</h2>
      <p class="ob-sub">Upload a JSON backup file to restore your history.</p>
      <input type="file" id="obImportFile" accept=".json,application/json" class="file-input-hidden">
      <button class="ob-btn-secondary" style="width:100%;margin-bottom:12px;"
              onclick="document.getElementById('obImportFile').click()">Choose File</button>
      <div id="obImportFileName" class="ob-import-filename"></div>
      <button class="ob-btn-primary" onclick="obProcessImport()">Import & Continue</button>
      <button class="ob-btn-secondary" onclick="obGoTo('mode')">← Back</button>
    </div>
  `;
}

export function obGoTo(step) {
  if (step === 'name') {
    renderStep(nameStepHtml());
    setTimeout(() => document.getElementById('obNameInput')?.focus(), 80);
  } else if (step === 'mode') {
    const nameInput = document.getElementById('obNameInput');
    if (nameInput) {
      const name = nameInput.value.trim();
      if (!name) { showToast('Please enter your name'); return; }
      onboardingData.name = name;
    }
    renderStep(modeStepHtml());
  } else if (step === 'structured') {
    renderStep(templateStepHtml());
  } else if (step === 'trackAsYouGo') {
    renderStep(trackConfirmStepHtml());
  } else if (step === 'import') {
    renderStep(importStepHtml());
    setTimeout(() => {
      const fi = document.getElementById('obImportFile');
      if (fi) fi.onchange = e => {
        const f = e.target.files[0];
        if (f) document.getElementById('obImportFileName').textContent = f.name;
      };
    }, 50);
  }
}

export function obSelectMode(mode) {
  if (mode === 'structured') obGoTo('structured');
  else obGoTo('trackAsYouGo');
}

export function obSelectTemplate(templateId) {
  const template = PROGRAM_TEMPLATES.find(t => t.id === templateId);
  if (template) obFinish('structured', template);
}

export function obFinish(mode, template) {
  const name = onboardingData.name || 'Athlete';

  state.profile = {
    name,
    createdAt: new Date().toISOString(),
    trainingMode: mode
  };

  if (mode === 'structured' && template) {
    state.programs = [buildProgramFromTemplate(template.name, template, true)];
  } else {
    state.programs = [];
  }

  state.history = [];
  saveData();
  hideOnboarding();
  window.switchTab('home');
  window.showWelcomeScreen();
}

export function obProcessImport() {
  const fi = document.getElementById('obImportFile');
  if (!fi || !fi.files[0]) { showToast('Please choose a file first'); return; }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      let data = JSON.parse(e.target.result);
      if (!data.history || !Array.isArray(data.history)) {
        showToast('Invalid backup file');
        return;
      }
      data = migrateToLatest(data);
      const name = onboardingData.name;
      if (name && data.profile) data.profile.name = name;

      applyImportedData(data);

      showToast(`Imported ${data.history.length} sessions`, 'success');
      hideOnboarding();
      window.switchTab('home');
      window.showWelcomeScreen();
    } catch (err) {
      showToast('Error reading file. Check the format.');
    }
  };
  reader.readAsText(fi.files[0]);
}
