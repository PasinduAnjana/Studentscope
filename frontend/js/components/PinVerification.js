class PinVerification {
    constructor() {
        this.createModal();
    }

    createModal() {
        if (document.getElementById('global-pin-verification-modal')) return;

        const modalHTML = `
      <div id="global-pin-verification-modal" class="modal-overlay" style="display: none; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;">
        <div class="modal-content card" style="background: var(--color-bg); padding: 30px; border-radius: 12px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
          <h2 style="margin-bottom: 5px; color: var(--color-primary);"><i class="fas fa-lock"></i> Security PIN Required</h2>
          <p style="color: var(--color-text); font-size: 0.9rem; margin-bottom: 20px;">Please enter your 4-digit PIN to authorize this action.</p>
          
          <input type="password" id="global-pin-input" pattern="[0-9]{4}" maxlength="4" placeholder="••••" style="width: 150px; text-align: center; letter-spacing: 15px; font-size: 2rem; padding: 10px; border-radius: 8px; border: 2px solid var(--color-border); background: var(--color-surface); color: var(--color-text); margin-bottom: 15px;">
          
          <div id="global-pin-error" style="color: var(--color-danger); font-size: 0.85rem; margin-bottom: 15px; min-height: 20px;"></div>
          
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="global-pin-cancel-btn" class="btn" style="background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border);">Cancel</button>
            <button id="global-pin-confirm-btn" class="btn btn-primary" style="min-width: 100px;">Verify</button>
          </div>
        </div>
      </div>
    `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        this.modal = document.getElementById('global-pin-verification-modal');
        this.input = document.getElementById('global-pin-input');
        this.errorDisplay = document.getElementById('global-pin-error');

        document.getElementById('global-pin-cancel-btn').addEventListener('click', () => this.close());
        document.getElementById('global-pin-confirm-btn').addEventListener('click', () => this.verify());

        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.verify();
        });
    }

    show(callback) {
        this.onSuccess = callback;
        this.input.value = '';
        this.errorDisplay.textContent = '';
        this.modal.style.display = 'flex';
        setTimeout(() => this.input.focus(), 100);
    }

    close() {
        this.modal.style.display = 'none';
        this.onSuccess = null;
    }

    async verify() {
        const pin = this.input.value;
        if (pin.length !== 4) {
            this.errorDisplay.textContent = 'Please enter exactly 4 digits.';
            return;
        }

        const btn = document.getElementById('global-pin-confirm-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Verifying...';
        btn.disabled = true;

        try {
            const response = await fetch('/api/clerk/pin/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                if (this.onSuccess) this.onSuccess();
                this.close();
            } else {
                this.errorDisplay.textContent = data.error || 'Incorrect PIN.';
                this.input.value = '';
                this.input.focus();
            }
        } catch (err) {
            this.errorDisplay.textContent = 'Network error. Please try again.';
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}

// Global instance
window.pinVerification = new PinVerification();

window.requirePinPrompt = function (callback) {
    // Only trigger for clerk (extra safety depending on dashboard setup)
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role');
    if (role === 'clerk') {
        window.pinVerification.show(callback);
    } else {
        // If not a clerk, no PIN required, just run callback
        callback();
    }
};
