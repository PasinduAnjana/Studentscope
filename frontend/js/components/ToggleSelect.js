class ToggleSelect extends HTMLElement {
    constructor() {
        super();
        this._value = "";
    }

    connectedCallback() {
        // Prevent double rendering if connectedCallback is called multiple times
        if (this.querySelector('.toggle-group')) return;

        // Read configuration from <toggle-option> children
        const options = Array.from(this.querySelectorAll('toggle-option')).map(opt => ({
            value: opt.getAttribute('value'),
            icon: opt.getAttribute('icon'),
            label: opt.textContent.trim()
        }));

        this.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'toggle-group';

        this._buttons = [];

        options.forEach(opt => {
            const btn = document.createElement('div');
            btn.className = 'toggle-btn';
            btn.dataset.value = opt.value;
            // Create icon element
            const icon = document.createElement('i');
            icon.className = opt.icon;
            // Create label element
            const span = document.createElement('span');
            span.textContent = opt.label;

            btn.appendChild(icon);
            btn.appendChild(span);

            btn.addEventListener('click', () => {
                this.value = opt.value;
            });

            this._buttons.push(btn);
            container.appendChild(btn);
        });

        this.appendChild(container);

        // Initial value check
        if (this.hasAttribute('value')) {
            this.value = this.getAttribute('value');
        }
    }

    get value() {
        return this._value;
    }

    set value(val) {
        if (this._value === val && val !== "") return; // Allow forcing update on init
        this._value = val;
        this.setAttribute('value', val);

        if (this._buttons) {
            this._buttons.forEach(btn => {
                if (btn.dataset.value === val) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        this.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

customElements.define('toggle-select', ToggleSelect);
