import { supabase } from '../lib/supabase';

const form = document.getElementById('waitlist-form') as HTMLFormElement;
const emailInput = document.getElementById('waitlist-email') as HTMLInputElement;
const btn = document.getElementById('waitlist-btn') as HTMLButtonElement;
const msg = document.getElementById('waitlist-msg') as HTMLSpanElement;

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage('Please enter a valid email.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = '...';

    try {
      const { error } = await supabase
        .from('waitlist')
        .insert({
          email,
          source: document.referrer || window.location.href,
          user_agent: navigator.userAgent,
        });

      if (error) {
        if (error.code === '23505') {
          showMessage("You're already on the list!", 'success');
        } else {
          showMessage('Something went wrong. Try again.', 'error');
          btn.disabled = false;
          btn.textContent = 'Join the Waitlist';
          return;
        }
      } else {
        showMessage("You're in!", 'success');
      }

      emailInput.style.display = 'none';
      btn.style.display = 'none';
    } catch {
      showMessage('Connection error. Try again.', 'error');
      btn.disabled = false;
      btn.textContent = 'Join the Waitlist';
    }
  });
}

function showMessage(text: string, type: 'success' | 'error') {
  if (!msg) return;
  msg.textContent = text;
  msg.className = `waitlist-msg waitlist-msg--${type}`;
}
