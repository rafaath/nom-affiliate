'use client';

import { useEffect } from 'react';

type DraftValue = string | boolean;
type Draft = Record<string, DraftValue>;

export function FormDraftPersistence({
  formId,
  hasError,
  storageKey,
  clearOnSuccess = false,
}: {
  formId: string;
  hasError: boolean;
  storageKey: string;
  clearOnSuccess?: boolean;
}) {
  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;

    const submittedKey = `${storageKey}:submitted`;

    if (clearOnSuccess && !hasError && sessionStorage.getItem(submittedKey) === '1') {
      sessionStorage.removeItem(storageKey);
      sessionStorage.removeItem(submittedKey);
      return;
    }

    restoreDraft(form, storageKey);

    const save = () => saveDraft(form, storageKey);
    const onSubmit = () => {
      saveDraft(form, storageKey);
      sessionStorage.setItem(submittedKey, '1');
    };

    form.addEventListener('input', save);
    form.addEventListener('change', save);
    form.addEventListener('submit', onSubmit);

    return () => {
      form.removeEventListener('input', save);
      form.removeEventListener('change', save);
      form.removeEventListener('submit', onSubmit);
    };
  }, [clearOnSuccess, formId, hasError, storageKey]);

  return null;
}

function saveDraft(form: HTMLFormElement, storageKey: string) {
  const draft: Draft = {};
  const controls = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input[name], textarea[name], select[name]'
  );

  controls.forEach((control) => {
    if (control instanceof HTMLInputElement && control.type === 'password') return;
    if (control instanceof HTMLInputElement && control.type === 'checkbox') {
      draft[control.name] = control.checked;
      return;
    }

    draft[control.name] = control.value;
  });

  sessionStorage.setItem(storageKey, JSON.stringify(draft));
}

function restoreDraft(form: HTMLFormElement, storageKey: string) {
  const rawDraft = sessionStorage.getItem(storageKey);
  if (!rawDraft) return;

  let draft: Draft;
  try {
    draft = JSON.parse(rawDraft) as Draft;
  } catch {
    sessionStorage.removeItem(storageKey);
    return;
  }

  for (const [name, value] of Object.entries(draft)) {
    const controls = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      `[name="${CSS.escape(name)}"]`
    );

    controls.forEach((control) => {
      if (control instanceof HTMLInputElement && control.type === 'password') return;
      if (control instanceof HTMLInputElement && control.type === 'checkbox') {
        control.checked = value === true;
        return;
      }

      control.value = String(value ?? '');
    });
  }
}
