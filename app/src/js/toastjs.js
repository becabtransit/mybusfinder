// Toast Notification — Liquid Glass Edition
// Inspired by Apple's visionOS / iOS Liquid Glass aesthetic
// By Becab Systems - redesigned with Liquid Glass

class ToastNotification {
  constructor(options = {}) {
    this.options = {
      duration: options.duration || 3000,
      maxToasts: options.maxToasts || 5,
      containerClass: options.containerClass || 'toast-container',
      toastClass: options.toastClass || 'toast',
      blurAmount: options.blurAmount || '24px',
      position: options.position || 'bottom-right',
      transition: {
        bezier: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        duration: '0.55s',
        filterDuration: '0.3s'
      },
      ...options
    };

    this.toasts = [];
    this.container = null;
    this._injectStyles();
    this.initContainer();
  }

  _injectStyles() {
    if (document.getElementById('toast-liquid-glass-styles')) return;

    const style = document.createElement('style');
    style.id = 'toast-liquid-glass-styles';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@400;500;600&display=swap');

      .toast-lg {
        font-family: -apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif;
        position: relative;
        cursor: default;
        border-radius: 20px;
        max-width: 340px;
        min-width: 260px;
        overflow: hidden;
        color: #fff;
        isolation: isolate;
        transform: translateY(60px) scale(0.88);
        opacity: 0;
        transition: transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1),
                    opacity 0.4s cubic-bezier(0.25, 1, 0.5, 1);
        will-change: transform, opacity;
      }

