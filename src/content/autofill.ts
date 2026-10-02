import type { AutofillOperation, AutofillResult } from '../shared/types';

function isElementVisible(elem: HTMLElement): boolean {
  if (!elem || !elem.isConnected) return false;
  if (elem.hidden || elem.style.display === 'none' || elem.style.visibility === 'hidden') return false;
  if (typeof window !== 'undefined' && window.getComputedStyle) {
    const style = window.getComputedStyle(elem);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  }
  return true;
}

export function executeAutofill(operations: AutofillOperation[]): AutofillResult[] {
  const results: AutofillResult[] = [];

  for (const op of operations) {
    try {
      // Escape fieldId to prevent CSS selector injection from malicious pages
      const escapedId = CSS.escape(op.fieldId);
      let element = document.querySelector(`[data-fp-id="${escapedId}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      
      if (!element) {
        // Fallback: try by standard id or name (useful for SPAs that re-render and lose data-fp-id)
        element = document.getElementById(op.fieldId) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (!element) {
           const byName = document.getElementsByName(op.fieldId);
           if (byName.length > 0) element = byName[0] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        }
      }

      if (!element) {
        results.push({ fieldId: op.fieldId, success: false, reason: 'Field no longer exists in DOM' });
        continue;
      }

      if (!element.isConnected) {
        results.push({ fieldId: op.fieldId, success: false, reason: 'Field is not attached to DOM' });
        continue;
      }

      if (element.disabled || ('readOnly' in element && (element as any).readOnly)) {
        results.push({ fieldId: op.fieldId, success: false, reason: 'Field is disabled or readonly' });
        continue;
      }

      const tagName = element.tagName.toLowerCase();
      if (tagName !== 'input' && tagName !== 'select' && tagName !== 'textarea') {
        results.push({ fieldId: op.fieldId, success: false, reason: 'Target element is not a form input control' });
        continue;
      }

      const type = element.type ? element.type.toLowerCase() : '';
      if (type === 'hidden' || type === 'password') {
        results.push({ fieldId: op.fieldId, success: false, reason: 'Unsupported or unsafe field type' });
        continue;
      }

      const autocomplete = element.getAttribute('autocomplete')?.toLowerCase() || '';
      if (
        autocomplete === 'current-password' ||
        autocomplete === 'new-password' ||
        autocomplete === 'one-time-code' ||
        autocomplete === 'cc-csc'
      ) {
        results.push({ fieldId: op.fieldId, success: false, reason: 'Autofill blocked on sensitive authentication or payment field' });
        continue;
      }

      const form = element.closest('form');
      if (form) {
        const action = form.getAttribute('action')?.trim().toLowerCase() || '';
        if (action.startsWith('javascript:') || action.startsWith('data:')) {
          results.push({ fieldId: op.fieldId, success: false, reason: 'Enclosing form has dangerous script/data action URL' });
          continue;
        }
      }

      if (!isElementVisible(element)) {
        results.push({ fieldId: op.fieldId, success: false, reason: 'Field is hidden, collapsed, or invisible in DOM' });
        continue;
      }

      // Check if value already exists and we shouldn't silently overwrite
      // We assume if it reaches here, the user explicitly approved it via the popup.

      if (tagName === 'select') {
        const select = element as HTMLSelectElement;
        let matched = false;
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].value === op.value || select.options[i].text === op.value) {
            select.selectedIndex = i;
            matched = true;
            break;
          }
        }
        if (!matched) {
          results.push({ fieldId: op.fieldId, success: false, reason: 'Dropdown option not found' });
          continue;
        }
      } else if (type === 'radio') {
        // Radio logic: the op.fieldId might point to a specific radio button, or we might need to find the radio with the value
        const radio = element as HTMLInputElement;
        if (radio.value === op.value || op.value.toLowerCase() === 'true') {
          radio.checked = true;
        } else {
           results.push({ fieldId: op.fieldId, success: false, reason: 'Radio value mismatch' });
           continue;
        }
      } else if (type === 'checkbox') {
         // Should not automatically check checkboxes unless specifically requested
         results.push({ fieldId: op.fieldId, success: false, reason: 'Checkboxes require manual user interaction' });
         continue;
      } else {
        // Native React setter workaround
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;

        if (tagName === 'textarea' && nativeTextAreaValueSetter) {
            nativeTextAreaValueSetter.call(element, op.value);
        } else if (nativeInputValueSetter) {
            nativeInputValueSetter.call(element, op.value);
        } else {
            element.value = op.value;
        }
      }

      // Dispatch events for framework-managed inputs
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));

      results.push({ fieldId: op.fieldId, success: true });
    } catch (err: any) {
      results.push({ fieldId: op.fieldId, success: false, reason: err.message });
    }
  }

  return results;
}
