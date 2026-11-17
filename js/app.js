import { loadData, exportData, importData, confirmReset, openResetModal, closeResetModal } from './data.js';
import { showWelcomeScreen } from './welcome.js';
import { renderProgress, updateMuscleGroupExercise, setChartRange, toggleHistoryBlock } from './progress.js';
import { navigateCalendar, openCalendarDay, closeCalendarDay, openManualWorkoutSelect, _liveSessionIdx } from './calendar.js';
import { openEditModal, closeEditModal, saveEdit, deleteEditSession, openSessionEdit, closeSessionEdit, saveSessionEdit, sessionEditDeleteExercise, sessionEditDeleteSet, deleteSession } from './historyEdit.js';
import { startSession, startTrackAsYouGoWorkout, abandonSession, finishSession, confirmFinishSession, closeModal, updateSessionDate, updateSet, toggleNote, toggleSetLogged, addSet, removeExercise, updateExerciseNote, showExercisePicker, renderSession, leaveSession, toggleReorderMode, startManualEntry, showExerciseOptions, closeExerciseOptions, replaceExercise, removeSet, openExercise } from './session.js';
import { updateSessionBanner, hideSessionBanner, resumeSession } from './sessionBanner.js';
import { renderSettings, editProfileName, switchTrainingMode, toggleRestTimer, onRestDurationChange, toggleRestAlert, connectHealth, toggleHealthEnabled, toggleHealthSteps, toggleHealthWeight } from './settings.js';
import { initRestTimer, pauseTimer, skipTimer, resetTimer, toggleTimerExpanded, updatePillVisibility, reconcileTimer } from './restTimer.js';
import { initHealthKit } from './healthkit.js';
import { showOnboarding, hideOnboarding, obGoTo, obSelectMode, obSelectTemplate, obFinish, obProcessImport } from './onboarding.js';
import { openExerciseSelector, closeExerciseSelector, exSelFilterMuscle, exSelSearch, exSelPickExercise, exSelShowCreate, exSelCancelCreate, exSelConfirmCreate } from './exerciseSelector.js';
import { showProgramBuilder, closeProgramBuilder, pbUpdateName, pbSelectDayCount, pbToggleDay, pbSetDayName, pbAddExercise, pbEditExercise, pbRemoveExercise, pbSetRepType, pbSaveProgram, pbConfirmSetsReps, pbCancelSetsReps, pbIncrSets, pbDecrSets, pbIncrRepMin, pbDecrRepMin, pbIncrRepMax, pbDecrRepMax, pbIncrFixed, pbDecrFixed } from './programBuilder.js';
import { renderHome, homeStartWorkout, homeOpenYesterday } from './home.js';
import { showBackgroundPicker, closeBackgroundPicker, setBackgroundTab, selectBackground, saveBackground } from './backgroundPicker.js';
import { showProfilePhotoOptions, closeProfilePhotoOptions, pickProfilePhoto, removeProfilePhoto, zoomPhotoCrop, cancelPhotoCrop, confirmPhotoCrop } from './profilePhoto.js';
import { renderMyPlans, showCreatePlanSheet, myPlansToggleActions } from './myplans.js';
import { setActiveProgram, deleteProgram, duplicateProgram, duplicateTemplate } from './programActions.js';
import { state } from './data.js';

function switchTab(tab) {
  // Backward compat: 'plan' → 'myPlans', 'settings' → 'profile'
  if (tab === 'plan') tab = 'myPlans';
  if (tab === 'settings') tab = 'profile';

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  if (tab === 'session') {
    document.getElementById('sessionPage').classList.add('active');
    hideSessionBanner();
    renderSession();
    updatePillVisibility();
    return;
  }

  const tabEl = document.querySelector(`.tab[data-tab="${tab}"]`);
  if (tabEl) tabEl.classList.add('active');

  if (tab === 'home') {
    document.getElementById('homePage').classList.add('active');
    renderHome();
  } else if (tab === 'myPlans') {
    document.getElementById('myPlansPage').classList.add('active');
    renderMyPlans();
  } else if (tab === 'progress') {
    document.getElementById('progressPage').classList.add('active');
    renderProgress();
  } else if (tab === 'profile') {
    document.getElementById('settingsPage').classList.add('active');
    renderSettings();
  }

  updateSessionBanner();
  updatePillVisibility();
}

// All window bindings — the only place inline onclick handlers can reach these functions
window.switchTab = switchTab;
window.renderHome = renderHome;
window.renderMyPlans = renderMyPlans;
window.homeStartWorkout = homeStartWorkout;
window.homeOpenYesterday = homeOpenYesterday;
window.showCreatePlanSheet = showCreatePlanSheet;
window.myPlansToggleActions = myPlansToggleActions;

window.startSession = startSession;
window.startTrackAsYouGoWorkout = startTrackAsYouGoWorkout;
window.abandonSession = abandonSession;
window.finishSession = finishSession;
window.confirmFinishSession = confirmFinishSession;
window.closeModal = closeModal;
window.updateSessionDate = updateSessionDate;
window.updateSet = updateSet;
window.toggleNote = toggleNote;
window.toggleSetLogged = toggleSetLogged;
window.addSet = addSet;
window.removeExercise = removeExercise;
window.showExerciseOptions = showExerciseOptions;
window.closeExerciseOptions = closeExerciseOptions;
window.replaceExercise = replaceExercise;
window.removeSet = removeSet;
window.updateExerciseNote = updateExerciseNote;
window.showExercisePicker = showExercisePicker;