      /* Glass shell */
      .toast-lg::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        backdrop-filter: blur(24px) saturate(180%) brightness(1.12);
        -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.12);
        z-index: 0;
        transition: backdrop-filter 0.3s ease;
      }

      /* Glossy inner border */
      .toast-lg::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        border: 1px solid rgba(255,255,255,0.28);
        background: linear-gradient(
          135deg,
          rgba(255,255,255,0.22) 0%,
          rgba(255,255,255,0.06) 40%,
          rgba(255,255,255,0.00) 70%,
          rgba(255,255,255,0.08) 100%
        );
        z-index: 1;
        pointer-events: none;
      }

      .toast-lg-bg {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        z-index: 0;
        transition: opacity 0.5s ease;
      }

      /* Specular highlight — top shine */
      .toast-lg-shine {
        position: absolute;
        top: 0;
        left: 10%;
        right: 10%;
        height: 40%;
        border-radius: 0 0 60% 60%;
        background: linear-gradient(
          to bottom,
          rgba(255,255,255,0.30) 0%,
          rgba(255,255,255,0.00) 100%
        );
        z-index: 2;
        pointer-events: none;
        filter: blur(1px);
      }

      /* Ambient glow blob */
      .toast-lg-glow {
        position: absolute;
        width: 120%;
        height: 120%;
        top: -10%;
        left: -10%;
        border-radius: 50%;
        z-index: 0;
        pointer-events: none;
        opacity: 0.55;
        filter: blur(30px);
        transition: opacity 0.4s ease;
      }

      .toast-lg-content {
        position: relative;
        display: flex;
        align-items: center;
        padding: 13px 16px;
        gap: 11px;
        z-index: 3;
      }

      .toast-lg-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        flex-shrink: 0;
        background: rgba(255,255,255,0.18);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,0.3);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.35);
        transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
      }

      .toast-lg:hover .toast-lg-icon {
        transform: scale(1.1);
      }

      .toast-lg-icon svg {
        filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));
      }

      .toast-lg-text {
        flex: 1;
        min-width: 0;
      }

      .toast-lg-title {
        font-size: 13.5px;
        font-weight: 600;
        line-height: 1.3;
        letter-spacing: -0.01em;
        text-shadow: 0 1px 3px rgba(0,0,0,0.25);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .toast-lg-subtitle {
        font-size: 12px;
        font-weight: 400;
        opacity: 0.78;
        margin-top: 1px;
        line-height: 1.3;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .toast-lg-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: rgba(255,255,255,0.15);
        border: 1px solid rgba(255,255,255,0.2);
        cursor: pointer;
        flex-shrink: 0;
        opacity: 0;
        transform: scale(0.8);
        transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1), background 0.15s ease;
      }

      .toast-lg:hover .toast-lg-close {
        opacity: 1;
        transform: scale(1);
      }

      .toast-lg-close:hover {
        background: rgba(255,255,255,0.28) !important;
      }

      .toast-lg-progress {
        position: relative;
        height: 2.5px;
        width: 100%;
        border-radius: 0 0 20px 20px;
        overflow: hidden;
        z-index: 3;
      }

      .toast-lg-progress-track {
        position: absolute;
        inset: 0;
        background: rgba(255,255,255,0.12);
      }

      .toast-lg-progress-bar {
        position: absolute;
        top: 0; left: 0; bottom: 0;
        width: 100%;
        transform-origin: left;
        border-radius: inherit;
        transition: transform linear;
        background: rgba(255,255,255,0.55);
        box-shadow: 0 0 6px rgba(255,255,255,0.4);
      }

      /* Entrance keyframe for icon bounce */
      @keyframes toast-icon-pop {
        0%   { transform: scale(0.5) rotate(-10deg); }
        70%  { transform: scale(1.15) rotate(3deg); }
        100% { transform: scale(1) rotate(0deg); }
      }

      .toast-lg.toast-visible .toast-lg-icon {
        animation: toast-icon-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both;
      }
    `;
    document.head.appendChild(style);
  }

  initContainer() {
    const containerId = `${this.options.containerClass}-${this.options.position}`;
    if (!document.querySelector(`.${containerId}`)) {
      this.container = document.createElement('div');
      this.container.className = `${this.options.containerClass} ${containerId}`;
      Object.assign(this.container.style, {
        position: 'fixed',
        zIndex: '4000000',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '16px',
        pointerEvents: 'none'
      });

      const positions = {
        'top-right':    { top: '0', right: '0', alignItems: 'flex-end' },
        'top-left':     { top: '0', left: '0', alignItems: 'flex-start' },
        'bottom-right': { bottom: '0', right: '0', alignItems: 'flex-end' },
        'bottom-left':  { bottom: '0', left: '0', alignItems: 'flex-start' }
      };
      Object.assign(this.container.style, positions[this.options.position] || positions['bottom-right']);
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector(`.${containerId}`);
    }
  }

  getTypeConfig(type) {
    return {
      success: {
        bg: 'rgba(16, 200, 120, 0.22)',
        glow: '#0fba75',
        accent: 'rgba(16, 200, 120, 0.75)',
        label: 'Succès',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
      },
      error: {
        bg: 'rgba(255, 69, 69, 0.22)',
        glow: '#ff4545',
        accent: 'rgba(255, 69, 69, 0.75)',
        label: 'Erreur',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
      },
      warning: {
        bg: 'rgba(255, 165, 40, 0.22)',
        glow: '#ff9f28',
        accent: 'rgba(255, 165, 40, 0.75)',
        label: 'Attention',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
      },
      info: {
        bg: 'rgba(80, 160, 255, 0.22)',
        glow: '#4fa3ff',
        accent: 'rgba(80, 160, 255, 0.75)',
        label: 'Info',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
      }
    }[type] || this.getTypeConfig('info');
  }

  show(message, type = 'info', customOptions = {}) {
    if (this.toasts.length >= this.options.maxToasts) {
      this.removeToast(this.toasts[0].element, true);
    }

    const config = this.getTypeConfig(type);
    const duration = customOptions.duration !== undefined ? customOptions.duration : this.options.duration;

    const toast = document.createElement('div');
    toast.className = `toast-lg toast-lg-${type}`;
    toast.style.pointerEvents = 'all';
    Object.assign(toast.style, {
      boxShadow: `0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.20)`
    });

    const parts = message.split(' | ');
    const title = parts[0];
    const subtitle = parts[1] || '';

    toast.innerHTML = `
      <div class="toast-lg-bg" style="background: ${config.bg};"></div>
      <div class="toast-lg-glow" style="background: radial-gradient(ellipse at center, ${config.glow}88, transparent 70%);"></div>
      <div class="toast-lg-shine"></div>
      <div class="toast-lg-content">
        <div class="toast-lg-icon">${config.icon}</div>
        <div class="toast-lg-text">
          <div class="toast-lg-title">${title}</div>
          ${subtitle ? `<div class="toast-lg-subtitle">${subtitle}</div>` : ''}
        </div>
        <div class="toast-lg-close">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>
      </div>
      <div class="toast-lg-progress">
        <div class="toast-lg-progress-track"></div>
        <div class="toast-lg-progress-bar" style="transition-duration: ${duration / 1000}s;"></div>
      </div>
    `;

    this.container.appendChild(toast);
    void toast.offsetWidth;

    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateY(0) scale(1)';
      toast.style.opacity = '1';
      toast.classList.add('toast-visible');

      setTimeout(() => {
        const bar = toast.querySelector('.toast-lg-progress-bar');
        if (bar) bar.style.transform = 'scaleX(0)';
      }, 30);
    }, 20);

    const toastId = `${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
    toast.dataset.toastId = toastId;

    const toastInfo = {
      id: toastId,
      element: toast,
      removing: false,
      timeout: setTimeout(() => this.removeToast(toast, false), duration)
    };

    toastInfo.backupTimeout = setTimeout(() => {
      const idx = this.toasts.findIndex(t => t.id === toastId);
      if (idx !== -1 && !this.toasts[idx].removing) this.removeToast(toast, true);
    }, duration + 1200);

    this.toasts.push(toastInfo);

    // Close button
    toast.querySelector('.toast-lg-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeToast(toast, false);
    });

    // Pause on hover
    toast.addEventListener('mouseenter', () => {
      clearTimeout(toastInfo.timeout);
      clearTimeout(toastInfo.backupTimeout);
      const bar = toast.querySelector('.toast-lg-progress-bar');
      if (bar) bar.style.transitionProperty = 'none';
    });

    toast.addEventListener('mouseleave', () => {
      if (toastInfo.removing) return;
      const bar = toast.querySelector('.toast-lg-progress-bar');
      let remaining = duration * 0.25;
      if (bar) {
        const mat = window.getComputedStyle(bar).transform;
        const scaleX = parseFloat(mat.split(',')[0].split('(')[1]) || 0;
        remaining = Math.max(400, duration * scaleX);
        bar.style.transitionProperty = 'transform';
        bar.style.transitionDuration = `${remaining / 1000}s`;
      }
      toastInfo.timeout = setTimeout(() => this.removeToast(toast, false), remaining);
      toastInfo.backupTimeout = setTimeout(() => {
        const idx = this.toasts.findIndex(t => t.id === toastId);
        if (idx !== -1 && !this.toasts[idx].removing) this.removeToast(toast, true);
      }, remaining + 1200);
    });

    return toastInfo;
  }

  removeToast(toast, force = false) {
    let index = -1;
    if (typeof toast === 'string') {
      index = this.toasts.findIndex(t => t.id === toast);
    } else {
      const id = toast.dataset?.toastId;
      index = this.toasts.findIndex(t => t.id === id || t.element === toast);
    }
    if (index === -1) return;

    this.toasts[index].removing = true;
    clearTimeout(this.toasts[index].timeout);
    clearTimeout(this.toasts[index].backupTimeout);

    const el = this.toasts[index].element;
    el.style.transform = 'translateY(40px) scale(0.9)';
    el.style.opacity = '0';

    setTimeout(() => {
      if (el?.parentNode) el.parentNode.removeChild(el);
      const idx = this.toasts.findIndex(t => t.id === this.toasts[index]?.id);
      if (idx !== -1) this.toasts.splice(idx, 1);
    }, force ? 80 : 480);
  }

  success(message, options = {}) { return this.show(message, 'success', options); }
  error(message, options = {})   { return this.show(message, 'error', options); }
  warning(message, options = {}) { return this.show(message, 'warning', options); }
  info(message, options = {})    { return this.show(message, 'info', options); }

  clear() {
    this.toasts.forEach(t => {
      clearTimeout(t.timeout);
      clearTimeout(t.backupTimeout);
      t.removing = true;
      if (t.element?.parentNode) t.element.parentNode.removeChild(t.element);
    });
    this.toasts = [];
  }
}

const toastTopRight    = new ToastNotification({ position: 'top-right',    duration: 3000, maxToasts: 5 });
const toastTopLeft     = new ToastNotification({ position: 'top-left',     duration: 3000, maxToasts: 5 });
const toastBottomRight = new ToastNotification({ position: 'bottom-right', duration: 3000, maxToasts: 5 });
const toastBottomLeft  = new ToastNotification({ position: 'bottom-left',  duration: 3000, maxToasts: 5 });
