//Provides beautifully animated and designed toast notifications for your websites 
//Usage : toastBottomRight.error/info/warning/success('Insert here your info...');

//Setvars has been added to match your website preferences ; they can be edited using : 
//     const toastName = new ToastNotification({
//         position: 'bottom-right',       (top-right/top-left/bottom-right/bottom-left)
//         duration: 3000,                 Duration when the toast popup will be displayed
//         maxToasts: 5,                   Maximum toasts that can be displayed
//         blurAmount: '8px'               Determines the amount of background blur
//     });

//Default settings are already made for you and working right now, you can already use them !
//By Becab Systems - Bechir Abidi


class ToastNotification {
  constructor(options = {}) {
    this.options = {
      duration: options.duration || 3000,
      maxToasts: options.maxToasts || 5,
      containerClass: options.containerClass || 'toast-container',
      toastClass: options.toastClass || 'toast',
      blurAmount: options.blurAmount || '8px',
      transition: {
        bezier: 'cubic-bezier(0.25, 1.5, 0.5, 1)',
        duration: '0.5s',
        filterDuration: '0.3s'
      },
      ...options
    };

    this.toasts = [];
    this.container = null;
    this.initContainer();
  }

  initContainer() {
    const containerId = `${this.options.containerClass}-${this.options.position}`;
    
    if (!document.querySelector(`.${containerId}`)) {
      this.container = document.createElement('div');
      this.container.className = `${this.options.containerClass} ${containerId}`;
      
      Object.assign(this.container.style, {
        position: 'fixed',
        zIndex: '9999',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '15px'
      });
      
      switch (this.options.position) {
        case 'top-right':
          Object.assign(this.container.style, {
            top: '0',
            right: '0',
            alignItems: 'flex-end',
            zIndex: '4000000'
          });
          break;
        case 'top-left':
          Object.assign(this.container.style, {
            top: '0',
            left: '0',
            alignItems: 'flex-start',
            zIndex: '4000000'
          });
          break;
        case 'bottom-left':
          Object.assign(this.container.style, {
            bottom: '0',
            left: '0',
            alignItems: 'flex-start',
            zIndex: '4000000'
          });
          break;
        case 'bottom-right':
          Object.assign(this.container.style, {
            bottom: '0',
            right: '0',
            alignItems: 'flex-end',
            zIndex: '4000000'
          });
          break;
      }
      
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector(`.${containerId}`);
    }
  }

  getTypeConfig(type) {
    const typeConfigs = {
      'success': {
        backgroundColor: 'rgba(16, 185, 129, 0.35)',
        progressColor: '#05966947',
        textColor: '#ffffff',
        shadowColor: 'rgba(16, 185, 129, 0.3)'
      },
      'error': {
        backgroundColor: 'rgba(239, 68, 68, 0.35)',
        progressColor: '#DC262647',
        textColor: '#ffffff',
        shadowColor: 'rgba(239, 68, 68, 0.3)'
      },
      'warning': {
        backgroundColor: 'rgba(245, 158, 11, 0.35)',
        progressColor: '#D9770647',
        textColor: '#ffffff',
        shadowColor: 'rgba(245, 158, 11, 0.3)'
      },
      'info': {
        backgroundColor: 'rgba(44, 44, 44, 0.35)',
        progressColor: '#2563EB47',
        textColor: '#ffffff',
        shadowColor: 'rgba(44, 44, 44, 0.3)'
      }
    };

    return typeConfigs[type] || typeConfigs['info'];
  }

