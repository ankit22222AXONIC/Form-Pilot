/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { startAnalysisSession } from './detector';

describe('Form Detector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    delete (window as any).__formPilotObserver;
    (globalThis as any).chrome = {
      runtime: {
        onMessage: { addListener: () => {}, removeListener: () => {} },
        sendMessage: () => Promise.resolve()
      }
    };
    HTMLElement.prototype.getBoundingClientRect = () => ({
      width: 100, height: 20, top: 0, left: 0, bottom: 20, right: 100, x: 0, y: 0, toJSON: () => {}
    });
  });

  it('detects a simple form with fields and assigns data-fp-id', () => {
    document.body.innerHTML = `
      <form id="test-form">
        <label for="fname">First Name</label>
        <input type="text" id="fname" name="fname" />
        <label for="lname">Last Name</label>
        <input type="text" id="lname" name="lname" />
      </form>
    `;

    const result = startAnalysisSession();

    expect(result.forms.length).toBe(1);
    expect(result.totalFields).toBe(2);
    expect(result.forms[0].fields[0].label).toBe('First Name');
    expect(result.forms[0].fields[0].id).toBe('fname');
    expect(result.forms[0].fields[1].label).toBe('Last Name');
    expect(result.forms[0].fields[1].id).toBe('lname');

    // check that data-fp-id is set
    const inputs = document.querySelectorAll('input');
    expect(inputs[0].getAttribute('data-fp-id')).toBe('fname');
  });

  it('detects floating fields outside a form', () => {
    document.body.innerHTML = `
      <input type="email" id="email" placeholder="Email Address" />
    `;

    const result = startAnalysisSession();

    expect(result.forms.length).toBe(1);
    expect(result.forms[0].id).toBe('floating-fields');
    expect(result.totalFields).toBe(1);
    expect(result.forms[0].fields[0].type).toBe('email');
    expect(result.forms[0].fields[0].label).toBe('Email Address');
  });

  it('ignores hidden, submit, and button fields', () => {
    document.body.innerHTML = `
      <form>
        <input type="hidden" name="csrf" value="123" />
        <input type="text" name="username" aria-label="Username" />
        <input type="submit" value="Submit" />
        <button type="button">Cancel</button>
      </form>
    `;

    const result = startAnalysisSession();

    expect(result.totalFields).toBe(1);
    expect(result.forms[0].fields[0].name).toBe('username');
    expect(result.forms[0].fields[0].label).toBe('Username');
  });

  it('extracts values from pre-filled fields', () => {
    document.body.innerHTML = `
      <input type="text" name="city" value="New York" />
      <input type="checkbox" name="agree" checked />
    `;

    const result = startAnalysisSession();

    expect(result.totalFields).toBe(2);
    expect(result.forms[0].fields[0].value).toBe('New York');
    expect(result.forms[0].fields[1].value).toBe('true');
  });

  it('completely ignores password, OTP, and sensitive authentication fields', () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="username" aria-label="Username" />
        <input type="password" name="password" id="pwd" />
        <input type="text" name="otp" autocomplete="one-time-code" />
        <input type="password" name="newpwd" autocomplete="new-password" />
        <input type="text" name="cvv" autocomplete="cc-csc" />
      </form>
    `;

    const result = startAnalysisSession();

    expect(result.totalFields).toBe(1);
    expect(result.forms[0].fields[0].name).toBe('username');
  });
});
