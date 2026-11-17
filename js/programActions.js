// Program management actions used by My Plans (switch, delete, duplicate a
// program or template) and the custom-program limit. Bound to window in app.js.
import { state, saveData } from './data.js';
import { PROGRAM_TEMPLATES, buildProgramFromTemplate } from './programTemplates.js';
import { showToast, showConfirm } from './utils.js';

export const MAX_CUSTOM_PROGRAMS = 5;

export function setActiveProgram(programId) {
  const prog = state.programs.find(p => p.id === programId);
  if (!prog) return;
  const current = state.programs.find(p => p.isActive);
  const currentName = current ? current.name : '';
  const msg = currentName
    ? `Switch to "${prog.name}"?\n\nThis will replace "${currentName}" on the Plan tab.\n\nYour workout history will be preserved.`
    : `Activate "${prog.name}"?`;
  showConfirm(msg, () => {
    state.programs.forEach(p => { p.isActive = false; });
    prog.isActive = true;
    saveData();
    window.renderMyPlans();
    showToast(`Activated: ${prog.name}`, 'success');
  }, 'Activate');
}

export function deleteProgram(programId) {
  const prog = state.programs.find(p => p.id === programId);
  if (!prog) return;
  if (prog.isActive) {
    showToast('Cannot delete active program. Switch to another first.');
    return;
  }
  showConfirm(
    `Delete "${prog.name}"?\n\nThis will permanently delete the program and all its workout days.\n\nYour workout history will NOT be deleted.\n\nThis cannot be undone.`,
    () => {
      state.programs = state.programs.filter(p => p.id !== programId);
      saveData();
      window.renderMyPlans();
      showToast(`Deleted: ${prog.name}`);
    },
    'Delete'
  );
}

// True (after a toast) when the custom-program limit is reached.
function _atCustomLimit() {
  const customCount = state.programs.filter(p => p.isCustom === true).length;
  if (customCount >= MAX_CUSTOM_PROGRAMS) {
    showToast(`Max ${MAX_CUSTOM_PROGRAMS} custom programs. Delete one first.`);
    return true;
  }
  return false;
}

export function duplicateProgram(programId) {
  const prog = state.programs.find(p => p.id === programId);
  if (!prog) return;

  if (_atCustomLimit()) return;

  const copyName = `${prog.name} (Copy)`;
  showConfirm(
    `Create a copy of "${prog.name}"?\n\nThe copy will be saved as "${copyName}".\n\nYou can rename it after creation.`,
    () => {
      const copy = JSON.parse(JSON.stringify(prog));
      copy.id = `program_${Date.now()}`;
      copy.name = copyName;
      copy.isActive = false;
      copy.isCustom = true;
      copy.templateId = null;
      copy.createdAt = new Date().toISOString();
      state.programs.push(copy);
      saveData();
      window.renderMyPlans();
      showToast(`Duplicated: ${copyName}`, 'success');
    },
    'Duplicate'
  );
}

export function duplicateTemplate(templateId) {
  const template = PROGRAM_TEMPLATES.find(t => t.id === templateId);
  if (!template) return;

  if (_atCustomLimit()) return;

  const copyName = `${template.name} (Copy)`;
  showConfirm(
    `Create a copy of "${template.name}"?\n\nThe copy will be saved as "${copyName}" and added to your custom programs.`,
    () => {
      const copy = buildProgramFromTemplate(copyName, template, false, true);
      state.programs.push(copy);
      saveData();
      window.renderMyPlans();
      showToast(`Duplicated: ${copyName}`, 'success');
    },
    'Duplicate'
  );
}