  show(message, type = 'info', customOptions = {}) {
    if (this.toasts.length >= this.options.maxToasts) {
      this.removeToast(this.toasts[0].element, true);
    }
    
    const config = this.getTypeConfig(type);
    
    const toast = document.createElement('div');
    toast.className = `${this.options.toastClass} ${this.options.toastClass}-${type}`;
    
    Object.assign(toast.style, {
      position: 'relative',
      cursor: 'default',
      padding: '0',
      borderRadius: '10px',
      maxWidth: '320px',
      transform: 'translateY(50px)', 
      opacity: '0', 
      overflow: 'hidden',
      color: config.textColor,
      boxShadow: `0 8px 20px ${config.shadowColor}`
    });
    
    let iconHtml = '';
    switch (type) {
      case 'success':
        iconHtml = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
        break;
      case 'error':
        iconHtml = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
        break;
      case 'warning':
        iconHtml = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        break;
      case 'info':
      default:
        iconHtml = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
        break;
    }
    
    const toastContent = `
      <div class="toast-blur-bg"></div>
      <div class="toast-content">
        <div class="toast-icon">${iconHtml}</div>
        <div class="toast-message">${message}</div>
        <div class="toast-close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
      </div>
      <div class="toast-progress"></div>
    `;
    
    toast.innerHTML = toastContent;
    
    Object.assign(toast.style, {
      transition: `transform ${this.options.transition.duration} ${this.options.transition.bezier}, 
                   opacity ${this.options.transition.duration} ${this.options.transition.bezier}`
    });
    
    const blurBg = toast.querySelector('.toast-blur-bg');
    Object.assign(blurBg.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: config.backgroundColor,
      backdropFilter: `blur(${this.options.blurAmount})`,
      WebkitBackdropFilter: `blur(${this.options.blurAmount})`,
      borderRadius: 'inherit',
      zIndex: '0',
      opacity: '1',
      transition: `opacity ${this.options.transition.duration} ${this.options.transition.bezier}, 
                   backdrop-filter ${this.options.transition.filterDuration} ease`
    });
    
    const contentElement = toast.querySelector('.toast-content');
    Object.assign(contentElement.style, {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      gap: '10px',
      zIndex: '1' 
    });
    
