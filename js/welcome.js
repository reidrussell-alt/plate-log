import { state } from './data.js';

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getWelcomeWorkoutLabel() {
  if (!state.profile) return "TODAY'S SESSION";
  if (state.profile.trainingMode === 'trackAsYouGo') return "TODAY'S WORKOUT";

  const activeProgram = state.programs.find(p => p.isActive);
  if (!activeProgram || !activeProgram.days.length) return "TODAY'S SESSION";

  if (!state.history.length) return activeProgram.days[0].name.toUpperCase();

  const lastDayId = state.history[state.history.length - 1].dayId;
  const dayIds = activeProgram.days.map(d => d.id);
  const lastIdx = dayIds.indexOf(lastDayId);
  if (lastIdx === -1) return activeProgram.days[0].name.toUpperCase();
  return activeProgram.days[(lastIdx + 1) % dayIds.length].name.toUpperCase();
}

export function showWelcomeScreen() {
  const el = document.getElementById('welcomeScreen');
  if (!el) return;

  const greeting = getGreeting();
  const workoutLabel = getWelcomeWorkoutLabel();
  const name = state.profile?.name || '';

  el.innerHTML = `
    <div class="welcome-progress"></div>
    <div class="welcome-inner">
      <div class="welcome-logo-wrap">
        <div class="welcome-logo">
          <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <!-- Weight plate mark, matches the home-screen icon -->
            <circle cx="30" cy="30" r="27" fill="#d9342b"/>
            <circle cx="30" cy="30" r="20.5" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.2"/>
            <circle cx="30" cy="30" r="8" fill="#fff"/>
            <circle cx="30" cy="30" r="3.4" fill="#d9342b"/>
            <rect x="25.5" y="6.5" width="9" height="4.2" rx="2.1" fill="#fff"/>
            <rect x="25.5" y="49.3" width="9" height="4.2" rx="2.1" fill="#fff"/>
          </svg>
        </div>
      </div>
      <div class="welcome-content">
        <div class="welcome-greeting">
          <span class="welcome-greeting-text">${greeting}${name ? ',' : '.'}</span>
          ${name ? `<br><span class="welcome-name">${name}.</span>` : ''}
        </div>
        <div class="welcome-tagline">Let's get after it.</div>
        <div class="welcome-label-wrap">
          <span class="welcome-label-line"></span>
          <span class="welcome-label">${workoutLabel}</span>
          <span class="welcome-label-line"></span>
        </div>
      </div>
      <div class="welcome-hint">Tap to continue</div>
    </div>
  `;

  el.classList.add('visible');

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(autoDismiss);
    el.classList.add('fading');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  };

  const autoDismiss = setTimeout(dismiss, 2500);
  el.addEventListener('click', dismiss, { once: true });
}
