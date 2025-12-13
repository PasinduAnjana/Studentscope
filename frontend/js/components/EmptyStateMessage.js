class EmptyStateMessage extends HTMLElement {
  connectedCallback() {
      this.render();
  }

  static get observedAttributes() {
      return ['icon', 'message'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue !== newValue) {
          this.render();
      }
  }

  render() {
      const icon = this.getAttribute('icon') || 'fas fa-info-circle';
      const message = this.getAttribute('message') || 'No data available';

      this.innerHTML = `
        <div class="empty-state">
          <i class="${icon}"></i>
          <p class="empty-text">${message}</p>
        </div>
        <style>
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            text-align: center;
            background-color: transparent;
            box-shadow: none;
            height: 100%;
            min-height: 200px;
            width: 100%;
          }
          .empty-state i {
            font-size: 32px;
            color: var(--color-subtext, #6c757d);
            margin-bottom: 24px;
            opacity: 0.3;
          }
          .empty-text {
            font-size: 16px;
            color: var(--color-subtext, #6c757d);
            margin: 0; 
            opacity: 0.5;
          }
        </style>
      `;
  }
}

customElements.define('empty-state-message', EmptyStateMessage);