    const iconElement = toast.querySelector('.toast-icon');
    Object.assign(iconElement.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0'
    });
    
    const messageElement = toast.querySelector('.toast-message');
    Object.assign(messageElement.style, {
      flex: '1',
      fontSize: '14px',
      fontWeight: '500',
      lineHeight: '1.4'
    });
    
    const closeElement = toast.querySelector('.toast-close');
    Object.assign(closeElement.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: '8px',
      opacity: '0.7',
      cursor: 'pointer',
      flexShrink: '0',
      transition: 'opacity 0.2s ease'
    });
    
    const progressElement = toast.querySelector('.toast-progress');
    Object.assign(progressElement.style, {
      position: 'relative',
      height: '3px',
      width: '100%',
      backgroundColor: config.progressColor,
      transform: 'scaleX(1)',
      transformOrigin: 'left',
      transition: `transform ${(customOptions.duration !== undefined ? customOptions.duration : this.options.duration) / 1000}s linear`,
      zIndex: '1'
    });
    
    const fragment = document.createDocumentFragment();
    fragment.appendChild(toast);
    
    void toast.offsetWidth;
    this.container.appendChild(toast);
    void toast.offsetWidth;
    
    setTimeout(() => {
      Object.assign(toast.style, {
        transform: 'translateY(0)',
        opacity: '1'
      });
      
      setTimeout(() => {
        if (progressElement && progressElement.style) {
          progressElement.style.transform = 'scaleX(0)';
        }
      }, 30);
    }, 50); 
    
    const duration = customOptions.duration !== undefined ? 
      customOptions.duration : 
      this.options.duration;

    const toastId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    toast.dataset.toastId = toastId;

    const toastInfo = {
      id: toastId,
      element: toast,
      timeout: setTimeout(() => {
        this.removeToast(toast, false);
      }, duration),
      removing: false
    };

    const backupTimeout = setTimeout(() => {
      const index = this.toasts.findIndex(t => t.id === toastId);
      if (index !== -1 && !this.toasts[index].removing) {
        this.removeToast(toast, true);
      }
    }, duration + 1000);

    toastInfo.backupTimeout = backupTimeout;
    
    this.toasts.push(toastInfo);
    
    const closeButton = toast.querySelector('.toast-close');
    if (closeButton) {
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const toastElement = e.currentTarget.closest(`.${this.options.toastClass}`);
        if (toastElement) {
          this.removeToast(toastElement, true);
        }
      });
    }
    
    toast.addEventListener('mouseenter', () => {
      const close = toast.querySelector('.toast-close');
      if (close) close.style.opacity = '1';
      
      const blurBg = toast.querySelector('.toast-blur-bg');
      if (blurBg) {
        blurBg.style.backdropFilter = `blur(${parseInt(this.options.blurAmount) + 2}px)`;
        blurBg.style.WebkitBackdropFilter = `blur(${parseInt(this.options.blurAmount) + 2}px)`;
      }
      
      const progress = toast.querySelector('.toast-progress');
      if (progress) {
        progress.style.transitionProperty = 'none';
      }
      
      clearTimeout(toastInfo.timeout);
      clearTimeout(toastInfo.backupTimeout);
    });
    
    toast.addEventListener('mouseleave', () => {
      const close = toast.querySelector('.toast-close');
      if (close) close.style.opacity = '0.7';
      
      const blurBg = toast.querySelector('.toast-blur-bg');
      if (blurBg) {
        blurBg.style.backdropFilter = `blur(${this.options.blurAmount})`;
        blurBg.style.WebkitBackdropFilter = `blur(${this.options.blurAmount})`;
      }
      
      const progress = toast.querySelector('.toast-progress');
      if (progress) {
        const computedStyle = window.getComputedStyle(progress);
        const scaleX = parseFloat(computedStyle.transform.split(',')[0].split('(')[1]) || 0;
        const remainingTime = duration * scaleX;
        
        progress.style.transitionProperty = 'transform';
        progress.style.transitionDuration = `${remainingTime / 1000}s`;
      }
      
      if (!toastInfo.removing) {
        const remainingTime = Math.max(500, duration * (progress ? parseFloat(window.getComputedStyle(progress).transform.split(',')[0].split('(')[1]) || 0 : 0.2));
        
        toastInfo.timeout = setTimeout(() => {
          this.removeToast(toast, false);
        }, remainingTime);
        
        toastInfo.backupTimeout = setTimeout(() => {
          const index = this.toasts.findIndex(t => t.id === toastId);
          if (index !== -1 && !this.toasts[index].removing) {
            this.removeToast(toast, true);
          }
        }, remainingTime + 1000);
      }
    });
    
    return toastInfo;
  }

  removeToast(toast, force = false) {
    let index = -1;
    if (typeof toast === 'string') {
      index = this.toasts.findIndex(t => t.id === toast);
    } else {
      const toastId = toast.dataset.toastId;
      index = this.toasts.findIndex(t => t.id === toastId);
      if (index === -1) {
        index = this.toasts.findIndex(t => t.element === toast);
      }
    }
    
    if (index === -1) return;
    
    this.toasts[index].removing = true;

    clearTimeout(this.toasts[index].timeout);
    clearTimeout(this.toasts[index].backupTimeout);
    
    const toastElement = this.toasts[index].element;
    
    const blurBg = toastElement.querySelector('.toast-blur-bg');
    if (blurBg) {
      blurBg.style.opacity = '0.5';
    }
    
    Object.assign(toastElement.style, {
      transform: 'translateY(50px)',
      opacity: '0'
    });
    
    const removeDelay = force ? 50 : 500;
    
    setTimeout(() => {
      if (toastElement && toastElement.parentNode) {
        toastElement.parentNode.removeChild(toastElement);
      }
      
      const currentIndex = this.toasts.findIndex(t => t.id === this.toasts[index].id);
      if (currentIndex !== -1) {
        this.toasts.splice(currentIndex, 1);
      }
    }, removeDelay);
  }

  success(message, options = {}) {
    return this.show(message, 'success', options);
  }
  
  error(message, options = {}) {
    return this.show(message, 'error', options);
  }
  
  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }
  
  info(message, options = {}) {
    return this.show(message, 'info', options);
  }
  
  clear() {
    this.toasts.forEach(toast => {
      clearTimeout(toast.timeout);
      clearTimeout(toast.backupTimeout);
      toast.removing = true;
      
      if (toast.element && toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }
    });
    this.toasts = [];
  }
}

const toastTopRight = new ToastNotification({
  position: 'top-right', 
  duration: 3000,           
  maxToasts: 5,
  blurAmount: '8px'
});

const toastTopLeft = new ToastNotification({
  position: 'top-left', 
  duration: 3000,           
  maxToasts: 5,
  blurAmount: '8px'
});

const toastBottomRight = new ToastNotification({
  position: 'bottom-right', 
  duration: 3000,           
  maxToasts: 5,
  blurAmount: '8px'
});

const toastBottomLeft = new ToastNotification({
  position: 'bottom-left', 
  duration: 3000,           
  maxToasts: 5,
  blurAmount: '8px'
});