window.renderProgress = renderProgress;
window.updateMuscleGroupExercise = updateMuscleGroupExercise;
window.setChartRange = setChartRange;
window.toggleHistoryBlock = toggleHistoryBlock;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveEdit = saveEdit;
window.deleteEditSession = deleteEditSession;
window.navigateCalendar = navigateCalendar;
window.openCalendarDay = openCalendarDay;
window.closeCalendarDay = closeCalendarDay;
window.openManualWorkoutSelect = openManualWorkoutSelect;
window.openSessionEdit = openSessionEdit;
window.closeSessionEdit = closeSessionEdit;
window.saveSessionEdit = saveSessionEdit;
window.sessionEditDeleteExercise = sessionEditDeleteExercise;
window.sessionEditDeleteSet = sessionEditDeleteSet;
window.deleteSession = deleteSession;
window._liveSessionIdx = _liveSessionIdx;

window.exportData = exportData;
window.importData = (event) => importData(event, () => { renderMyPlans(); renderSettings(); });
window.openResetModal = openResetModal;
window.closeResetModal = closeResetModal;
window.confirmReset = () => { confirmReset(); switchTab('home'); };

window.renderSettings = renderSettings;
window.showProfilePhotoOptions = showProfilePhotoOptions;
window.closeProfilePhotoOptions = closeProfilePhotoOptions;
window.pickProfilePhoto = pickProfilePhoto;
window.removeProfilePhoto = removeProfilePhoto;
window.zoomPhotoCrop = zoomPhotoCrop;
window.cancelPhotoCrop = cancelPhotoCrop;
window.confirmPhotoCrop = confirmPhotoCrop;
window.showBackgroundPicker = showBackgroundPicker;
window.closeBackgroundPicker = () => closeBackgroundPicker();
window.setBackgroundTab = setBackgroundTab;
window.selectBackground = selectBackground;
window.saveBackground = saveBackground;
window.editProfileName = editProfileName;
window.switchTrainingMode = switchTrainingMode;
window.setActiveProgram = setActiveProgram;
window.deleteProgram = deleteProgram;
window.duplicateProgram = duplicateProgram;
window.duplicateTemplate = duplicateTemplate;

window.openExerciseSelector = openExerciseSelector;
window.closeExerciseSelector = closeExerciseSelector;
window.exSelFilterMuscle = exSelFilterMuscle;
window.exSelSearch = exSelSearch;
window.exSelPickExercise = exSelPickExercise;
window.exSelShowCreate = exSelShowCreate;
window.exSelCancelCreate = exSelCancelCreate;
window.exSelConfirmCreate = exSelConfirmCreate;

window.showProgramBuilder = showProgramBuilder;
window.closeProgramBuilder = closeProgramBuilder;
window.pbUpdateName = pbUpdateName;
window.pbSelectDayCount = pbSelectDayCount;
window.pbToggleDay = pbToggleDay;
window.pbSetDayName = pbSetDayName;
window.pbAddExercise = pbAddExercise;
window.pbEditExercise = pbEditExercise;
window.pbRemoveExercise = pbRemoveExercise;
window.pbSetRepType = pbSetRepType;
window.pbSaveProgram = pbSaveProgram;
window.pbConfirmSetsReps = pbConfirmSetsReps;
window.pbCancelSetsReps = pbCancelSetsReps;
window.pbIncrSets = pbIncrSets;
window.pbDecrSets = pbDecrSets;
window.pbIncrRepMin = pbIncrRepMin;
window.pbDecrRepMin = pbDecrRepMin;
window.pbIncrRepMax = pbIncrRepMax;
window.pbDecrRepMax = pbDecrRepMax;
window.pbIncrFixed = pbIncrFixed;
window.pbDecrFixed = pbDecrFixed;

window.toggleRestTimer = toggleRestTimer;
window.onRestDurationChange = onRestDurationChange;
window.toggleRestAlert = toggleRestAlert;
window.connectHealth = connectHealth;
window.toggleHealthEnabled = toggleHealthEnabled;
window.toggleHealthSteps = toggleHealthSteps;
window.toggleHealthWeight = toggleHealthWeight;
window.pauseTimer = pauseTimer;
window.skipTimer = skipTimer;
window.resetTimer = resetTimer;
window.toggleTimerExpanded = toggleTimerExpanded;

window.showOnboarding = showOnboarding;
window.hideOnboarding = hideOnboarding;
window.obGoTo = obGoTo;
window.obSelectMode = obSelectMode;
window.obSelectTemplate = obSelectTemplate;
window.obFinish = obFinish;
window.obProcessImport = obProcessImport;

window.showWelcomeScreen = showWelcomeScreen;

window.resumeSession = resumeSession;
window.leaveSession = leaveSession;
window.toggleReorderMode = toggleReorderMode;
window.openExercise = openExercise;
window.startManualEntry = startManualEntry;

// Register service worker (skipped on localhost)
if ('serviceWorker' in navigator && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});

  // When a new SW takes control, reload to pick up the fresh cache
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

loadData();
initRestTimer();
initHealthKit().catch(() => {});

if (state.currentSession) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('sessionPage').classList.add('active');
  renderSession();
} else if (!state.profile) {
  // New users get the same welcome screen; its button opens the setup steps
  showWelcomeScreen(showOnboarding);
} else {
  switchTab('home');
  showWelcomeScreen();
}

window.addEventListener('resize', () => {
  if (document.getElementById('progressPage').classList.contains('active')) {
    renderProgress();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') reconcileTimer();
});
