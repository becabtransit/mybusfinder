//Provides beautifully animated and designed toast notifications for your websites 
//Usage : toast.error/info/warning/success('Insert here your info...');

//Setvars has been added to match your website preferences ; they can be edited using : 
//     const toast = new ToastNotification({
//         position: 'bottom-right',       (top-right/top-left/bottom-right/bottom-left)
//         duration: 3000,                 (duration when the toast popup will be displayed)
//         maxToasts: 5                    (maximum toasts that can be displayed during that delay)
//     });
//Default settings are already applied, you can already use it without editing these variables.

//By Becab Systems - Bechir Abidi


class ToastNotification {
    constructor(options = {}) {
      this.options = {
        position: options.position || 'bottom-right',
        duration: options.duration || 3000,
        maxToasts: options.maxToasts || 5,
        containerClass: options.containerClass || 'toast-container',
        toastClass: options.toastClass || 'toast',
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
      if (!document.querySelector(`.${this.options.containerClass}`)) {
        this.container = document.createElement('div');
        this.container.className = this.options.containerClass;
        
        Object.assign(this.container.style, {
          position: 'fixed',
          zIndex: '9999',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '10px'
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
          default:
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
        this.container = document.querySelector(`.${this.options.containerClass}`);
      }
    }
  
    show(message, type = 'info', customOptions = {}) {
      if (this.toasts.length >= this.options.maxToasts) {
        this.removeToast(this.toasts[0].element);
      }
      
      const toast = document.createElement('div');
      toast.className = `${this.options.toastClass} ${this.options.toastClass}-${type}`;
      toast.innerHTML = message;
      
      Object.assign(toast.style, {
        color: '#ffffff',
        cursor: 'pointer',
        padding: '12px 20px',
        borderRadius: '8px',
        backgroundColor: '#fff',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        maxWidth: '300px',
        transform: 'translateY(50px)',
        opacity: '0',
        filter: 'blur(10px)',
        transition: `transform ${this.options.transition.duration} ${this.options.transition.bezier}, 
                    filter ${this.options.transition.filterDuration} ease-out, 
                    opacity ${this.options.transition.duration} ${this.options.transition.bezier}`
      });
      
      switch (type) {
        case 'success':
            toast.style.backgroundColor = '#2E7D32'; 
            break;
        case 'error':
            toast.style.backgroundColor = '#B71C1C'; 
            break;
        case 'warning':
            toast.style.backgroundColor = '#FF8F00'; 
            break;
        case 'info':
        default:
            toast.style.backgroundColor = '#212121'; 
            break;
    }
    
      
      this.container.appendChild(toast);
      
      void toast.offsetWidth;
      
      Object.assign(toast.style, {
        transform: 'translateY(0)',
        opacity: '1',
        filter: 'blur(0)'
      });
      
      const toastInfo = {
        element: toast,
        timeout: setTimeout(() => {
          this.removeToast(toast);
        }, customOptions.duration || this.options.duration)
      };
      
      this.toasts.push(toastInfo);
      
      toast.addEventListener('click', () => {
        this.removeToast(toast);
      });
      
      return toastInfo;
    }
  
    removeToast(toast) {
      const index = this.toasts.findIndex(t => t.element === toast);
      if (index === -1) return;
      
      clearTimeout(this.toasts[index].timeout);
      
      Object.assign(toast.style, {
        transform: 'translateY(50px)',
        opacity: '0',
        filter: 'blur(10px)'
      });
      
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        this.toasts.splice(index, 1);
      }, 500); 
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
        if (toast.element.parentNode) {
          toast.element.parentNode.removeChild(toast.element);
        }
      });
      this.toasts = [];
    }
  }
  
  const toast = new ToastNotification({
    position: 'bottom-right', 
    duration: 3000,           
    maxToasts: 5              
  });
  