// Toast function: toast(message, iconClass)
// Toast function: toast(message, iconClass, options)
// options: { confirm: true, onConfirm: function, center: true }
window.toast = function (message, iconClass, options = {}) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  if (options.center || options.confirm) {
    toast.classList.add("toast-center");
  }
  if (iconClass) {
    const icon = document.createElement("span");
    icon.className = `toast-icon ${iconClass}`;
    toast.appendChild(icon);
  }
  const msg = document.createElement("span");
  msg.textContent = message;
  toast.appendChild(msg);

  let overlay = null;
  if (options.confirm) {
    // Block interaction with overlay
    overlay = document.createElement("div");
    overlay.className = "toast-overlay";
    document.body.appendChild(overlay);

    const btnConfirm = document.createElement("button");
    btnConfirm.textContent = options.confirmText || "Confirm";
    btnConfirm.className = "toast-confirm";

    // Helper to close
    const closeToast = () => {
      toast.remove();
      if (overlay) overlay.remove();
      if (previousActiveElement) previousActiveElement.focus();
    };

    btnConfirm.onclick = function () {
      closeToast();
      if (typeof options.onConfirm === "function") {
        options.onConfirm();
      }
    };

    const btnCancel = document.createElement("button");
    btnCancel.textContent = options.cancelText || "Cancel";
    btnCancel.className = "toast-cancel";
    btnCancel.onclick = function () {
      closeToast();
      if (typeof options.onCancel === "function") {
        options.onCancel();
      }
    };

    toast.appendChild(btnConfirm);
    toast.appendChild(btnCancel);

    // Remove auto-close animation for confirm toasts
    toast.style.animation = "toast-in 0.3s forwards";

    // Accessibility: Focus management
    const previousActiveElement = document.activeElement;

    // Wait for DOM
    setTimeout(() => {
      btnConfirm.focus();
    }, 0);

    toast.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (document.activeElement === btnConfirm) {
          btnCancel.focus();
        } else {
          btnConfirm.focus();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        btnCancel.click();
      }
    });

  } else {
    toast.style.animation =
      "toast-in 0.3s forwards, toast-out 0.3s 2.7s forwards";
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
  container.appendChild(toast);
};
