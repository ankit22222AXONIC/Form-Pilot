/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { executeAutofill } from './autofill';
import type { AutofillOperation } from '../shared/types';

describe('Autofill Execution', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    HTMLElement.prototype.getBoundingClientRect = () => ({
      width: 100, height: 20, top: 0, left: 0, bottom: 20, right: 100, x: 0, y: 0, toJSON: () => {}
    });
  });

  it('successfully fills a text input', () => {
    document.body.innerHTML = `<input type="text" data-fp-id="f1" />`;
    const ops: AutofillOperation[] = [{ fieldId: 'f1', value: 'John Doe' }];
    
    const results = executeAutofill(ops);
    
    expect(results.length).toBe(1);
    expect(results[0].success).toBe(true);
    
    const input = document.querySelector('input')!;
    expect(input.value).toBe('John Doe');
  });

  it('fails if element is not found', () => {
    const ops: AutofillOperation[] = [{ fieldId: 'f1', value: 'John Doe' }];
    
    const results = executeAutofill(ops);
    
    expect(results[0].success).toBe(false);
    expect(results[0].reason).toContain('no longer exists');
  });

  it('rejects disabled or readonly inputs', () => {
    document.body.innerHTML = `
      <input type="text" data-fp-id="f1" disabled />
      <input type="text" data-fp-id="f2" readonly />
    `;
    
    const ops: AutofillOperation[] = [
      { fieldId: 'f1', value: 'John' },
      { fieldId: 'f2', value: 'Doe' }
    ];
    
    const results = executeAutofill(ops);
    
    expect(results[0].success).toBe(false);
    expect(results[0].reason).toContain('disabled or readonly');
    expect(results[1].success).toBe(false);
    expect(results[1].reason).toContain('disabled or readonly');
  });

  it('rejects hidden or password inputs', () => {
    document.body.innerHTML = `
      <input type="hidden" data-fp-id="f1" />
      <input type="password" data-fp-id="f2" />
    `;
    
    const ops: AutofillOperation[] = [
      { fieldId: 'f1', value: 'John' },
      { fieldId: 'f2', value: 'secret' }
    ];
    
    const results = executeAutofill(ops);
    
    expect(results[0].success).toBe(false);
    expect(results[0].reason).toContain('Unsupported or unsafe');
    expect(results[1].success).toBe(false);
    expect(results[1].reason).toContain('Unsupported or unsafe');
  });

  it('fills select dropdowns if option exists', () => {
    document.body.innerHTML = `
      <select data-fp-id="f1">
        <option value="US">United States</option>
        <option value="UK">United Kingdom</option>
      </select>
    `;
    
    const select = document.querySelector('select')!;
    
    // Match by value
    let results = executeAutofill([{ fieldId: 'f1', value: 'UK' }]);
    expect(results[0].success).toBe(true);
    expect(select.value).toBe('UK');
    
    // Match by text
    results = executeAutofill([{ fieldId: 'f1', value: 'United States' }]);
    expect(results[0].success).toBe(true);
    expect(select.value).toBe('US');
    
    // Fails on no match
    results = executeAutofill([{ fieldId: 'f1', value: 'Canada' }]);
    expect(results[0].success).toBe(false);
    expect(results[0].reason).toContain('not found');
  });

  it('handles radio buttons correctly', () => {
    document.body.innerHTML = `<input type="radio" data-fp-id="f1" value="Male" />`;
    const radio = document.querySelector('input')!;
    
    let results = executeAutofill([{ fieldId: 'f1', value: 'Male' }]);
    expect(results[0].success).toBe(true);
    expect(radio.checked).toBe(true);
    
    radio.checked = false;
    
    results = executeAutofill([{ fieldId: 'f1', value: 'Female' }]);
    expect(results[0].success).toBe(false);
    expect(radio.checked).toBe(false);
  });

  it('rejects checkboxes', () => {
    document.body.innerHTML = `<input type="checkbox" data-fp-id="f1" />`;
    const results = executeAutofill([{ fieldId: 'f1', value: 'true' }]);
    
    expect(results[0].success).toBe(false);
    expect(results[0].reason).toContain('Checkboxes require manual');
  });

  it('falls back to element ID or Name when data-fp-id is missing (SPA re-render)', () => {
    document.body.innerHTML = `<input type="text" id="spa-field" />`;
    const results = executeAutofill([{ fieldId: 'spa-field', value: 'fallback-value' }]);
    expect(results[0].success).toBe(true);
    
    const input = document.getElementById('spa-field') as HTMLInputElement;
    expect(input.value).toBe('fallback-value');
  });

  it('rejects targeting non-form elements like div or button', () => {
    document.body.innerHTML = `<div data-fp-id="not-input">Click me</div>`;
    const results = executeAutofill([{ fieldId: 'not-input', value: 'hacked' }]);
    expect(results[0].success).toBe(false);
    expect(results[0].reason).toContain('not a form input control');
  });

  it('blocks autofill on sensitive autocomplete attributes (OTP and CVV)', () => {
    document.body.innerHTML = `
      <input type="text" data-fp-id="otp-field" autocomplete="one-time-code" />
      <input type="text" data-fp-id="cvv-field" autocomplete="cc-csc" />
    `;
    const results = executeAutofill([
      { fieldId: 'otp-field', value: '123456' },
      { fieldId: 'cvv-field', value: '999' }
    ]);
    expect(results[0].success).toBe(false);
    expect(results[0].reason).toContain('sensitive authentication or payment');
    expect(results[1].success).toBe(false);
    expect(results[1].reason).toContain('sensitive authentication or payment');
  });

  it('blocks autofill on forms with dangerous javascript: or data: actions', () => {
    document.body.innerHTML = `
      <form action="javascript:stealData()">
        <input type="text" data-fp-id="js-action-field" />
      </form>
      <form action="data:text/html,<script>steal()</script>">
        <input type="text" data-fp-id="data-action-field" />
      </form>
    `;
    const results = executeAutofill([
      { fieldId: 'js-action-field', value: 'secret' },
      { fieldId: 'data-action-field', value: 'secret' }
    ]);
    expect(results[0].success).toBe(false);
    expect(results[0].reason).toContain('dangerous script/data action URL');
    expect(results[1].success).toBe(false);
    expect(results[1].reason).toContain('dangerous script/data action URL');
  });

  it('blocks autofill when target element is hidden with display:none or visibility:hidden', () => {
    document.body.innerHTML = `
      <input type="text" data-fp-id="hidden-field-1" style="display:none" />
      <input type="text" data-fp-id="hidden-field-2" style="visibility:hidden" />
    `;
    const results = executeAutofill([
      { fieldId: 'hidden-field-1', value: 'val1' },
      { fieldId: 'hidden-field-2', value: 'val2' }
    ]);
    expect(results[0].success).toBe(false);
    expect(results[0].reason).toContain('hidden, collapsed, or invisible');
    expect(results[1].success).toBe(false);
    expect(results[1].reason).toContain('hidden, collapsed, or invisible');
  });
});
