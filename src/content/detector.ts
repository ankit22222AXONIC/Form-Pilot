export interface FieldMetadata {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  visible: boolean;
  options?: string[];
  value?: string;
}

export interface FormMetadata {
  id: string;
  name: string;
  fields: FieldMetadata[];
  action?: string;
  method?: string;
}

export interface DetectionResult {
  forms: FormMetadata[];
  totalFields: number;
  pageUrl?: string;
  pageTitle?: string;
  protocol?: string;
  hostname?: string;
}

export function startAnalysisSession(): DetectionResult {
  const detectFormsOnPage = (): DetectionResult => {
    const isVisible = (elem: HTMLElement): boolean => {
      if (!elem) return false;
      const style = window.getComputedStyle(elem);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      const rect = elem.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      return true;
    };

    const getLabelText = (field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string => {
      const ariaLabelledBy = field.getAttribute('aria-labelledby');
      if (ariaLabelledBy) {
        const labelElem = document.getElementById(ariaLabelledBy);
        if (labelElem && labelElem.textContent) return labelElem.textContent.trim();
      }
      const ariaLabel = field.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel.trim();
      if (field.id) {
        const labelElem = document.querySelector(`label[for="${CSS.escape(field.id)}"]`);
        if (labelElem && labelElem.textContent) return labelElem.textContent.trim();
      }
      const parentLabel = field.closest('label');
      if (parentLabel && parentLabel.textContent) {
        const clone = parentLabel.cloneNode(true) as HTMLElement;
        const inputInClone = clone.querySelector('input, select, textarea');
        if (inputInClone) inputInClone.remove();
        return clone.textContent?.trim() || '';
      }
      if (field.hasAttribute('placeholder')) {
        return field.getAttribute('placeholder')?.trim() || '';
      }
      return field.name || field.id || 'Unknown Field';
    };

    const getFieldType = (field: HTMLElement): string => {
      if (field.tagName.toLowerCase() === 'textarea') return 'textarea';
      if (field.tagName.toLowerCase() === 'select') return 'select';
      if (field instanceof HTMLInputElement) {
        return field.type.toLowerCase() || 'text';
      }
      return 'unknown';
    };

    const processField = (field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
      if (!isVisible(field)) return null;
      const type = getFieldType(field);
      if (type === 'hidden' || type === 'password' || type === 'submit' || type === 'button' || type === 'image') return null;

      const autocomplete = field.getAttribute('autocomplete')?.toLowerCase() || '';
      if (
        autocomplete === 'current-password' ||
        autocomplete === 'new-password' ||
        autocomplete === 'one-time-code' ||
        autocomplete === 'cc-csc'
      ) {
        return null;
      }

      let options: string[] | undefined = undefined;
      if (field instanceof HTMLSelectElement) {
        options = Array.from(field.options).map(opt => opt.value || opt.text);
      }
      if (type === 'radio' || type === 'checkbox') {
        options = [ (field as HTMLInputElement).value ];
      }

      let fieldId = field.getAttribute('data-fp-id');
      if (!fieldId) {
        fieldId = field.id || Math.random().toString(36).substr(2, 9);
        field.setAttribute('data-fp-id', fieldId);
      }

      let value = field.value;
      if (type === 'radio' || type === 'checkbox') {
        value = (field as HTMLInputElement).checked ? 'true' : 'false';
      }

      return {
        id: fieldId,
        name: field.name || field.id || '',
        label: getLabelText(field),
        type,
        required: field.required || field.hasAttribute('aria-required'),
        disabled: field.disabled,
        readonly: field.hasAttribute('readonly'),
        visible: true,
        options,
        value
      };
    };

    const forms: any[] = [];
    let totalFields = 0;

    const findElements = (root: Document | ShadowRoot | HTMLIFrameElement): { forms: HTMLFormElement[], fields: HTMLElement[] } => {
      let foundForms: HTMLFormElement[] = [];
      let foundFields: HTMLElement[] = [];
      
      try {
        let doc: Document | ShadowRoot | null = root as Document | ShadowRoot;
        if (root instanceof HTMLIFrameElement) {
          doc = root.contentDocument;
        }
        if (!doc) return { forms: [], fields: [] };

        // Get direct forms and fields
        foundForms.push(...Array.from(doc.querySelectorAll('form')));
        foundFields.push(...Array.from(doc.querySelectorAll('input, select, textarea') as NodeListOf<HTMLElement>));

        // Walk all elements to find open shadow roots and iframes
        const allElements = doc.querySelectorAll('*');
        allElements.forEach(el => {
          if (el.shadowRoot) {
            const nested = findElements(el.shadowRoot);
            foundForms.push(...nested.forms);
            foundFields.push(...nested.fields);
          } else if (el.tagName === 'IFRAME') {
            const nested = findElements(el as HTMLIFrameElement);
            foundForms.push(...nested.forms);
            foundFields.push(...nested.fields);
          }
        });
      } catch (_e) {
        // Cross-origin iframe or closed shadow root, ignore safely
      }
      return { forms: foundForms, fields: foundFields };
    };

    const { forms: allForms, fields: allFields } = findElements(document);

    allForms.forEach((form, idx) => {
      const fields: any[] = [];
      // Find fields that belong to this form
      const formFields = allFields.filter(f => f.closest('form') === form);
      
      formFields.forEach(el => {
        const fieldData = processField(el as any);
        if (fieldData) fields.push(fieldData);
      });

      if (fields.length > 0) {
        forms.push({
          id: form.id || `form-${idx}`,
          name: form.name || `Form ${idx + 1}`,
          action: form.getAttribute('action') || (form as HTMLFormElement).action || '',
          method: ((form as HTMLFormElement).method || 'GET').toUpperCase(),
          fields
        });
        totalFields += fields.length;
      }
    });

    const floatingFields: any[] = [];
    allFields.forEach(el => {
      if (!el.closest('form')) {
        const fieldData = processField(el as any);
        if (fieldData) floatingFields.push(fieldData);
      }
    });

    if (floatingFields.length > 0) {
      forms.push({
        id: 'floating-fields',
        name: 'Uncategorized Fields',
        action: '',
        method: '',
        fields: floatingFields
      });
      totalFields += floatingFields.length;
    }

    const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
    const pageTitle = typeof document !== 'undefined' ? document.title : '';
    const protocol = typeof window !== 'undefined' ? window.location.protocol : '';
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

    return { forms, totalFields, pageUrl, pageTitle, protocol, hostname };
  };

  // Setup observer
  if (!(window as any).__formPilotObserver) {
    let debounceTimer: any = null;
    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const res = detectFormsOnPage();
        try {
          if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: 'FORM_UPDATE', payload: res }).catch(() => {
              // Context invalid, popup closed. Clean up.
              observer.disconnect();
              delete (window as any).__formPilotObserver;
            });
          }
        } catch (_e) {
          observer.disconnect();
          delete (window as any).__formPilotObserver;
        }
      }, 1000);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    (window as any).__formPilotObserver = observer;

    const messageListener = (msg: any) => {
      if (msg.type === 'STOP_OBSERVING') {
        observer.disconnect();
        try {
          chrome.runtime.onMessage.removeListener(messageListener);
        } catch (_e) {}
        delete (window as any).__formPilotObserver;
      }
    };
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(messageListener);
    }
  }

  // Return initial scan immediately
  return detectFormsOnPage();
}
