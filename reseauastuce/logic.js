

        if (!window.requestIdleCallback) {
            window.requestIdleCallback = function(callback, options) {
                const start = Date.now();
                return setTimeout(function() {
                    callback({
                        didTimeout: false,
                        timeRemaining: function() {
                            return Math.max(0, 50 - (Date.now() - start));
                        }
                    });
                }, 1);
            };
            
            window.cancelIdleCallback = function(id) {
                clearTimeout(id);
            };
        }

        document.addEventListener('DOMContentLoaded', () => {
            if (localStorage.getItem('nepasafficheraccueil') === 'true') {
                const accueil = document.getElementById('accueil');
                accueil.classList.add('hide');
                accueil.classList.remove("affiche");
                window.isMenuShowed = false;
                setTimeout(() => {
                    accueil.style.display = 'none';
                }, 500);
            } else {
                afficherMenu();
            }
        });

    // Ripple Effect Implementation for iOS26-like behavior - Improved by BecabDev
    // Simply add class "ripple-container" to element you want the effect on it
    class RippleEffect {
        constructor() {
            this.activeRipples = new Map();
            this.rippleCounter = 0;
            this.isTouch = false;
            this.init();
        }

        init() {
            // Mouse events
            document.addEventListener('mousedown', this.handlePointerDown.bind(this));
            document.addEventListener('mouseup', this.handlePointerUp.bind(this));
            document.addEventListener('mousemove', this.handlePointerMove.bind(this));
            document.addEventListener('mouseleave', this.handlePointerLeave.bind(this));
            
            // Touch events
            document.addEventListener('touchstart', this.handlePointerDown.bind(this), { passive: true });
            document.addEventListener('touchend', this.handlePointerUp.bind(this), { passive: true });
            document.addEventListener('touchmove', this.handlePointerMove.bind(this), { passive: true });
            document.addEventListener('touchcancel', this.handlePointerLeave.bind(this), { passive: true });
        }

        handlePointerDown(e) {
            if (e.type === 'touchstart') {
                this.isTouch = true;
            } else if (e.type === 'mousedown' && this.isTouch) {
                return; 
            }

            const container = e.target.closest('.ripple-container');
            if (!container) return;

            const pointer = this.getPointerPosition(e);
            const rect = container.getBoundingClientRect();
            
            const rippleId = `ripple_${this.rippleCounter++}`;
            const ripple = this.createRipple(container, pointer.x - rect.left, pointer.y - rect.top);
            
            const rippleData = {
                id: rippleId,
                element: ripple,
                container: container,
                startTime: Date.now(),
                isHeld: false,
                isReleased: false,
                timeouts: []
            };
            
            this.activeRipples.set(rippleId, rippleData);

            const heldTimeout = setTimeout(() => {
                const activeRipple = this.activeRipples.get(rippleId);
                if (activeRipple && !activeRipple.isReleased && activeRipple.element.parentNode) {
                    activeRipple.element.classList.remove('animate');
                    activeRipple.element.classList.add('held');
                    activeRipple.isHeld = true;
                }
            }, 150);

            rippleData.timeouts.push(heldTimeout);

            const safetyTimeout = setTimeout(() => {
                const activeRipple = this.activeRipples.get(rippleId);
                if (activeRipple && !activeRipple.isReleased) {
                    this.releaseRipple(rippleId);
                }
            }, 10000);

            rippleData.timeouts.push(safetyTimeout);
        }

        handlePointerMove(e) {
            if (e.type === 'mousemove' && this.isTouch) return;

            const container = e.target.closest('.ripple-container');
            if (!container) return;

            const pointer = this.getPointerPosition(e);
            const rect = container.getBoundingClientRect();
            
            const x = pointer.x - rect.left;
            const y = pointer.y - rect.top;

            for (const [rippleId, rippleData] of this.activeRipples) {
                if (rippleData.container === container && 
                    rippleData.isHeld && 
                    !rippleData.isReleased &&
                    rippleData.element.parentNode) {
                    
                    const ripple = rippleData.element;
                    const size = parseFloat(ripple.style.width);
                    ripple.style.left = (x - size / 2) + 'px';
                    ripple.style.top = (y - size / 2) + 'px';
                }
            }
        }

        handlePointerUp(e) {
            if (e.type === 'mouseup' && this.isTouch) {
                setTimeout(() => { this.isTouch = false; }, 100);
                return;
            }

            const container = e.target.closest('.ripple-container');
            if (!container) return;

            for (const [rippleId, rippleData] of this.activeRipples) {
                if (rippleData.container === container && !rippleData.isReleased) {
                    this.releaseRipple(rippleId);
                }
            }
        }

        handlePointerLeave(e) {
            const ripplesToRelease = Array.from(this.activeRipples.keys());
            ripplesToRelease.forEach(rippleId => {
                this.releaseRipple(rippleId);
            });

            if (e.type === 'mouseleave') {
                this.isTouch = false;
            }
        }

        releaseRipple(rippleId) {
            const rippleData = this.activeRipples.get(rippleId);
            if (!rippleData || rippleData.isReleased) return;

            rippleData.isReleased = true;

            rippleData.timeouts.forEach(timeout => clearTimeout(timeout));
            rippleData.timeouts = [];
            
            if (!rippleData.element.parentNode) {
                this.cleanupRipple(rippleId);
                return;
            }

            if (rippleData.isHeld) {
                rippleData.element.classList.remove('held');
                rippleData.element.classList.add('release');
                
                const cleanupTimeout = setTimeout(() => {
                    this.cleanupRipple(rippleId);
                }, 400);
                rippleData.timeouts.push(cleanupTimeout);
            } else {
                const timeHeld = Date.now() - rippleData.startTime;
                if (timeHeld < 150) {
                    const cleanupTimeout = setTimeout(() => {
                        this.cleanupRipple(rippleId);
                    }, 150 - timeHeld + 300); 
                    rippleData.timeouts.push(cleanupTimeout);
                } else {
                    const cleanupTimeout = setTimeout(() => {
                        this.cleanupRipple(rippleId);
                    }, 100);
                    rippleData.timeouts.push(cleanupTimeout);
                }
            }
        }

        cleanupRipple(rippleId) {
            const rippleData = this.activeRipples.get(rippleId);
            if (!rippleData) return;

            rippleData.timeouts.forEach(timeout => clearTimeout(timeout));
            rippleData.timeouts = [];

            if (rippleData.element && rippleData.element.parentNode) {
                try {
                    rippleData.element.parentNode.removeChild(rippleData.element);
                } catch (e) {
                }
            }

            this.activeRipples.delete(rippleId);
        }

        createRipple(container, x, y) {
            const rect = container.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height) * 2.5;
            
            const ripple = document.createElement('div');
            ripple.classList.add('ripple', 'animate');
            
            ripple.style.width = size + 'px';
            ripple.style.height = size + 'px';
            ripple.style.left = (x - size / 2) + 'px';
            ripple.style.top = (y - size / 2) + 'px';
            
            container.appendChild(ripple);
            
            return ripple;
        }

        getPointerPosition(e) {
            if (e.touches && e.touches.length > 0) {
                return { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
            return { x: e.clientX, y: e.clientY };
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            new RippleEffect();
        }, 1000);
    });

    VERSION_NAME = '3.5.1';

    document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
    });
    document.addEventListener('gesturechange', function (e) {
    e.preventDefault();
    });
    document.addEventListener('gestureend', function (e) {
    e.preventDefault();
    });

    const gearbox = document.getElementById('gearbox');
    const overlay = document.getElementById('overlay');
    const logoscr = document.getElementById('logoscr');
    const bottomlogo = document.getElementById('bottom-logo');
    const loadingText = document.getElementById('loading-text');

    function apparaitrelelogo() {
        gearbox.style.display = 'none';
        overlay.style.display = 'none';
        logoscr.style.display = 'block';
        bottomlogo.style.display = 'block';
        loadingText.style.display = 'none';
    }

    function disparaitrelelogo() {
        gearbox.style.display = 'block';
        overlay.style.display = 'block';
        logoscr.style.display = 'none';
        bottomlogo.style.display = 'none';
        loadingText.style.display = 'block';
    }


    const i18n = {
    translations: {},
    currentLang: 'fr',
    supportedLanguages: ['fr', 'it', 'ar', 'en'],
    defaultLang: 'fr',
    
    getBrowserLanguage() {
        const fullLang = navigator.language || navigator.userLanguage;
        const primaryLang = fullLang.split('-')[0];
        
        if (this.supportedLanguages.includes(primaryLang)) {
        return primaryLang;
        }
        
        return this.defaultLang;
    },
    
    getLanguageFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const lang = urlParams.get('lang');
        return lang || localStorage.getItem('preferredLanguage') || this.defaultLang;
    },
    
    async loadTranslations() {
        this.currentLang = this.getLanguageFromUrl();
        localStorage.setItem('preferredLanguage', this.currentLang);
        
        try {
        const response = await fetch(`../locales/${this.currentLang}.json`);
        this.translations = await response.json();
        document.dispatchEvent(new CustomEvent('translationsLoaded'));
        return this.translations;
        } catch (error) {
        console.error("Erreur lors du chargement des traductions:", error);
        return {};
        }
    },
    
    t(key, params = {}) {
        let text = this.translations[key] || key;
        
        Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
        });
        
        return text;
    },
    
    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (this.translations[key]) {
            element.innerHTML = this.translations[key];
        }
        });
    },
    
    addLangToUrl() {
        const browserLang = this.getBrowserLanguage();
        
        if (browserLang !== this.defaultLang) {
        const currentUrl = new URL(window.location.href);
        if (!currentUrl.searchParams.has('lang')) {
            currentUrl.searchParams.set('lang', browserLang);
            window.history.replaceState({}, '', currentUrl.toString());
        }
        }
        
        return browserLang;
    },
    
    init() {
        const detectedLang = this.addLangToUrl();
        const urlLang = new URLSearchParams(window.location.search).get('lang');
        
        if (!localStorage.getItem('preferredLanguage')) {
        localStorage.setItem('preferredLanguage', urlLang || detectedLang);
        }
        
        return this.loadTranslations();
    }
    };

    window.t = (key, params) => i18n.t(key, params);

    function waitForTranslations() {
    return new Promise(resolve => {
        if (Object.keys(i18n.translations).length > 0) {
        resolve();
        } else {
        document.addEventListener('translationsLoaded', () => resolve(), { once: true });
        }
    });
    }


    const fluentPopupStyles = `
    .fluent-popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 99999999999;
        opacity: 0;
        transition: opacity 0.1s ease;
    }

    .fluent-popup {
        background-color: rgba(0, 0, 0, 0.57);
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        padding: 20px;
        max-width: 400px;
        width: 90%;
        font-family: 'League Spartan', sans-serif;
        position: relative;
        transform: scale(0);
        transition: transform 0.5s cubic-bezier(.99,0,.53,1.28);
        color: #ffffff;
        margin-right: 20px;
        margin-left: 20px;
    }

    .fluent-popup.show {
        transform: scale(1);
    }

    .fluent-popup-overlay.show {
        opacity: 1;
    }

    .fluent-popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }

    .fluent-popup-title {
        font-size: 18px;
        font-weight: 600;
        margin: 0;
    }

    .fluent-popup-close {
        background: none;
        border: none;
        cursor: pointer;
        color: #555;
        width: 28px;
        height: 28px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
    }

    .fluent-popup-close:hover {
        background-color: rgba(0, 0, 0, 0.05);
        color: #000;
    }

    .fluent-popup-content {
        margin-bottom: 15px;
        line-height: 1.5;
    }

    .fluent-popup-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
    }

    .fluent-button {
        padding: 3px 14px;
        border-radius: 16px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
    }

    .fluent-button-primary {
        background: #0a84ff;
        color: #ffffff;
        box-shadow: 0 1px 4px rgba(10, 132, 255, 0.3);
    }

    .fluent-button-primary:hover {
        background-color: #106ebe;
    }

    .fluent-button-secondary {
        background-color: rgba(0, 0, 0, 0.05);
        color: #ffffff;
    }

    .fluent-button-secondary:hover {
        background-color: rgba(0, 0, 0, 0.1);
    }
    `;

    class FluentPopup {
    constructor() {
        this.initialized = false;
        this.isOpen = false;
        this.overlay = null;
        this.popup = null;
        this.styleElement = null;
    }

    init() {
        if (this.initialized) return;

        this.styleElement = document.createElement('style');
        this.styleElement.textContent = fluentPopupStyles;
        document.head.appendChild(this.styleElement);

        this.overlay = document.createElement('div');
        this.overlay.className = 'fluent-popup-overlay';
        
        
        this.popup = document.createElement('div');
        this.popup.className = 'fluent-popup';
        
        this.overlay.appendChild(this.popup);
        document.body.appendChild(this.overlay);

        this.initialized = true;
    }


    open(options = {}) {
        if (!this.initialized) this.init();
        if (this.isOpen) return;
        document.querySelector(".fluent-popup-overlay").style.display = "flex";

        const {
        title = 'Notification',
        message = '',
        buttons = {
            primary: 'OK',
            primaryAction: () => this.close()
        },
        closeButton = true
        } = options;

        this.popup.innerHTML = `
        <div class="fluent-popup-header">
            <h3 class="fluent-popup-title">${title}</h3>
        </div>
        <div class="fluent-popup-content">
            ${message}
        </div>
        <div class="fluent-popup-actions">
            ${buttons.secondary ? `<button class="fluent-button fluent-button-secondary">${buttons.secondary}</button>` : ''}
            <button class="fluent-button fluent-button-primary">${buttons.primary}</button>
        </div>
        `;


        const primaryBtn = this.popup.querySelector('.fluent-button-primary');
        primaryBtn.addEventListener('click', (e) => {
        if (buttons.primaryAction) buttons.primaryAction(e);
        });

        const secondaryBtn = this.popup.querySelector('.fluent-button-secondary');
        if (secondaryBtn && buttons.secondaryAction) {
        secondaryBtn.addEventListener('click', (e) => buttons.secondaryAction(e));
        }

        requestAnimationFrame(() => {
        this.overlay.classList.add('show');
        this.popup.classList.add('show');
        });

        this.isOpen = true;
    }

    close() {
        if (!this.isOpen) return;
        
        this.overlay.classList.remove('show');
        this.popup.classList.remove('show');
        
        setTimeout(() => {
        this.isOpen = false;
        document.querySelector(".fluent-popup-overlay").style.display = "none";
        }, 300);
    }


    destroy() {
        if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
        }
        
        if (this.styleElement && this.styleElement.parentNode) {
        this.styleElement.parentNode.removeChild(this.styleElement);
        }
        
        this.initialized = false;
        this.isOpen = false;
    }
    }

    const fluentPopupManager = new FluentPopup();

    function showFluentPopup(options = {}) {
    soundsUX('MBF_Popup');
    fluentPopupManager.open(options);
    }



    document.addEventListener('DOMContentLoaded', () => {

    if (localStorage.getItem('premiereuutilisation') !== 'true') {
        if (localStorage.getItem('transparency') !== 'true') {
            localStorage.setItem('transparency', true);
            localStorage.setItem('premiereUtilisation', true);
        }
    }

    i18n.init().then(() => {
        i18n.applyTranslations();
        if (langSwitcher && langSwitcher.updateCurrentLanguage) {
        langSwitcher.updateCurrentLanguage(i18n.currentLang);
        }
        waitForTranslations().then(() => {
            const settingsmbf = t("settingsmbf");
            const general = t("general");
            const advanced = t("advanced");
            const about = t("aboutmbf");
            const settings = t("settings");
            const satelmode = t("satelmode");
            const satelmodetext = t("satelmodetext");
            const locateonstart = t("locateonstart");
            const locateonstarttext = t("locateonstarttext");
            const selectlanguage = t("selectlanguage");
            const selectlanguagetext = t("selectlanguagetext");
            const spottingmode = t("spottingmode");
            const spottingmodetext = t("spottingmodetext");
            const theme = t("theme");
            const themeselect = t("themeselect");
            const defaulttheme = t("defaulttheme");
            const darktheme = t("darktheme");
            const hero = t("hero");
            const corail = t("corail");
            const barbie = t("barbie");
            const palmbus = t("palmbus");     
            const transparency = t("transparency");
            const transparencytext = t("transparencytext");
            const darkmap = t("darkmap");
            const darkmaptext = t("darkmaptext");   
            const betasetting = t("betasetting");
            const betasettingdarkmap = t("betasettingdarkmap");
            const understood = t("understood");
            const cancel = t("cancel");
            const languagepackversion = t("languagepackversion");
            const langversion = t("langversion");
            const erazecache = t("erazecache");
            const erazecachetext = t("erazecachetext");
            const vibrations = t("vibrations");
            const vibrationstext = t("vibrationstext");
            const soundsux = t("soundsux");
            const soundsuxtext = t("soundsuxtext");
            const customization = t("customization");
            const customizationtext = t("customizationtext");
            const findline = t("findline");
            const findlinetext = t("findlinetext");
            const nepasafficheraccueil = t("nepasafficheraccueil");
            const nepasafficheraccueiltext = t("nepasafficheraccueiltext");
            const hardwareaccelerationtitle = t("hardwareaccelerationtitle");
            const hardwareaccelerationtext = t("hardwareaccelerationtext");

                   

            FluentSettingsMenu.init({
                title: settingsmbf,
                accentColor: "#0078d7"
            });

            FluentSettingsMenu.createSection("general", general);
            FluentSettingsMenu.createSection("about", about);

            FluentSettingsMenu.addSubmenu("general", "customization", {
                icon: "",
                label: customization,
                description: customizationtext,
            });

            FluentSettingsMenu.addToggle("submenu-customization", "mapview", {
                icon: "🗺️",
                label: satelmode,
                description: satelmodetext,
                value: localStorage.getItem('isStandardView') === 'true',
                onChange: function (value) {
                toggleMapView(value);
                if (value) {
                    soundsUX('MBF_SettingOn');
                } else {
                    soundsUX('MBF_SettingOff');
                }
                }
            });

            FluentSettingsMenu.addSelect("submenu-customization", "themeselect", {
                icon: "🖌️",
                label: theme,
                description: themeselect,
                value: localStorage.getItem('theme') === 'default' ? 'default' : localStorage.getItem('theme'),
                options: [
                { value: 'default', label: defaulttheme },
                { value: 'dark', label: darktheme },
                { value: 'hero', label: hero },
                { value: 'corail', label: corail },
                { value: 'barbie', label: barbie },
                { value: 'palmbus', label: palmbus }
                ],
                onChange: function (value) {
                changeColorBkg(value);
                if (value) {
                    soundsUX('MBF_SettingOn');
                } else {
                    soundsUX('MBF_SettingOff');
                }
                }
            });

            FluentSettingsMenu.addToggle("general", "locate", {
                icon: "📍",
                label: locateonstart,
                description: locateonstarttext,
                value: localStorage.getItem('locateonstart') === 'true',
                onChange: function (value) {
                localStorage.setItem('locateonstart', value);
                if (value) {
                    soundsUX('MBF_SettingOn');
                } else {
                    soundsUX('MBF_SettingOff');
                }
                }
            });

            FluentSettingsMenu.addToggle("general", "locate", {
                icon: "🏠",
                label: nepasafficheraccueil,
                description: nepasafficheraccueiltext,
                value: localStorage.getItem('nepasafficheraccueil') === 'true',
                onChange: function (value) {
                localStorage.setItem('nepasafficheraccueil', value);
                if (value) {
                    soundsUX('MBF_SettingOn');
                } else {
                    soundsUX('MBF_SettingOff');
                }
                }
            });

            FluentSettingsMenu.addToggle("submenu-customization", "transparency", {
                icon: "🪟",
                label: transparency,
                description: transparencytext,
                value: localStorage.getItem('transparency') === 'true',
                onChange: function (value) {
                localStorage.setItem('transparency', value);
                if (value) {
                    soundsUX('MBF_SettingOn');
                } else {
                    soundsUX('MBF_SettingOff');
                }
                }
            });

            FluentSettingsMenu.addToggle("submenu-customization", "transparency", {
                icon: "📳",
                label: vibrations,
                description: vibrationstext,
                value: localStorage.getItem('vibrations') === 'true',
                onChange: function (value) {
                localStorage.setItem('vibrations', value);
                if (value) {
                    soundsUX('MBF_SettingOn');
                } else {
                    soundsUX('MBF_SettingOff');
                }
                }
            });

            FluentSettingsMenu.addToggle("submenu-customization", "transparency", {
                icon: "🔊",
                label: soundsux,
                description: soundsuxtext,
                value: localStorage.getItem('soundsux') === 'true',
                onChange: function (value) {
                localStorage.setItem('soundsux', value);
                if (value) {
                    soundsUX('MBF_SettingOn');
                } else {
                    soundsUX('MBF_SettingOff');
                }
                }
            });

            FluentSettingsMenu.addToggle("submenu-customization", "transparency", {
                icon: "〰️",
                label: findline,
                description: findlinetext,
                value: localStorage.getItem('filterlinesonselect') === 'true',
                onChange: function (value) {
                localStorage.setItem('filterlinesonselect', value);
                if (value) {
                    soundsUX('MBF_SettingOn');
                } else {
                    soundsUX('MBF_SettingOff');
                }
                }
            });

            FluentSettingsMenu.addLanguageSwitcher("general", {
                icon: "🌐",
                label: selectlanguage,
                description: selectlanguagetext,
                languages: [
                { code: 'fr', name: 'Français 🇫🇷' },
                { code: 'en', name: 'English 🇬🇧' },
                { code: 'it', name: 'Italiano 🇮🇹' },
                { code: 'ar', name: 'Arabe 🇸🇦' },
                ],
                currentLang: i18n.currentLang,
                onChange: (lang) => {
                localStorage.setItem('preferredLanguage', lang);
                location.reload(); // recharge pour refléter les traductions
                }
            });

            FluentSettingsMenu.addSubmenu("about", "aboutsub", {
                icon: "",
                label: "My Bus Finder - v" + window.VERSION_NAME,
                description: "made in Cannes with ❤️",
            });

            FluentSettingsMenu.addSubmenu("about", "instagram", {
                icon: "📸",
                label: "Instagram",
                description: "@becabdev",
                onclick: function () {
                    window.open('https://www.instagram.com/becabdev/', '_blank');
                }
            });

            FluentSettingsMenu.addSubmenu("submenu-aboutsub", "ver", {
                icon: "ℹ️",
                label: "Version",
                description: window.VERSION_NAME,
                onclick: function () {
                    return;
                }
            });

            FluentSettingsMenu.addSubmenu("submenu-aboutsub", "buildver", {
                icon: "🏗️",
                label: "Build",
                description: `${window.BUILD_VERSION}`,
                onclick: function () {
                    return;
                }
            });

            FluentSettingsMenu.addSubmenu("submenu-aboutsub", "lang", {
                icon: "📖",
                label: languagepackversion,
                description: i18n.currentLang + " - " + langversion,
                onclick: function () {
                    return;
                }
            });

            FluentSettingsMenu.addSubmenu("submenu-aboutsub", "opendata", {
                icon: "🚌",
                label: "Données temps-réel",
                description: "Ministère de l'Aménagement du Territoire, des Infrastructures et des Transports",
                onclick: function () {
                    window.open('https://transport.data.gouv.fr/', '_blank');
                }
            });

            FluentSettingsMenu.addSubmenu("submenu-aboutsub", "fluentdesign", {
                icon: "🖌️",
                label: "BecabDev Liquid UI Design System",
                description: "v1.0.0",
            });

            FluentSettingsMenu.addSubmenu("submenu-aboutsub", "protobuf", {
                icon: "📦",
                label: "Protobuf.js",
                description: "v3.21.12",
                onclick: function () {
                    window.open('https://protobuf.dev/', '_blank');
                }
            });

            FluentSettingsMenu.addSubmenu("submenu-aboutsub", "leaflet", {
                icon: "📦",
                label: "Leaflet.js",
                description: "v1.9.4",
                onclick: function () {
                    window.open('https://leafletjs.com/', '_blank');
                }
            });

            FluentSettingsMenu.addSubmenu("submenu-aboutsub", "osm", {
                icon: "📦",
                label: "OpenStreetMap Contributors",
                description: "© OpenStreetMap contributors (data: ODbL, map: CC-BY-SA 2.0)",
                onclick: function () {
                    window.open('https://www.openstreetmap.org/copyright', '_blank');
                }
            });

            FluentSettingsMenu.addSubmenu("submenu-aboutsub", "github", {
                icon: "🐈‍⬛",
                label: "GitHub",
                description: "becabdev/mybusfinder",
                onclick: function () {
                    window.open('https://github.com/becabdev/mybusfinder', '_blank');
                }
            });


            FluentSettingsMenu.addSubmenu("submenu-aboutsub", "erazecache", {
                icon: "🗑️",
                label: erazecache,
                description: erazecachetext,
                onclick: function () {
                    showFluentPopup({
                        title: erazecache,
                        message: erazecachetext,
                        buttons: {
                            primary: understood,
                            primaryAction: () => {
                                clearGTFSCache();
                                clearVehicleCache()
                                fluentPopupManager.close();
                            },
                            secondary: cancel,
                            secondaryAction: () => {
                                fluentPopupManager.close();
                            }
                        }
                    });
                }
            });
        });

    });
    });

    window.i18n = i18n;

document.addEventListener('DOMContentLoaded', function() {
    const menuItems = document.querySelectorAll('.menubottom-ul li a');

    if (localStorage.getItem('transparency') === 'true') {
        const map = document.getElementById('map');
        map.classList.remove('hiddennotransition');
        map.classList.add('appearnotransition');
        map.classList.remove('hidden');
        map.classList.remove('appear');
    } else {
        const map = document.getElementById('map');
        map.classList.remove('hidden');
        map.classList.add('appear');
        map.classList.remove('hiddennotransition');
        map.classList.remove('appearnotransition');
    }

    
    menuItems.forEach(item => {
        item.addEventListener('touchstart', function() {
            safeVibrate(50);
        });
        
        item.addEventListener('touchend', function() {
            safeVibrate(50);
        });
    });
});


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            toastBottomRight.info('Préparation en cours.')
            soundsUX('MBF_NotificationInfo');
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
        
        registration.update();
      })
      .catch(error => {
        console.error('Erreur lors de l\'enregistrement du service Worker:', error);
      });
  });
}

let globalSettings = {};

async function getSetvar() {
    try {
        const fileConfigs = [
            { key: 'colorbkg', path: 'setvar/settings/theme/maincolor.txt' },
            { key: 'view', path: 'setvar/settings/map/defaultzoom.txt' },
            { key: 'nomdureseau', path: 'setvar/settings/networkname.txt' },
            { key: 'boutique', path: 'setvar/settings/linkboutique.txt' }
        ];

        const filePromises = fileConfigs.map(async (config) => {
            const response = await fetch(config.path);
            const text = await response.text();
            return { key: config.key, value: text.trim() };
        });

        const results = await Promise.all(filePromises);

        const settings = {};
        results.forEach(result => {
            settings[result.key] = result.value;
        });

        const boutiqueCheckPromise = checkBoutiqueAvailability(settings.boutique);
        globalSettings = settings;

        boutiqueCheckPromise.catch(() => {
            window.boutiqueAvailable = false;
        });

        return settings;

    } catch (error) {
        console.error('Erreur chargement setvar ! ', error);
        window.boutiqueAvailable = false;
        throw error; 
    }
}

async function checkBoutiqueAvailability(boutiqueUrl) {
    window.boutiqueAvailable = true;
}

let settingsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; 

async function getSetvarWithCache() {
    const now = Date.now();
    
    if (settingsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        return settingsCache;
    }
    
    const settings = await getSetvar();
    
    settingsCache = settings;
    cacheTimestamp = now;
    
    return settings;
}

getSetvar();

const vehicleModels = {};

const vehicleTypes = {
    'elec': new Set(),
    'hybrid': new Set(),
    'gnv': new Set(),
    'usb': new Set(),
    'clim': new Set()
};

let map;

async function changeColorBkg(selectedTheme = null) {
    const data = await getSetvar();
    const defaultColor = data && data.colorbkg ? data.colorbkg : "#005A9E";

    const themes = {
        default: defaultColor,
        dark: "#121212",
        hero: "#2A2A6E",
        corail: "#444444",
        barbie: "#9A0D5B",
        palmbus: "#B38F00"
    };

    const savedTheme = localStorage.getItem("theme") || "default";
    const theme = selectedTheme || savedTheme;

    const baseColor = themes[theme] || themes["default"];
    const colorWithAlpha = `${baseColor}9c`;

    localStorage.setItem("theme", theme);
    localStorage.setItem("colorbkg", baseColor);

    document.getElementById("menubtm").style.backgroundColor = colorWithAlpha;
    document.documentElement.style.backgroundColor = colorWithAlpha;

    window.colorbkg = baseColor;
    window.colorbkg9c = colorWithAlpha;
}


(async () => {
    await changeColorBkg();
})();

setTimeout(() => {
    const logoscr = document.getElementById('logoscr');
    logoscr.classList.add('logoscrapp');
    document.getElementById("bottom-logo").classList.add("logoscrapp");
}, 10); 

function soundsUX(soundFileName) {
    if (localStorage.getItem('soundsux') === 'true') {
        const audio = new Audio('../soundsUX/' + soundFileName + '.wav');
        audio.volume = 1.0;
        audio.play().catch(error => {
            console.error('Erreur lors de la lecture du son UserXperience', error);
        });
    }
}

async function initMap() {
    const data = await getSetvar();
    let defaultCoords = [43.125463, 5.930077];
    let defaultZoom = 13;
    
    if (data && data.view) {
        try {
            const viewConfig = data.view.match(/\[(.*?)\],\s*(\d+)/);
            if (viewConfig && viewConfig.length >= 3) {
                const coords = viewConfig[1].split(',').map(coord => parseFloat(coord.trim()));
                defaultCoords = [coords[0], coords[1]];
                defaultZoom = parseInt(viewConfig[2]);
            }
        } catch (error) {
            console.error('Erreur parsing des coord gps', error);
        }
    }
    
    const storageKey = `mapPosition_${location.pathname}`;
    const savedPosition = JSON.parse(localStorage.getItem(storageKey) || "null");

    window.mapInstance = L.map('map', {
        zoomControl: false
    }).setView(
        savedPosition && savedPosition.center ? savedPosition.center : defaultCoords,
        savedPosition && savedPosition.zoom ? savedPosition.zoom : defaultZoom
    );

    mapInstance.on("moveend", () => {
        const center = mapInstance.getCenter();
        const zoom = mapInstance.getZoom();
        localStorage.setItem(storageKey, JSON.stringify({
            center: [center.lat, center.lng],
            zoom: zoom
        }));
    });

    
    L.popup({
        closeButton: false
    });

    mapInstance.on('moveend', function() {
        if (isSunOrientationVisible) {
            updateSunOrientation();
        }
    });
    
    mapInstance.on('popupopen', function (e) {
        const popupWrapper = e.popup._wrapper; 
        popupWrapper.classList.remove('popup-zoom-out', 'popup-zoom-in');
        setTimeout(() => {
            popupWrapper.classList.add('popup-zoom-in');
        }, 10); 
    });
    
    mapInstance.on('popupclose', function (e) {
        const popupWrapper = e.popup._wrapper; 
        popupWrapper.classList.remove('popup-zoom-in');
        popupWrapper.classList.add('popup-zoom-out');
        popupWrapper.addEventListener(
            'transitionend',
            () => {
                popupWrapper.classList.remove('popup-zoom-out');
            },
            { once: true }
        );
    });

    


    const isStandardView = localStorage.getItem('isStandardView') === 'true';
    
    if (!isStandardView) {
    const tileLayerUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    
    const tileLayer = L.tileLayer(tileLayerUrl, {
        minZoom: 6,
        maxZoom: 19,
    }).addTo(mapInstance);


} else {
    const mapPane = mapInstance.getPanes().tilePane;
    mapPane.style.filter = 'none';
    
    L.tileLayer('https://data.geopf.fr/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&STYLE={style}&TILEMATRIXSET=PM&FORMAT={format}&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}', {
        minZoom: 6,
        maxZoom: 19,
        format: 'image/jpeg',
        style: 'normal'
    }).addTo(mapInstance);

}




mapInstance.attributionControl.setPrefix('');

    mapInstance.on('locationfound', onLocationFound);
    mapInstance.on('locationerror', onLocationError);

    return mapInstance;
}

let locationMarker = null;
let locationCircle = null;
let isLocating = false;
let watchId = null;

function locateMe() {
    if (!navigator.geolocation) {
        console.warn('La géolocalisation n\'est pas supportée par ce navigateur.');
        return;
    }

    if (isLocating) {
        stopLocating();
        return;
    }

    isLocating = true;

    watchId = navigator.geolocation.watchPosition(
        (position) => onLocationFound({
            latlng: L.latLng(position.coords.latitude, position.coords.longitude),
            accuracy: position.coords.accuracy
        }),
        (error) => onLocationError({ message: error.message }),
        {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000
        }
    );
}

function stopLocating() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    isLocating = false;

    if (locationMarker) {
        mapInstance.removeLayer(locationMarker);
        locationMarker = null;
    }
    if (locationCircle) {
        mapInstance.removeLayer(locationCircle);
        locationCircle = null;
    }
}

function onLocationFound(e) {
    const radius = e.accuracy;
    const latlng = e.latlng;

    if (locationCircle) {
        locationCircle.setLatLng(latlng).setRadius(radius);
    } else {
        locationCircle = L.circle(latlng, {
            radius: radius,
            color: '#4A90E2',
            fillColor: '#4A90E2',
            fillOpacity: 0.15,
            weight: 1
        }).addTo(mapInstance);
    }

    if (locationMarker) {
        locationMarker.setLatLng(latlng);
    } else {
        const locationIcon = L.divIcon({
            className: '',
            html: `
                <div style="
                    width: 18px;
                    height: 18px;
                    background: #4A90E2;
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 0 6px rgba(0,0,0,0.4);
                    position: relative;
                ">
                    <div style="
                        position: absolute;
                        inset: -6px;
                        border-radius: 50%;
                        background: rgba(74, 144, 226, 0.25);
                        animation: pulse 2s infinite;
                    "></div>
                </div>
            `,
            iconSize: [18, 18],
            iconAnchor: [9, 9]
        });

        locationMarker = L.marker(latlng, { icon: locationIcon, zIndexOffset: 1000 })
            .addTo(mapInstance);

        mapInstance.setView(latlng, Math.max(mapInstance.getZoom(), 16));
    }
}

function onLocationError(e) {
    console.error('Erreur de géolocalisation :', e.message);
    isLocating = false;
}

function locateUser() {
    if (!map) return;
    
    locateMe();
}

(async function() {
    map = await initMap();
})();

const sunOverlay = document.getElementById('sun-overlay');
    let isSunOrientationVisible = false; 

    function updateSunOrientation(date = new Date()) {
        sunOverlay.innerHTML = '';

        const center = map.getCenter();
        const centerLat = center.lat;
        const centerLon = center.lng;

        const sunTimes = SunCalc.getTimes(date, centerLat, centerLon);
        const sunrise = sunTimes.sunrise;
        const sunset = sunTimes.sunset;

        const mapSize = map.getSize();
        const centerPoint = {
            x: mapSize.x / 2,
            y: mapSize.y / 2
        };

        const currentTime = new Date(sunrise);
        const radius = Math.min(mapSize.x, mapSize.y) * 0.4; 

        while (currentTime <= sunset) {
            const sunPosition = SunCalc.getPosition(currentTime, centerLat, centerLon);
            
            const azimuthDegrees = sunPosition.azimuth * (180 / Math.PI);
            const angleRad = (azimuthDegrees + 90) * (Math.PI / 180); 

            const endX = centerPoint.x + radius * Math.cos(angleRad);
            const endY = centerPoint.y + radius * Math.sin(angleRad);

            const hourColor = getColorForTime();

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute('x1', centerPoint.x);
            line.setAttribute('y1', centerPoint.y);
            line.setAttribute('x2', endX);
            line.setAttribute('y2', endY);
            line.setAttribute('stroke', hourColor);
            line.setAttribute('stroke-width', '2');
            line.classList.add('sun-line');
            sunOverlay.appendChild(line);

            const hourCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            hourCircle.setAttribute('cx', endX);
            hourCircle.setAttribute('cy', endY);
            hourCircle.setAttribute('r', '25');
            hourCircle.setAttribute('fill', hourColor);

            const hourText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            hourText.setAttribute('x', endX);
            hourText.setAttribute('y', endY);
            hourText.setAttribute('text-anchor', 'middle');
            hourText.setAttribute('dy', '.3em');
            hourText.setAttribute('fill', 'white');
            hourText.setAttribute('font-size', '18');
            hourText.textContent = currentTime.getHours();

            sunOverlay.appendChild(hourCircle);
            sunOverlay.appendChild(hourText);

            currentTime.setHours(currentTime.getHours() + 1);
        }

        const now = new Date();
        if (now >= sunrise && now <= sunset) {
            const nowSunPosition = SunCalc.getPosition(now, centerLat, centerLon);
            const nowAzimuthDegrees = nowSunPosition.azimuth * (180 / Math.PI);
            const nowAngleRad = (nowAzimuthDegrees + 90) * (Math.PI / 180); 

            const nowEndX = centerPoint.x + radius * Math.cos(nowAngleRad);
            const nowEndY = centerPoint.y + radius * Math.sin(nowAngleRad);

            const nowLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            nowLine.setAttribute('x1', centerPoint.x);
            nowLine.setAttribute('y1', centerPoint.y);
            nowLine.setAttribute('x2', nowEndX);
            nowLine.setAttribute('y2', nowEndY);
            nowLine.setAttribute('stroke', 'black');
            nowLine.setAttribute('stroke-width', '4');
            sunOverlay.appendChild(nowLine);
        }
    }

    function getColorForTime() {
        return 'black'; 
    }

function toggleSunOrientation(forceState) {
    if (forceState !== undefined) {
        isSunOrientationVisible = forceState;
    } else {
        isSunOrientationVisible = !isSunOrientationVisible;
    }
    
    if (isSunOrientationVisible) {
        sunOverlay.style.opacity = 1; 
        updateSunOrientation();
        window.nearbyVehiclesControl.show();
        window.nearbyVehiclesControl.collapse();
    } else {
        sunOverlay.style.opacity = 0; 
        setTimeout(() => sunOverlay.innerHTML = '', 500); 
        window.nearbyVehiclesControl.hide();
    }
}


const markers = {};
let lineColors = {};
let lineName = {};
let stopIds = [];
let stopNameMap = {}
let selectedLine = null;
let geoJsonLines = []; 
let tripUpdates = {};
let loadingInterval;

// ==================== MARKER POOL ====================
class MarkerPool {
    constructor(maxSize = 200) {
        this.pool = [];
        this.active = new Map();
        this.maxSize = maxSize;
    }
    
    acquire(id, lat, lon, routeId, bearing) {
        let marker = this.pool.pop();
        
        if (!marker) {
            marker = createColoredMarker(lat, lon, routeId, bearing);
        } else {
            marker.setLatLng([lat, lon]);
            this.updateMarkerStyle(marker, routeId, bearing);
        }
        
        marker.id = id;
        this.active.set(id, marker);
        return marker;
    }
    
    release(id) {
        const marker = this.active.get(id);
        if (!marker) return;
        
        if (marker.isPopupOpen()) {
            marker.closePopup();
        }
        
        if (marker.minimalPopup) {
            map.removeLayer(marker.minimalPopup);
            marker.minimalPopup = null;
        }
        
        map.removeLayer(marker);
        this.active.delete(id);
        
        if (this.pool.length < this.maxSize) {
            this.pool.push(marker);
        }
    }
    
    updateMarkerStyle(marker, routeId, bearing) {
        const color = lineColors[routeId] || '#000000';
        
        if (marker._icon) {
            const markerIcon = marker._icon.querySelector('.marker-icon');
            if (markerIcon) {
                markerIcon.style.backgroundColor = color;
            }
            
            const arrowElement = marker._icon.querySelector('.marker-arrow');
            if (arrowElement) {
                arrowElement.style.transform = `rotate(${bearing - 90}deg)`;
            }
        }
    }
    
    get(id) {
        return this.active.get(id);
    }
    
    has(id) {
        return this.active.has(id);
    }
    
    clear() {
        this.active.forEach((marker, id) => this.release(id));
        this.pool = [];
    }
}

const markerPool = new MarkerPool();
// ==================== FIN MARKER POOL ====================

// ==================== EVENT MANAGER ====================
class EventManager {
    constructor() {
        this.listeners = new Map();
    }
    
    on(target, event, handler, id) {
        const key = `${id}-${event}`;
        this.off(target, event, id);
        target.on(event, handler);
        this.listeners.set(key, { target, event, handler });
    }
    
    off(target, event, id) {
        const key = `${id}-${event}`;
        const listener = this.listeners.get(key);
        if (listener) {
            listener.target.off(event, listener.handler);
            this.listeners.delete(key);
        }
    }
    
    clear() {
        this.listeners.forEach(({ target, event, handler }) => {
            target.off(event, handler);
        });
        this.listeners.clear();
    }
}

const eventManager = new EventManager();
// ==================== FIN EVENT MANAGER ====================

// ==================== STYLE MANAGER ====================
const StyleManager = {
    styles: new Map(),
    maxStyles: 10,
    
    applyMenuStyle(textColor) {
        document.querySelectorAll('.menu-color-style').forEach(style => {
            if (!this.styles.has(style.id)) {
                style.remove();
            }
        });
        
        if (this.styles.size >= this.maxStyles) {
            const oldestId = this.styles.keys().next().value;
            const oldStyle = document.getElementById(oldestId);
            if (oldStyle) oldStyle.remove();
            this.styles.delete(oldestId);
        }
        
        const styleId = `style-${Date.now()}`;
        const styleSheet = document.createElement('style');
        styleSheet.id = styleId;
        styleSheet.classList.add('menu-color-style');
        
        styleSheet.textContent = `
            #menubtm * {
                color: ${textColor};
            }
        `;
        
        document.head.appendChild(styleSheet);
        this.styles.set(styleId, Date.now());
        
        return styleId;
    },
    
    removeStyle(styleId) {
        const style = document.getElementById(styleId);
        if (style) {
            style.remove();
            this.styles.delete(styleId);
        }
    },
    
    clearAll() {
        this.styles.forEach((_, id) => this.removeStyle(id));
    }
};
// ==================== FIN STYLE MANAGER ====================


function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.style.display = 'flex';
    loadingInterval = setInterval(() => {}, 0);
}
		

let globalStopSpinner = null;
let HorairesCharges = false;

function showUpdatePopupPourHoraires() {
    window.open('schedule.html', '_blank');
}

function showUpdatePopupLocalBus(link) {
    const popup = document.getElementById('update-popup');
    const boutonFermer = document.getElementById('close-popup');
    boutonFermer.style.display = 'none';
    const iframe = document.getElementById('webview-frame');
    const currentLang = i18n.currentLang;
    const hasParams = link.includes('?');
    const langParam = `lang=${currentLang}`;
    popup.classList.remove('closepop');


    const popupContent = document.querySelector('.popup-content');
    popupContent.style.position = 'relative';
    
    if (hasParams) {
        iframe.src = `${link}&${langParam}`;
    } else {
        iframe.src = `${link}?${langParam}`;
    }
    
    
    
    popup.style.display = 'flex'; 
    const menubottom1 = document.getElementById('menubtm');

    menubottom1.classList.remove('slide-downb');
    menubottom1.classList.add('slide-upb');
    if (selectedLine) {
        resetMapView();            
    }

    menubottom1.addEventListener('transitionend', () => {
        if (menubottom1.classList.contains('slide-up')) {
            menubottom1.style.display = 'none';
        }
    }, { once: true });
}


function showUpdatePopup(link) {
    const popup = document.getElementById('update-popup');
    const boutonFermer = document.getElementById('close-popup');
    boutonFermer.style.display = 'fixed';
    const iframe = document.getElementById('webview-frame');
    const currentLang = i18n.currentLang;
    const hasParams = link.includes('?');
    const langParam = `lang=${currentLang}`;
    popup.classList.remove('closepop');
    

    const popupContent = document.querySelector('.popup-content');
    popupContent.style.position = 'relative';
    
    if (hasParams) {
        iframe.src = `${link}&${langParam}`;
    } else {
        iframe.src = `${link}?${langParam}`;
    }
        
    popup.style.display = 'flex'; 
    const menubottom1 = document.getElementById('menubtm');

    menubottom1.classList.remove('slide-downb');
    menubottom1.classList.add('slide-upb');
    if (selectedLine) {
        resetMapView();            
    }

    menubottom1.addEventListener('transitionend', () => {
        if (menubottom1.classList.contains('slide-up')) {
            menubottom1.style.display = 'none';
        }
    }, { once: true });
}



function startWindowsSpinnerAnimation(elementId, interval = 30) {
    const frames = [
    '','','','','','','','','','','','','','','','',
    '','','','','','','','','','','','','','','','',
    '','','','','','','','','','','','','','','','',
    '','','','','','','','','','','','','','','','',
    '','','','','','','','','','','','','','','','',
    '','','','','','','','','','','','','','','','',
    '','','','','','','','','','','','','','','','',
    '','','','','','','','','',''
  ];


  const el = document.getElementById(elementId);
  if (!el) {
    return () => {};
  }

  let i = 0;
  const timer = setInterval(() => {
    el.textContent = frames[i];
    i = (i + 1) % frames.length;
  }, interval);
  return () => clearInterval(timer);
}

function showUpdatePopupmusic(link) {
    const popup = document.getElementById('update-popup');
    const iframe = document.getElementById('webview-frame');
    const currentLang = i18n.currentLang;
    const hasParams = link.includes('?');
    const langParam = `lang=${currentLang}`;
    showLanguageSwitcher();

    
    if (hasParams) {
        iframe.src = `${link}&${langParam}`;
    } else {
        iframe.src = `${link}?${langParam}`;
    }
    
    popup.style.display = 'flex'; 
    const menubottom1 = document.getElementById('menubtm');
    const menu = document.getElementById('menu');
    const menubotom = document.getElementById('menubottom');

    menubottom1.classList.remove('slide-downb');
    menubottom1.classList.add('slide-upb');
    if (selectedLine) {
        resetMapView();            
    }

    menubottom1.addEventListener('transitionend', () => {
        if (menubottom1.classList.contains('slide-up')) {
            menubottom1.style.display = 'none';
        }
    }, { once: true });
}

window.addEventListener('message', function(event) {
    if (event.data && event.data.action === 'showUpdatePopup') {
        if (window.parent && typeof window.parent.showUpdatePopup === 'function') {
            window.parent.showUpdatePopup(event.data.url);
        }
    }
}, false);



function focusOnVehicle(vehicleId) {
    try {        
        closeUpdatePopup();
        
        const marker = Object.values(markers).find(m => m.id === vehicleId);
        
        if (!marker) {
            toastBottomRight.error('La position du véhicule est indisponible');
            soundsUX('MBF_NotificationError');
            return;
        }
        
        
        try {
            map.setView(marker.getLatLng(), 17);
            marker.openPopup();
            
            const markerIcon = marker._icon.querySelector('.marker-icon');
            if (!markerIcon) {
                toastBottomRight.error('La position du véhicule est indisponible');
                soundsUX('MBF_NotificationError');
                return;
            }
            
            markerIcon.style.transform = 'scale(1.3)';
            setTimeout(() => {
                markerIcon.style.transform = 'scale(1)';
            }, 500);
            
        } catch (mapError) {
            toastBottomRight.error('Une erreur interne est survenue ! Prière contacter le support MyBusFinder en leur indiquant ce code d\'erreur : manipulating marker error');
            soundsUX('MBF_NotificationError');
        }
    } catch (error) {
        toastBottomRight.error('Une erreur interne est survenue ! Prière contacter le support MyBusFinder en leur indiquant ce code d\'erreur : focusOnVehicle function error');
        soundsUX('MBF_NotificationError');
    }
}

window.addEventListener('message', function(event) {
    try {        
        if (event.data && event.data.type === 'vehicleSelected') {
            const vehicleId = event.data.vehicleId;
            closeUpdatePopup();
            focusOnVehicle(vehicleId);
        }
    } catch (error) {
        console.error('Error ', error);
    }
});

function closeUpdatePopup() {
    const popup = document.getElementById('update-popup');
    const popup1 = document.getElementById('time-popup');
    const iframe = document.getElementById('webview-frame');
    hideLanguageSwitcher();

    
    if (iframe.dataset.originalSrc) {
        const timestamp = new Date().getTime();
        iframe.src = iframe.dataset.originalSrc + (iframe.dataset.originalSrc.includes('?') ? '&' : '?') + 'cache=' + timestamp;
    } else {
        if (iframe.src && iframe.src !== "") {
            iframe.dataset.originalSrc = iframe.src;
            const timestamp = new Date().getTime();
            iframe.src = iframe.src + (iframe.src.includes('?') ? '&' : '?') + 'cache=' + timestamp;
        } else {
            iframe.src = "";
        }
    }
    
    popup.classList.add('closepop');
    setTimeout(() => {
        popup.style.display = 'none'; 
        popup1.style.display = 'none'; 
    }, 300);

}


document.getElementById('close-popup').addEventListener('click', closeUpdatePopup);
document.getElementById('close-popup1').addEventListener('click', closeUpdatePopup);





function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');

    if (localStorage.getItem('buildversion') !== window.BUILD_VERSION) {
        setTimeout(() => {
        window.updating = true;
        disparaitrelelogo();
        const loadingtext = document.getElementById('loading-text');
        loadingtext.textContent = 'Mise à jour en cours ' + window.VERSION_NAME;
        ProgressOverlay.setLabel('Copying logic-' + window.VERSION_NAME + '-' + window.BUILD_VERSION + '.js');
        let progress = 0;

        const intervalId = setInterval(() => {
            progress++;
            updateLoadingProgress(progress);

            if (progress >= 100) {
                clearInterval(intervalId); 
                window.location.reload();
            }
        }, 30);

        soundsUX('MBF_NotificationInfo');
        localStorage.setItem('buildversion', window.BUILD_VERSION);

        }, 500);


    } else {
        const logoscr = document.getElementById('logoscr');
        logoscr.classList.add('logoscrappp');
        loadingScreen.classList.add('logoscrapppp');
        loadingScreen.style.pointerEvents = 'none';
        const menubottom1 = document.getElementById('menubtm');
        menubottom1.style.display = 'flex';
        window.isMenuShowed = false;

        if (localStorage.getItem('nepasafficheraccueil') === 'true') {
            setTimeout(() => {
                menubottom1.classList.remove('slide-upb');
                menubottom1.classList.add('slide-downb');
            }, 10);
        }

        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 300);
    }
}


document.addEventListener('DOMContentLoaded', initializeApp);
const doc = document;
showLoadingScreen();


let data;

let DB_NAME;
let STORE_NAME;
const DB_VERSION = 4;

async function initConstants() {
    try {
        const { nomdureseau } = await getSetvar();
        DB_NAME = `MyBusFinder${nomdureseau}`;
        STORE_NAME = `gtfsStore${nomdureseau}`;
        return { DB_NAME, STORE_NAME };
    } catch (error) {
        console.error('Erreur lors de l\'initialisation des constantes', error);
        DB_NAME = 'MyBusFinderDefault';
        STORE_NAME = 'gtfsStoreDefault';
        return { DB_NAME, STORE_NAME };
    }
}

async function initDB() {
    if (!DB_NAME || !STORE_NAME) {
        await initConstants();
    }
    
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

async function calculateSHA256(data) {
    let buffer;
    if (data instanceof ArrayBuffer) {
        buffer = data;
    } else if (typeof data === 'string') {
        const encoder = new TextEncoder();
        buffer = encoder.encode(data).buffer;
    } else if (data instanceof Blob) {
        buffer = await data.arrayBuffer();
    } else {
        const jsonString = JSON.stringify(data);
        const encoder = new TextEncoder();
        buffer = encoder.encode(jsonString).buffer;
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
}

async function getFileHash() {
    try {
        const response = await fetch('proxy-cors/proxy_gtfs.php', {
            method: 'GET',
            headers: {
                'X-Content-Only-Header': 'true'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Échec de la vérif ${response.status}`);
        }
        
        const buffer = await response.arrayBuffer();
        const partialData = buffer.slice(0, Math.min(buffer.byteLength, 1024 * 50));
        
        const fileHash = await calculateSHA256(partialData);
        
        return { fileHash, needsFullDownload: true };
    } catch (error) {
        console.error('Erreur lors de la vérif du hash', error);
        return { needsFullDownload: true };
    }
}

async function checkGTFSUpdate() {
    try {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        const storedMetadata = await new Promise((resolve, reject) => {
            const request = store.get('gtfsMetadata');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        if (!storedMetadata || !storedMetadata.fileHash) {
            return { needsUpdate: true };
        }
        
        const { fileHash, needsFullDownload } = await getFileHash();
        
        if (fileHash !== storedMetadata.fileHash) {
            return { needsUpdate: true, fileHash };
        }
        
        return { needsUpdate: false, metadata: storedMetadata };
    } catch (error) {
        console.error('Erreur vérif maj GTFS', error);
        return { needsUpdate: true };
    }
}

async function saveToCache(data, metadata) {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            store.put(data, 'gtfsData');
            
            if (!metadata) {
                metadata = {};
            }
            metadata.lastUpdate = new Date().toISOString();
            store.put(metadata, 'gtfsMetadata');

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    } catch (error) {
        console.error('Erreur sauvegarde dans le cache', error);
        throw error;
    }
}

async function getFromCache() {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get('gtfsData');

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Erreur lors de la récup cache', error);
        return null;
    }
}

async function extractGTFSFiles() {
    try {
        disparaitrelelogo();
        const loadingtext = document.getElementById('loading-text');
        loadingtext.textContent = 'Chargement des données dyna en cours - async... 😊';
        soundsUX('MBF_Popup');

        const response = await fetch('proxy-cors/proxy_gtfs.php?action=extracted');
        if (!response.ok) {
            throw new Error(`Échec téléchargement ${response.status} ${response.statusText}`);
        }
        
        const extractedFiles = await response.json();
        
        const filesString = JSON.stringify(extractedFiles);
        const encoder = new TextEncoder();
        const data = encoder.encode(filesString.substring(0, Math.min(filesString.length, 1024 * 50)));
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        const metadata = {
            fileHash,
            lastUpdate: new Date().toISOString()
        };
        
        return { extractedFiles, metadata };
    } catch (error) {
        console.error('Erreur lors du chargement des fichiers GTFS', error);
        throw error;
    }
}

function parseCSVLine(csvLine) {
    const result = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let i = 0; i < csvLine.length; i++) {
        const char = csvLine[i];
        
        if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            result.push(currentValue);
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    
    result.push(currentValue);
    
    return result.map(value => {
        if (value.startsWith('"') && value.endsWith('"')) {
            return value.slice(1, -1);
        }
        return value;
    });
}

async function loadLineColors(routesFileContent) {
    try {
        if (!routesFileContent) {
            console.warn('Aucun contenu de fichier routes fourni');
            return;
        }
        
        if (typeof routes === 'undefined') window.routes = {};
        if (typeof lineColors === 'undefined') window.lineColors = {};
        if (typeof lineName === 'undefined') window.lineName = {};
        
        const data = await getSetvar();
        if (!data) {
            console.error('Échec récupération variables de config');
            return;
        }
       
        const lines = routesFileContent.split(/\r\n|\n/);
       
        const headers = parseCSVLine(lines[0]);
        const routeIdIndex = headers.indexOf('route_id');
        const shortNameIndex = headers.indexOf('route_short_name');
        const longNameIndex = headers.indexOf('route_long_name');
        const routeTypeIndex = headers.indexOf('route_type');
        const routeColorIndex = headers.indexOf('route_color');
        const routeTextColorIndex = headers.indexOf('route_text_color');
        const agencyIdIndex = headers.indexOf('agency_id');
       
        if (routeIdIndex === -1) {
            return;
        }
        
        if (routeColorIndex === -1) {
            console.warn('route_color non trouvée, les couleurs par défaut seront utilisées');
        }
        
        const startIndex = data.slicelinecolor ? parseInt(data.slicelinecolor) : 1;
       
        lines.slice(startIndex).forEach(line => {
            if (!line.trim()) return;
           
            const values = parseCSVLine(line);
            if (values.length <= routeIdIndex) {
                console.warn('Ligne ignorer dans routes txt, données incomplètes', line);
                return;
            }
           
            const routeId = values[routeIdIndex];
            if (routeId) {
                routes[routeId] = {
                    short_name: shortNameIndex !== -1 && values[shortNameIndex] ? values[shortNameIndex] : '',
                    long_name: longNameIndex !== -1 && values[longNameIndex] ? values[longNameIndex] : '',
                    route_type: routeTypeIndex !== -1 ? parseInt(values[routeTypeIndex] || '0', 10) : 0,
                    route_color: routeColorIndex !== -1 && values[routeColorIndex] ? `#${values[routeColorIndex]}` : '#FFFFFF',
                    route_text_color: routeTextColorIndex !== -1 && values[routeTextColorIndex] ? `#${values[routeTextColorIndex]}` : '#000000',
                    agency_id: agencyIdIndex !== -1 ? values[agencyIdIndex] : null
                };
                
                let routeColor = routeColorIndex !== -1 ? values[routeColorIndex] : '';
                if (routeColor && !routeColor.startsWith('#') && routeColor.trim() !== '') {
                    routeColor = `#${routeColor}`;
                } else if (!routeColor) {
                    routeColor = '#FFFFFF'; 
                }
                
                const routeDisplayName = shortNameIndex !== -1 && values[shortNameIndex] ? 
                    values[shortNameIndex] : 
                    (longNameIndex !== -1 && values[longNameIndex] ? values[longNameIndex] : '');
                
                let cleanedLineName = routeDisplayName ? routeDisplayName.replace(/\"/g, '').trim() : '';
                
                lineColors[routeId] = routeColor;
                lineName[routeId] = cleanedLineName;
            }
        });
       
        
    } catch (error) {
        console.error('Errreur lors du chargement des itineraires et couleurs', error);
    }
}

async function loadStopIds(stopsFileContent) {
    try {
        if (!stopsFileContent) {
            return;
        }
        
        const lines = stopsFileContent.split('\n');
        
        const headers = lines[0].split(',');
        const stopIdIndex = headers.indexOf('stop_id');
        
        if (stopIdIndex !== -1) {
            lines.slice(1).forEach(line => {
                if (line.trim()) {
                    const columns = line.split(',');
                    let stopId = columns[stopIdIndex];
                    
                    stopId = stopId.replace(/\"/g, '');
                    
                    if (stopId) {
                        stopIds.push(stopId);
                    }
                }
            });
        }
    } catch (error) {
        console.error('Erreur', error);
    }
}

async function loadLineTerminusData(stopsFileContent) {
    try {
        if (!stopsFileContent) {
            return;
        }
        
        const lines = stopsFileContent.split('\n');
        const headers = lines[0].split(',');
        const stopIdIndex = headers.indexOf('stop_id');
        const stopNameIndex = headers.indexOf('stop_name');
        
        if (stopIdIndex !== -1 && stopNameIndex !== -1) {
            lines.slice(1).forEach(line => {
                if (line.trim()) {
                    const columns = line.split(',');
                    let stopId = columns[stopIdIndex];
                    let stopName = columns[stopNameIndex];
                    
                    stopId = stopId.replace(/\"/g, '');
                    stopName = stopName.replace(/\"/g, '');
                    
                    if (stopId && stopName) {
                        stopNameMap[stopId] = stopName;
                    }
                }
            });
        }
    } catch (error) {
        console.error('Erreur', error);
    }
}

const ProgressOverlay = {
  overlay: null,
  progressBar: null,
  animationInterval: null,
  isCollecting: false,
  collectionTimeout: null,
  pendingProgress: null,
  currentProgress: 0,

  injectStyles() {
    if (document.getElementById('progress-overlay-styles')) return;
    const style = document.createElement('style');
    style.id = 'progress-overlay-styles';
    style.textContent = `
      #progress-overlay {
        position: fixed;
        top: 0px;
        left: 50%;
        transform: translateX(-50%) translateY(-40px);
        z-index: 9999999;
        width: 90%;
        background: rgba(30, 30, 30, 0.75);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
        padding: 16px 200px;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', sans-serif;
        opacity: 0;
        transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
      }

      #progress-overlay.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0px);
      }

      #progress-overlay.hiding {
        opacity: 0;
        transform: translateX(-50%) translateY(-40px);
      }

      .po-label-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .po-label {
        font-size: 12px;
        color: #98989d;
        font-weight: 500;
      }

      .po-percent {
        font-size: 12px;
        color: #98989d;
        font-weight: 500;
        font-variant-numeric: tabular-nums;
      }

      .po-container {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }

      .po-bar {
        height: 100%;
        border-radius: 4px;
        position: absolute;
        left: 0;
        width: 0%;
        background: linear-gradient(90deg, #007aff 0%, #0051d5 100%);
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .po-bar.indeterminate {
        animation: po-move 2s cubic-bezier(0.4, 0, 0.6, 1) infinite,
                   po-width 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        background: linear-gradient(90deg, #007aff 0%, #0051d5 100%);
        transition: none;
      }

      .po-bar.completed {
        background: linear-gradient(90deg, #34c759 0%, #30b350 100%);
        width: 100% !important;
        left: 0 !important;
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      @keyframes po-move {
        0%   { left: 0%; }
        50%  { left: 95%; }
        100% { left: 0%; }
      }

      @keyframes po-width {
        0%   { width: 5%; }
        25%  { width: 35%; }
        50%  { width: 5%; }
        75%  { width: 35%; }
        100% { width: 5%; }
      }
    `;
    document.head.appendChild(style);
  },

  create(label = '') {
    this.injectStyles();
    if (document.getElementById('progress-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'progress-overlay';
    overlay.innerHTML = `
      <div class="po-label-row">
        <span class="po-label" id="po-label-text">${label} Installing requirements... If you are stuck at this step, please restart the app.</span>
        <span class="po-percent" id="po-percent-text"></span>
      </div>
      <div class="po-container">
        <div class="po-bar" id="po-bar"></div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
    this.progressBar = document.getElementById('po-bar');
    this.currentProgress = 0;
    this.isCollecting = false;
    this.pendingProgress = null;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('visible');
      });
    });
  },

  // --- API publique ---

  setIndeterminate(label) {
    if (!this.overlay) this.create(label);
    if (label) this.setLabel(label);

    this.stopAnimation();
    this.pendingProgress = null;
    this.isCollecting = false;
    if (this.collectionTimeout) {
      clearTimeout(this.collectionTimeout);
      this.collectionTimeout = null;
    }

    this.progressBar.style.transition = 'none';
    this.progressBar.style.width = '';
    this.progressBar.style.left = '';
    this.progressBar.classList.remove('completed');
    this.progressBar.classList.add('indeterminate');
    this.currentProgress = -1;
    this.updatePercent('');
  },

  // Appelé à chaque updateLoadingProgress() — accumule et garde la dernière valeur
  setProgress(percent, label) {
    if (!this.overlay) this.create(label);
    if (label) this.setLabel(label);

    // On garde toujours la valeur la plus récente (écrase les intermédiaires)
    this.pendingProgress = percent;

    if (!this.isCollecting) {
      this.isCollecting = true;

      this.collectionTimeout = setTimeout(() => {
        this.isCollecting = false;
        const target = this.pendingProgress;
        this.pendingProgress = null;
        this._applyProgress(target);
      }, 20); // délai court pour absorber les appels simultanés
    }
  },

  animate(durationMs = 4000, label) {
    if (!this.overlay) this.create(label);
    if (label) this.setLabel(label);
    this._startAnimation(durationMs);
  },

  hide(delay = 0) {
    if (!this.overlay) return;
    this.stopAnimation();
    if (this.collectionTimeout) {
      clearTimeout(this.collectionTimeout);
      this.collectionTimeout = null;
    }

    setTimeout(() => {
      if (!this.overlay) return;
      this.overlay.classList.remove('visible');
      this.overlay.classList.add('hiding');

      setTimeout(() => {
        if (this.overlay) {
          this.overlay.remove();
          this.overlay = null;
          this.progressBar = null;
        }
      }, 400);
    }, delay);
  },

  setLabel(text) {
    const el = document.getElementById('po-label-text');
    if (el) el.textContent = text;
  },

  updatePercent(text) {
    const el = document.getElementById('po-percent-text');
    if (el) el.textContent = text;
  },

  // --- Méthodes internes ---

  stopAnimation() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  },

  _applyProgress(percent) {
    if (!this.progressBar) return;

    const wasIndeterminate = this.progressBar.classList.contains('indeterminate');

    if (wasIndeterminate) {
      // Attendre le bon moment dans le cycle CSS (barre revenue à gauche)
      this._waitForIndeterminateEnd(() => this._setBarProgress(percent));
    } else {
      this._setBarProgress(percent);
    }
  },

  _setBarProgress(percent) {
    if (!this.progressBar) return;

    this.stopAnimation();
    this.progressBar.classList.remove('indeterminate');

    if (percent >= 100) {
      this.progressBar.classList.add('completed');
      this.updatePercent('');
    } else {
      this.progressBar.classList.remove('completed');
      this.progressBar.style.transition = 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      this.progressBar.style.left = '0';
      this.progressBar.style.width = percent + '%';
      this.updatePercent(Math.round(percent) + '%');
    }

    this.currentProgress = percent;
  },

  _waitForIndeterminateEnd(callback) {
    const startTime = Date.now();
    const maxWait = 3000;

    const check = () => {
      if (!this.progressBar || !this.overlay) return;

      const containerWidth = this.progressBar.parentElement
        ? this.progressBar.parentElement.offsetWidth
        : 0;

      if (containerWidth === 0) {
        this.progressBar.classList.remove('indeterminate');
        callback();
        return;
      }

      const style = window.getComputedStyle(this.progressBar);
      const left = parseFloat(style.left) || 0;
      const width = parseFloat(style.width) || 0;
      const leftPct = (left / containerWidth) * 100;
      const widthPct = (width / containerWidth) * 100;

      // On attend que la barre soit revenue proche du bord gauche
      if (leftPct < 2 && widthPct < 15) {
        this.progressBar.classList.remove('indeterminate');
        setTimeout(callback, 80);
      } else if (Date.now() - startTime < maxWait) {
        requestAnimationFrame(check);
      } else {
        this.progressBar.classList.remove('indeterminate');
        callback();
      }
    };

    setTimeout(() => requestAnimationFrame(check), 100);
  },

  _startAnimation(durationMs) {
    this.stopAnimation();
    if (!this.progressBar) return;

    this.progressBar.classList.remove('completed', 'indeterminate');
    this.progressBar.style.transition = 'none';
    this.progressBar.style.width = '0%';
    this.progressBar.style.left = '0';
    this.currentProgress = 0;

    const steps = 100;
    const intervalMs = durationMs / steps;

    setTimeout(() => {
      this.progressBar.style.transition = 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      this.animationInterval = setInterval(() => {
        if (!this.progressBar) { this.stopAnimation(); return; }
        if (this.currentProgress < 100) {
          this.currentProgress += 1;
          this.progressBar.style.width = this.currentProgress + '%';
          this.updatePercent(this.currentProgress + '%');
        } else {
          this.stopAnimation();
          this.progressBar.classList.add('completed');
          this.updatePercent('');
        }
      }, intervalMs);
    }, 50);
  }
};

function createLoadingOverlay() {
    let overlay = document.getElementById('gtfs-loading-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'gtfs-loading-overlay';
        overlay.innerHTML = `
            <div class="loading-container">
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" id="progress-bar-fill"></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        const style = document.createElement('style');
        style.textContent = `
            #gtfs-loading-overlay {
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%) translateY(20%);
                z-index: 999999999999999999999;
                opacity: 0;
                visibility: hidden;
                transition: all 0.5s cubic-bezier(0.25, 1.5, 0.5, 1);
            }
            
            #gtfs-loading-overlay.visible {
                opacity: 1;
                visibility: visible;
                transform: translateX(-50%) translateY(0%);
            }
            
            .loading-container {
                padding: 20px 30px;
                border-radius: 16px;
                min-width: 320px;
            }
            
            .progress-bar-container {
                width: 100%;
                height: 8px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 10px;
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .progress-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, #00f2fe 0%, #4facfe 100%);
                border-radius: 10px;
                width: 0%;
                transition: width 0.4s ease;
                box-shadow: 0 0 10px rgba(79, 172, 254, 0.5);
            }

        `;
        document.head.appendChild(style);
    }
    
    return overlay;
}

function showLoadingOverlay() {
    ProgressOverlay.setIndeterminate();
    window.overlayVisible = true;
}

function hideLoadingOverlay() {
    window.overlayVisible = false;
    setTimeout(() => {
        ProgressOverlay.hide();
    }, 2000);

}

function updateLoadingProgress(percentage) {
    if (percentage <= 0) {
        ProgressOverlay.setIndeterminate();
    } else {
        ProgressOverlay.setProgress(percentage);
    }

    if (percentage >= 100) {
        setTimeout(() => {
            hideLoadingOverlay();
        }, 300);
    }
}

async function loadGTFSDataOptimized() {
    try {
        setTimeout(() => {
            showLoadingOverlay();
        }, 200);        
        
        let progress = 0;
        const updateProgress = (step, total) => {
            progress = Math.round((step / total) * 100);
            updateLoadingProgress(progress);
        };
        
        updateProgress(0, 4);
        soundsUX('MBF_Popup');

        console.log('Vérification des endpoints...');
        const infoResponse = await fetch('proxy-cors/proxy_gtfs.php?action=info', {
            cache: 'no-store'
        });
        
        if (!infoResponse.ok) {
            const errorText = await infoResponse.text();
            console.error('Erreur info endpoint', errorText);
            throw new Error(`Endpoint info invalide ${infoResponse.status}`);
        }
        
        const serverInfo = await infoResponse.json();
        console.log('Info serveur:', serverInfo);
        
        if (!serverInfo.routes_exists) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // ── ROUTES ──────────────────────────────────────────────
        updateProgress(1, 4);
        updateLoadingProgress(25);
        setTimeout(() => ProgressOverlay.setLabel(t('loadingroutes')), 100);

        console.log('Chargement des lignes...');
        const routesResponse = await fetch('proxy-cors/proxy_gtfs.php?action=routes', {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        
        if (!routesResponse.ok) {
            const errorText = await routesResponse.text();
            console.error('Erreur routes', errorText);
            try {
                const errorJson = JSON.parse(errorText);
                throw new Error(`Erreur routes (${routesResponse.status}): ${errorJson.error || errorText}`);
            } catch (e) {
                throw new Error(`Erreur routes (${routesResponse.status}): ${errorText}`);
            }
        }
        
        const routesData = await routesResponse.json();
        console.log('Routes chargées:', Object.keys(routesData).length, 'lignes');
        
        Object.entries(routesData).forEach(([routeId, data]) => {
            lineColors[routeId] = data.c ? `#${data.c}` : '#FFFFFF';
            lineName[routeId]   = data.s || data.l || routeId;
        });

        // ── STOPS ────────────────────────────────────────────────
        updateProgress(2, 4);
        updateLoadingProgress(50);
        setTimeout(() => ProgressOverlay.setLabel(t('loadingstops')), 150);

        console.log('Chargement des stops...');
        const stopsResponse = await fetch('proxy-cors/proxy_gtfs.php?action=stops', {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        
        if (!stopsResponse.ok) {
            const errorText = await stopsResponse.text();
            console.error('Erreur stops:', errorText);
            throw new Error(`Erreur stops (${stopsResponse.status}): ${errorText}`);
        }
        
        const stopsData = await stopsResponse.json();
        console.log('Stops chargés:', Object.keys(stopsData).length, 'arrêts');
        
        Object.entries(stopsData).forEach(([stopId, data]) => {
            stopIds.push(stopId);
            stopNameMap[stopId] = data.n || stopId;
        });

        // ── STOP TIMES (chargement non bloquant avec worker) ─────────
        updateProgress(3, 4);
        updateLoadingProgress(75);
        setTimeout(() => ProgressOverlay.setLabel(t('loadingtimetables')), 200);

        window.staticStopTimes = {};
        window.stopTimesReady  = false;

        window.stopTimesPromise = Promise.resolve();

        // ── FIN ──────────────────────────────────────────────────
        if (!window.updating) {
            updateProgress(4, 4);
            updateLoadingProgress(100);
            setTimeout(() => ProgressOverlay.setLabel(t('loadingdone')), 200);
        }
        
        apparaitrelelogo();
        
        console.log('Données GTFS chargées', {
            routes:    Object.keys(lineColors).length,
            stops:     stopIds.length,
            trips:     Object.keys(window.staticStopTimes || {}).length,
            memoryUsed: performance.memory
                ? `${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)} MB`
                : 'N/A'
        });
        
        return {
            lineColors,
            lineName,
            stopIds,
            stopNameMap,
            staticStopTimes: window.staticStopTimes
        };
        
    } catch (error) {
        console.error('Erreur lors du chargement gtfs', error);
        console.error('Stack:', error.stack);
        
        hideLoadingOverlay();
        
        const errorMessage = error.message || 'Erreur inconnue';
        toastBottomRight.error(`Erreur de chargement ${errorMessage}`);
        soundsUX('MBF_NotificationError');
        
        throw error;
    }
}

async function getServerCacheInfo() {
    try {
        const response = await fetch('proxy-cors/proxy_gtfs.php?action=info');
        const info = await response.json();
        
        console.log('📊 Info cache serveur:', {
            totalSize: `${(info.total_size / 1024).toFixed(2)} KB`,
            coreSize: `${(info.core_size / 1024).toFixed(2)} KB`,
            routesSize: `${(info.routes_size / 1024).toFixed(2)} KB`,
            stopsSize: `${(info.stops_size / 1024).toFixed(2)} KB`,
            cacheAge: `${info.cache_age_hours}h`
        });
        
        return info;
    } catch (error) {
        console.warn('Impossible de récupérer les infos cache:', error);
        return null;
    }
}

async function initializeGTFS() {
    try {
        Object.keys(lineColors).forEach(key => delete lineColors[key]);
        Object.keys(lineName).forEach(key => delete lineName[key]);
        stopIds.length = 0;
        Object.keys(stopNameMap).forEach(key => delete stopNameMap[key]);
        
        const startTime = performance.now();
        const data = await loadGTFSDataOptimized();
        const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
        
        console.log(`GTFS chargé en ${loadTime}s`);
        
        if (window.location.search.includes('debug')) {
            await getServerCacheInfo();
        }
        
        return data;
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation GTFS', error);
        throw error;
    }
}

async function checkGTFSUpdate() {
    try {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        const storedMetadata = await new Promise((resolve, reject) => {
            const request = store.get('gtfsMetadata');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        if (!storedMetadata || !storedMetadata.fileHash) {
            return { needsUpdate: true };
        }
        
        const lastUpdate = new Date(storedMetadata.lastUpdate);
        const now = new Date();
        const ageInDays = (now - lastUpdate) / (1000 * 60 * 60 * 24);
        
        if (ageInDays > 4) {
            console.log('Cache expiré (> 4 jours), mise à jour nécessaire');
            return { needsUpdate: true };
        }
        
        try {
            const response = await fetch('proxy-cors/proxy_gtfs.php?action=extracted', {
                method: 'HEAD'
            });
            
            const lastModified = response.headers.get('Last-Modified');
            if (lastModified) {
                const serverDate = new Date(lastModified);
                if (serverDate > lastUpdate) {
                    console.log('Nouvelle version disponible sur le serveur');
                    return { needsUpdate: true };
                }
            }
        } catch (error) {
            console.warn('Impossible de vérifier la version serveur', error);
        }
        
        return { needsUpdate: false, metadata: storedMetadata };
    } catch (error) {
        console.error('Erreur vérif maj GTFS', error);
        return { needsUpdate: true };
    }
}


async function clearGTFSCache() {
    try {
        const db = await initDB();
        localStorage.clear();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                toastBottomRight.success('MBF3 : Cache erased successfully !!');
                soundsUX('MBF_Success');
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Erreur lors de l\'effacement du cache', error);
        toastBottomRight.error('Erreur lors de l\'effacement du cache');
        soundsUX('MBF_NotificationError');
        throw error;
    }
}

async function decodeProtobuf(buffer) {
            const root = await protobuf.load('gtfs-realtime.proto');
            const FeedMessage = root.lookupType('transit_realtime.FeedMessage');
            const message = FeedMessage.decode(new Uint8Array(buffer));
            return FeedMessage.toObject(message, { longs: String });
        }

        window.addEventListener('message', function(event) {
    if (event.data.type === 'vehicleSelected') {
        const vehicleId = event.data.vehicleId;
        const tripId = event.data.tripId;
        const stopId = event.data.stopId;
        const routeId = event.data.routeId;

        safeVibrate([30], true);
        const accueil = document.getElementById('accueil');
        accueil.classList.add('hide');
        accueil.classList.remove("affiche")
        const menubottom1 = document.getElementById('menubtm');
        menubottom1.style.display = 'flex';
        window.isMenuShowed = false;
    
        setTimeout(() => {
            menubottom1.classList.remove('slide-upb');
            menubottom1.classList.add('slide-downb');
            setTimeout(() => {
                accueil.style.display = 'none';
            }, 500);
        }, 10);

        
        const marker = findMarkerByVehicleId(vehicleId);
        if (marker) {
            map.setView(marker.getLatLng(), 17);
            
            marker.openPopup();
            
            const menu = document.getElementById('menu');
            const map = document.getElementById('map');
                menu.classList.add('hidden');
            if (localStorage.getItem('transparency') === 'true') {
                const map = document.getElementById('map');
                map.classList.remove('hiddennotransition');
                map.classList.add('appearnotransition');
                map.classList.remove('hidden');
                map.classList.remove('appear');
            } else {
                const map = document.getElementById('map');
                map.classList.remove('hidden');
                map.classList.add('appear');
                map.classList.remove('hiddennotransition');
                map.classList.remove('appearnotransition');
            }
            window.isMenuShowed = false;
            menu.addEventListener('animationend', function onAnimationEnd(event) {
                if (event.animationName === 'slideInBounceInv' && menu.classList.contains('hidden')) { 
                    menu.style.display = 'none';
                }
            });
            isMenuVisible = false;
            
            if (selectedLine) {
                resetMapView();
            }
        }
    }
});

function findMarkerByVehicleId(vehicleId) {
    for (const [id, marker] of Object.entries(markers)) {
        if (marker.id === vehicleId) {
            return marker;
        }
    }
    return null;
}

let lastActiveMarkerId = null;

let lastActiveColor = null;
window.isMenuShowed = false;

// ==================== TEXT COLOR UTILS ====================
const TextColorUtils = {
    cache: new Map(),
    maxCacheSize: 100,
    
    getOptimal(bgColor, options = {}) {
        const cacheKey = `${bgColor}-${JSON.stringify(options)}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const result = this._calculate(bgColor, options);
        
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(cacheKey, result);
        return result;
    },
    
    _calculate(bgColor, options = {}) {
        const {
            contrastRatio = 4.5,
            darkColor = '#1a1a1a',
            lightColor = '#f8f9fa'
        } = options;

        let r, g, b, a = 1;

        if (!bgColor) return darkColor;
        bgColor = bgColor.trim();

        if (bgColor.startsWith('rgb')) {
            const values = bgColor.match(/\d+(\.\d+)?/g);
            if (values) {
                r = parseInt(values[0]);
                g = parseInt(values[1]);
                b = parseInt(values[2]);
                a = values[3] ? parseFloat(values[3]) : 1;
            } else {
                return darkColor;
            }
        } else {
            if (/^#([a-f\d])([a-f\d])([a-f\d])$/i.test(bgColor)) {
                bgColor = bgColor.replace(/^#([a-f\d])([a-f\d])([a-f\d])$/i,
                    (_, r, g, b) => '#' + r + r + g + g + b + b);
            }

            if (bgColor.length === 7) {
                r = parseInt(bgColor.slice(1, 3), 16);
                g = parseInt(bgColor.slice(3, 5), 16);
                b = parseInt(bgColor.slice(5, 7), 16);
            } else if (bgColor.length === 9) {
                r = parseInt(bgColor.slice(1, 3), 16);
                g = parseInt(bgColor.slice(3, 5), 16);
                b = parseInt(bgColor.slice(5, 7), 16);
                a = parseInt(bgColor.slice(7, 9), 16) / 255;
            } else {
                return darkColor;
            }
        }

        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        const srgb = [r, g, b].map(c => {
            const val = c / 255;
            return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
        });
        const luminance = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];

        const getLuminance = (color) => {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16) / 255;
            const g = parseInt(hex.substr(2, 2), 16) / 255;
            const b = parseInt(hex.substr(4, 2), 16) / 255;
            const srgb = [r, g, b].map(c => 
                c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
            );
            return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
        };

        const darkLuminance = getLuminance(darkColor);
        const lightLuminance = getLuminance(lightColor);

        const contrastWithDark = luminance > darkLuminance 
            ? (luminance + 0.05) / (darkLuminance + 0.05)
            : (darkLuminance + 0.05) / (luminance + 0.05);
        
        const contrastWithLight = luminance > lightLuminance 
            ? (luminance + 0.05) / (lightLuminance + 0.05)
            : (lightLuminance + 0.05) / (luminance + 0.05);

        const isMediumDark = luminance >= 0.12 && luminance <= 0.35;

        if (contrastWithDark >= contrastRatio && contrastWithLight >= contrastRatio) {
            return isMediumDark ? lightColor : (luminance > 0.18 ? darkColor : lightColor);
        } else if (contrastWithDark >= contrastRatio) {
            return isMediumDark ? lightColor : darkColor;
        } else if (contrastWithLight >= contrastRatio) {
            return lightColor;
        } else {
            if (isMediumDark || luminance < 0.15) return lightColor;
            return contrastWithDark > contrastWithLight ? darkColor : lightColor;
        }
    },
    
    clearCache() {
        this.cache.clear();
    }
};
// ==================== FIN TEXT COLOR UTILS ====================


const markerCache = {
    colors: new Map(),
    icons: new Map(),
    styles: new Set()
};

function getCachedColors(route_id) {
    if (markerCache.colors.has(route_id)) {
        return markerCache.colors.get(route_id);
    }
    
    const color = lineColors[route_id] || '#000000';
    const lighterColor = adjustBrightness(color, 30);
    const darkerColor = adjustBrightness(color, -20);
    
    const colors = { color, lighterColor, darkerColor };
    markerCache.colors.set(route_id, colors);
    return colors;
}

function ensurePulseStyle(route_id) {
    const styleId = `pulse-style-${route_id}`;
    
    if (markerCache.styles.has(styleId)) {
        return;
    }
    
    const { color } = getCachedColors(route_id);
    
    const pulseAnimation = `
        @keyframes pulse-${route_id} {
            0% { 
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25), 
                           0 2px 6px rgba(0, 0, 0, 0.15),
                           inset 0 1px 0 rgba(255, 255, 255, 0.3),
                           0 0 0 0 ${color}40;
            }
            50% {
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3), 
                           0 3px 8px rgba(0, 0, 0, 0.2),
                           inset 0 1px 0 rgba(255, 255, 255, 0.4),
                           0 0 0 8px ${color}20;
            }
            100% { 
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25), 
                           0 2px 6px rgba(0, 0, 0, 0.15),
                           inset 0 1px 0 rgba(255, 255, 255, 0.3),
                           0 0 0 0 ${color}00;
            }
        }
    `;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = pulseAnimation;
    document.head.appendChild(style);
    markerCache.styles.add(styleId);
}

function createCachedIcon(route_id, bearing = 0) {
    const cacheKey = `${route_id}-${Math.floor(bearing / 5) * 5}`; 
    
    if (markerCache.icons.has(cacheKey)) {
        return markerCache.icons.get(cacheKey);
    }
    
    const { color, lighterColor, darkerColor } = getCachedColors(route_id);
    
    const markerHtmlStyles = `
        background: linear-gradient(135deg, ${lighterColor} 0%, ${color} 50%, ${darkerColor} 100%);
        width: 12px;
        height: 12px;
        display: block;
        left: -6px;
        top: -6px;
        position: relative;
        border-radius: 50%;
        border: 2px solid white;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        will-change: all;
    `;

    const arrowSvg = `
        <svg class="marker-arrow" style="
            position: absolute;
            width: 16px;
            height: 16px;
            left: 4px;
            top: -2px;
            will-change: all;
            transform-origin: 2px; 
            transform: rotate(${bearing - 90}deg);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);"
            viewBox="0 0 24 24">
            
            <path 
                d="M8 4 L16 12 L8 20"
                fill="none"
                stroke="rgba(0, 0, 0, 0.3)"
                stroke-width="5"
                stroke-linecap="round"
                stroke-linejoin="round"
                transform="translate(1, 1)"
            />
            
            <path 
                d="M8 4 L16 12 L8 20"
                fill="none"
                stroke="white"
                stroke-width="6"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
            
            <defs>
                <linearGradient id="arrow-gradient-${route_id}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${lighterColor};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${darkerColor};stop-opacity:1" />
                </linearGradient>
            </defs>
            <path 
                d="M8 4 L16 12 L8 20"
                fill="none"
                stroke="url(#arrow-gradient-${route_id})"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="marker-arrow-path"
            />
        </svg>
    `;

    const icon = L.divIcon({
        className: "my-custom-pin-enhanced",
        iconAnchor: [0, 0],
        popupAnchor: [0, -5],
        html: `
            <div style="position: relative;" class="marker-container">
                <span style="${markerHtmlStyles}" 
                      class="marker-icon enhanced-marker" 
                      onmouseover="this.style.transform='scale(1.2)'; this.style.animation='pulse-${route_id} 1.5s infinite';"
                      onmouseout="this.style.transform='scale(1)'; this.style.animation='none';" />
                ${arrowSvg}
            </div>
        `
    });
    
    markerCache.icons.set(cacheKey, icon);
    return icon;
}

const StyleCleanupManager = {
    lastCleanup: Date.now(),
    cleanupInterval: 30000, 
    
    check() {
        const now = Date.now();
        if (now - this.lastCleanup > this.cleanupInterval) {
            this.cleanup();
            this.lastCleanup = now;
        }
    },
    
    cleanup() {
        const styles = document.querySelectorAll('.menu-color-style');
        if (styles.length > 5) {
            styles.forEach((style, index) => {
                if (index < styles.length - 2) {
                    style.remove();
                }
            });
        }
    }
};

function updateMenuBtmColor(color, routeId) {
    const menubtm = document.getElementById('menubtm');
    if (!menubtm) return;
    
    StyleCleanupManager.check();
    
    requestAnimationFrame(() => {
        menubtm.style.backgroundColor = `${color}9c`;
        
        const textColor = TextColorUtils.getOptimal(color);
        const invert = textColor === '#1a1a1a' ? 'invert(1)' : 'invert(0)';
        
        const images = document.querySelectorAll('#menubtm img');
        images.forEach(img => {
            img.style.filter = invert;
        });
        
        return StyleManager.applyMenuStyle(textColor);
    });
}

function createColoredMarker(lat, lon, route_id, bearing = 0) {
    const generateUniqueId = () => `popup-style-${Math.random().toString(36).substr(2, 9)}`;
    
    // Optimisation: S'assurer que le style d'animation existe
    ensurePulseStyle(route_id);
    
    // Optimisation: Utiliser l'icône en cache
    const icon = createCachedIcon(route_id, bearing);
    
    const marker = L.marker([lat, lon], { icon });
    const styleId = generateUniqueId();
    const { color } = getCachedColors(route_id);
    
    marker.on('popupopen', function(e) {
        const menubtm = document.getElementById('menubtm');
        safeVibrate([50]);
        const consulted = parseInt(localStorage.getItem('mbf_vehicles_consulted') || '0', 10);
        localStorage.setItem('mbf_vehicles_consulted', (consulted + 1).toString());
        soundsUX('MBF_VehicleOpen');
        saveAndFilterSingleLine(route_id);

        if (menubtm) {
            const markerId = marker.id;

            if (lastActiveMarkerId !== null && lastActiveMarkerId !== markerId && lastActiveColor !== null) {
                const styleId = updateMenuBtmColor(color, route_id);
                marker.styleId = styleId;
            } else {
                const styleId = updateMenuBtmColor(color, route_id);
                marker.styleId = styleId;
            }
            
            lastActiveMarkerId = markerId;
            lastActiveColor = color;
        }
    });

    marker.on('popupclose', async function(e) {
        const menubtm = document.getElementById('menubtm');
        safeVibrate([50]);
        soundsUX('MBF_VehicleClose');
        restoreFilterState();
        
        if (menubtm) {
            try {
                setTimeout(async () => {
                    if (lastActiveMarkerId === marker.id) {
                        const data = await getSetvar();
                        
                        if (data) {
                            requestAnimationFrame(() => {
                                const menubtmCurrentTransition = window.getComputedStyle(menubtm).transition;
                                
                                if (!menubtmCurrentTransition.includes('background-color')) {
                                    menubtm.style.transition = menubtmCurrentTransition 
                                        ? `${menubtmCurrentTransition}, background-color 0.5s ease` 
                                        : 'background-color 0.5s ease';
                                }
                                
                                menubtm.style.backgroundColor = `${window.colorbkg9c}`;
                                
                                // Optimisation: Supprimer tous les anciens styles en une fois
                                document.querySelectorAll('.menu-color-style').forEach(style => style.remove());
                                
                                const styleSheet = document.createElement('style');
                                styleSheet.id = styleId;
                                styleSheet.classList.add('menu-color-style');
                                
                                styleSheet.textContent = `
                                    #menubtm * {
                                        color: white !important;
                                    }
                                `;
                                
                                document.querySelectorAll('#menubtm img').forEach(img => {
                                    img.style.filter = 'invert(0)';
                                });
                                
                                document.head.appendChild(styleSheet);
                                
                                lastActiveMarkerId = null;
                                lastActiveColor = null;
                                
                                if (marker.styleId) {
                                    const oldStyle = document.getElementById(marker.styleId);
                                    if (oldStyle) {
                                        oldStyle.remove();
                                    }
                                }
                            });
                        }
                    }
                }, 50);
            } catch (error) {
                return false;
            }
        }
    });
    
    return marker;
}

function clearMarkerCache() {
    markerCache.colors.clear();
    markerCache.icons.clear();
    markerCache.styles.forEach(styleId => {
        const style = document.getElementById(styleId);
        if (style) style.remove();
    });
    markerCache.styles.clear();
}

function shouldRenderMarker(marker) {
    const zoom = map.getZoom();
    const bounds = map.getBounds();
    
    if (zoom < 13) {
        return false; 
    }
    
    const paddedBounds = bounds.pad(0.2);
    return paddedBounds.contains(marker.getLatLng());
}

function adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1);
}

const additionalCSS = `
.my-custom-pin-enhanced {
    background: transparent !important;
    border: none !important;
}

.marker-container {
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
}

.enhanced-marker {
    position: relative;
    z-index: 1000;
}

.enhanced-marker:hover {
    z-index: 1001;
}

.marker-arrow {
    pointer-events: none;
}
`;

const AnimationManager = {
    activeAnimations: new Map(),
    
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    },
    
    animateMarker(marker, newPosition, duration = 1000) {
        const markerId = marker.id;
        
        // Annuler l'animation existante
        if (this.activeAnimations.has(markerId)) {
            cancelAnimationFrame(this.activeAnimations.get(markerId).frameId);
        }
        
        const startLatLng = marker.getLatLng();
        const endLatLng = L.latLng(newPosition[0], newPosition[1]);
        
        // Si distance trop courte, pas d'animation
        const distance = startLatLng.distanceTo(endLatLng);
        if (distance < 5) {
            marker.setLatLng(endLatLng);
            return;
        }
        
        const startTime = performance.now();
        
        const animate = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = this.easeInOutQuad(progress);
            
            const lat = startLatLng.lat + (endLatLng.lat - startLatLng.lat) * easedProgress;
            const lng = startLatLng.lng + (endLatLng.lng - startLatLng.lng) * easedProgress;
            
            marker.setLatLng([lat, lng]);

            if (progress < 1) {
                const frameId = requestAnimationFrame(animate);
                this.activeAnimations.set(markerId, { frameId });
            } else {
                this.activeAnimations.delete(markerId);
            }
        };
        
        const frameId = requestAnimationFrame(animate);
        this.activeAnimations.set(markerId, { frameId });
    },
    
    cancelAnimation(markerId) {
        if (this.activeAnimations.has(markerId)) {
            cancelAnimationFrame(this.activeAnimations.get(markerId).frameId);
            this.activeAnimations.delete(markerId);
        }
    },
    
    cancelAll() {
        this.activeAnimations.forEach(({ frameId }) => {
            cancelAnimationFrame(frameId);
        });
        this.activeAnimations.clear();
    }
};

function animateMarker(marker, newPosition) {
    AnimationManager.animateMarker(marker, newPosition);
}

let busStopLayers = [];
let selectedLines = [];
let busStopsByLine = {}; 
let allBusLines = []; 

let gtfsInitialized = false;


async function loadGeoJsonLines() {
    try {
        const response = await fetch('proxy-cors/proxy_geojson.php');
        const geoJsonData = await response.json();

        currentZoomLevel = map.getZoom();
        
        const activeLinesSet = new Set();
        markerPool.active.forEach((marker) => {
            if (marker.line) {
                activeLinesSet.add(marker.line);
            }
        });

        const busLines = L.geoJSON(geoJsonData, {
            renderer: L.canvas(),
            filter: function(feature) {
                if (feature.geometry.type === 'LineString') {
                    return activeLinesSet.has(feature.properties.route_id);
                }
                return false; 
            },
            style: function(feature) {
                return {
                    color: lineColors[feature.properties.route_id] || '#3388ff',
                    weight: 6,
                    opacity: 0.7,  
                    lineJoin: 'round',
                    lineCap: 'round',
                    className: 'bus-line', 
                    dashArray: feature.properties.route_type === '3' ? '5, 5' : null
                };
            },
            onEachFeature: function(feature, layer) {
                if (feature.properties && feature.properties.route_id) {
                    geoJsonLines.push(layer);
                }
            }
        }).addTo(map);
    } catch (error) {
        console.error('Erreur lors du chargement des lignes GeoJSON', error);
    }
}

function filterByLine(lineId) {
    const lineIndex = selectedLines.indexOf(lineId);

    if (lineIndex !== -1) {
        selectedLines.splice(lineIndex, 1);
    } else {
        selectedLines.push(lineId);
    }

    updateLinesDisplay();

    if (selectedLines.length === 0) {
        resetMapView();
    } else if (selectedLines.length === 1) {
        zoomToSelectedLine(selectedLines[0]);
    } else if (selectedLines.length > 1) {
        zoomToMultipleLines(selectedLines);
    }
}

function zoomToSelectedLine(lineId) {
    const bounds = L.latLngBounds();

    geoJsonLines.forEach(layer => {
        if (layer.feature.properties.route_id === lineId) {
            bounds.extend(layer.getBounds());
        }
    });

    if (bounds.isValid()) {
        map.fitBounds(bounds, {
            padding: [10, 10], 
            maxZoom: 17        
        });
    }
}

function zoomToMultipleLines(lineIds) {
    const bounds = L.latLngBounds();

    geoJsonLines.forEach(layer => {
        if (lineIds.includes(layer.feature.properties.route_id)) {
            bounds.extend(layer.getBounds());
        }
    });

    if (bounds.isValid()) {
        map.fitBounds(bounds, {
            padding: [50, 50], 
            maxZoom: 15       
        });
    }
}

function updateLinesDisplay() {
    const activeLinesSet = new Set();
    markerPool.active.forEach((marker) => {
        if (marker.line) {
            activeLinesSet.add(marker.line);
        }
    });
    
    geoJsonLines.forEach(layer => {
        const routeId = layer.feature.properties.route_id;

        const hasVehicles = activeLinesSet.has(routeId);
        const isFilteredIn = selectedLines.length === 0 || selectedLines.includes(routeId);

        if (hasVehicles && isFilteredIn) {
            if (!map.hasLayer(layer)) {
                map.addLayer(layer);
            }
        } else {
            if (map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
        }
    });

    //updateBusStopsFiltering();

    if (typeof markerPool !== 'undefined' && markerPool.active) {
        markerPool.active.forEach((marker, id) => {
            const shouldShow = selectedLines.length === 0 || selectedLines.includes(marker.line);
            
            if (shouldShow) {
                if (!map.hasLayer(marker)) {
                    map.addLayer(marker);
                }
            } else {
                if (map.hasLayer(marker)) {
                    if (marker.isPopupOpen()) {
                        marker.closePopup();
                    }
                    map.removeLayer(marker);
                }
            }
        });
    }
}

function resetMapView() {
    selectedLines = [];
    selectedLine = null;

    geoJsonLines.forEach(layer => {
        if (!map.hasLayer(layer)) {
            map.addLayer(layer);
        }
    });

    busStopLayers.forEach(layer => {
        if (!map.hasLayer(layer)) {
            map.addLayer(layer);
        }
    });

    if (typeof markers !== 'undefined') {
        Object.values(markers).forEach(marker => {
            if (!map.hasLayer(marker)) {
                map.addLayer(marker);
            }
        });
    }
}

let savedFilterState = null;
let ligneselectionnee = false;

/**
 * Sauvegarde l'état actuel du filtrage et applique un filtrage sur une ligne unique
 * @param {string} lineId - l'id de la ligne à filtrer exclusivement
 */
function saveAndFilterSingleLine(lineId) {
    if (localStorage.getItem('filterlinesonselect') === 'true') {
        if (ligneselectionnee === false) {
            savedFilterState = {
                selectedLines: [...selectedLines], 
                selectedLine: selectedLine
            };
            ligneselectionnee = true;
        }
        selectedLines = [lineId];
        selectedLine = lineId;
        updateLinesDisplay();
    }
}

/**
 * Restaure l'état de filtrage précédemment sauvegardé
 */
function restoreFilterState() {
    if (savedFilterState === null) {
        return;
    }
    ligneselectionnee = false;
    selectedLines = [...savedFilterState.selectedLines]; 
    selectedLine = savedFilterState.selectedLine;
    
    updateLinesDisplay();
    
    if (selectedLines.length === 0) {
        resetMapView();
    } else if (selectedLines.length === 1) {
        zoomToSelectedLine(selectedLines[0]);
    } else if (selectedLines.length > 1) {
        zoomToMultipleLines(selectedLines);
    }
    
    savedFilterState = null;
}



function showPopup() {
    const popup2 = document.getElementById('popup2');

    popup2.style.display = 'block';
    

    const menubottom1 = document.getElementById('menubtm');


    const menu = document.getElementById('menu');
            const menubotom = document.getElementById('menubottom');
            menubottom1.classList.remove('slide-downb');
            menubottom1.classList.add('slide-upb');


            menubottom1.addEventListener('transitionend', () => {
            if (menubottom1.classList.contains('slide-up')) {
            menubottom1.style.display = 'none';
            }
            }, { once: true });



}

function closePopup() {
    const popup2 = document.getElementById('popup2');
    popup2.style.display = 'none';
    const menubottom1 = document.getElementById('menubtm');
            const menu = document.getElementById('menu');
            const map = document.getElementById('map');
            menu.classList.add('hidden');
            if (localStorage.getItem('transparency') === 'true') {
                const map = document.getElementById('map');
                map.classList.remove('hiddennotransition');
                map.classList.add('appearnotransition');
                map.classList.remove('hidden');
                map.classList.remove('appear');
            } else {
                const map = document.getElementById('map');
                map.classList.remove('hidden');
                map.classList.add('appear');
                map.classList.remove('hiddennotransition');
                map.classList.remove('appearnotransition');
            }
            window.isMenuShowed = false;
            menu.addEventListener('animationend', function onAnimationEnd(event) {
                if (event.animationName === 'slideInBounceInv' && menu.classList.contains('hidden')) { 
                    menu.style.display = 'none';
                }
            });
            isMenuVisible = false; 
            menubottom1.style.display = 'flex';
    setTimeout(() => {
        menubottom1.classList.remove('slide-upb');
        menubottom1.classList.add('slide-downb');
    }, 10);


}



async function loadVehicleModels() {
    try {
        const { nomdureseau } = await getSetvar();
        let VEHICULES_CACHE = nomdureseau;
        const CACHE_DURATION_VEHICLES = 24 * 60 * 60 * 1000;
        const cachedData = await getCachedData();
        
        if (cachedData) {
            Object.assign(vehicleModels, cachedData.models);
            Object.assign(vehicleTypes, cachedData.types);
            console.log('Données chargées depuis le cache');
            
            // Vérifier si mise à jour nécessaire en arrière-plan
            requestIdleCallback(() => checkForVehicleUpdates());
            return;
        }

        const response = await fetch('setvar/vehicules/index.php');
        const fileList = await response.json();
        const txtFiles = fileList.filter(file => file.endsWith('.txt'));
        
        // Charger par priorité
        await loadVehiclesByPriority(txtFiles);
        
        await saveCacheData({
            models: vehicleModels,
            types: vehicleTypes,
            timestamp: Date.now()
        });
        
        console.log(`${txtFiles.length} modèles de véhicules chargés avec succès`);
        
    } catch (error) {
        console.error('Erreur lors du chargement des modèles de véhicules', error);
        toastBottomRight.error('Erreur lors du chargement des modèles de véhicules');
        soundsUX('MBF_NotificationError');
    }
}

// ==================== LAZY LOADING VÉHICULES ====================
async function loadVehiclesByPriority(fileList) {
    const visibleVehicles = new Set();
    
    // Identifier les véhicules visibles
    Object.values(markerPool.active).forEach(marker => {
        if (map.getBounds().contains(marker.getLatLng())) {
            visibleVehicles.add(marker.id);
        }
    });
    
    const priorityFiles = [];
    const normalFiles = [];
    
    // Trier les fichiers par priorité
    fileList.forEach(file => {
        const vehicleId = file.replace('.txt', '');
        if (visibleVehicles.has(vehicleId)) {
            priorityFiles.push(file);
        } else {
            normalFiles.push(file);
        }
    });
    
    console.log(`Chargement prioritaire: ${priorityFiles.length} véhicules visibles`);
    
    // Charger d'abord les véhicules visibles
    if (priorityFiles.length > 0) {
        await loadVehicleFilesInBatches(priorityFiles, 5);
    }
    
    // Charger le reste en arrière-plan
    if (normalFiles.length > 0) {
        requestIdleCallback(async () => {
            await loadVehicleFilesInBatches(normalFiles, 10);
            console.log('Chargement complet des véhicules terminé');
            
            // Sauvegarder en cache
            await saveCacheData({
                models: vehicleModels,
                types: vehicleTypes,
                timestamp: Date.now()
            });
        });
    } else {
        // Tout est chargé, sauvegarder immédiatement
        await saveCacheData({
            models: vehicleModels,
            types: vehicleTypes,
            timestamp: Date.now()
        });
    }
}

async function checkForVehicleUpdates() {
    try {
        const response = await fetch('setvar/vehicules/index.php');
        const fileList = await response.json();
        const txtFiles = fileList.filter(file => file.endsWith('.txt'));
        
        // Comparer avec le cache actuel
        const cachedCount = Object.keys(vehicleModels).length;
        
        if (txtFiles.length !== cachedCount) {
            console.log('Mise à jour des véhicules détectée, rechargement...');
            Object.keys(vehicleModels).forEach(key => delete vehicleModels[key]);
            Object.keys(vehicleTypes).forEach(key => vehicleTypes[key].clear());
            
            await loadVehiclesByPriority(txtFiles);
        }
    } catch (error) {
        console.warn('Erreur vérification mises à jour véhicules:', error);
    }
}
// ==================== FIN LAZY LOADING VÉHICULES ====================

async function loadVehicleFilesInBatches(fileList, batchSize = 10) {
    const results = [];
    
    for (let i = 0; i < fileList.length; i += batchSize) {
        const batch = fileList.slice(i, i + batchSize);
        const batchPromises = batch.map(fileName => loadVehicleModelFileOptimized(fileName));
        
        try {
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults);
        } catch (error) {
            console.error(`Erreur lors du traitement du batch ${i / batchSize + 1}:`, error);
        }
    }
    
    const errors = results.filter(result => result.status === 'rejected');
    if (errors.length > 0) {
        console.warn(`${errors.length} fichiers n'ont pas pu être chargés`);
    }
}

async function loadVehicleModelFileOptimized(fileName) {
    try {
        const response = await fetch(`setvar/vehicules/${fileName}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} pour ${fileName}`);
        }
        
        const content = await response.text();
        const lines = content.split('\n')
            .map(line => line.trim())
            .filter(line => line !== '');
        
        if (lines.length < 8) {
            throw new Error(`Format invalide - ${lines.length} lignes trouvées, 8 minimum requis`);
        }
        
        const [modelName, thumbnailPath, ...paramLines] = lines;
        const vehicleIds = lines.slice(8);
        
        const params = {
            isElectric: parseParamValueFast(paramLines[0]),       
            isHybrid: parseParamValueFast(paramLines[1]),       
            isGnv: parseParamValueFast(paramLines[2]),     
            isUsbPlugs: parseParamValueFast(paramLines[3]),  
            isAirConditioned: parseParamValueFast(paramLines[4]), 
            isHeatingUnit: parseParamValueFast(paramLines[5])
        };
        
        const modelKey = fileName.slice(0, -4); // Plus rapide que replace
        
        // Stockage optimisé
        vehicleModels[modelKey] = {
            name: modelName,
            thumbnail: thumbnailPath,
            params: params,
            vehicles: new Set(vehicleIds)
        };
        
        // Mise à jour des types de véhicules en une seule passe
        updateVehicleTypes(vehicleIds, params);
        
    } catch (error) {
        console.error(`Erreur lors du chargement du fichier ${fileName}:`, error.message);
        throw error; // Re-lancer pour Promise.allSettled
    }
}

// Version optimisée du parsing des paramètres
function parseParamValueFast(paramLine) {
    const equalIndex = paramLine.indexOf('=');
    if (equalIndex === -1) return false;
    
    const value = paramLine.slice(equalIndex + 1);
    return value === 'true'; // Plus rapide que toLowerCase()
}

// Mise à jour optimisée des types de véhicules
function updateVehicleTypes(vehicleIds, params) {
    if (params.isElectric) {
        vehicleIds.forEach(id => vehicleTypes['elec'].add(id));
    }
    if (params.isHybrid) {
        vehicleIds.forEach(id => vehicleTypes['hybrid'].add(id));
    }
    if (params.isGnv) {
        vehicleIds.forEach(id => vehicleTypes['gnv'].add(id));
    }
    if (params.isUsbPlugs) {
        vehicleIds.forEach(id => vehicleTypes['usb'].add(id));
    }
    if (params.isAirConditioned || params.isHeatingUnit) {
        vehicleIds.forEach(id => vehicleTypes['clim'].add(id));
    }
}

// ==================== CACHE OPTIMISÉ ====================
const CacheManager = {
    dbName: 'MyBusFinderCache',
    version: 1,
    
    async openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('vehicles')) {
                    db.createObjectStore('vehicles');
                }
            };
        });
    },
    
    async get(key) {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['vehicles'], 'readonly');
                const store = transaction.objectStore('vehicles');
                const request = store.get(key);
                
                request.onsuccess = () => {
                    const result = request.result;
                    if (result && Date.now() - result.timestamp < 24 * 60 * 60 * 1000) {
                        resolve(this.deserialize(result.data));
                    } else {
                        resolve(null);
                    }
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('Cache read error:', error);
            return null;
        }
    },
    
    async set(key, data) {
        try {
            const db = await this.openDB();
            const serialized = this.serialize(data);
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['vehicles'], 'readwrite');
                const store = transaction.objectStore('vehicles');
                const request = store.put({
                    data: serialized,
                    timestamp: Date.now()
                }, key);
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn('Cache write error:', error);
        }
    },
    
    serialize(data) {
        const result = {
            models: {},
            types: {}
        };
        
        for (const [key, model] of Object.entries(data.models)) {
            result.models[key] = {
                ...model,
                vehicles: Array.from(model.vehicles)
            };
        }
        
        for (const [type, vehicles] of Object.entries(data.types)) {
            result.types[type] = Array.from(vehicles);
        }
        
        return result;
    },
    
    deserialize(data) {
        const models = {};
        const types = {
            elec: new Set(),
            hybrid: new Set(),
            gnv: new Set(),
            usb: new Set(),
            clim: new Set()
        };
        
        for (const [key, model] of Object.entries(data.models)) {
            models[key] = {
                ...model,
                vehicles: new Set(model.vehicles)
            };
        }
        
        for (const [type, vehicles] of Object.entries(data.types)) {
            types[type] = new Set(vehicles);
        }
        
        return { models, types };
    },
    
    async clear() {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['vehicles'], 'readwrite');
            const store = transaction.objectStore('vehicles');
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};

async function getCachedData() {
    return await CacheManager.get('vehicleData');
}

async function saveCacheData(data) {
    await CacheManager.set('vehicleData', data);
}

async function clearVehicleCache() {
    await CacheManager.clear();
    vehicleModelLookupCache.clear();
    console.log('Cache des véhicules vidé');
}
// ==================== FIN CACHE OPTIMISÉ ====================


const vehicleModelLookupCache = new Map();

function getVehicleModel(parkNumber) {
    const parkId = String(parkNumber);
    
    if (vehicleModelLookupCache.has(parkId)) {
        return vehicleModelLookupCache.get(parkId);
    }
    
    for (const [modelKey, model] of Object.entries(vehicleModels)) {
        if (model.vehicles.has(parkId)) {
            vehicleModelLookupCache.set(parkId, model);
            return model;
        }
    }
    
    vehicleModelLookupCache.set(parkId, null);
    return null;
}

function clearVehicleCache() {
    sessionStorage.removeItem(CACHE_KEY);
    vehicleModelLookupCache.clear();
    console.log('Cache des véhicules vidé');
}

// qu'es-ce que ça aide l'IA maintenant... 🙂

// finalement c'est de la vraie daube son code
// vive le code fait par des humains !
// mais bon, ça marche, c'est l'essentiel

function getVehicleOptionsBadges(parkNumber) {
    const model = getVehicleModel(parkNumber);
    let badges = '';
    
    if (model) {
        const params = model.params;
        
        const badgeStyle = `
            padding: 6px 10px; 
            background: #0000002e; 
            font-weight: normal; 
            white-space: nowrap; 
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border-radius: 10px; 
            display: inline-flex; 
            align-items: center; 
            gap: 6px;
            height: 20px;
        `;
        
        const svgStyle = `
            display: inline-block;
            vertical-align: top;
            position: relative;
            top: -1px;
        `;
        
        const textStyle = `
            display: inline-block;
            line-height: 20px;
            vertical-align: middle;
            position: relative;
            top: 1px;
        `;

        if (model != null) {
            badges += `<span style="${badgeStyle}">
                <svg class="${svgStyle}" width="17" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M10.5026 5.01692L9.96661 3.65785C9.62068 2.78072 8.37933 2.78072 8.03339 3.65784L6.96137 6.37599C6.85576 6.64378 6.64378 6.85575 6.37599 6.96137L3.65785 8.03339C2.78072 8.37932 2.78072 9.62067 3.65784 9.96661L6.37599 11.0386C6.64378 11.1442 6.85575 11.3562 6.96137 11.624L8.03339 14.3422C8.37932 15.2193 9.62067 15.2193 9.96661 14.3422L11.0386 11.624C11.1442 11.3562 11.3562 11.1442 11.624 11.0386L14.3422 9.96661C15.2193 9.62068 15.2193 8.37933 14.3422 8.03339L12.9831 7.49738" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path> <path d="M16.4885 13.3481C16.6715 12.884 17.3285 12.884 17.5115 13.3481L18.3121 15.3781C18.368 15.5198 18.4802 15.632 18.6219 15.6879L20.6519 16.4885C21.116 16.6715 21.116 17.3285 20.6519 17.5115L18.6219 18.3121C18.4802 18.368 18.368 18.4802 18.3121 18.6219L17.5115 20.6519C17.3285 21.116 16.6715 21.116 16.4885 20.6519L15.6879 18.6219C15.632 18.4802 15.5198 18.368 15.3781 18.3121L13.3481 17.5115C12.884 17.3285 12.884 16.6715 13.3481 16.4885L15.3781 15.6879C15.5198 15.632 15.632 15.5198 15.6879 15.3781L16.4885 13.3481Z" stroke="currentColor" stroke-width="1.5"></path> </g></svg>
                <span style="${textStyle}">${model.name}</span>
            </span> `;
        }

        if (params.isElectric) {
            badges += `<span style="${badgeStyle}">
                <svg style="${svgStyle}" width="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M11.9 5L7.5 13.615H13V19L18.5 9.308H13L11.9 5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>             
                <span style="${textStyle}">${t("electric")}</span>
            </span> `;
        }
        if (params.isHybrid) {
            badges += `<span style="${badgeStyle}">
                <svg style="${svgStyle}" width="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M11.9357 0.250176C11.5215 0.252442 11.1876 0.59006 11.1898 1.00427C11.1921 1.41847 11.5297 1.75242 11.9439 1.75015L11.9357 0.250176ZM2.28847 6.83416L1.65477 6.433C1.64467 6.44895 1.63518 6.46528 1.62632 6.48194L2.28847 6.83416ZM3.1337 6.90115C3.35525 6.55117 3.25114 6.08785 2.90115 5.8663C2.55117 5.64475 2.08785 5.74886 1.8663 6.09885L3.1337 6.90115ZM11.9439 1.75015C14.1874 1.73788 16.373 2.46203 18.1653 3.81151L19.0676 2.61319C17.013 1.06623 14.5076 0.236108 11.9357 0.250176L11.9439 1.75015ZM18.1653 3.81151C19.9576 5.16098 21.2577 7.06123 21.866 9.22072L23.3098 8.814C22.6125 6.33849 21.1222 4.16015 19.0676 2.61319L18.1653 3.81151ZM21.866 9.22072C22.4743 11.3802 22.3574 13.6796 21.533 15.7662L22.9281 16.3174C23.8731 13.9255 24.0072 11.2895 23.3098 8.814L21.866 9.22072ZM21.533 15.7662C20.7086 17.8528 19.2224 19.6113 17.3024 20.7719L18.0784 22.0556C20.2794 20.7252 21.9831 18.7094 22.9281 16.3174L21.533 15.7662ZM17.3024 20.7719C15.3824 21.9325 13.1346 22.4311 10.9039 22.1912L10.7435 23.6826C13.3007 23.9576 15.8774 23.3861 18.0784 22.0556L17.3024 20.7719ZM10.9039 22.1912C8.67327 21.9513 6.58292 20.9861 4.9536 19.4438L3.92242 20.5332C5.79017 22.3012 8.18643 23.4076 10.7435 23.6826L10.9039 22.1912ZM4.9536 19.4438C3.32429 17.9015 2.246 15.8672 1.88418 13.653L0.403819 13.8949C0.818584 16.4331 2.05467 18.7651 3.92242 20.5332L4.9536 19.4438ZM1.88418 13.653C1.52237 11.4388 1.89701 9.16712 2.95062 7.18637L1.62632 6.48194C0.418517 8.75255 -0.0109459 11.3567 0.403819 13.8949L1.88418 13.653ZM2.92217 7.23531L3.1337 6.90115L1.8663 6.09885L1.65477 6.433L2.92217 7.23531Z" fill="#FFFFFF"></path> <path d="M5.84101 6.303L5.31068 5.77267H5.31068L5.84101 6.303ZM2 4.712H1.25H2ZM2.65901 3.121L2.12868 2.59067L2.12868 2.59067L2.65901 3.121ZM4.25001 1.53L4.78034 0.999669C4.48745 0.706775 4.01258 0.706775 3.71968 0.999669L4.25001 1.53ZM7.43201 4.712L7.96234 5.24233C8.103 5.10168 8.18201 4.91091 8.18201 4.712C8.18201 4.51309 8.103 4.32232 7.96234 4.18167L7.43201 4.712ZM5.31068 5.77267C5.02938 6.05398 4.64784 6.21201 4.25001 6.21201V7.71201C5.04567 7.71201 5.80873 7.39594 6.37134 6.83333L5.31068 5.77267ZM4.25001 6.21201C3.85219 6.21201 3.47065 6.05398 3.18934 5.77267L2.12868 6.83333C2.6913 7.39594 3.45436 7.71201 4.25001 7.71201V6.21201ZM3.18934 5.77267C2.90804 5.49136 2.75 5.10983 2.75 4.712H1.25C1.25 5.50765 1.56607 6.27072 2.12868 6.83333L3.18934 5.77267ZM2.75 4.712C2.75 4.31417 2.90804 3.93264 3.18934 3.65133L2.12868 2.59067C1.56607 3.15328 1.25 3.91635 1.25 4.712H2.75ZM3.18934 3.65133L4.78034 2.06033L3.71968 0.999669L2.12868 2.59067L3.18934 3.65133ZM3.71968 2.06033L6.90168 5.24233L7.96234 4.18167L4.78034 0.999669L3.71968 2.06033ZM6.90168 4.18167L5.31068 5.77267L6.37134 6.83333L7.96234 5.24233L6.90168 4.18167Z" fill="#FFFFFF"></path> <path d="M4.25019 1.52942C3.95716 1.82218 3.95694 2.29705 4.24969 2.59008C4.54245 2.88311 5.01732 2.88334 5.31035 2.59058L4.25019 1.52942ZM6.37135 1.53058C6.66438 1.23782 6.66461 0.762951 6.37185 0.46992C6.0791 0.176889 5.60422 0.176665 5.31119 0.46942L6.37135 1.53058ZM5.31035 2.59058L6.37135 1.53058L5.31119 0.46942L4.25019 1.52942L5.31035 2.59058Z" fill="#FFFFFF"></path> <path d="M6.37176 3.65192C6.07901 3.94495 6.07923 4.41983 6.37226 4.71258C6.6653 5.00534 7.14017 5.00511 7.43292 4.71208L6.37176 3.65192ZM8.49292 3.65108C8.78568 3.35805 8.78545 2.88318 8.49242 2.59042C8.19939 2.29767 7.72452 2.29789 7.43176 2.59092L8.49292 3.65108ZM7.43292 4.71208L8.49292 3.65108L7.43176 2.59092L6.37176 3.65192L7.43292 4.71208Z" fill="#FFFFFF"></path> <path d="M9 13H8.25H9ZM12 7L12.6171 6.57374C12.4771 6.37101 12.2464 6.25 12 6.25C11.7536 6.25 11.5229 6.37101 11.3829 6.57374L12 7ZM14.25 13C14.25 13.5967 14.0129 14.169 13.591 14.591L14.6517 15.6517C15.3549 14.9484 15.75 13.9946 15.75 13H14.25ZM13.591 14.591C13.169 15.0129 12.5967 15.25 12 15.25V16.75C12.9946 16.75 13.9484 16.3549 14.6517 15.6517L13.591 14.591ZM12 15.25C11.4033 15.25 10.831 15.0129 10.409 14.591L9.34835 15.6517C10.0516 16.3549 11.0054 16.75 12 16.75V15.25ZM10.409 14.591C9.98705 14.169 9.75 13.5967 9.75 13H8.25C8.25 13.9946 8.64509 14.9484 9.34835 15.6517L10.409 14.591ZM9.75 13C9.75 12.7561 9.87648 12.3 10.1554 11.6651C10.4208 11.061 10.7805 10.3898 11.1487 9.75496C11.5156 9.12262 11.8835 8.53914 12.1602 8.11299C12.2984 7.90024 12.4134 7.72748 12.4935 7.60836C12.5335 7.54882 12.5648 7.50273 12.5859 7.4718C12.5964 7.45633 12.6044 7.44466 12.6097 7.437C12.6123 7.43317 12.6143 7.43034 12.6155 7.42855C12.6161 7.42765 12.6166 7.427 12.6168 7.42662C12.617 7.42643 12.6171 7.42631 12.6171 7.42625C12.6171 7.42622 12.6171 7.42622 12.6171 7.42621C12.6171 7.42623 12.6171 7.42626 12 7C11.3829 6.57374 11.3829 6.57381 11.3828 6.57389C11.3828 6.57394 11.3827 6.57405 11.3826 6.57415C11.3825 6.57435 11.3823 6.57462 11.3821 6.57496C11.3816 6.57563 11.381 6.57657 11.3801 6.57776C11.3785 6.58015 11.3761 6.58358 11.3731 6.58801C11.367 6.59689 11.3581 6.60981 11.3467 6.62656C11.3239 6.66006 11.2907 6.70889 11.2487 6.77134C11.1648 6.8962 11.0453 7.07568 10.9023 7.29598C10.6165 7.73592 10.2344 8.34175 9.85126 9.00229C9.4695 9.66036 9.0792 10.3855 8.7821 11.0618C8.49852 11.7072 8.25 12.4154 8.25 13H9.75ZM12 7C11.3829 7.42626 11.3829 7.42623 11.3829 7.42621C11.3829 7.42622 11.3829 7.42622 11.3829 7.42625C11.3829 7.42631 11.383 7.42643 11.3832 7.42662C11.3834 7.427 11.3839 7.42765 11.3845 7.42855C11.3857 7.43034 11.3877 7.43317 11.3903 7.437C11.3956 7.44466 11.4036 7.45633 11.4141 7.4718C11.4352 7.50273 11.4665 7.54882 11.5065 7.60836C11.5866 7.72748 11.7016 7.90024 11.8398 8.11299C12.1165 8.53914 12.4844 9.12262 12.8513 9.75496C13.2195 10.3898 13.5792 11.061 13.8446 11.6651C14.1235 12.3 14.25 12.7561 14.25 13H15.75C15.75 12.4154 15.5015 11.7072 15.2179 11.0618C14.9208 10.3855 14.5305 9.66036 14.1487 9.00229C13.7656 8.34175 13.3835 7.73592 13.0977 7.29598C12.9547 7.07568 12.8352 6.8962 12.7513 6.77134C12.7093 6.70889 12.6761 6.66006 12.6533 6.62656C12.6419 6.60981 12.633 6.59689 12.6269 6.58801C12.6239 6.58358 12.6215 6.58015 12.6199 6.57776C12.619 6.57657 12.6184 6.57563 12.6179 6.57496C12.6177 6.57462 12.6175 6.57435 12.6174 6.57415C12.6173 6.57405 12.6172 6.57394 12.6172 6.57389C12.6171 6.57381 12.6171 6.57374 12 7Z" fill="#FFFFFF"></path> </g></svg>             
                <span style="${textStyle}">${t("hybrid")}</span>
            </span> `;
        }
        if (params.isGnv) {
            badges += `<span style="${badgeStyle}">
                <svg style="${svgStyle}" width="17" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#ffffff"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M17,8C8,10,5.9,16.17,3.82,21.34L5.71,22l1-2.3A4.49,4.49,0,0,0,8,20C19,20,22,3,22,3,21,5,14,5.25,9,6.25S2,11.5,2,13.5a6.22,6.22,0,0,0,1.75,3.75C7,8,17,8,17,8Z"></path> <rect width="24" height="24" fill="none"></rect> </g></svg>             
                <span style="${textStyle}">${t("gnv")}</span>
            </span> `;
        }
        if (params.isUsbPlugs) {
            badges += `<span style="${badgeStyle}">
                <svg style="${svgStyle}" width="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <circle cx="12" cy="17" r="1" stroke="currentColor" stroke-width="1.5"></circle> <circle cx="8" cy="9" r="1" stroke="currentColor" stroke-width="1.5"></circle> <path d="M11.25 16C11.25 16.4142 11.5858 16.75 12 16.75C12.4142 16.75 12.75 16.4142 12.75 16H11.25ZM12 6L12.5303 5.46967C12.2374 5.17678 11.7626 5.17678 11.4697 5.46967L12 6ZM12.4697 7.53033C12.7626 7.82322 13.2374 7.82322 13.5303 7.53033C13.8232 7.23744 13.8232 6.76256 13.5303 6.46967L12.4697 7.53033ZM10.4697 6.46967C10.1768 6.76256 10.1768 7.23744 10.4697 7.53033C10.7626 7.82322 11.2374 7.82322 11.5303 7.53033L10.4697 6.46967ZM11.4697 6.53033L12.4697 7.53033L13.5303 6.46967L12.5303 5.46967L11.4697 6.53033ZM11.4697 5.46967L10.4697 6.46967L11.5303 7.53033L12.5303 6.53033L11.4697 5.46967ZM12.75 16V14.125H11.25V16H12.75ZM12.75 14.125V6H11.25V14.125H12.75Z" fill="currentColor"></path> <path d="M8 10V11.0296C8 11.9044 8.5685 12.6777 9.40345 12.9386L10.8069 13.3772C11.5167 13.599 12 14.2563 12 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path> <path d="M16 11V12.0296C16 12.9044 15.4315 13.6777 14.5966 13.9386L13.1931 14.3772C12.4833 14.599 12 15.2563 12 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path> <path d="M15 10C15 9.5286 15 9.29289 15.1464 9.14645C15.2929 9 15.5286 9 16 9C16.4714 9 16.7071 9 16.8536 9.14645C17 9.29289 17 9.5286 17 10C17 10.4714 17 10.7071 16.8536 10.8536C16.7071 11 16.4714 11 16 11C15.5286 11 15.2929 11 15.1464 10.8536C15 10.7071 15 10.4714 15 10Z" stroke="currentColor" stroke-width="1.5"></path> <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path> </g></svg>             
                <span style="${textStyle}">${t("usb")}</span>
            </span> `;
        }
        if (params.isAirConditioned) {
            badges += `<span style="${badgeStyle}">
                <svg style="${svgStyle}" width="17" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g id="a"></g> <g id="b"> <path d="M29,8v5c0,1.1-.9,2-2,2h-1.21l-.1-1H6.31l-.1,1h-1.21c-1.1,0-2-.9-2-2v-5c0-1.1,.9-2,2-2H27c1.1,0,2,.9,2,2Z" style="fill:currentColor;"></path> <path d="M27,5H5c-1.6543,0-3,1.3457-3,3v5c0,1.6543,1.3457,3,3,3h.098l-.0926,.8975c-.0293,.2812,.0625,.562,.252,.7725,.1899,.21,.4595,.3301,.7427,.3301H26c.2832,0,.5527-.1201,.7427-.3301,.1895-.2104,.2812-.4912,.252-.7725l-.0926-.8975h.098c1.6543,0,3-1.3457,3-3v-5c0-1.6543-1.3457-3-3-3ZM7.1084,16l.1035-1H24.7881l.1035,1H7.1084Zm20.8916-3c0,.5513-.4487,1-1,1h-.3044l-.0106-.1025c-.0527-.5098-.4819-.8975-.9946-.8975H6.3096c-.5127,0-.9419,.3877-.9946,.8975l-.0106,.1025h-.3044c-.5513,0-1-.4487-1-1v-5c0-.5513,.4487-1,1-1H27c.5513,0,1,.4487,1,1v5Zm-1-3c0,.5522-.4478,1-1,1h-1c-.5522,0-1-.4478-1-1s.4478-1,1-1h1c.5522,0,1,.4478,1,1Zm-4,0c0,.5522-.4478,1-1,1h-1c-.5522,0-1-.4478-1-1s.4478-1,1-1h1c.5522,0,1,.4478,1,1Zm-1.3291,15.2422c.4097,.3706,.4414,1.0029,.0708,1.4126-.1973,.2183-.4692,.3291-.7422,.3291-.2393,0-.479-.0854-.6704-.2583-2.5371-2.2954-2.3774-6.5806-2.3696-6.7622,.0244-.5513,.4976-.9932,1.0415-.9536,.5508,.0234,.979,.4893,.9565,1.0405-.0015,.0352-.1216,3.5322,1.7134,5.1919Zm6.2363-.8213c-.1694,.3647-.5308,.5791-.9077,.5791-.1411,0-.2842-.0298-.4204-.0928-.1099-.0513-2.6978-1.2852-3.667-4.624-.1538-.5303,.1514-1.0854,.6816-1.2393,.5322-.1538,1.0854,.1514,1.2393,.6816,.707,2.4355,2.5693,3.3589,2.5879,3.3672,.501,.2324,.7188,.8271,.4863,1.3281Zm-13.8667-4.4575c.0078,.1816,.1675,4.4668-2.3696,6.7622-.1914,.1729-.4312,.2583-.6704,.2583-.2729,0-.5444-.1108-.7422-.3291-.3706-.4097-.3389-1.042,.0708-1.4126,1.5327-1.3862,1.7563-4.2168,1.7134-5.1899-.0244-.5518,.4028-1.019,.9546-1.0435,.5381-.0249,1.0186,.4023,1.0435,.9546Zm-4.9526,.3198c-.9692,3.3389-3.5571,4.5728-3.667,4.624-.1362,.063-.2793,.0928-.4204,.0928-.377,0-.7383-.2144-.9077-.5791-.2314-.499-.0161-1.0913,.481-1.3257,.0938-.0454,1.8901-.9468,2.5933-3.3696,.1538-.5303,.7065-.8359,1.2393-.6816,.5303,.1538,.8354,.709,.6816,1.2393Z" style="fill:currentColor;"></path> </g> </g></svg>
                <span style="${textStyle}">${t("ac")}</span>
            </span> `;
        }
        if (params.isHeatingUnit) {
            badges += `<span style="${badgeStyle}">
                <svg style="${svgStyle}" width="17" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path style="fill:currentColor;" d="M465.94,475.301h-70.358c-7.484,0-13.553-6.068-13.553-13.553s6.069-13.553,13.553-13.553h70.358 c10.452,0,18.955-8.503,18.955-18.955V182.167c0-10.452-8.503-18.955-18.955-18.955H137.925c-10.452,0-18.955,8.503-18.955,18.955 v247.073c0,10.452,8.503,18.955,18.955,18.955h182.984c7.484,0,13.553,6.068,13.553,13.553s-6.069,13.553-13.553,13.553H137.925 c-25.398,0-46.06-20.663-46.06-46.06V182.167c0-25.398,20.663-46.06,46.06-46.06H465.94c25.398,0,46.06,20.663,46.06,46.06v247.073 C512,454.637,491.337,475.301,465.94,475.301z"></path> <path style="fill:currentColor;" d="M190.663,411.956L190.663,411.956c-13.019,0-23.67-10.651-23.67-23.67V223.118 c0-13.019,10.651-23.67,23.67-23.67l0,0c13.019,0,23.67,10.651,23.67,23.67v165.167C214.333,401.304,203.68,411.956,190.663,411.956 z"></path> <path style="fill:currentColor;" d="M190.663,425.508c-20.526,0-37.223-16.698-37.223-37.223V223.118 c0-20.524,16.697-37.221,37.223-37.221s37.223,16.697,37.223,37.221v165.167C227.884,408.811,211.187,425.508,190.663,425.508z M190.663,213.004c-5.578,0-10.117,4.539-10.117,10.116v165.166c0,5.578,4.539,10.117,10.117,10.117s10.117-4.539,10.117-10.117 V223.118C200.779,217.541,196.241,213.004,190.663,213.004z"></path> <path style="fill:currentColor;" d="M301.932,411.956L301.932,411.956c-13.019,0-23.67-10.651-23.67-23.67V223.118 c0-13.019,10.651-23.67,23.67-23.67l0,0c13.019,0,23.67,10.651,23.67,23.67v165.167C325.601,401.304,314.95,411.956,301.932,411.956 z"></path> <path style="fill:currentColor;" d="M301.931,425.508c-20.526,0-37.223-16.698-37.223-37.223V223.118 c0-20.524,16.697-37.221,37.223-37.221c20.526,0,37.223,16.697,37.223,37.221v165.167 C339.154,408.811,322.457,425.508,301.931,425.508z M301.931,213.004c-5.578,0-10.117,4.539-10.117,10.116v165.166 c0,5.578,4.539,10.117,10.117,10.117s10.117-4.539,10.117-10.117V223.118C312.048,217.541,307.509,213.004,301.931,213.004z"></path> <path style="fill:currentColor;" d="M413.202,411.956L413.202,411.956c-13.019,0-23.67-10.651-23.67-23.67V223.118 c0-13.019,10.651-23.67,23.67-23.67l0,0c13.019,0,23.67,10.651,23.67,23.67v165.167C436.87,401.304,426.219,411.956,413.202,411.956 z"></path> <g> <path style="fill:currentColor;" d="M413.202,425.508c-20.526,0-37.223-16.698-37.223-37.223V223.118 c0-20.524,16.697-37.221,37.223-37.221s37.223,16.697,37.223,37.221v165.167C450.424,408.811,433.726,425.508,413.202,425.508z M413.202,213.004c-5.578,0-10.117,4.539-10.117,10.116v165.166c0,5.578,4.539,10.117,10.117,10.117s10.117-4.539,10.117-10.117 V223.118C423.319,217.541,418.78,213.004,413.202,213.004z"></path> <path style="fill:currentColor;" d="M105.416,230.486H58.277c-7.484,0-13.553-6.068-13.553-13.553c0-7.485,6.069-13.553,13.553-13.553 h47.139c7.484,0,13.553,6.068,13.553,13.553C118.969,224.418,112.901,230.486,105.416,230.486z"></path> <path style="fill:currentColor;" d="M105.416,408.027H58.277c-7.484,0-13.553-6.068-13.553-13.553c0-7.485,6.069-13.553,13.553-13.553 h47.139c7.484,0,13.553,6.068,13.553,13.553C118.969,401.959,112.901,408.027,105.416,408.027z"></path> <path style="fill:currentColor;" d="M47.435,251.51c-7.484,0-13.553-6.068-13.553-13.553V92.943c0-7.485,6.069-13.553,13.553-13.553 s13.553,6.068,13.553,13.553v145.014C60.987,245.442,54.918,251.51,47.435,251.51z"></path> <path style="fill:currentColor;" d="M47.435,475.301c-7.484,0-13.553-6.068-13.553-13.553V305.703c0-7.485,6.069-13.553,13.553-13.553 s13.553,6.068,13.553,13.553v156.045C60.987,469.234,54.918,475.301,47.435,475.301z"></path> </g> <rect x="13.553" y="50.253" style="fill:currentColor;" width="67.764" height="73.185"></rect> <path style="fill:currentColor;" d="M81.317,136.989H13.553C6.069,136.989,0,130.922,0,123.436V50.252 c0-7.485,6.069-13.553,13.553-13.553h67.764c7.484,0,13.553,6.068,13.553,13.553v73.185C94.869,130.922,88.8,136.989,81.317,136.989 z M27.106,109.884h40.658V63.804H27.106V109.884z"></path> </g></svg>
                <span style="${textStyle}">${t("hot")}</span>
            </span> `;
        }
    } 
    
    return badges;
}

function getVehicleBrandHtml(parkNumber) {
    const model = getVehicleModel(parkNumber);
    const defaultImagePath = "src/generic.png";
    
    if (model) {
        return `
            <div class="vehicle-model">

                <img src="${model.thumbnail}" 
                     onerror="this.style.display='none';" 
                     alt="${model.name}" 
                     class="vehicle-thumbnail"  />
            </div>
        `;
    }

    return ``;
}

function getVehicleBrandHtmlLight(parkNumber) {
    const model = getVehicleModel(parkNumber);
    const defaultImagePath = "src/generic.png";
    
    if (model) {
        return `
            <img src="${model.thumbnail}" 
                onerror="this.style.display='none';" 
                alt="Thumbnail ${model.name}" 
                class="vehicle-thumbnaill"  />
        `;
    }

    return ``;
}

async function initializeApp() {
    try {
        
        for (const key in vehicleTypes) {
            vehicleTypes[key] = new Set();
        }
        
        await loadVehicleModels();
        
        await fetchVehiclePositions();
    } catch (error) {
        console.error('BECAB Launcher : erreur lors de l\'initialisation :', error);
        toastBottomRight.error('BECAB Launcher : erreur lors de l\'initialisation :', error);
        soundsUX('MBF_NotificationError');
    }
}

let isVibrating = false;
let vibrationTimeout = null;

/**
 * Fonction pour gérer les vibrations de manière sécurisée sans chevauchement
 * @param {Array|Number} pattern - Motif de vibration (un nombre pour une vibration simple, un tableau pour un motif)
 * @param {Boolean} force - Forcer la vibration même si une autre est en cours
 * @returns {Boolean} - Indique si la vibration à été déclenchée
 * Par Becab Systems
 */
function safeVibrate(pattern, force = false) {
    if (localStorage.getItem('vibration') === 'true') {
        if (!navigator.vibrate) {
            return false;
        }
        
        if (isVibrating && !force) {
            return false;
        }
        
        if (isVibrating && force) {
            navigator.vibrate(0);
            
            if (vibrationTimeout) {
                clearTimeout(vibrationTimeout);
                vibrationTimeout = null;
            }
        }
        
        isVibrating = true;
        
        const vibrationPattern = Array.isArray(pattern) ? pattern : [pattern];
        
        const totalDuration = vibrationPattern.reduce((a, b) => a + b, 0) + 50;
        
        try {
            const success = navigator.vibrate(vibrationPattern);
            
            if (success === false) {
                isVibrating = false;
                return false;
            }
        } catch (error) {
            isVibrating = false;
            return false;
        }
        
        vibrationTimeout = setTimeout(() => {
            isVibrating = false;
            vibrationTimeout = null;
        }, totalDuration);
        
        return true;
    } 
}




const langSwitcher = createLanguageSwitcher();

function createLanguageSwitcher(container) {
  // Config des langues disponibles (pour rajoutes langues, juste rajouter un objet dans le tableau
  // et rajouter la langue dans le fichier de traduction i18n.js)
  const languages = [
    { code: 'fr', name: 'Français 🥖🥐' },
    { code: 'en', name: 'English 🐟🍟' },
    { code: 'it', name: 'Italiano 🍕🍍' },
    { code: 'ar', name: 'عربي 🫖🍖' }
  ];
  
  const switcherContainer = document.createElement('div');
  switcherContainer.style.display = 'none';
  switcherContainer.className = 'language-switcher glass-effect';
  switcherContainer.style.position = 'absolute';
  switcherContainer.style.bottom = '0px';
  switcherContainer.style.left = '0px';
  switcherContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
  switcherContainer.style.backdropFilter = 'blur(8px)';
  switcherContainer.style.WebkitBackdropFilter = 'blur(8px)';
  switcherContainer.style.borderRadius = '0 12px 0 0';
  switcherContainer.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.4)';
  switcherContainer.style.padding = '4px';
  switcherContainer.style.zIndex = '10000000000';
  switcherContainer.style.fontFamily = 'League Spartan, sans-serif';
  switcherContainer.style.transition = 'all 0.4s cubic-bezier(0.32, 0.64, 0.45, 1)';
  switcherContainer.style.transform = 'translateY(100px)';
  switcherContainer.style.opacity = '0';
  
  
  const mainButton = document.createElement('div');
  mainButton.className = 'lang-main-button';
  mainButton.style.display = 'flex';
  mainButton.style.alignItems = 'center';
  mainButton.style.justifyContent = 'space-between';
  mainButton.style.cursor = 'pointer';
  mainButton.style.color = '#ffffff';
  mainButton.style.padding = '8px 12px';
  mainButton.style.borderRadius = '8px';
  mainButton.style.transition = 'background-color 0.4s';
  
  const globeIcon = document.createElement('span');
  globeIcon.innerHTML = '🌐';
  globeIcon.style.marginRight = '10px';
  globeIcon.style.fontSize = '18px';
  
  const currentLangText = document.createElement('span');
  currentLangText.id = 'current-lang-text';
  currentLangText.textContent = languages.find(lang => lang.code === i18n.currentLang)?.name || 'Langue';
  
  const arrowIcon = document.createElement('span');
  arrowIcon.innerHTML = '▼';
  arrowIcon.style.fontSize = '12px';
  arrowIcon.style.marginLeft = '10px';
  arrowIcon.style.transition = 'transform 0.4s';
  
  mainButton.appendChild(globeIcon);
  mainButton.appendChild(currentLangText);
  mainButton.appendChild(arrowIcon);
  
  const dropdown = document.createElement('div');
  dropdown.className = 'lang-dropdown';
  dropdown.style.display = 'none';
  dropdown.style.flexDirection = 'column';
  dropdown.style.marginTop = '10px';
  dropdown.style.borderRadius = '8px';
  dropdown.style.overflow = 'hidden';
  dropdown.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
  dropdown.style.backgroundColor = 'rgba(36, 36, 36, 0.95)';
  dropdown.style.animation = 'none';
  
  languages.forEach(lang => {
    const langOption = document.createElement('div');
    langOption.className = 'lang-option';
    langOption.textContent = lang.name;
    langOption.dataset.lang = lang.code;
    langOption.style.padding = '10px 15px';
    langOption.style.cursor = 'pointer';
    langOption.style.transition = 'background-color 0.3s';
    langOption.style.color = '#ffffff';
    


    if (lang.code === i18n.currentLang) {
      langOption.style.backgroundColor = 'rgba(80, 80, 80, 0.5)';
      langOption.style.fontWeight = 'bold';
    }
    
    langOption.onmouseover = () => {
      langOption.style.backgroundColor = 'rgba(80, 80, 80, 0.3)';
    };
    
    langOption.onmouseout = () => {
      if (lang.code !== i18n.currentLang) {
        langOption.style.backgroundColor = 'transparent';
      } else {
        langOption.style.backgroundColor = 'rgba(80, 80, 80, 0.5)';
      }
    };
    
    langOption.onclick = async (e) => {
      e.stopPropagation();
      const newLang = lang.code;
      
      if (newLang !== i18n.currentLang) {
        langSwitcher.updateCurrentLanguage(newLang);
        const transitionOverlay = document.createElement('div');
        transitionOverlay.style.position = 'fixed';
        transitionOverlay.style.top = '0';
        transitionOverlay.style.left = '0';
        transitionOverlay.style.width = '100%';
        transitionOverlay.style.height = '100%';
        transitionOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        transitionOverlay.style.zIndex = '9999';
        transitionOverlay.style.opacity = '0';
        transitionOverlay.style.transition = 'opacity 0.4s ease';
        document.body.appendChild(transitionOverlay);
        
        setTimeout(() => {
          transitionOverlay.style.opacity = '1';
          
          const urlParams = new URLSearchParams(window.location.search);
          urlParams.set('lang', newLang);
          
          localStorage.setItem('preferredLanguage', newLang);
          
          setTimeout(() => {
            window.location.search = urlParams.toString();
          }, 300);
        }, 50);
      }
      
      toggleDropdown(false);
    };
    
    dropdown.appendChild(langOption);
  });
  
  switcherContainer.appendChild(mainButton);
  switcherContainer.appendChild(dropdown);
  
  let isOpen = false;
  
  function toggleDropdown(forceState) {
    isOpen = forceState !== undefined ? forceState : !isOpen;
    
    if (isOpen) {
      dropdown.style.display = 'flex';
      dropdown.style.animation = 'zoomFadeIn 0.5s cubic-bezier(0.25, 1.5, 0.5, 1) forwards';
      arrowIcon.style.transform = 'rotate(180deg)';
      mainButton.style.backgroundColor = 'rgba(80, 80, 80, 0.3)';
    } else {
      dropdown.style.animation = 'none';
      dropdown.style.display = 'none';
      arrowIcon.style.transform = 'rotate(0deg)';
      mainButton.style.backgroundColor = 'transparent';
    }
  }
  
  mainButton.onclick = () => toggleDropdown();
  
  document.addEventListener('click', (e) => {
    if (!switcherContainer.contains(e.target) && isOpen) {
      toggleDropdown(false);
    }
  });
  
  
  if (container) {
    if (typeof container === 'string') {
      document.querySelector(container).appendChild(switcherContainer);
    } else {
      container.appendChild(switcherContainer);
    }
  } else {
    document.body.appendChild(switcherContainer);
  }
  
  return {
    element: switcherContainer,
    updateCurrentLanguage: (langCode) => {
      currentLangText.textContent = languages.find(lang => lang.code === langCode)?.name || 'Langue';
      
      document.querySelectorAll('.lang-option').forEach(option => {
        if (option.dataset.lang === langCode) {
          option.style.backgroundColor = 'rgba(80, 80, 80, 0.5)';
          option.style.fontWeight = 'bold';
        } else {
          option.style.backgroundColor = 'transparent';
          option.style.fontWeight = 'normal';
        }
      });
    }
  };
}



function hideLanguageSwitcher() {
  langSwitcher.element.style.transform = 'translateY(100px)';
  langSwitcher.element.style.opacity = '0';
  
  setTimeout(() => {
    langSwitcher.element.style.display = 'none';
  }, 300); 
}

function showLanguageSwitcher() {
  langSwitcher.element.style.display = 'block';
  
  setTimeout(() => {
    langSwitcher.element.style.transform = 'translateY(0)';
    langSwitcher.element.style.opacity = '1';
  }, 10);
}


function startWindowsSpinnerAnimation(elementId, interval = 30) {
  const frames = [
    '','','','','','','','','','','','','','','','',
    '','','','','','','','','','','','','','','','',
    '','','','','','','','','','','','','','','','',
    '','','','','','','','','','','','','','','','',
    '','','','','','','','','','','','','','','','',
    '','','','','','','','','','','','','','','','',
    '','','','','','','','','','','','','','','','',
    '','','','','','','','','',''
  ];

  const el = document.getElementById(elementId);
  if (!el) {
    return () => {};
  }

  let i = 0;
  const timer = setInterval(() => {
    el.textContent = frames[i];
    i = (i + 1) % frames.length;
  }, interval);
  return () => clearInterval(timer);
}

let isStandardView = localStorage.getItem('isStandardView') === 'true';

function toggleMapView(forceState) {
    if (forceState !== undefined) {
        isStandardView = forceState;
    } else {
        isStandardView = !isStandardView;
    }
    
    localStorage.setItem('isStandardView', isStandardView);
    applyMapView();
}

function applyMapView() {
    const currentDate = new Date();
    const latitude = map.getCenter().lat;  
    const longitude = map.getCenter().lng;  


    map.eachLayer(function(layer) {
        if (layer instanceof L.TileLayer) {
            map.removeLayer(layer);
        }
    });

    if (!isStandardView) {
    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        minZoom: 6,
        maxZoom: 19,
    }).addTo(map);
    

} else {
    const mapPane = map.getPanes().tilePane;
    mapPane.style.filter = 'none';

    
    L.tileLayer('https://data.geopf.fr/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&STYLE={style}&TILEMATRIXSET=PM&FORMAT={format}&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}', {
        minZoom: 6,
        maxZoom: 19,
        format: 'image/jpeg',
        style: 'normal'
    }).addTo(map);

}
}

function shareVehicleId(id) {
  const message = t("shareMessage").replace("{{vehicleId}}", id);
  const url = window.location.href + `?vehicle=${encodeURIComponent(id)}`; 
  const fullMessage = `${message} ${url}`;

  if (navigator.share) {
    navigator.share({
      title: 'My Bus Finder',
      text: fullMessage,
    }).catch(err => console.error("Sharing failed :(", err));
  } 
}

function getVehicleFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("vehicle");
}

function waitForVehicleMarker(vehicleId, timeoutMs = 5000, intervalMs = 200) {
  return new Promise(resolve => {
    const start = Date.now();
    const timer = setInterval(() => {
      const marker = markerPool && markerPool.active ? markerPool.active.get(vehicleId) : null;
      if (marker) {
        clearInterval(timer);
        resolve(marker);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        resolve(null);
      }
    }, intervalMs);
  });
}

function waitForGtfsInitialized(timeoutMs = 10000, intervalMs = 200) {
  return new Promise(resolve => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (gtfsInitialized) {
        clearInterval(timer);
        resolve(true);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        resolve(false);
      }
    }, intervalMs);
  });
}

window.addEventListener("load", async () => {
  const vehicleId = getVehicleFromUrl();
  if (!vehicleId) return;

  await waitForGtfsInitialized();
  await fetchVehiclePositions();

  const marker = await waitForVehicleMarker(vehicleId);
  if (!marker) return;

  map.setView(marker.getLatLng(), 17);
  marker.openPopup();
});



function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function getTextColor(bgColor, options = {}) {
    const {
        contrastRatio = 4.5,
        darkColor = '#1a1a1a',
        lightColor = '#f8f9fa',
        useGradient = false 
    } = options;

    let r, g, b, a = 1;

    if (!bgColor) return darkColor;

    bgColor = bgColor.trim();

    if (bgColor.startsWith('rgb')) {
        const values = bgColor.match(/\d+(\.\d+)?/g);
        if (values) {
            r = parseInt(values[0]);
            g = parseInt(values[1]);
            b = parseInt(values[2]);
            a = values[3] ? parseFloat(values[3]) : 1;
        } else {
            return darkColor;
        }
    } else {
        // Parse hex colors
        if (/^#([a-f\d])([a-f\d])([a-f\d])$/i.test(bgColor)) {
            bgColor = bgColor.replace(/^#([a-f\d])([a-f\d])([a-f\d])$/i,
                (_, r, g, b) => '#' + r + r + g + g + b + b);
        }

        if (bgColor.length === 7) {
            r = parseInt(bgColor.slice(1, 3), 16);
            g = parseInt(bgColor.slice(3, 5), 16);
            b = parseInt(bgColor.slice(5, 7), 16);
        } else if (bgColor.length === 9) {
            r = parseInt(bgColor.slice(1, 3), 16);
            g = parseInt(bgColor.slice(3, 5), 16);
            b = parseInt(bgColor.slice(5, 7), 16);
            a = parseInt(bgColor.slice(7, 9), 16) / 255;
        } else if (bgColor.length === 8 && bgColor.startsWith('#')) {
            r = parseInt(bgColor.slice(1, 3), 16);
            g = parseInt(bgColor.slice(3, 5), 16);
            b = parseInt(bgColor.slice(5, 7), 16);
            a = parseInt(bgColor.slice(7, 9), 16) / 255;
        } else {
            return darkColor;
        }
    }

    // Clamp values
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    // Calculate luminance of background
    const srgb = [r, g, b].map(c => {
        const val = c / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    const luminance = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];

    // Helper function to calculate luminance from hex
    const getLuminance = (color) => {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;
        const srgb = [r, g, b].map(c => 
            c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
        );
        return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    };

    // Calculate contrast ratios
    const darkLuminance = getLuminance(darkColor);
    const lightLuminance = getLuminance(lightColor);

    const contrastWithDark = luminance > darkLuminance 
        ? (luminance + 0.05) / (darkLuminance + 0.05)
        : (darkLuminance + 0.05) / (luminance + 0.05);
    
    const contrastWithLight = luminance > lightLuminance 
        ? (luminance + 0.05) / (lightLuminance + 0.05)
        : (lightLuminance + 0.05) / (luminance + 0.05);

    const isMediumDark = luminance >= 0.12 && luminance <= 0.35;

    if (contrastWithDark >= contrastRatio && contrastWithLight >= contrastRatio) {
        if (isMediumDark) {
            return lightColor;
        }
        return luminance > 0.18 ? darkColor : lightColor;
    } 
    else if (contrastWithDark >= contrastRatio) {
        if (isMediumDark) {
            return lightColor;
        }
        return darkColor;
    } 
    // Si seule la couleur claire passe
    else if (contrastWithLight >= contrastRatio) {
        return lightColor;
    } 
    // Aucune ne passe vraiment le test
    else {
        // Pour les couleurs moyennes-foncées, forcer le clair
        if (isMediumDark) {
            return lightColor;
        }
        
        // Seuil abaissé à 0.15 pour préférer le clair sur les fonds sombres
        if (luminance < 0.15) {
            return lightColor; 
        }
        
        // Sinon prendre le meilleur contraste disponible
        return contrastWithDark > contrastWithLight ? darkColor : lightColor;
    }
}


const MenuManager = {
    container: null,
    sections: new Map(),
    busesByLineAndDestination: {},
    isInitialized: false,
    searchInput: null,
    searchResults: null,
    isSearchActive: false,
    allBuses: [],
    
    init() {
        this.container = document.getElementById('menu');
        if (!this.container) {
            console.error('Menu container not found');
            return false;
        }
        this.isInitialized = true;
        return true;
    },
    
    generateInitialStructure(busesByLineAndDestination) {
        if (!this.isInitialized) this.init();
        
        this.busesByLineAndDestination = busesByLineAndDestination;
        this.container.innerHTML = '';
        
        this._createTopBar();
        this._createSearchBar();
        
        const spacer = document.createElement('div');
        spacer.style.height = '15px';
        spacer.id = 'menu-spacer';
        this.container.appendChild(spacer);
        
        this._insertLinesInBatches(this._getSortedLines(), busesByLineAndDestination);
    },

    _insertLinesInBatches(sortedLines, busesByLineAndDestination, index = 0) {
        const BATCH_SIZE = 3;
        const end = Math.min(index + BATCH_SIZE, sortedLines.length);
        
        for (let i = index; i < end; i++) {
            const line = sortedLines[i];
            const lineSection = this._createLineSection(line);
            this.sections.set(line, lineSection);
            
            const destinations = busesByLineAndDestination[line];
            Object.keys(destinations).sort().forEach(destination => {
                this._addDestinationToSection(lineSection, line, destination, destinations[destination]);
            });
            
            this.container.appendChild(lineSection.element);
        }
        
        if (end < sortedLines.length) {
            requestAnimationFrame(() => {
                this._insertLinesInBatches(sortedLines, busesByLineAndDestination, end);
            });
        } else {
            this._updateStatistics();
            this._buildBusIndex();
        }
    },
    
    _createSearchBar() {
        const searchContainer = document.createElement('div');
        searchContainer.id = 'search-container';
        searchContainer.style.cssText = `
            top: 78px;
            left: 0;
            right: 0;
            padding: 0 16px 10px;
            z-index: 0;
            transition: transform 0.3s ease;
            margin-top: 10px;
        `;
        
        const searchWrapper = document.createElement('div');
        searchWrapper.style.cssText = `
            position: relative;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: rgba(0, 0, 0, 0.2) 0px 2px 10px;
            backdrop-filter: blur(17px);
            background-color: rgba(0, 0, 0, 0.46);
            border-radius: 100px;
        `;
        
        // Icône de recherche
        const searchIcon = document.createElement('div');
        searchIcon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="8" stroke="white" stroke-width="2"/>
                <path d="M21 21L16.65 16.65" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `;
        searchIcon.style.cssText = `
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            pointer-events: none;
            opacity: 0.7;
            z-index: 2;
        `;
        
        // Input de recherche
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = t('search_placeholder') || 'Rechercher ligne, destination, bus...';
        this.searchInput.id = 'menu-search-input';
        this.searchInput.style.cssText = `
            flex: 1;
            padding: 12px 45px 12px 45px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 25px;
            color: white;
            font-size: 15px;
            font-family: 'League Spartan', sans-serif;
            outline: none;
            transition: all 0.3s ease;
        `;
        
        // Bouton clear
        const clearButton = document.createElement('button');
        clearButton.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `;
        clearButton.style.cssText = `
            position: absolute;
            right: 7px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.1);
            border: none;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: none;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            z-index: 2;
        `;
        
        clearButton.onmouseover = () => {
            clearButton.style.background = 'rgba(255, 255, 255, 0.2)';
            clearButton.style.transform = 'translateY(-50%) scale(1.1)';
        };
        clearButton.onmouseout = () => {
            clearButton.style.background = 'rgba(255, 255, 255, 0.1)';
            clearButton.style.transform = 'translateY(-50%) scale(1)';
        };
        
        clearButton.onclick = () => {
            this.searchInput.value = '';
            this._performSearch('');
            this.searchInput.focus();
        };
        
    this.searchInput.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        clearButton.style.display = value ? 'flex' : 'none';
        this._performSearch(value);
    });

    this.searchInput.addEventListener('focus', () => {
        searchWrapper.classList.add('search-active');
        var soundAi = new Audio('../soundsUX/becabintell.wav');
        soundAi.play();
        
        this.searchInput.style.background = 'rgba(255, 255, 255, 0.15)';
        this.searchInput.style.borderColor = 'rgba(255, 255, 255, 0.4)';
        this.searchInput.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.1)';
    });

    this.searchInput.addEventListener('blur', () => {
        if (!this.searchInput.value.trim()) {
            searchWrapper.classList.remove('search-active');
        }
        
        this.searchInput.style.background = 'rgba(255, 255, 255, 0.1)';
        this.searchInput.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        this.searchInput.style.boxShadow = 'none';
    });
        
        searchWrapper.appendChild(searchIcon);
        searchWrapper.appendChild(this.searchInput);
        searchWrapper.appendChild(clearButton);
        searchContainer.appendChild(searchWrapper);
        
        // Résultats de recherche
        this.searchResults = document.createElement('div');
        this.searchResults.id = 'search-results';
        this.searchResults.style.cssText = `
            margin-top: 10px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 12px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            display: none;
            position: sticky;
        `;
        searchContainer.appendChild(this.searchResults);
        
        this.container.appendChild(searchContainer);
    },
        
    _buildBusIndex() {
        this.allBuses = [];
        
        Object.entries(this.busesByLineAndDestination).forEach(([line, destinations]) => {
            Object.entries(destinations).forEach(([destination, buses]) => {
                buses.forEach(bus => {
                    const vehicleLabel = bus.vehicleData?.vehicle?.label
                        || bus.vehicleData?.vehicle?.id
                        || "inconnu";
                    
                    this.allBuses.push({
                        line,
                        destination,
                        vehicleLabel,
                        parkNumber: bus.parkNumber,
                        bus,
                        searchText: `${line} ${destination} ${vehicleLabel}`.toLowerCase()
                    });
                });
            });
        });
    },
    
    _performSearch(query) {
        const searchWrapper = document.querySelector('#search-container > div');
        
        if (!query) {
            this.isSearchActive = false;
            this.searchResults.style.display = 'none';
            
            if (searchWrapper) {
                searchWrapper.classList.remove('search-active');
            }
            
            this._showAllSections();
            return;
        }
        
        this.isSearchActive = true;
        const normalizedQuery = query.toLowerCase().trim();
        
        const results = this.allBuses.map(item => {
            const score = this._calculateScore(item, normalizedQuery);
            return { ...item, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);
        
        if (results.length === 0) {
            this._showNoResults();
            this._hideAllSections();
            return;
        }
        
        const resultsByLine = new Map();
        results.forEach(result => {
            if (!resultsByLine.has(result.line)) {
                resultsByLine.set(result.line, []);
            }
            resultsByLine.get(result.line).push(result);
        });
        
        this._displaySearchResults(resultsByLine, normalizedQuery);
        
        this._filterSections(resultsByLine);
    },

    _calculateScore(item, query) {
        let score = 0;
        
        if (item.line.toLowerCase() === query) score += 100;
        if (item.destination.toLowerCase() === query) score += 80;
        if (item.vehicleLabel.toLowerCase() === query) score += 90;
        
        if (item.line.toLowerCase().startsWith(query)) score += 50;
        if (item.destination.toLowerCase().startsWith(query)) score += 40;
        if (item.vehicleLabel.toLowerCase().startsWith(query)) score += 45;
        
        if (item.line.toLowerCase().includes(query)) score += 30;
        if (item.destination.toLowerCase().includes(query)) score += 25;
        if (item.vehicleLabel.toLowerCase().includes(query)) score += 28;
        
        if (this._fuzzyMatch(item.line, query)) score += 15;
        if (this._fuzzyMatch(item.destination, query)) score += 12;
        if (this._fuzzyMatch(item.vehicleLabel, query)) score += 13;
        
        if (score > 0) {
            const tripId = item.bus.vehicleData?.trip?.tripId;
            const stops = tripUpdates[tripId]?.nextStops || [];
            const stopNames = stops.map(s => stopNameMap[s.stopId] || s.stopId).join(' ');
            
            if (stopNames.toLowerCase() === query) score += 85;
            else if (stopNames.toLowerCase().startsWith(query)) score += 42;
            else if (stopNames.toLowerCase().includes(query)) score += 27;
            
            if (this._fuzzyMatch(stopNames, query)) score += 10;
        }
        
        const matchCount = [
            item.line.toLowerCase().includes(query),
            item.destination.toLowerCase().includes(query),
            item.vehicleLabel.toLowerCase().includes(query)
        ].filter(Boolean).length;
        
        if (matchCount > 1) score += 20 * matchCount;
        
        return score;
    },

    _fuzzyMatch(text, query) {
        if (!text) return false;
        text = text.toLowerCase();
        
        // Match exact
        if (text.includes(query)) return true;
        
        // Match avec caractères manquants (ex: "cnn" match "cannes")
        let textIndex = 0;
        for (let char of query) {
            textIndex = text.indexOf(char, textIndex);
            if (textIndex === -1) return false;
            textIndex++;
        }
        return true;
    },
    
    _displaySearchResults(resultsByLine, query) {
        this.searchResults.innerHTML = '';
        this.searchResults.style.display = 'block';
        
        const summary = document.createElement('div');
        summary.style.cssText = `
            color: white;
            font-size: 14px;
            margin-bottom: 15px;
            opacity: 0.8;
            font-weight: 500;
        `;
        
        const totalResults = Array.from(resultsByLine.values()).reduce((sum, arr) => sum + arr.length, 0);
        summary.textContent = `${totalResults} ${t('result' + (totalResults > 1 ? 's' : ''))} • ${resultsByLine.size} ${t('line' + (resultsByLine.size > 1 ? 's' : ''))}`;
        this.searchResults.appendChild(summary);
        
        // Afficher par ligne avec les véhicules
        Array.from(resultsByLine.entries()).slice(0, 2).forEach(([line, items]) => {
            const lineColor = lineColors[line] || '#000000';
            const textColor = getTextColor(lineColor);
            
            const lineResult = document.createElement('div');
            lineResult.style.cssText = `
                background: ${lineColor}40;
                padding: 12px;
                margin-bottom: 10px;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 2px solid transparent;
            `;
            
            lineResult.onmouseover = () => {
                lineResult.style.background = `${lineColor}60`;
                lineResult.style.borderColor = `${lineColor}80`;
                lineResult.style.transform = 'scale(0.98)';
            };
            
            lineResult.onmouseout = () => {
                lineResult.style.background = `${lineColor}40`;
                lineResult.style.borderColor = 'transparent';
                lineResult.style.transform = 'scale(1)';
            };
            
            lineResult.onclick = () => {
                this.searchInput.value = '';
                this._performSearch('');
                
                const lineSection = this.sections.get(line);
                if (lineSection) {
                    lineSection.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    lineSection.element.style.animation = 'pulse 0.5s ease';
                    setTimeout(() => {
                        lineSection.element.style.animation = '';
                    }, 500);
                }
            };
            
            const lineHeader = document.createElement('div');
            lineHeader.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            `;
            
            const lineTitle = document.createElement('div');
            lineTitle.style.cssText = `
                color: white;
                font-weight: 600;
                font-size: 16px;
            `;
            lineTitle.textContent = `${t('line')} ${lineName[line] || line}`;
            
            const vehicleCount = document.createElement('div');
            vehicleCount.style.cssText = `
                color: white;
                font-size: 12px;
                opacity: 0.9;
                background: rgba(0, 0, 0, 0.2);
                padding: 4px 8px;
                border-radius: 12px;
            `;
            vehicleCount.textContent = `${items.length} ${t('vehicle' + (items.length > 1 ? 's' : ''))}`;
            
            lineHeader.appendChild(lineTitle);
            lineHeader.appendChild(vehicleCount);
            
            // Destinations
            const destinationsText = document.createElement('div');
            destinationsText.style.cssText = `
                color: white;
                font-size: 13px;
                opacity: 0.85;
                margin-bottom: 10px;
            `;
            const uniqueDestinations = [...new Set(items.map(i => i.destination))];
            destinationsText.textContent = `➜ ${uniqueDestinations.join(', ')}`;
            
            const vehiclesList = document.createElement('div');
            vehiclesList.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-top: 8px;
            `;
            
            items.slice(0, 3).forEach((item, index) => {
                const vehicleItem = document.createElement('div');
                vehicleItem.style.cssText = `
                    background: rgba(0, 0, 0, 0.2);
                    padding: 8px 10px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.2s ease;
                    cursor: pointer;
                `;
                
                vehicleItem.onmouseover = () => {
                    vehicleItem.style.background = 'rgba(0, 0, 0, 0.35)';
                    vehicleItem.style.transform = 'scale(1.02)';
                };
                
                vehicleItem.onmouseout = () => {
                    vehicleItem.style.background = 'rgba(0, 0, 0, 0.2)';
                    vehicleItem.style.transform = 'scale(1)';
                };
                
                vehicleItem.onclick = (e) => {
                    e.stopPropagation();
                    safeVibrate([50, 300, 50, 30, 50], true);
                    soundsUX('MBF_Menu_VehicleSelect');
                    map.setView(item.bus.vehicle.getLatLng(), 15);
                    item.bus.vehicle.openPopup();
                    closeMenu();
                    this.searchInput.value = '';
                    this._performSearch('');
                };
                
                const vehicleBadge = document.createElement('span');
                vehicleBadge.style.cssText = `
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 12px;
                    min-width: 50px;
                    text-align: center;
                `;
                vehicleBadge.textContent = item.vehicleLabel.replace(/Véhicule inconnu\.?/, "inconnu");
                
                const destInfo = document.createElement('span');
                destInfo.style.cssText = `
                    color: white;
                    font-size: 13px;
                    opacity: 0.9;
                    flex: 1;
                `;
                destInfo.textContent = item.destination;
                
                vehicleItem.appendChild(vehicleBadge);
                vehicleItem.appendChild(destInfo);
                
                vehiclesList.appendChild(vehicleItem);
            });
                
            if (items.length > 3) {
                const moreVehicles = document.createElement('div');
                moreVehicles.style.cssText = `
                    color: white;
                    font-size: 12px;
                    opacity: 0.6;
                    text-align: center;
                    margin-top: 4px;
                    font-style: italic;
                `;
                moreVehicles.textContent = `+ ${items.length - 3} ${t('other')} ${t('vehicles')}`;
                vehiclesList.appendChild(moreVehicles);
            }
            
            lineResult.appendChild(lineHeader);
            lineResult.appendChild(destinationsText);
            lineResult.appendChild(vehiclesList);
            this.searchResults.appendChild(lineResult);
        });
        
        if (resultsByLine.size > 10) {
            const more = document.createElement('div');
            more.style.cssText = `
                color: white;
                font-size: 13px;
                opacity: 0.6;
                text-align: center;
                margin-top: 10px;
                padding: 8px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
            `;
            more.textContent = `+ ${resultsByLine.size - 10} ${t('other_lines')}`;
            this.searchResults.appendChild(more);
        }
    },    

    _showNoResults() {
        this.searchResults.innerHTML = '';
        this.searchResults.style.display = 'block';
        
        const noResults = document.createElement('div');
        noResults.style.cssText = `
            color: white;
            text-align: center;
            padding: 20px;
            opacity: 0.6;
        `;
        noResults.innerHTML = `
            <div style="font-size: 40px; margin-bottom: 10px;">🔍</div>
            <div style="font-size: 16px;">${t('no_results') || 'Aucun résultat'}</div>
        `;
        this.searchResults.appendChild(noResults);
    },
    
    _showAllSections() {
        this.sections.forEach((section) => {
            section.element.style.display = '';
            section.element.style.opacity = '1';
            section.element.style.transform = '';
            section.element.style.transition = '';
        });
    },

    _hideAllSections() {
        this.sections.forEach((section) => {
            section.element.style.display = 'none';
            section.element.style.opacity = '';
            section.element.style.transform = '';
        });
    },

    _filterSections(resultsByLine) {
        let visibleIndex = 0;
        const MAX_ANIMATED = 8; // Au-delà, pas d'animation

        this.sections.forEach((section, line) => {
            if (resultsByLine.has(line)) {
                section.element.style.display = '';
                if (visibleIndex < MAX_ANIMATED) {
                    section.element.style.opacity = '0';
                    section.element.style.transform = 'translateY(20px)';
                    const idx = visibleIndex;
                    setTimeout(() => {
                        section.element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        section.element.style.opacity = '1';
                        section.element.style.transform = 'translateY(0)';
                    }, idx * 50);
                } else {
                    section.element.style.opacity = '1';
                    section.element.style.transform = '';
                    section.element.style.transition = '';
                }
                visibleIndex++;
            } else {
                section.element.style.display = 'none';
                section.element.style.opacity = '';
                section.element.style.transform = '';
                section.element.style.transition = '';
            }
        });
    },

    updateData(busesByLineAndDestination) {
        if (!this.isInitialized) return;
        
        const newLines = new Set(Object.keys(busesByLineAndDestination));
        const currentLines = new Set(this.sections.keys());
        
        for (const line of currentLines) {
            if (!newLines.has(line)) {
                this._removeLine(line);
            }
        }
        
        for (const line of newLines) {
            if (this.sections.has(line)) {
                this._updateLine(line, busesByLineAndDestination[line]);
            } else {
                this._addLine(line, busesByLineAndDestination[line]);
            }
        }
        
        this.busesByLineAndDestination = busesByLineAndDestination;
        this._updateStatistics();
        
        const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 50));
        idleCallback(() => {
            this._buildBusIndex();
            if (this.isSearchActive && this.searchInput) {
                this._performSearch(this.searchInput.value);
            }
        });
    },
    
    _createTopBar() {
        const topBar = document.createElement('div');
        topBar.id = 'menu-top-bar';
        topBar.classList.add('menu-top-bar', 'animate-zoom-ripple', 'ripple-container');
        topBar.style.cssText = `
            position: sticky;
            top: 10px;
            left: 0;
            background-color: #00000075;
            color: white;
            padding: 9px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 1001;
            transition: transform 0.3s ease;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(17px);
            -webkit-backdrop-filter: blur(17px);
            width: fit-content;
            margin: 10px 15px 0px;
            border-radius: 33px;
            gap: 12px;
        `;
        
        const backButton = document.createElement('div');
        backButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 6L9 12L15 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        backButton.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            padding: 8px;
            margin-right: 5px;
            border-radius: 33px;
            transition: background 0.2s ease;
        `;
        backButton.onmouseover = () => backButton.style.background = 'rgba(255, 255, 255, 0.1)';
        backButton.onmouseout = () => backButton.style.background = 'transparent';
        backButton.onclick = closeMenu;
        
        const title = document.createElement('div');
        title.className = 'menu-title';
        title.id = 'menu-statistics';
        title.textContent = t("network");
        title.style.cssText = `font-size: 20px; font-weight: 500;`;

        const statsButton = document.createElement('div');
        statsButton.id = 'menu-stats-toggle-btn';
        statsButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3V21H21" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7 16L11 10L15 13L20 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        statsButton.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            padding: 8px;
            border-radius: 33px;
            transition: background 0.2s ease;
            opacity: 0.85;
        `;
        statsButton.onmouseover = () => statsButton.style.background = 'rgba(255, 255, 255, 0.15)';
        statsButton.onmouseout = () => statsButton.style.background = 'transparent';
        statsButton.onclick = () => this._toggleStatsView();
        
        topBar.appendChild(backButton);
        topBar.appendChild(title);
        topBar.appendChild(statsButton);
        this.container.appendChild(topBar);

        let lastScrollTop = 0;

        this.container.addEventListener('scroll', () => {
            const scrollTop = this.container.scrollTop;
            
            if (scrollTop > lastScrollTop && scrollTop > 50) {
                topBar.style.transform = 'translateY(-130%)';
            } else {
                topBar.style.transform = 'translateY(0)';
            }
            lastScrollTop = scrollTop;
            
            this._handleScrollAnimations();
        });
    },

    _handleScrollAnimations() {
        const wrapper = document.getElementById('menu-main-content-wrapper');
        const containerToCheck = wrapper || this.container;
        const containerRect = this.container.getBoundingClientRect();
        const sections = containerToCheck.querySelectorAll('.linesection');

        sections.forEach(section => {
            const sectionRect = section.getBoundingClientRect();
            const sectionTop = sectionRect.top - containerRect.top;
            const sectionBottom = sectionRect.bottom - containerRect.top;
            const isVisible = sectionBottom > 0 && sectionTop < containerRect.height;

            if (isVisible) {
                section.style.opacity = '1';
                section.style.transform = 'scale(1) translateY(0)';
            }
        });
    },
    
    _createLineSection(line) {
        const lineNameText = lineName[line] || t("unknown_line");
        const lineColor = lineColors[line] || '#000000e6';
        const textColor = getTextColor(lineColor);
        
        const lineSection = document.createElement('div');
        lineSection.dataset.line = line;
        lineSection.classList.add('linesection', 'ripple-container');
        
        lineSection.style.cssText = `
            background-color: ${lineColor}f0 !important;
            margin-bottom: 10px;
            margin-left: 10px;
            margin-right: 10px;
            padding: 10px;
            border-radius: 16px;
            position: relative;
            overflow: hidden;
            transition: transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease;
            box-shadow: 0 0px 20px 3px rgba(0, 0, 0, 0.1);
        `;

        
        // Beams
        const beam1 = document.createElement('div');
        beam1.classList.add('light-beam', 'beam1');
        lineSection.appendChild(beam1);
        
        const beam2 = document.createElement('div');
        beam2.classList.add('light-beam', 'beam2');
        lineSection.appendChild(beam2);
        
        const beam3 = document.createElement('div');
        beam3.classList.add('light-beam', 'beam3');
        lineSection.appendChild(beam3);
        
        // Favorite button
        const favoriteButton = document.createElement('button');
        favoriteButton.className = 'favorite-button';
        favoriteButton.style.cssText = `
            position: absolute;
            right: 5px;
            top: 5px;
            background: none;
            border: none;
            color: ${textColor};
            font-size: 20px;
            cursor: pointer;
            z-index: 10;
        `;
        favoriteButton.innerHTML = favoriteLines.has(line) ? '★' : '☆';
        favoriteButton.onclick = async (e) => {
            e.stopPropagation();
            const isFavorite = favoriteLines.has(line);
            await animateFavoriteTransition(e.target, lineSection, line, isFavorite);
        };
        
        // Title
        const lineTitle = document.createElement('div');
        lineTitle.className = 'line-title';
        lineTitle.textContent = `${t("line")} ${lineNameText}`;
        lineTitle.style.cssText = `
            font-size: 23px;
            font-weight: 500;
            color: ${textColor};
            padding-right: 30px;
            padding-left: 10px;
            position: relative;
            z-index: 1;
        `;
        
        // Destinations container
        const destinationsContainer = document.createElement('div');
        destinationsContainer.className = 'destinations-container';
        destinationsContainer.style.cssText = `
            position: relative;
            z-index: 1;
        `;
        
        lineSection.appendChild(lineTitle);
        lineSection.appendChild(favoriteButton);
        lineSection.appendChild(destinationsContainer);

        const unavailableContainer = document.createElement('div');
        unavailableContainer.className = 'unavailable-container';
        unavailableContainer.style.cssText = `position: relative; z-index: 1;`;
        lineSection.appendChild(unavailableContainer);
        
        lineSection.onmouseover = () => {
            lineSection.style.transform = 'scale(0.99)';
            lineSection.style.opacity = '0.9';
            lineSection.style.boxShadow = '0 0px 20px 11px rgba(0, 0, 0, 0.1)';
            lineSection.style.backgroundColor = lineColor;
        };
        
        lineSection.onmouseout = () => {
            lineSection.style.transform = 'scale(1)';
            lineSection.style.opacity = '1';
            lineSection.style.boxShadow = '0 0px 20px 3px rgba(0, 0, 0, 0.1)';
            lineSection.style.backgroundColor = lineColor;
        };
        
        lineSection.onclick = () => {
            if (localStorage.getItem('astuce') !== 'true') {
                localStorage.setItem('astuce', 'true');
                toastBottomRight.info(`${t("astuceselectligne")}`);
            }
            safeVibrate([50, 30, 50], true);
            soundsUX('MBF_Menu_LineSelect');
            const lc = parseInt(localStorage.getItem('mbf_lines_consulted') || '0', 10);
            localStorage.setItem('mbf_lines_consulted', (lc + 1).toString());
            selectedLine = line;
            filterByLine(line);
            closeMenu();
        };
        
        return {
            element: lineSection,
            destinationsContainer: destinationsContainer,
            unavailableContainer: unavailableContainer,
            destinations: new Map(),
            lineColor: lineColor,
            textColor: textColor
        };
    },
    
    _addDestinationToSection(lineSection, line, destination, buses) {
        const destinationSection = document.createElement('div');
        destinationSection.className = 'destination-section';
        destinationSection.dataset.destination = destination;
        destinationSection.style.cssText = `
            margin-top: 5px;
            padding-left: 10px;
        `;
        
        const destinationTitle = document.createElement('div');
        destinationTitle.className = 'destination-title';
        destinationTitle.textContent = `➜ ${destination}`;
        destinationTitle.style.cssText = `
            font-size: 19px;
            font-weight: normal;
            margin-bottom: 4px;
            color: ${lineSection.textColor};
        `;
        
        const busesContainer = document.createElement('div');
        busesContainer.className = 'buses-container';
        
        destinationSection.appendChild(destinationTitle);
        destinationSection.appendChild(busesContainer);
        
        const destData = {
            element: destinationSection,
            busesContainer: busesContainer,
            buses: new Map()
        };
        
        buses.forEach(bus => {
            const busItem = this._createBusItem(bus, lineSection.lineColor, lineSection.textColor);
            destData.buses.set(bus.parkNumber, busItem);
            const isUnavailable = busItem.dataset.unavailable === 'true';
            if (!isUnavailable) {
                busesContainer.appendChild(busItem);
            }
        });

        this._rebuildUnavailableSection(lineSection, line);
        
        lineSection.destinations.set(destination, destData);
        lineSection.destinationsContainer.appendChild(destinationSection);
    },
    
    _createBusItem(bus, lineColor, textColor) {
        const marker = bus.vehicle;
        const tripId = marker.vehicleData?.trip?.tripId;
        const stopId = marker.vehicleData?.stopId?.replace("0:", "").replace("TCAR:Vehicle::", "").replace(":LOC", "") || '';
        
        const { nextStopInfo, terminusInfo } = this._getBusInfo(marker, tripId, stopId);
        
        const busItem = document.createElement('div');
        const isUnavailable = nextStopInfo === t("unavailabletrip");
        busItem.dataset.unavailable = isUnavailable ? 'true' : 'false';
        busItem.className = 'bus-item ripple-container menu-item';
        busItem.dataset.busId = bus.parkNumber;
        busItem.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            overflow: hidden;
            box-shadow: 0 0 7px 0px rgb(0 0 0 / 24%);
            cursor: pointer;
            font-family: League Spartan;
            color: ${textColor};
            padding: 5px 10px;
            margin-bottom: 8px;
            background-color: rgba(0, 0, 0, 0.05);
            border-radius: 8px;
            position: relative;
        `;
        
        const vehicleLabel = bus.vehicleData?.vehicle?.label || 
                            bus.vehicleData?.vehicle?.id || 
                            "Véhicule inconnu";
        const vehicleBrandHtmlLight = getVehicleBrandHtmlLight(vehicleLabel);
        
        const backgroundContainer = document.createElement('div');
        backgroundContainer.className = 'background-thumbnail';
        backgroundContainer.style.cssText = `
            position: absolute;
            right: 8px;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            pointer-events: none;
            opacity: 0.2;
            z-index: 0;
            scale: 1.7;
        `;
        backgroundContainer.innerHTML = vehicleBrandHtmlLight;
        
        const thumbnailImg = backgroundContainer.querySelector('.vehicle-thumbnaill');
        if (thumbnailImg) {
            thumbnailImg.style.height = '80%';
            thumbnailImg.style.width = 'auto';
            thumbnailImg.style.maxHeight = '40px';
            thumbnailImg.style.objectFit = 'contain';
        }
        
        const frontContent = document.createElement('div');
        frontContent.className = 'bus-front-content';
        frontContent.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            position: relative;
            z-index: 1;
        `;
        
        const displayLabel = vehicleLabel.replace(/Véhicule inconnu\.?/, "inconnu");
        const busIdBox = document.createElement('div');
        busIdBox.className = 'bus-id';
        busIdBox.textContent = displayLabel;
        busIdBox.style.cssText = `
            padding: 2px 8px;
            background-color: #00000017;
            border-radius: 6px;
            font-weight: bold;
            color: ${textColor};
            display: inline-block;
            text-align: center;
            padding: 5px 10px;
        `;
        
        const contentContainer = document.createElement('div');
        contentContainer.className = 'bus-info-container';
        contentContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            flex-grow: 1;
        `;
        
        const mainText = document.createElement('div');
        mainText.className = 'bus-main-text';
        mainText.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 1.2em;
            font-weight: 500;
            color: ${textColor};
        `;
        
        const infoText = document.createElement('span');
        infoText.textContent = nextStopInfo;
        mainText.appendChild(infoText);
        
        const arrivalText = document.createElement('div');
        arrivalText.className = 'bus-arrival-text';
        arrivalText.textContent = terminusInfo;
        arrivalText.style.cssText = `
            font-size: 0.9em;
            opacity: 0.8;
            color: ${textColor};
        `;
        
        contentContainer.appendChild(mainText);
        contentContainer.appendChild(arrivalText);
        
        frontContent.appendChild(busIdBox);
        frontContent.appendChild(contentContainer);
        
        busItem.appendChild(backgroundContainer);
        busItem.appendChild(frontContent);
        try {
        
        const navBtn = document.createElement('button');
        navBtn.style.cssText = `
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0,0,0,0.18);
            border: none;
            border-radius: 50%;
            width: 32px; height: 32px;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer;
            z-index: 2;
            transition: background 0.2s, transform 0.15s;
        `;
        navBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="#ffffff" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>`;
        navBtn.title = "Naviguer vers ce véhicule";
        navBtn.addEventListener('mousedown', e => e.stopPropagation());
        navBtn.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
        navBtn.onclick = (e) => {
            e.stopPropagation();
            safeVibrate([30, 40, 30], true);
            soundsUX('MBF_SelectedVehicle_DoorOpen');
            openVehicleNavigation(bus.parkNumber, bus.vehicle);
        };

        frontContent.style.paddingRight = '42px'; 
        busItem.appendChild(navBtn);
        } catch(e) {
            console.warn('NavBtn error:', e);
        }

        busItem.onclick = (event) => {
            event.stopPropagation();
            safeVibrate([50, 300, 50, 30, 50], true);
            soundsUX('MBF_Menu_VehicleSelect');
            map.setView(bus.vehicle.getLatLng(), 15);
            bus.vehicle.openPopup();
            closeMenu();
            if (selectedLine) resetMapView();
        };
        
        return busItem;
    },

    _rebuildUnavailableSection(lineSection, line) {
        const container = lineSection.unavailableContainer;
        container.innerHTML = '';

        // collecte tous les bus indisponibles ttes destinations confondues
        const unavailableBuses = [];
        lineSection.destinations.forEach((destData, destination) => {
            destData.buses.forEach((busItem, parkNumber) => {
                if (busItem.dataset.unavailable === 'true') {
                    unavailableBuses.push({ busItem, destination });
                }
            });
        });

        if (unavailableBuses.length === 0) return;

        // btn toggle
        const toggle = document.createElement('div');
        toggle.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            padding: 6px 16px;
            margin-top: 4px;
            border-radius: 8px;
            transition: background 0.2s;
            user-select: none;
        `;

        const arrow = document.createElement('span');
        arrow.textContent = '▶';
        arrow.style.cssText = `
            font-size: 10px;
            color: ${lineSection.textColor};
            opacity: 0.6;
            transition: transform 0.25s ease;
            display: inline-block;
        `;

        const label = document.createElement('span');
        label.style.cssText = `
            font-size: 14px;
            color: ${lineSection.textColor};
            opacity: 0.65;
        `;
        label.textContent = `${unavailableBuses.length} ${t('unavailabletrip_count') || 'hors service / sans données'}`;

        toggle.appendChild(arrow);
        toggle.appendChild(label);

        // liste pliable
        const list = document.createElement('div');
        list.style.cssText = `
            overflow: hidden;
            max-height: 0;
            transition: max-height 0.35s cubic-bezier(0.4,0,0.2,1);
            padding-left: 10px;
        `;

        unavailableBuses.forEach(({ busItem, destination }) => {
            busItem.style.opacity = '0.55';
            busItem.style.filter  = 'saturate(0.4)';
            list.appendChild(busItem);
        });

        let open = container.dataset.open === 'true';
        toggle.onclick = (e) => {
            e.stopPropagation();
            open = !open;
            container.dataset.open = open;
            arrow.style.transform  = open ? 'rotate(90deg)' : 'rotate(0deg)';
            list.style.maxHeight   = open ? `${list.scrollHeight + 20}px` : '0';
        };

        if (open) {
            arrow.style.transform   = 'rotate(90deg)';
            list.style.transition   = 'none';
            list.style.maxHeight    = '9999px';
            toggle.style.background = 'rgba(0,0,0,0.2)';
            requestAnimationFrame(() => {
                list.style.transition = 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)';
            });
        }

        lineSection.destinations.forEach((destData) => {
            const hasAvailable = Array.from(destData.buses.values())
                .some(item => item.dataset.unavailable !== 'true');
            destData.element.style.display = hasAvailable ? '' : 'none';
        });

        container.appendChild(toggle);
        container.appendChild(list);
    },
    
    _updateLine(line, destinations) {
        const lineSection = this.sections.get(line);
        if (!lineSection) return;
        
        const newDestinations = new Set(Object.keys(destinations));
        const currentDestinations = new Set(lineSection.destinations.keys());
        
        for (const dest of currentDestinations) {
            if (!newDestinations.has(dest)) {
                this._removeDestination(line, dest);
            }
        }
        
        for (const dest of newDestinations) {
            if (lineSection.destinations.has(dest)) {
                this._updateDestination(line, dest, destinations[dest]);
            } else {
                this._addDestinationToSection(lineSection, line, dest, destinations[dest]);
            }
        }
    },
    
    _addLine(line, destinations) {
        const lineSection = this._createLineSection(line);
        this.sections.set(line, lineSection);

        const wrapper = document.getElementById('menu-main-content-wrapper');
        const target = wrapper || this.container;

        const sortedLines = this._getSortedLines();
        const index = sortedLines.indexOf(line);

        if (index === -1 || index === sortedLines.length - 1) {
            target.appendChild(lineSection.element);
        } else {
            const nextLine = sortedLines[index + 1];
            const nextElement = this.sections.get(nextLine)?.element;
            if (nextElement && target.contains(nextElement)) {
                target.insertBefore(lineSection.element, nextElement);
            } else {
                target.appendChild(lineSection.element);
            }
        }

        Object.keys(destinations).sort().forEach(dest => {
            this._addDestinationToSection(lineSection, line, dest, destinations[dest]);
        });
    },
    
    _removeLine(line) {
        const lineSection = this.sections.get(line);
        if (!lineSection) return;
        
        lineSection.element.remove();
        this.sections.delete(line);
    },
    
    _updateDestination(line, destination, buses) {
        const lineSection = this.sections.get(line);
        if (!lineSection) return;
        
        const destSection = lineSection.destinations.get(destination);
        if (!destSection) return;
        
        const newBuses = new Set(buses.map(b => b.parkNumber));
        const currentBuses = new Set(destSection.buses.keys());
        
        for (const busId of currentBuses) {
            if (!newBuses.has(busId)) {
                const busItem = destSection.buses.get(busId);
                if (busItem) busItem.remove();
                destSection.buses.delete(busId);
            }
        }
        
        buses.forEach(bus => {
            if (destSection.buses.has(bus.parkNumber)) {
                const busItem = destSection.buses.get(bus.parkNumber);
                this._updateBusItem(busItem, bus);
                // Re-évalue si le statut a changé
                const { nextStopInfo } = this._getBusInfo(
                    bus.vehicle, bus.vehicleData?.trip?.tripId,
                    bus.vehicleData?.stopId?.replace("0:", "").replace("TCAR:Vehicle::", "").replace(":LOC", "") || ''
                );
                busItem.dataset.unavailable = (nextStopInfo === t("unavailabletrip")) ? 'true' : 'false';
            } else {
                const busItem = this._createBusItem(bus, lineSection.lineColor, lineSection.textColor);
                destSection.buses.set(bus.parkNumber, busItem);
                const isUnavailable = busItem.dataset.unavailable === 'true';
                if (!isUnavailable) destSection.busesContainer.appendChild(busItem);
            }
        });

        this._rebuildUnavailableSection(lineSection, line);
    },
    
    _removeDestination(line, destination) {
        const lineSection = this.sections.get(line);
        if (!lineSection) return;
        
        const destSection = lineSection.destinations.get(destination);
        if (!destSection) return;
        
        destSection.element.remove();
        lineSection.destinations.delete(destination);
    },
    
    _updateBusItem(busItem, bus) {
        const marker = bus.vehicle;
        const tripId = marker.vehicleData?.trip?.tripId;
        const stopId = marker.vehicleData?.stopId?.replace("0:", "").replace("TCAR:Vehicle::", "").replace(":LOC", "") || '';
        
        const { nextStopInfo, terminusInfo } = this._getBusInfo(marker, tripId, stopId);
        
        const mainTextSpan = busItem.querySelector('.bus-main-text span');
        const arrivalText = busItem.querySelector('.bus-arrival-text');
        
        if (mainTextSpan) mainTextSpan.textContent = nextStopInfo;
        if (arrivalText) arrivalText.textContent = terminusInfo;
    },
    
    _getBusInfo(marker, tripId, stopId) {
        const currentStatus = marker.vehicleData?.currentStatus;
        const nextStops = tripUpdates[tripId]?.nextStops || [];
        const line = marker.line;
        
        let currentStopIndex = nextStops.findIndex(stop => 
            stop.stopId.replace("0:", "").replace("TCAR:Vehicle::", "").replace(":LOC", "") === stopId
        );
        
        let filteredStops = [];
        if (currentStopIndex !== -1) {
            filteredStops = nextStops.slice(currentStopIndex).filter(stop => 
                stop.delay === null || stop.delay >= -60
            );
        } else {
            filteredStops = nextStops.filter(stop => 
                stop.delay === null || stop.delay > 0
            );
        }
        
        const statusMap = {
            0: t("notinservice"),
            1: t("dooropen"),
            2: t("enservice")
        };
        const status = statusMap[currentStatus] || 'Inconnu';
        
        let nextStopInfo = '';
        let terminusInfo = '';
        
        if (filteredStops.length === 0) {
            nextStopInfo = t("unavailabletrip");
        } else {
            const firstStopName = stopNameMap[filteredStops[0].stopId] || filteredStops[0].stopId;
            const firstStopDelay = filteredStops[0].delay || 0;
            const minutes = Math.max(0, Math.ceil(firstStopDelay / 60));
            
            if (line === 'Inconnu') {
                nextStopInfo = t("unknownline");
            } else {
                nextStopInfo = firstStopName;
            }
            
            if (filteredStops.length > 1) {
                const lastStop = filteredStops[filteredStops.length - 1];
                const timeLeft = lastStop.delay;
                const timeLeftText = timeLeft !== null 
                    ? timeLeft <= 0 ? t("imminent") : `${Math.ceil(timeLeft / 60)} min`
                    : '';
                terminusInfo = `${t("arrivalat")} ${marker.destination} ${timeLeftText !== t("imminent") ? t("in") + ' ' + timeLeftText : t("imminent")}.`;
            } else {
                terminusInfo = `${t("indirectionof")} ${marker.destination}.`;
            }
        }
        
        return { nextStopInfo, terminusInfo };
    },
    
    _updateStatistics() {
        const statsElement = document.getElementById('menu-statistics');
        if (!statsElement) return;

        const statsView = document.getElementById('menu-stats-view');
        if (statsView && statsView.style.display !== 'none') return;

        let totalLines = Object.keys(this.busesByLineAndDestination).length;
        let totalVehicles = 0;
        let activeLines = 0;

        Object.values(this.busesByLineAndDestination).forEach(destinations => {
            let lineVehicleCount = 0;
            Object.values(destinations).forEach(buses => {
                lineVehicleCount += buses.length;
            });
            totalVehicles += lineVehicleCount;
            if (lineVehicleCount > 0) activeLines++;
        });

        const sameNumber = (activeLines === totalLines);

        if (sameNumber) {
            statsElement.innerHTML = `
                <div>${t("network")}</div>
                <div style="font-size: 12px; opacity: 0.8;">
                    ${totalLines} ${t('lines')} • ${totalVehicles} ${t('vehicles')}
                </div>
            `;
        } else {
            statsElement.innerHTML = `
                <div>${t("network")}</div>
                <div style="font-size: 12px; opacity: 0.8;">
                    ${activeLines}/${totalLines} ${t('lines')} • ${totalVehicles} ${t('vehicles')}
                </div>
            `;
        }
},
    
    _getSortedLines() {
        return Object.keys(this.busesByLineAndDestination).sort((a, b) => {
            const aIsFavorite = favoriteLines.has(a);
            const bIsFavorite = favoriteLines.has(b);
            
            if (aIsFavorite && !bIsFavorite) return -1;
            if (!aIsFavorite && bIsFavorite) return 1;
            
            const getSortKey = (line) => {
                let typeValue = 1000;
                
                if (/^[A-Za-z]$/.test(line)) {
                    typeValue = 100;
                } else if (/^\d+$/.test(line)) {
                    typeValue = 200;
                } else if (/^\d+[A-Za-z]+$/.test(line)) {
                    const numPart = parseInt(line.match(/^\d+/)[0], 10);
                    return 200 + numPart + 0.5;
                }
                
                if (typeValue === 200) {
                    return typeValue + parseInt(line, 10);
                }
                
                if (typeValue === 100) {
                    return typeValue + line.charCodeAt(0);
                }
                
                return typeValue;
            };
            
            const valueA = getSortKey(a);
            const valueB = getSortKey(b);
            
            if (valueA !== valueB) {
                return valueA - valueB;
            }
            
            return a.localeCompare(b);
        });
    },

    _toggleStatsView() {
        const statsView = document.getElementById('menu-stats-view');
        const mainContent = document.getElementById('menu-main-content-wrapper');
        const searchContainer = document.getElementById('search-container');
        const spacer = document.getElementById('menu-spacer');
        const statsBtn = document.getElementById('menu-stats-toggle-btn');
        const titleEl = document.getElementById('menu-statistics');

        if (!statsView) {
            this._buildStatsView();
            return;
        }

        const isStatsVisible = statsView.style.display !== 'none';

        if (isStatsVisible) {
            statsView.style.opacity = '0';
            statsView.style.transform = 'translateX(100%)';
            setTimeout(() => { statsView.style.display = 'none'; }, 350);

            if (mainContent) {
                mainContent.style.display = 'block';
                mainContent.style.opacity = '0';
                mainContent.style.transform = 'translateX(-30px)';
                setTimeout(() => {
                    mainContent.style.transition = 'opacity 0.35s ease, transform 0.35s cubic-bezier(0,.45,.18,1)';
                    mainContent.style.opacity = '1';
                    mainContent.style.transform = 'translateX(0)';
                }, 20);
            }
            if (searchContainer) searchContainer.style.display = '';
            if (spacer) spacer.style.display = '';

            statsBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 3V21H21" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M7 16L11 10L15 13L20 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`;
            if (titleEl) titleEl.innerHTML = `<div>${t("network")}</div><div style="font-size:12px;opacity:.8;">${Object.keys(this.busesByLineAndDestination).length} ${t('lines')} • ${this._countTotalVehicles()} ${t('vehicles')}</div>`;
            const topBar = document.getElementById('menu-top-bar');
            if (topBar) {
                topBar.classList.remove('topbar-anim-expand', 'topbar-anim-shrink');
                void topBar.offsetWidth;
                topBar.classList.add('topbar-anim-shrink');
            }
        } else {
            this._refreshStatsView();
            statsView.style.display = 'block';
            statsView.style.opacity = '0';
            statsView.style.transform = 'translateX(30px)';
            setTimeout(() => {
                statsView.style.transition = 'opacity 0.35s ease, transform 0.35s cubic-bezier(.98,0,.03,.99)';
                statsView.style.opacity = '1';
                statsView.style.transform = 'translateX(0)';
            }, 20);

            if (mainContent) {
                mainContent.style.transition = 'opacity 0.2s ease, transform 0.2s cubic-bezier(.98,0,.03,.99)';
                mainContent.style.opacity = '0';
                mainContent.style.transform = 'translateX(-30px)';
                setTimeout(() => { mainContent.style.display = 'none'; }, 200);
            }
            if (searchContainer) searchContainer.style.display = 'none';
            if (spacer) spacer.style.display = 'none';

            statsBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M9 3H5C3.89543 3 3 3.89543 3 5V9C3 10.1046 3.89543 11 5 11H9C10.1046 11 11 10.1046 11 9V5C11 3.89543 10.1046 3 9 3Z" stroke="white" stroke-width="2"/>
                    <path d="M19 3H15C13.8954 3 13 3.89543 13 5V9C13 10.1046 13.8954 11 15 11H19C20.1046 11 21 10.1046 21 9V5C21 3.89543 20.1046 3 19 3Z" stroke="white" stroke-width="2"/>
                    <path d="M9 13H5C3.89543 13 3 13.8954 3 15V19C3 20.1046 3.89543 21 5 21H9C10.1046 21 11 20.1046 11 19V15C11 13.8954 10.1046 13 9 13Z" stroke="white" stroke-width="2"/>
                    <path d="M19 13H15C13.8954 13 13 13.8954 13 15V19C13 20.1046 13.8954 21 15 21H19C20.1046 21 21 20.1046 21 19V15C21 13.8954 20.1046 13 19 13Z" stroke="white" stroke-width="2"/>
                </svg>`;
            if (titleEl) titleEl.innerHTML = `<div>${t('statistics')}</div>`;
            const topBar = document.getElementById('menu-top-bar');
            if (topBar) {
                topBar.classList.remove('topbar-anim-expand', 'topbar-anim-shrink');
                void topBar.offsetWidth;
                topBar.classList.add('topbar-anim-expand');
            }
        }
    },

    _countTotalVehicles() {
        let total = 0;
        Object.values(this.busesByLineAndDestination).forEach(destinations => {
            Object.values(destinations).forEach(buses => { total += buses.length; });
        });
        return total;
    },

    _computeNetworkStats() {
        const now = Date.now() / 1000;

        // Compteurs de base
        let totalVehicles = 0;
        let totalLines = Object.keys(this.busesByLineAndDestination).length;
        const lineVehicleCounts = {};
        const destinationSet = new Set();

        Object.entries(this.busesByLineAndDestination).forEach(([line, destinations]) => {
            let lineCount = 0;
            Object.entries(destinations).forEach(([dest, buses]) => {
                destinationSet.add(dest);
                lineCount += buses.length;
                totalVehicles += buses.length;
            });
            lineVehicleCounts[line] = lineCount;
        });

        // Ligne la plus chargée
        let busiestLine = null, busiestCount = 0;
        Object.entries(lineVehicleCounts).forEach(([line, count]) => {
            if (count > busiestCount) { busiestCount = count; busiestLine = line; }
        });

        // Ligne la moins chargée (au moins 1 véhicule)
        let quietestLine = null, quietestCount = Infinity;
        Object.entries(lineVehicleCounts).forEach(([line, count]) => {
            if (count > 0 && count < quietestCount) { quietestCount = count; quietestLine = line; }
        });

        // Calcul retard moyen + distrib
        let delaySum = 0, delayCount = 0;
        let onTimeCount = 0, lateCount = 0, earlyCount = 0;
        let maxDelay = 0, maxDelayLine = null;
        let delayBuckets = { 'early_big': 0, 'early': 0, 'ontime': 0, 'late_small': 0, 'late_mid': 0, 'late_big': 0 };

        markerPool.active.forEach((marker) => {
            const tripId = marker.vehicleData?.trip?.tripId;
            const nextStops = tripUpdates[tripId]?.nextStops || [];

            nextStops.slice(0, 3).forEach(stop => {
                const computed = computeDelaySeconds(tripId, stop.stopId, stop.arrivalTime || stop.departureTime);
                if (computed !== null) {
                    delaySum += computed;
                    delayCount++;
                    const mins = computed / 60;
                    if (Math.abs(mins) <= 1) onTimeCount++;
                    else if (mins > 1) lateCount++;
                    else earlyCount++;

                    if (mins > maxDelay) {
                        maxDelay = mins;
                        maxDelayLine = marker.line;
                    }

                    if (mins < -5) delayBuckets['early_big']++;
                    else if (mins < -2) delayBuckets['early']++;
                    else if (mins <= 2) delayBuckets['ontime']++;
                    else if (mins <= 5) delayBuckets['late_small']++;
                    else if (mins <= 10) delayBuckets['late_mid']++;
                    else delayBuckets['late_big']++;
                }
            });
        });

        const avgDelaySeconds = delayCount > 0 ? delaySum / delayCount : 0;
        const avgDelayMinutes = avgDelaySeconds / 60;
        const onTimePercent = delayCount > 0 ? Math.round((onTimeCount / delayCount) * 100) : null;

        // Véhicules par type
        let elecCount = 0, hybridCount = 0, gnvCount = 0;
        let usbCount = 0, acCount = 0;
        markerPool.active.forEach((marker) => {
            const id = String(marker.vehicleData?.vehicle?.label || marker.vehicleData?.vehicle?.id || '');
            if (!id) return;
            if (vehicleTypes['elec']?.has(id)) elecCount++;
            if (vehicleTypes['hybrid']?.has(id)) hybridCount++;
            if (vehicleTypes['gnv']?.has(id)) gnvCount++;
            if (vehicleTypes['usb']?.has(id)) usbCount++;
            if (vehicleTypes['clim']?.has(id)) acCount++;
        });
        const greenCount = elecCount + hybridCount + gnvCount;
        const greenPercent = totalVehicles > 0 ? Math.round((greenCount / totalVehicles) * 100) : 0;

        // Vitesse moyenne estimée (depuis les données position)
        let speedSum = 0, speedCount = 0, stoppedCount = 0, movingCount = 0;
        markerPool.active.forEach((marker) => {
            const speed = marker.vehicleData?.position?.speed;
            if (speed !== undefined && speed !== null) {
                speedSum += speed;
                speedCount++;
                if (speed < 2) stoppedCount++;
                else movingCount++;
            }
        });
        const avgSpeed = speedCount > 0 ? (speedSum / speedCount).toFixed(1) : null;
        const movingPercent = totalVehicles > 0 ? Math.round((movingCount / totalVehicles) * 100) : null;

        // Occupancy globale
        let occupancySum = 0, occupancyCount = 0;
        let fullCount = 0, emptyCount = 0;
        markerPool.active.forEach((marker) => {
            const occ = marker.vehicleData?.occupancyStatus;
            if (occ !== null && occ !== undefined) {
                occupancySum += occ;
                occupancyCount++;
                if (occ >= 5) fullCount++;
                if (occ <= 1) emptyCount++;
            }
        });
        const avgOccupancy = occupancyCount > 0 ? occupancySum / occupancyCount : null;
        const occupancyLabels = [t('empty'), t('slightly_full'), t('available_seats'), t('standing_room'), t('crowded'), t('full'), t('not_applicable')];
        const avgOccupancyLabel = avgOccupancy !== null ? occupancyLabels[Math.min(Math.round(avgOccupancy), 6)] : null;

        // Destinations uniques
        const uniqueDestinations = destinationSet.size;

        // Stats personnelles
        const firstUse = localStorage.getItem('mbf_first_use') || new Date().toISOString();
        if (!localStorage.getItem('mbf_first_use')) localStorage.setItem('mbf_first_use', firstUse);
        const vehiclesConsulted = parseInt(localStorage.getItem('mbf_vehicles_consulted') || '0', 10);
        const linesConsulted = parseInt(localStorage.getItem('mbf_lines_consulted') || '0', 10);
        const historicMax = Math.max(parseInt(localStorage.getItem('mbf_max_vehicles') || '0', 10), totalVehicles);
        localStorage.setItem('mbf_max_vehicles', historicMax.toString());
        const daysSinceFirst = Math.floor((Date.now() - new Date(firstUse).getTime()) / (1000 * 60 * 60 * 24));

        // Sessions (incrémente à chaque ouverture du menu stats)
        const sessionsCount = parseInt(localStorage.getItem('mbf_stats_opened') || '0', 10);

        // Heure de pointe
        const hour = new Date().getHours();
        const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);

        // Score de santé réseau (0-100)
        let healthScore = 100;
        if (onTimePercent !== null) healthScore = Math.round(onTimePercent * 0.6 + (movingPercent ?? 50) * 0.2 + Math.min(greenPercent, 100) * 0.2);
        const healthColor = healthScore >= 60 ? '#40e981' : healthScore >= 40 ? '#b0e57c' : '#c69090';
        const healthLabel = healthScore >= 60 ? t('excellent') : healthScore >= 40 ? t('correct') : t('degraded');

        // Tendance retard (comparaison avec dernière valeur stockée)
        const lastAvgDelay = parseFloat(localStorage.getItem('mbf_last_avg_delay') || '0');
        const delayTrend = avgDelayMinutes - lastAvgDelay;
        localStorage.setItem('mbf_last_avg_delay', avgDelayMinutes.toFixed(2));
        const delayTrendLabel = Math.abs(delayTrend) < 0.3 ? t('stable')
            : delayTrend > 0 ? `+${Math.round(delayTrend)} min`
            : `${Math.round(delayTrend)} min`;
        const delayTrendColor = Math.abs(delayTrend) < 0.3 ? '#aaa'
            : delayTrend > 0 ? '#c89292' : '#a5d1b5';

        return {
            totalVehicles, totalLines, uniqueDestinations,
            busiestLine, busiestCount, quietestLine, quietestCount,
            avgDelayMinutes, avgDelaySeconds, onTimePercent,
            onTimeCount, lateCount, earlyCount, delayCount,
            maxDelay, maxDelayLine, delayBuckets,
            delayTrend, delayTrendLabel, delayTrendColor,
            elecCount, hybridCount, gnvCount, usbCount, acCount,
            greenCount, greenPercent,
            avgSpeed, movingPercent, stoppedCount, movingCount,
            avgOccupancy, avgOccupancyLabel, fullCount, emptyCount, occupancyCount,
            vehiclesConsulted, linesConsulted, historicMax,
            daysSinceFirst, firstUse, sessionsCount,
            isPeakHour, healthScore, healthColor, healthLabel,
            lineVehicleCounts
        };
    },

    _buildStatsView() {
        const statsView = document.createElement('div');
        statsView.id = 'menu-stats-view';
        statsView.style.cssText = `
            padding: 10px 10px 20px;
            display: none;
            opacity: 0;
            transform: translateX(30px);
            transition: opacity 0.35s ease, transform 0.35s ease;
        `;
        this.container.appendChild(statsView);

        // Wrapper le contenu existant (sections de lignes + search)
        const existingSections = this.container.querySelectorAll('.linesection');
        const searchContainer = document.getElementById('search-container');
        const spacer = document.getElementById('menu-spacer');

        let wrapper = document.getElementById('menu-main-content-wrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'menu-main-content-wrapper';
            wrapper.style.cssText = `transition: opacity 0.2s ease, transform 0.2s ease;`;

            if (searchContainer) this.container.insertBefore(wrapper, searchContainer);
            else this.container.appendChild(wrapper);

            if (searchContainer) wrapper.appendChild(searchContainer);
            if (spacer) wrapper.appendChild(spacer);
            existingSections.forEach(s => wrapper.appendChild(s));
        }

        this._refreshStatsView();

        statsView.style.display = 'block';
        statsView.style.opacity = '0';
        statsView.style.transform = 'translateX(30px)';
        setTimeout(() => {
            statsView.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
            statsView.style.opacity = '1';
            statsView.style.transform = 'translateX(0)';
        }, 20);

        if (wrapper) {
            wrapper.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            wrapper.style.opacity = '0';
            wrapper.style.transform = 'translateX(-30px)';
            setTimeout(() => { wrapper.style.display = 'none'; }, 200);
        }
        if (searchContainer) searchContainer.style.display = 'none';
        if (spacer) spacer.style.display = 'none';

        const statsBtn = document.getElementById('menu-stats-toggle-btn');
        const titleEl = document.getElementById('menu-statistics');
        if (statsBtn) statsBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 3H5C3.89543 3 3 3.89543 3 5V9C3 10.1046 3.89543 11 5 11H9C10.1046 11 11 10.1046 11 9V5C11 3.89543 10.1046 3 9 3Z" stroke="white" stroke-width="2"/>
                <path d="M19 3H15C13.8954 3 13 3.89543 13 5V9C13 10.1046 13.8954 11 15 11H19C20.1046 11 21 10.1046 21 9V5C21 3.89543 20.1046 3 19 3Z" stroke="white" stroke-width="2"/>
                <path d="M9 13H5C3.89543 13 3 13.8954 3 15V19C3 20.1046 3.89543 21 5 21H9C10.1046 21 11 20.1046 11 19V15C11 13.8954 10.1046 13 9 13Z" stroke="white" stroke-width="2"/>
                <path d="M19 13H15C13.8954 13 13 13.8954 13 15V19C13 20.1046 13.8954 21 15 21H19C20.1046 21 21 20.1046 21 19V15C21 13.8954 20.1046 13 19 13Z" stroke="white" stroke-width="2"/>
            </svg>`;
        if (titleEl) titleEl.innerHTML = `<div>${t('statistics')}</div>`;
    },

    _refreshStatsView() {
        const statsView = document.getElementById('menu-stats-view');
        if (!statsView) return;

        // Incrémenter le compteur d'ouvertures
        const sessionsCount = parseInt(localStorage.getItem('mbf_stats_opened') || '0', 10);
        localStorage.setItem('mbf_stats_opened', (sessionsCount + 1).toString());

        const s = this._computeNetworkStats();

        const delayColor = Math.abs(s.avgDelayMinutes) <= 1 ? '#15d85d'
            : s.avgDelayMinutes > 5 ? '#c07c7c'
            : s.avgDelayMinutes > 1 ? '#d7ab8b' : '#829cc7';

        const delayLabel = s.delayCount === 0 ? '—'
            : Math.abs(s.avgDelayMinutes) <= 1 ? t('on_time')
            : s.avgDelayMinutes > 0 ? `+${Math.round(s.avgDelayMinutes)} min`
            : `${Math.round(s.avgDelayMinutes)} min`;

        const peakBadge = s.isPeakHour
            ? `<span style="font-size:19px;opacity:.7;color:#ff9f0a;">${t('peak_hour')}</span>`
            : `<span style="font-size:19px;opacity:.7;color:#15d85d;">${t('normal_traffic')}</span>`;

        const onTimePct = s.onTimePercent ?? 0;
        const latePct = s.delayCount > 0 ? Math.round((s.lateCount / s.delayCount) * 100) : 0;
        const earlyPct = s.delayCount > 0 ? Math.round((s.earlyCount / s.delayCount) * 100) : 0;

        // Top 3 lignes
        const topLines = Object.entries(s.lineVehicleCounts)
            .sort((a, b) => b[1] - a[1]).slice(0, 5);

        const topLinesHTML = topLines.map(([line, count]) => {
            const color = lineColors[line] || '#555';
            const name = lineName[line] || line;
            const width = topLines[0][1] > 0 ? Math.round((count / topLines[0][1]) * 100) : 0;
            return `
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                    <div style="background:${color};color:${getTextColor(color)};padding:3px 10px;border-radius:8px;font-weight:600;font-size:13px;min-width:38px;text-align:center;">${name}</div>
                    <div style="flex:1;background:rgba(255,255,255,0.1);border-radius:6px;height:8px;overflow:hidden;">
                        <div style="width:${width}%;height:100%;background:${color};border-radius:6px;transition:width 0.8s ease;"></div>
                    </div>
                    <div style="font-size:12px;opacity:0.75;min-width:24px;text-align:right;">${count}</div>
                </div>`;
        }).join('');

        const bucketLabels = {
            'early_big':   t('early_big'),
            'early':       t('early'),
            'ontime':      t('on_time'),
            'late_small':  t('late_small'),
            'late_mid':    t('late_mid'),
            'late_big':    t('late_big')
        };
        const bucketColors = {
            'early_big':  '#0a84ff',
            'early':      '#40c8e0',
            'ontime':     '#15d85d',
            'late_small': '#ff9f0a',
            'late_mid':   '#ff6b3a',
            'late_big':   '#ff453a'
        };

        const bucketMax = Math.max(...Object.values(s.delayBuckets), 1);

        const distributionHTML = s.delayCount > 0 ? `
            <div style="display:flex;gap:6px;align-items:flex-end;justify-content:center;height:90px;margin-bottom:10px;">
                ${Object.entries(s.delayBuckets).map(([key, val]) => {
                    const pct = Math.round((val / bucketMax) * 100);
                    const heightPx = Math.max(val > 0 ? Math.round(pct * 0.6) : 0, val > 0 ? 6 : 0);
                    return `
                    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;height:100%;">
                        <div style="
                            width:100%;
                            height:${heightPx}px;
                            background:${bucketColors[key]};
                            opacity:${val > 0 ? 0.85 : 0.12};
                            border-radius:5px 5px 0 0;
                            transition:height 0.8s cubic-bezier(0.4,0,0.2,1);
                            min-height:3px;
                        "></div>
                    </div>`;
                }).join('')}
            </div>
            <div style="display:flex;gap:6px;justify-content:center;">
                ${Object.entries(bucketLabels).map(([key, label]) => `
                <div style="flex:1;text-align:center;">
                    <div style="width:8px;height:8px;border-radius:50%;background:${bucketColors[key]};margin:0 auto 3px;"></div>
                    <div style="font-size:8.5px;color:rgba(255,255,255,0.45);line-height:1.3;white-space:pre-line;">${label}</div>
                </div>`).join('')}
            </div>
        ` : '';

        // Flotte
        const fleetItems = [
            { label: t('electric'), count: s.elecCount, color: '#15d85d', emoji: '⚡' },
            { label: t('hybrid'), count: s.hybridCount, color: '#1a5ecc', emoji: '🔋' },
            { label: t('gnv'), count: s.gnvCount, color: '#db6a18', emoji: '🌿' },
            { label: t('usb'), count: s.usbCount, color: '#a855f7', emoji: '🔌' },
            { label: t('ac'), count: s.acCount, color: '#38bdf8', emoji: '❄️' },
        ].filter(f => f.count > 0);

        const fleetHTML = fleetItems.length > 0 ? fleetItems.map(f => `
            <div style="flex:1;min-width:60px;background:${f.color}22;border:1px solid ${f.color}44;border-radius:12px;padding:10px 8px;text-align:center;">
                <div style="font-size:18px;">${f.emoji}</div>
                <div style="font-size:18px;font-weight:700;color:white;">${f.count}</div>
                <div style="font-size:10px;opacity:.7;">${f.label}</div>
            </div>`).join('')
            : `<div style="opacity:.5;font-size:13px;padding:8px 0;">${t('nodata')}</div>`;

        const r = 40, cx = 50, cy = 56;
        const toRad = a => (a - 180) * Math.PI / 180;
        const arcAngle = Math.min((s.healthScore / 100) * 180, 179.9);
        const x2 = cx + r * Math.cos(toRad(arcAngle));
        const y2 = cy + r * Math.sin(toRad(arcAngle));

        const busiestLineName = s.busiestLine ? (lineName[s.busiestLine] || s.busiestLine) : '—';
        const busiestLineColor = s.busiestLine ? (lineColors[s.busiestLine] || '#555') : '#555';
        const quietestLineName = s.quietestLine ? (lineName[s.quietestLine] || s.quietestLine) : '—';
        const quietestLineColor = s.quietestLine ? (lineColors[s.quietestLine] || '#555') : '#555';
        const maxDelayLineName = s.maxDelayLine ? (lineName[s.maxDelayLine] || s.maxDelayLine) : '—';
        const maxDelayLineColor = s.maxDelayLine ? (lineColors[s.maxDelayLine] || '#555') : '#555';

        const daysSinceFirstLabel = s.daysSinceFirst === 0 ? t('today')
            : s.daysSinceFirst === 1 ? t('yesterday')
            : `${s.daysSinceFirst} ${t('days')}`;

        statsView.innerHTML = `
        <style>
            .stats-card {
                background: rgba(28, 28, 30, 0.75);
                border-radius: 14px;
                padding: 14px 16px;
                margin-bottom: 8px;
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.06);
                color: white;
                font-family: 'League Spartan', sans-serif;
                animation: scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
            }
            .stats-card-title {
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                color: rgba(255,255,255,0.5);
                margin-bottom: 10px;
                font-weight: 600;
            }
            .stats-row {
                display: flex;
                gap: 8px;
                margin-bottom: 8px;
            }
            .stats-tile {
                flex: 1;
                background: rgba(44, 44, 46, 0.8);
                border-radius: 12px;
                padding: 12px 10px;
                text-align: center;
                border: 1px solid rgba(255,255,255,0.05);
                min-width: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }

            .stats-tile-value {
                font-size: 24px;
                font-weight: 700;
                line-height: 1.1;
                color: white;
                letter-spacing: -0.5px;
            }
            .stats-tile-label {
                font-size: 13px;
                color: rgba(255,255,255,0.5);
                margin-top: 3px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .stats-inline-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .stats-inline-row:last-child { border-bottom: none; }
            .stats-inline-label {
                font-size: 13px;
                color: rgba(255,255,255,0.6);
            }
            .stats-inline-value {
                font-size: 13px;
                font-weight: 600;
                color: white;
                text-align: right;
            }
            .stats-line-badge {
                padding: 2px 9px;
                border-radius: 6px;
                font-weight: 700;
                font-size: 12px;
                display: inline-block;
            }
            .stats-pill {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                background: rgba(255,255,255,0.07);
                border-radius: 20px;
                padding: 3px 10px;
                font-size: 11px;
                color: rgba(255,255,255,0.7);
                border: 1px solid rgba(255,255,255,0.06);
            }
            .stats-progress-track {
                height: 5px;
                border-radius: 3px;
                background: rgba(255,255,255,0.08);
                overflow: hidden;
                margin: 2px 0;
            }
            .stats-progress-fill {
                height: 100%;
                border-radius: 3px;
                transition: width 0.9s cubic-bezier(0.4,0,0.2,1);
            }
        </style>

        <div class="stats-row" style="animation:scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) 0s both">
            <div style="
                flex:1.2;
                background: rgba(28,28,30,0.75);
                border-radius:14px;
                padding:14px;
                border:1px solid rgba(255,255,255,0.06);
                display:flex;
                flex-direction:column;
                justify-content:space-between;
                backdrop-filter:blur(20px);
                color:white;
            ">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:.8px;opacity:.4;margin-bottom:8px;">${t('networkhealth')}</div>
                <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:4px;">
                    <svg width="90" height="52" viewBox="0 0 100 58">
                        <path d="M 10 56 A 40 40 0 0 1 90 56" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8" stroke-linecap="round"/>
                        <path d="M 10 56 A 40 40 0 ${arcAngle > 179.9 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}" fill="none" stroke="${s.healthColor}" stroke-width="8" stroke-linecap="round"/>
                    </svg>
                    <div style="display:flex;flex-direction:column;align-items:flex-start;justify-content:center;">
                        <div style="font-size:26px;font-weight:700;color:${s.healthColor};line-height:1;">${s.healthScore}</div>
                        <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;">${s.healthLabel}</div>
                    </div>
                </div>
                <div style="margin-top:10px;display:flex;justify-content:center;">${peakBadge}</div>
            </div>
            <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
                <div class="stats-tile">
                    <div class="stats-tile-value">${s.totalVehicles}</div>
                    <div class="stats-tile-label">${t('vehicles')}</div>
                </div>
                <div class="stats-tile">
                    <div class="stats-tile-value">${s.totalLines}</div>
                    <div class="stats-tile-label">${t('lines')}</div>
                </div>
            </div>
        </div>

        <!-- Retard + vitesse -->
        <div class="stats-row" style="animation:scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.05s both">
            <div class="stats-tile">
                <div class="stats-tile-value" style="color:${delayColor};">${delayLabel}</div>
                <div class="stats-tile-label">${t('avgdelay')}</div>
            </div>
            <div class="stats-tile">
                <div class="stats-tile-value">${s.uniqueDestinations}</div>
                <div class="stats-tile-label">${t('destinations')}</div>
            </div>
            ${s.avgSpeed !== null ? `
            <div class="stats-tile">
                <div class="stats-tile-value">${Math.round(s.avgSpeed)}<span style="font-size:12px;font-weight:400;opacity:.6;"> km/h</span></div>
                <div class="stats-tile-label">${t('avgspeed')}</div>
            </div>` : ''}
        </div>

        <!-- Ponctualité -->
        ${s.delayCount > 0 ? `
        <div class="stats-card" style="animation-delay:0.08s">
            <div class="stats-card-title">${t('punctuality')}</div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
                <div>
                    <span style="font-size:28px;font-weight:700;color:${delayColor};letter-spacing:-1px;">${onTimePct}%</span>
                    <span style="font-size:12px;opacity:.45;margin-left:4px;">${t('onTime')}</span>
                </div>
            </div>
            <div style="height:5px;border-radius:3px;overflow:hidden;display:flex;gap:2px;margin-bottom:8px;">
                <div style="width:${onTimePct}%;background:#15d85d;transition:width 1s ease;border-radius:3px;"></div>
                <div style="width:${earlyPct}%;background:#0a84ff;transition:width 1s ease;border-radius:3px;"></div>
                <div style="width:${latePct}%;background:${latePct > 20 ? '#ff453a' : '#ff9f0a'};transition:width 1s ease;border-radius:3px;"></div>
            </div>
            <div style="display:flex;gap:14px;font-size:11px;">
                <span style="color:#15d85d;">● ${onTimePct}% ${t('onTime')}</span>
                <span style="color:#0a84ff;">● ${earlyPct}% ${t('early')}</span>
                <span style="color:${latePct > 20 ? '#ff453a' : '#ff9f0a'};">● ${latePct}% ${t('late')}</span>
            </div>
            ${s.maxDelay > 2 ? `
            <div style="margin-top:10px;padding:8px 10px;background:rgba(255,69,58,0.1);border-radius:10px;border:1px solid rgba(255,69,58,0.2);display:flex;align-items:center;justify-content:space-between;">
                <span style="font-size:12px;opacity:.6;">${t('maxdelay')}</span>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span class="stats-line-badge" style="background:${maxDelayLineColor};color:${getTextColor(maxDelayLineColor)};">${maxDelayLineName}</span>
                    <span style="color:#ff453a;font-weight:700;font-size:13px;">+${Math.round(s.maxDelay)} min</span>
                </div>
            </div>` : ''}
        </div>` : ''}

        <!-- Distribution retards -->
        ${s.delayCount > 0 ? `
        <div class="stats-card" style="animation-delay:0.11s">
            <div class="stats-card-title">${t('regulation')}</div>
            <div style="display:contents;align-items:flex-end;height:64px;margin-bottom:6px;">
                ${distributionHTML}
            </div>
        </div>` : ''}

        <!-- Répartition véhicules par ligne -->
        ${topLines.length > 0 ? `
        <div class="stats-card" style="animation-delay:0.14s">
            <div class="stats-card-title">${t('vehiclesbyline')}</div>
            ${topLines.map(([line, count]) => {
                const color = lineColors[line] || '#555';
                const name = lineName[line] || line;
                const width = topLines[0][1] > 0 ? Math.round((count / topLines[0][1]) * 100) : 0;
                return `
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px;">
                    <span class="stats-line-badge" style="background:${color};color:${getTextColor(color)};min-width:32px;text-align:center;">${name}</span>
                    <div style="flex:1;">
                        <div class="stats-progress-track">
                            <div class="stats-progress-fill" style="width:${width}%;background:${color};"></div>
                        </div>
                    </div>
                    <span style="font-size:12px;opacity:.5;min-width:20px;text-align:right;">${count}</span>
                </div>`;
            }).join('')}
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
                <div class="stats-pill">
                    +
                    <span class="stats-line-badge" style="background:${busiestLineColor};color:${getTextColor(busiestLineColor)};">${busiestLineName}</span>
                    <span>${s.busiestCount} bus</span>
                </div>
                ${s.quietestLine ? `
                <div class="stats-pill">
                    -
                    <span class="stats-line-badge" style="background:${quietestLineColor};color:${getTextColor(quietestLineColor)};">${quietestLineName}</span>
                    <span>${s.quietestCount} bus</span>
                </div>` : ''}
            </div>
        </div>` : ''}

        <!-- Mobilité -->
        ${s.movingPercent !== null ? `
        <div class="stats-card" style="animation-delay:0.17s">
            <div class="stats-card-title">${t('mobility')}</div>
            <div class="stats-inline-row">
                <span class="stats-inline-label">${t('moving')}</span>
                <span class="stats-inline-value" style="color:#15d85d;">${s.movingCount} <span style="opacity:.4;font-weight:400;">(${s.movingPercent}%)</span></span>
            </div>
            <div class="stats-inline-row">
                <span class="stats-inline-label">${t('stopped')}</span>
                <span class="stats-inline-value" style="color:#ff453a;">${s.stoppedCount}</span>
            </div>
            ${s.avgSpeed !== null ? `
            <div class="stats-inline-row">
                <span class="stats-inline-label">${t('avgspeed')}</span>
                <span class="stats-inline-value">${s.avgSpeed} km/h</span>
            </div>` : ''}
        </div>` : ''}

        <!-- Fréquentation -->
        ${s.occupancyCount > 0 ? `
        <div class="stats-card" style="animation-delay:0.2s">
            <div class="stats-card-title">${t('occupancy')}</div>
            <div class="stats-inline-row">
                <span class="stats-inline-label">${t('avgoccupancy')}</span>
                <span class="stats-inline-value">${s.avgOccupancyLabel || '—'}</span>
            </div>
            <div class="stats-inline-row">
                <span class="stats-inline-label">${t('fullvehicles')}</span>
                <span class="stats-inline-value" style="color:#ff453a;">${s.fullCount}</span>
            </div>
            <div class="stats-inline-row">
                <span class="stats-inline-label">${t('emptyvehicles')}</span>
                <span class="stats-inline-value" style="color:#15d85d;">${s.emptyCount}</span>
            </div>
        </div>` : ''}

        <!-- Flotte -->
        ${s.totalVehicles > 0 ? `
        <div class="stats-card" style="animation-delay:0.23s">
            <div class="stats-card-title">${t('fleet')}</div>
            <div style="display:flex;align-items:baseline;gap:5px;margin-bottom:10px;">
                <span style="font-size:28px;font-weight:700;color:#15d85d;letter-spacing:-1px;">${s.greenPercent}%</span>
                <span style="font-size:11px;opacity:.4;">propre en service</span>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                ${fleetItems.length > 0 ? fleetItems.map(f => `
                <div style="flex:1;min-width:56px;background:rgba(44,44,46,0.8);border-radius:10px;padding:9px 6px;text-align:center;border:1px solid ${f.color}30;">
                    <div style="font-size:16px;">${f.emoji}</div>
                    <div style="font-size:18px;font-weight:700;color:${f.color};">${f.count}</div>
                    <div style="font-size:9px;opacity:.5;">${f.label}</div>
                </div>`).join('') : `<span style="opacity:.4;font-size:12px;">Aucune donnée disponible</span>`}
            </div>
        </div>` : ''}

        <!-- Votre utilisation -->
        <div class="stats-card" style="animation-delay:0.26s">
            <div class="stats-card-title">${t('yourusage')}</div>
            <div class="stats-inline-row">
                <span class="stats-inline-label">${t('vehiclesconsulted')}</span>
                <span class="stats-inline-value" style="color:#0a84ff;">${s.vehiclesConsulted}</span>
            </div>
            <div class="stats-inline-row">
                <span class="stats-inline-label">${t('historicmax')}</span>
                <span class="stats-inline-value">${s.historicMax} ${t('vehicles')}</span>
            </div>
            <div class="stats-inline-row">
                <span class="stats-inline-label">${t('statsconsulted')}</span>
                <span class="stats-inline-value">${s.sessionsCount} ${t('times')}</span>
            </div>
            <div class="stats-inline-row">
                <span class="stats-inline-label">${t('usagefrom')}</span>
                <span class="stats-inline-value" style="opacity:.6;">${new Date(s.firstUse).toLocaleDateString('fr-FR')}</span>
            </div>
        </div>

        <!-- Actualiser -->
        <div style="text-align:center;margin-top:4px;margin-bottom:4px;">
            <div onclick="MenuManager._refreshStatsView()" style="
                display:inline-flex;align-items:center;gap:6px;
                background:rgba(0, 0, 0, 0.6);
                border:1px solid rgba(255,255,255,0.08);
                border-radius:20px;padding:7px 18px;
                cursor:pointer;font-size:12px;
                color:rgba(255,255,255,0.5);
                transition:all 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.color='white'"
            onmouseout="this.style.background='rgba(255,255,255,0.06)';this.style.color='rgba(255,255,255,0.5)'">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                <div>${t('refresh')}</div>
            </div>
        </div>
        `;

}
};

function updateMenu() {
    const busesByLineAndDestination = {};
    
    markerPool.active.forEach((marker, id) => {
        const line = marker.line;
        const destination = marker.destination || "Inconnue";
        
        if (!busesByLineAndDestination[line]) {
            busesByLineAndDestination[line] = {};
        }
        
        if (!busesByLineAndDestination[line][destination]) {
            busesByLineAndDestination[line][destination] = [];
        }
        
        busesByLineAndDestination[line][destination].push({
            parkNumber: marker.id,
            vehicle: marker,
            vehicleData: marker.vehicleData,
            nextStops: marker.rawData?.nextStops || []
        });
    });
    
    if (!MenuManager.isInitialized || MenuManager.sections.size === 0) {
        MenuManager.generateInitialStructure(busesByLineAndDestination);
    } else {
        MenuManager.updateData(busesByLineAndDestination);
    }
}


const favoriteLines = new Set(JSON.parse(localStorage.getItem('favoriteLines') || '[]'));

const ANIMATION_CONFIG = {
    DURATION: 400,
    POP_DURATION: 100,
    SPRING_TIMING: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    SCALE_UP: 1.03,
    ITEM_MARGIN: 10
};

let isAnimating = false;

function getAbsolutePositions(menu) {
    const sections = Array.from(menu.querySelectorAll('.linesection'));
    const positions = new Map();
    let accumulatedHeight = 0;
    
    sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        positions.set(section, {
            top: accumulatedHeight,
            height: rect.height,
            index: sections.indexOf(section)
        });
        accumulatedHeight += rect.height + ANIMATION_CONFIG.ITEM_MARGIN;
    });
    
    return { sections, positions };
}

function getTargetIndex(sections, movingSection, isFavorite, favoriteLines) {
    const movingLine = movingSection.dataset.line;
    
    if (isFavorite) {
        const firstNonFavoriteIndex = sections.findIndex(section => 
            !favoriteLines.has(section.dataset.line)
        );
        
        if (firstNonFavoriteIndex === sections.indexOf(movingSection)) {
            return -1;
        }
        
        return firstNonFavoriteIndex === -1 ? sections.length : firstNonFavoriteIndex;
    } else {
        let targetIndex = 0; 
        
        for (let i = 0; i < sections.length; i++) {
            const sectionLine = sections[i].dataset.line;
            
            if (favoriteLines.has(sectionLine)) {
                const movingNum = parseInt(movingLine);
                const sectionNum = parseInt(sectionLine);
                
                if (!isNaN(movingNum) && !isNaN(sectionNum)) {
                    if (movingNum < sectionNum) {
                        return i;
                    }
                } else if (movingLine.localeCompare(sectionLine) < 0) {
                    return i;
                }
            } else {
                return i; 
            }
        }
        
        return sections.length;
    }
}

function prepareSectionsForAnimation(sections) {
    sections.forEach(section => {
        section.style.transition = 'none';
        section.style.position = 'relative';
        section.style.zIndex = '1';
        section.style.transform = 'translateY(0)';
    });
    
    sections[0].offsetHeight;
}

async function animateFavoriteTransition(button, lineSection, line, isFavorite) {
    if (isAnimating) return;
    isAnimating = true;
    
    const menu = document.getElementById('menu');
    if (!menu || !lineSection) return;
    
    try {
        menu.style.pointerEvents = 'none';
        button.style.pointerEvents = 'none';
        
        const { sections, positions } = getAbsolutePositions(menu);
        const currentIndex = sections.indexOf(lineSection);
        
        if (isFavorite) {
            favoriteLines.delete(line);
        } else {
            favoriteLines.add(line);
        }
        
        const targetIndex = getTargetIndex(sections, lineSection, isFavorite, favoriteLines);
        
        if (targetIndex === -1 || currentIndex === -1 || targetIndex === currentIndex) {
            await animateRemoveFavorite(button, lineSection, sections, positions, currentIndex, targetIndex);
            try {
                localStorage.setItem('favoriteLines', JSON.stringify([...favoriteLines]));
            } catch (error) {
                console.error('Error saving favorite', error);
            }
            await cleanup(menu, button);
            return;
        }
        
        if (isFavorite) {
            await animateRemoveFavorite(button, lineSection, sections, positions, currentIndex, targetIndex);
            button.innerHTML = '☆';
        } else {
            await animateAddFavorite(button, lineSection, sections, positions, currentIndex, targetIndex);
        }
        
        try {
            localStorage.setItem('favoriteLines', JSON.stringify([...favoriteLines]));
        } catch (error) {
            console.error('Error saving favorite', error);
        }
        
    } catch (error) {
        console.error('Animation err', error);
    } finally {
        await cleanup(menu, button);
    }
}

async function animateAddFavorite(button, lineSection, sections, positions, currentIndex, targetIndex) {
    prepareSectionsForAnimation(sections);
    
    lineSection.style.zIndex = '2';
    lineSection.style.transition = `all ${ANIMATION_CONFIG.DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
    
    const currentPos = positions.get(lineSection);
    let targetY = 0;
    
    for (let i = 0; i < targetIndex; i++) {
        if (i !== currentIndex) {
            const section = sections[i];
            const sectionPos = positions.get(section);
            targetY += sectionPos.height + ANIMATION_CONFIG.ITEM_MARGIN;
        }
    }
    
    const deltaY = targetY - currentPos.top;
    
    sections.forEach((section, index) => {
        if (section !== lineSection) {
            let displacement = 0;
            
            if (currentIndex < targetIndex) {
                if (index > currentIndex && index <= targetIndex) {
                    displacement = -(currentPos.height + ANIMATION_CONFIG.ITEM_MARGIN);
                }
            } else {
                if (index >= targetIndex && index < currentIndex) {
                    displacement = currentPos.height + ANIMATION_CONFIG.ITEM_MARGIN;
                }
            }
            
            if (displacement !== 0) {
                section.style.transition = `transform ${ANIMATION_CONFIG.DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
                section.style.transform = `translateY(${displacement}px)`;
            }
        }
    });
    
    lineSection.style.transform = `scale(0.95)`;
    await new Promise(r => setTimeout(r, 100));
    lineSection.style.transform = `translateY(${deltaY}px) scale(0.95)`;
    await new Promise(r => setTimeout(r, ANIMATION_CONFIG.DURATION - 150));
    lineSection.style.transform = `translateY(${deltaY}px) scale(1)`;
    
    button.innerHTML = '★';
    button.style.transform = 'scale(1.2)';
    await new Promise(r => setTimeout(r, 100));
    button.style.transform = 'scale(1)';
}

async function animateRemoveFavorite(button, lineSection, sections, positions, currentIndex, targetIndex) {
    prepareSectionsForAnimation(sections);
    
    lineSection.style.zIndex = '2';
    lineSection.style.transition = `all ${ANIMATION_CONFIG.DURATION}ms ${ANIMATION_CONFIG.SPRING_TIMING}`;
    
    const currentPos = positions.get(lineSection);
    let targetY = 0;
    
    if (targetIndex === -1) {
        targetIndex = sections.length;
        sections.forEach((section, idx) => {
            if (idx !== currentIndex) {
                const sectionPos = positions.get(section);
                targetY += sectionPos.height + ANIMATION_CONFIG.ITEM_MARGIN;
            }
        });
    } else {
        for (let i = 0; i < targetIndex; i++) {
            if (i !== currentIndex) {
                const section = sections[i];
                const sectionPos = positions.get(section);
                targetY += sectionPos.height + ANIMATION_CONFIG.ITEM_MARGIN;
            }
        }
    }
    
    const deltaY = targetY - currentPos.top;
    
    sections.forEach((section, index) => {
        if (section !== lineSection) {
            let displacement = calculateDisplacement(index, currentIndex, targetIndex, 
                currentPos.height + ANIMATION_CONFIG.ITEM_MARGIN);
            
            if (displacement !== 0) {
                section.style.transition = `transform ${ANIMATION_CONFIG.DURATION}ms ${ANIMATION_CONFIG.SPRING_TIMING}`;
                section.style.transform = `translateY(${displacement}px)`;
            }
        }
    });
    
    await animateMovingSection(lineSection, deltaY);
    
    button.style.transform = 'scale(0.8)';
    button.innerHTML = '☆';
    await new Promise(r => setTimeout(r, 100));
    button.style.transform = 'scale(1)';
}

function calculateDisplacement(index, currentIndex, targetIndex, sectionHeight) {
    if (targetIndex === -1) {
        return index > currentIndex ? -sectionHeight : 0;
    }
    
    if (currentIndex < targetIndex) {
        return (index > currentIndex && index <= targetIndex) ? -sectionHeight : 0;
    } else {
        return (index >= targetIndex && index < currentIndex) ? sectionHeight : 0;
    }
}

async function animateMovingSection(section, deltaY) {
    section.style.transform = `scale(${ANIMATION_CONFIG.SCALE_UP})`;
    await new Promise(r => setTimeout(r, ANIMATION_CONFIG.POP_DURATION));
    
    section.style.transform = `translateY(${deltaY}px) scale(${ANIMATION_CONFIG.SCALE_UP})`;
    await new Promise(r => setTimeout(r, ANIMATION_CONFIG.DURATION - 150));
    
    section.style.transform = `translateY(${deltaY}px) scale(1)`;
}

function updateFavoriteState(button, line, isFavorite) {
    if (isFavorite) {
        favoriteLines.delete(line);
        button.innerHTML = '☆';
    } else {
        favoriteLines.add(line);
        button.innerHTML = '★';
    }
    
    try {
        localStorage.setItem('favoriteLines', JSON.stringify([...favoriteLines]));
    } catch (error) {
        console.error('Error saving favorite', error);
    }
}

async function cleanup(menu, button) {
    await new Promise(r => setTimeout(r, 50));
    
    const sections = menu.querySelectorAll('.linesection');
    sections.forEach(section => {
        section.style.transform = '';
        section.style.transition = '';
        section.style.zIndex = '';
        section.style.position = '';
    });
    
    menu.style.pointerEvents = 'auto';
    button.style.pointerEvents = 'auto';
    
    updateMenu();
    isAnimating = false;
}

const animationStyle = document.createElement('style');
animationStyle.textContent = `
    @keyframes topBarExpand {
        0%   { filter: blur(4px); transform: scale(0.96); opacity: 0.6; }
        60%  { filter: blur(1px); transform: scale(1.01); opacity: 1; }
        100% { filter: blur(0px); transform: scale(1);    opacity: 1; }
    }

    @keyframes topBarShrink {
        0%   { filter: blur(4px); transform: scale(1.04); opacity: 0.6; }
        60%  { filter: blur(1px); transform: scale(0.99); opacity: 1; }
        100% { filter: blur(0px); transform: scale(1);    opacity: 1; }
    }

    .topbar-anim-expand {
        animation: topBarExpand 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }

    .topbar-anim-shrink {
        animation: topBarShrink 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }

    .linesection {
        transition: transform 0.2s cubic-bezier(0.25, 1.5, 0.5, 1), box-shadow 0.2s cubic-bezier(0.25, 1.5, 0.5, 1);
    }
    
    .linesection.removing {
        animation: remove-favorite 0.3s ease-out forwards;
    }
    
    @keyframes remove-favorite {
        0% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.05);
            opacity: 0.8;
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }
    
    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.02);
        }
    }
    
    .favorite-button {
        transition: transform 0.2s ease-out, opacity 0.2s ease-out;
    }
    
    .favorite-button:hover {
        transform: scale(1.1);
    }
    
    .favorite-button:active {
        transform: scale(0.9);
    }
    
    #menu-search-input::placeholder {
        color: rgba(255, 255, 255, 0.75);
    }
    
    .quick-filter-btn.active {
        background: rgba(0, 0, 0, 0.69) !important;
        border-color: rgba(255, 255, 255, 0.4) !important;
    }

    @keyframes scaleIn {
        0% {
            opacity: 0;
            filter: blur(8px);
            transform: scale(0.85) translateY(20px);
        }
        100% {
            opacity: 1;
            filter: blur(0px);
            transform: scale(1) translateY(0);
        }
    }

    @keyframes borderExplosion {
        0% {
            box-shadow: 
                0 0 0 0 rgba(255, 0, 0, 0) inset,
                0 0 0 0 rgba(255, 255, 0, 0) inset,
                0 0 0 0 rgba(0, 255, 0, 0) inset,
                0 0 0 0 rgba(0, 255, 255, 0) inset,
                0 0 0 0 rgba(0, 0, 255, 0) inset,
                0 0 0 0 rgba(255, 0, 255, 0) inset;
        }
        33% {
            box-shadow: 
                0 0 0 0 rgba(255, 0, 0, 0) inset,
                0 0 0 0 rgba(255, 255, 0, 0) inset,
                0 0 10px 0 rgba(0, 255, 0, 0.7) inset,
                2px 0 10px 0 rgba(0, 255, 255, 0.6) inset,
                0 0 0 0 rgba(0, 0, 255, 0) inset,
                0 0 0 0 rgba(255, 0, 255, 0) inset;
        }
        66% {
            box-shadow: 
                0 0 0 0 rgba(255, 0, 0, 0) inset,
                -2px 0 10px 0 rgba(255, 255, 0, 0.6) inset,
                0 0 10px 0 rgba(0, 255, 0, 0.7) inset,
                2px 0 10px 0 rgba(0, 255, 255, 0.6) inset,
                5px 0 10px 0 rgba(0, 0, 255, 0.7) inset,
                0 0 0 0 rgba(255, 0, 255, 0) inset;
        }
        100% {
            box-shadow: 
                -5px 0 10px 0 rgba(255, 0, 0, 0.7) inset,
                -2px 0 10px 0 rgba(255, 255, 0, 0.6) inset,
                0 0 10px 0 rgba(0, 255, 0, 0.7) inset,
                2px 0 10px 0 rgba(0, 255, 255, 0.6) inset,
                5px 0 10px 0 rgba(0, 0, 255, 0.7) inset,
                3px 0 10px 0 rgba(255, 0, 255, 0.6) inset;
        }
    }

    @keyframes borderPulse {
        0%, 100% {
            box-shadow: 
                -5px 0 10px 0 rgba(255, 0, 0, 0.7) inset,
                -2px 0 10px 0 rgba(255, 255, 0, 0.6) inset,
                0 0 10px 0 rgba(0, 255, 0, 0.7) inset,
                2px 0 10px 0 rgba(0, 255, 255, 0.6) inset,
                5px 0 10px 0 rgba(0, 0, 255, 0.7) inset,
                3px 0 10px 0 rgba(255, 0, 255, 0.6) inset;
        }
        50% {
            box-shadow: 
                -6px 0 14px 0 rgba(255, 0, 128, 0.8) inset,
                -3px 0 14px 0 rgba(255, 128, 0, 0.7) inset,
                0 0 14px 0 rgba(128, 255, 0, 0.8) inset,
                3px 0 14px 0 rgba(0, 255, 128, 0.7) inset,
                6px 0 14px 0 rgba(128, 0, 255, 0.8) inset,
                4px 0 14px 0 rgba(255, 0, 255, 0.7) inset;
        }
    }

    @keyframes explosion {
        0% {
            transform: scaleX(1);
        } 
        33% {
            transform: scaleX(0.98);
        }
        66% {
            transform: scaleX(1.02);
        }
        100% {
            transform: scaleX(1);
        }
    }     

    .search-active {
        animation: borderExplosion 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), 
                borderPulse 2s ease-in-out 0.6s infinite !important;
        border-color: transparent !important;
    }

    .search-clique {
        animation: explosion 0.6s cubic-bezier(0.25, 1.5, 0.5, 1);
    }

`;
document.head.appendChild(animationStyle);


function cacheBoutonsenHaut() {
    const actualiserbtn = document.getElementById('refresh-bouton-map');
    const localiserbtn = document.getElementById('locate-bouton-map');

    actualiserbtn.classList.toggle('hideblur');
    localiserbtn.classList.toggle('hideblur');
}

function closeMenu() {
    cacheBoutonsenHaut()
    safeVibrate([30], true);
    soundsUX('MBF_SelectedVehicle_DoorClose');
    const menu = document.getElementById('menu');
    const menubottom1 = document.getElementById('menubtm');
    const mapp = document.getElementById('map');
    mapp.style.opacity = '1';
    
    menu.classList.add('hidden');
    if (localStorage.getItem('transparency') === 'true') {
        const map = document.getElementById('map');
        map.classList.remove('hiddennotransition');
        map.classList.add('appearnotransition');
        map.classList.remove('hidden');
        map.classList.remove('appear');
    } else {
        const map = document.getElementById('map');
        map.classList.remove('hidden');
        map.classList.add('appear');
        map.classList.remove('hiddennotransition');
        map.classList.remove('appearnotransition');
    }

    window.isMenuShowed = false;
    menu.addEventListener('animationend', function onAnimationEnd(event) {
        if (event.animationName === 'slideInBounceInv' && menu.classList.contains('hidden')) { 
            menu.style.display = 'none';
        }
    });
    isMenuVisible = false;
    menubottom1.style.display = 'flex';
    setTimeout(() => {
        menubottom1.classList.remove('slide-upb');
        menubottom1.classList.add('slide-downb');
    }, 10);
}

function computeDelaySeconds(tripId, stopId, rtArrivalTime) {
    if (!window.staticStopTimes || !rtArrivalTime) return null;

    const tripStops = window.staticStopTimes[tripId];
    if (!tripStops) return null;

    const cleanStopId = stopId.replace("0:", "").replace("TCAR:Vehicle::", "").replace(":LOC", "").trim();
    
    const staticStop = tripStops[cleanStopId] 
        || tripStops["0:" + cleanStopId]
        || tripStops[stopId];
        
    if (!staticStop) return null;

    const staticTimeStr = staticStop.a || staticStop.d; 
    if (!staticTimeStr) return null;

    function timeToSeconds(timeStr) {
        const parts = timeStr.split(':');
        if (parts.length < 2) return null;
        const h = parseInt(parts[0]) || 0;
        const m = parseInt(parts[1]) || 0;
        const s = parseInt(parts[2]) || 0;
        return h * 3600 + m * 60 + s;
    }

    const staticSecs = timeToSeconds(staticTimeStr);
    if (staticSecs === null) return null;

    let rtSecs;
    if (typeof rtArrivalTime === 'number' && rtArrivalTime > 86400) {
        const d = new Date(rtArrivalTime * 1000);
        rtSecs = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
    } else if (typeof rtArrivalTime === 'string' && rtArrivalTime.includes(':')) {
        rtSecs = timeToSeconds(rtArrivalTime);
    } else {
        return null;
    }

    if (rtSecs === null) return null;
    return rtSecs - staticSecs;
}


const TooltipManager = {
    pool: [],
    maxPoolSize: 50,
    active: new Map(),
    
    acquire() {
        let tooltip = this.pool.pop();
        if (!tooltip) {
            tooltip = L.tooltip({
                permanent: true,
                direction: 'center',
                className: 'minimal-tooltip-container',
                offset: [0, 0],
                opacity: 1
            });
        }
        return tooltip;
    },
    
    release(tooltip) {
        if (!tooltip) return;
        
        if (tooltip._container) {
            const handlers = tooltip._container._eventHandlers;
            if (handlers) {
                handlers.forEach(handler => {
                    tooltip._container.removeEventListener(handler.event, handler.fn);
                });
            }
        }
        
        if (this.pool.length < this.maxPoolSize) {
            this.pool.push(tooltip);
        }
    },
    
    clear() {
        this.active.forEach((tooltip) => {
            map.removeLayer(tooltip);
        });
        this.active.clear();
        this.pool = [];
    }
};

let _timeToggleInterval = null;
let _showTimeLeft = true;
let _timeToggleAnimating = false;

function initTimeToggle() {
    if (_timeToggleInterval) return;
    _timeToggleInterval = setInterval(() => {
        if (_timeToggleAnimating) return;
        _timeToggleAnimating = true;

        const timeDisplays = document.querySelectorAll('.time-display');
        const indicators   = document.querySelectorAll('.time-indicator');

        if (timeDisplays.length === 0) {
            _timeToggleAnimating = false;
            return;
        }

        timeDisplays.forEach(d => d.classList.add('fade-out'));
        indicators.forEach(i => {
            i.classList.add('animate');
            setTimeout(() => i.classList.remove('animate'), 600);
        });

        setTimeout(() => {
            _showTimeLeft = !_showTimeLeft;
            timeDisplays.forEach(d => {
                const val = _showTimeLeft
                    ? d.getAttribute('data-time-left')
                    : d.getAttribute('data-departure-time');
                if (val) d.textContent = val;
                d.classList.remove('fade-out');
            });
            _timeToggleAnimating = false;
        }, 350);

    }, 4000);
}

function destroyTimeToggle() {
    if (_timeToggleInterval) {
        clearInterval(_timeToggleInterval);
        _timeToggleInterval = null;
    }
}

const MinimalPopupAnimationManager = {
    rafId: null,
    schedule(callback) {
        this.cancel();
        this.rafId = requestAnimationFrame(callback);
    },
    cancel() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    },
    cleanup() { this.cancel(); }
};

function updateMinimalPopupsGlobal() {
    MinimalPopupAnimationManager.schedule(() => {
        if (!window.mapInstance) return;
        const currentZoom = window.mapInstance.getZoom();
        const showMinimal = currentZoom >= 17 && currentZoom < 20;
        if (!showMinimal) {
            markerPool.active.forEach((marker, id) => {
                if (marker) createOrUpdateMinimalTooltip(id, false);
            });
            return;
        }
        const bounds = window.mapInstance.getBounds();
        markerPool.active.forEach((marker, markerId) => {
            if (!marker) return;
            const markerLatLng = marker.getLatLng();
            const isInBounds = bounds.contains(markerLatLng);
            const shouldShow = !marker.isPopupOpen() && isInBounds;
            if (shouldShow) {
                createOrUpdateMinimalTooltip(markerId, true);
                if (marker.minimalPopup) marker.minimalPopup.setLatLng(markerLatLng);
            } else {
                createOrUpdateMinimalTooltip(markerId, false);
            }
        });
    });
}

const mapEventHandlers = {
    _attached: false,
    _handlers: [],
    attach(mapInstance) {
        if (this._attached) return;
        const onZoom = debounce(() => updateMinimalPopupsGlobal(), 10);
        const onMove = debounce(() => updateMinimalPopupsGlobal(), 30);
        mapInstance.on('zoomend', onZoom);
        mapInstance.on('moveend', onMove);
        this._handlers.push(
            { event: 'zoomend', fn: onZoom },
            { event: 'moveend', fn: onMove }
        );
        this._attached = true;
    },
    cleanup() {
        if (!window.mapInstance) return;
        this._handlers.forEach(({ event, fn }) => {
            window.mapInstance.off(event, fn);
        });
        this._handlers = [];
        this._attached = false;
    }
};

function createOrUpdateMinimalTooltip(markerId, shouldShow = true) {
    const marker = markerPool.get(markerId);
    if (!marker) return;
    
    // Safari : Vérifier le support des tooltips
    if (typeof L.tooltip !== 'function') {
        console.warn('Tooltips non supportés');
        return;
    }
    
    if (shouldShow && !marker.isPopupOpen()) {
        if (!marker.minimalPopup) {
            const minimalTooltip = TooltipManager.acquire();
            
            const color = lineColors[marker.line] || '#000000';
            const textColor = TextColorUtils.getOptimal(color);
            
            const minimalContent = `
                <div class="minimal-popup minimal-popup-appear" style="
                    position: relative;
                    font-family: 'League Spartan', sans-serif;
                    font-size: 11px;
                    color: ${textColor};
                    background: linear-gradient(135deg, ${color}f0, ${color}d0);
                    -webkit-backdrop-filter: blur(12px);
                    backdrop-filter: blur(12px);
                    border-radius: 12px;
                    padding: 6px 10px;
                    box-shadow: 0 4px 16px -2px ${color}80, 0 2px 8px -2px ${color}40;
                    min-width: 80px;
                    max-width: 140px;
                    cursor: pointer;
                    border: 1px solid ${color}60;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    -webkit-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    transform: translateY(0);
                    -webkit-transform: translateY(0) translateZ(0);
                ">
                    <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                        <div style="
                            background: rgba(255,255,255,0.2);
                            border-radius: 6px;
                            padding: 2px 6px;
                            font-weight: 600;
                            font-size: 10px;
                            line-height: 1.2;
                        ">
                            ${lineName[marker.line] || t("unknownline")}
                        </div>
                        <div style="
                            background: rgba(0,0,0,0.3);
                            border-radius: 4px;
                            padding: 1px 4px;
                            font-size: 9px;
                            font-weight: 500;
                        ">
                            ${((marker.vehicleData && (marker.vehicleData.vehicle.label || marker.vehicleData.vehicle.id)) || (marker.vehicle && (marker.vehicle.label || marker.vehicle.id)) || t("unknownparc")).toString().padStart(3, '0')}
                        </div>
                    </div>
                    <div style="
                        font-size: 9px; 
                        opacity: 0.85; 
                        margin-top: 2px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        font-weight: 400;
                    ">
                        ➜ ${marker.destination || t("unknowndestination")}
                    </div>
                </div>
            `;

            try {
                minimalTooltip
                    .setLatLng(marker.getLatLng())
                    .setContent(minimalContent)
                    .addTo(map);

                setTimeout(() => {
                    if (minimalTooltip._container) {
                        const clickHandler = function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            const m = markerPool.get(markerId);
                            if (m) m.openPopup();
                        };
                        
                        minimalTooltip._container.addEventListener('mousedown', clickHandler);
                        minimalTooltip._container.addEventListener('touchstart', clickHandler, { passive: false });
                        
                        if (!minimalTooltip._container._eventHandlers) {
                            minimalTooltip._container._eventHandlers = [];
                        }
                        minimalTooltip._container._eventHandlers.push({
                            event: 'mousedown',
                            fn: clickHandler
                        });
                    }
                }, 10); 
                
                marker.minimalPopup = minimalTooltip;
                TooltipManager.active.set(markerId, minimalTooltip);
                window.minimalTooltipStates[markerId] = 'visible';
            } catch (error) {
                console.error('Erreur création tooltip Safari', error);
                TooltipManager.release(minimalTooltip);
            }
        }
    } else if (!shouldShow && marker.minimalPopup) {
        const tooltipContainer = marker.minimalPopup._container;
        if (tooltipContainer) {
            const popupElement = tooltipContainer.querySelector('.minimal-popup');
            if (popupElement) {
                popupElement.classList.remove('minimal-popup-appear');
                popupElement.classList.add('minimal-popup-disappear');
                
                setTimeout(() => {
                    const tooltipToRemove = marker.minimalPopup;
                    marker.minimalPopup = null;
                    delete window.minimalTooltipStates[markerId];
                    
                    if (tooltipToRemove) {
                        if (tooltipToRemove._container && tooltipToRemove._container._eventHandlers) {
                            tooltipToRemove._container._eventHandlers.forEach(handler => {
                                tooltipToRemove._container.removeEventListener(handler.event, handler.fn);
                            });
                            delete tooltipToRemove._container._eventHandlers;
                        }
                        
                        try {
                            map.removeLayer(tooltipToRemove);
                            TooltipManager.release(tooltipToRemove);
                            TooltipManager.active.delete(markerId);
                        } catch (error) {
                            console.error('Erreur suppression tooltip', error);
                        }
                    }
                }, 20);
            }
        } else {
            const tooltipToRemove = marker.minimalPopup;
            marker.minimalPopup = null;
            delete window.minimalTooltipStates[markerId];
            
            try {
                map.removeLayer(tooltipToRemove);
                TooltipManager.release(tooltipToRemove);
                TooltipManager.active.delete(markerId);
            } catch (error) {
                console.error('Erreur suppression tooltip Safari:', error);
            }
        }
    }
}


async function fetchVehiclePositions() {
    if (!gtfsInitialized) {
        return;
    }
    try {
        const response = await fetch('proxy-cors/proxy_vehpos.php');
        const buffer = await response.arrayBuffer();
        const data = await decodeProtobuf(buffer);

        const activeVehicleIds = new Set();

        const activeTripIds = new Set();
        data.entity.forEach(entity => {
            const tripId = entity.vehicle?.trip?.tripId;
            if (tripId && tripId !== 'Inconnu') activeTripIds.add(tripId);
        });

        const missingTripIds = [...activeTripIds].filter(id => !window.staticStopTimes?.[id]);

        if (missingTripIds.length > 0 && !window.stopTimesLoading) {
            window.stopTimesLoading = true;

            const baseUrl = new URL('proxy-cors/proxy_gtfs.php', window.location.href).href;

            try {
                const r = await fetch(`${baseUrl}?action=stop_times_by_trips`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `trip_ids=${missingTripIds.join(',')}`
                });
                const json = await r.json();
                Object.assign(window.staticStopTimes, json);
                window.stopTimesReady   = true;
                window.stopTimesLoading = false;
            } catch (err) {
                console.warn('Erreur stop times:', err);
                window.stopTimesLoading = false;
            }
        }

            data.entity.forEach(entity => {
                const vehicle = entity.vehicle;
                if (vehicle) {


                const id = vehicle.vehicle.label || vehicle.vehicle.id || entity.id;
                const vehicleOptionsBadges = getVehicleOptionsBadges(id);
                const vehicleBrandHtml = getVehicleBrandHtml(id);
                const line = vehicle.trip && vehicle.trip.routeId ? vehicle.trip.routeId : 'Inconnu';
                const directionId = vehicle.trip ? vehicle.trip.directionId : undefined;
                activeVehicleIds.add(id);

                const statusMap = {
                    0: t("notinservicemaj"), // ❌ Hors service commercial
                    1: t("dooropen"), // Portes ouvertes
                    2: t("enservice") // En service
                };
                const status = statusMap[vehicle.currentStatus] || t("enservice");


                const stopIdun = vehicle.stopId || 'Inconnu';
                let stopId = stopIdun.replace("0:", "").replace("TCAR:Vehicle::", "").replace(":LOC", "");
                const latitude = vehicle.position.latitude;
                const longitude = vehicle.position.longitude;
                const occupancyStatus = vehicle?.occupancyStatus ?? null;

                const occupancyStatusMap = {
                    0: t("empty"),                      // EMPTY
                    1: t("manyseatsavailable"),         // MANY_SEATS_AVAILABLE
                    2: t("fewseatsavailable"),          // FEW_SEATS_AVAILABLE
                    3: t("standingroomonly"),           // STANDING_ROOM_ONLY
                    4: t("crushedstandingroomonly"),    // CRUSHED_STANDING_ROOM_ONLY
                    5: t("full"),                       // FULL
                    6: t("notavailable"),               // NOT_ACCEPTING_PASSENGERS
                    7: t("endstop")                     // NO_DATA_AVAILABLE
                };
                const occupancyStatusText = occupancyStatusMap[occupancyStatus] ?? "";
                

                const scheduleRelationship = vehicle?.trip?.scheduleRelationship ?? 0;
                const scheduleRelationshipMap = {
                    0: t("scheduled"),                  // SCHEDULED
                    1: t("added"),                      // ADDED
                    2: t("unscheduled"),                // UNSCHEDULED
                    3: t("canceled"),                   // CANCELED
                    4: t("replacement"),                // REPLACEMENT
                    5: t("duplicated"),                 // DUPLICATED
                    6: t("newvec"),                     // NEW
                    7: t("deleted")                     // DETELED
                };
                const scheduleRelationshipText = scheduleRelationshipMap[scheduleRelationship] || t("scheduled");

                if (isNaN(latitude) || isNaN(longitude)) {
                    return; 
                }

                const speed = vehicle.position.speed ? (vehicle.position.speed).toFixed(0) + ' km/h' : 'Arrêté';
                const bearing = vehicle.position.bearing || 'Inconnu';
                const tripId = vehicle.trip && vehicle.trip.tripId ? vehicle.trip.tripId : 'Inconnu';

                const lastStopId = tripUpdates[tripId] ? tripUpdates[tripId].lastStopId : 'Inconnu';
                const lastStopNameun = stopNameMap[lastStopId] || 'Haut-le-Pied';
                let lastStopName = lastStopNameun.replace("0:", "").replace("TCAR:Vehicle::", "").replace(":LOC", "");
                
                const nextStops = tripUpdates[tripId]?.nextStops || [];
                let currentStopIndex = nextStops.findIndex(stop => stop.stopId.replace("0:", "").replace("TCAR:Vehicle::", "").replace(":LOC", "") === stopId.replace("0:", "").replace("TCAR:Vehicle::", "").replace(":LOC", ""));
                const now = Math.floor(Date.now() / 1000);

                let filteredStops = [];
                if (currentStopIndex !== -1) {
                    filteredStops = nextStops.slice(currentStopIndex).filter(stop => {
                        return stop.delay === null || stop.delay >= -60;
                    });
                } else {
                    filteredStops = nextStops.filter(stop => stop.delay === null || stop.delay > 0);
                }

                filteredStops = filteredStops.map(stop => {
                    const computedDelay = computeDelaySeconds(
                        tripId,
                        stop.stopId,
                        stop.arrivalTime || stop.departureTime
                    );
                    return {
                        ...stop,
                        computedDelay: computedDelay, 
                    };
                });

                const stopSpinner = startWindowsSpinnerAnimation("win-spinner");
                setTimeout(() => {
                    stopSpinner();
                }, 8000);

                function getTerminusInfo(tripId, stopId, staticStopTimes) {
                    if (!window.stopTimesReady || !staticStopTimes[tripId]) return null;
                    
                    const tripStops = staticStopTimes[tripId];
                    const stopIds = Object.keys(tripStops);
                    
                    // le terminus de depart = premier arrêt du trip (stop_sequence la plus basse)
                    // les stops sont indexés par stopId , y faut trouver le premier
                    // On compare avec le stopId actuel du vehicule
                    const cleanCurrentStopId = stopId.replace("0:", "").replace("TCAR:Vehicle::", "").replace(":LOC", "").trim();
                    
                    // vérifier si le stopId actuel est le premier arrêt
                    // en cherchant l'heure de départ la plus tot dans le trip
                    let earliestTime = null;
                    let earliestStopId = null;
                    
                    for (const [sid, times] of Object.entries(tripStops)) {
                        const timeStr = times.a || times.d;
                        if (!timeStr) continue;
                        
                        const parts = timeStr.split(':').map(Number);
                        const secs = parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
                        
                        if (earliestTime === null || secs < earliestTime) {
                            earliestTime = secs;
                            earliestStopId = sid.replace("0:", "").replace("TCAR:Vehicle::", "").replace(":LOC", "").trim();
                        }
                    }
                    
                    // le bus est-il au premier arrêt ?
                    if (earliestStopId !== cleanCurrentStopId) return null;
                    
                    // calculer le temps avant départ
                    const departureStr = tripStops[earliestStopId]?.d || tripStops["0:" + earliestStopId]?.d;
                    if (!departureStr) return null;
                    
                    const parts = departureStr.split(':').map(Number);
                    const now = new Date();
                    const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
                    let depSecs = parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
                    
                    // gérer le passage minuit
                    let diff = depSecs - nowSecs;
                    if (diff < -3600) diff += 86400;
                    
                    // seulement afficher si depart dans moins de 30 minutes et pas déjà parti
                    if (diff < 0 || diff > 30 * 60) return null;
                    
                    return diff <= 60 ? "imminent" : `${Math.ceil(diff / 60)} min`;
                }
                
                const firstStop = filteredStops.length > 0 ? filteredStops[0] : null;
                const delayMinutes = (firstStop?.computedDelay != null && window.stopTimesReady)
                    ? Math.round(firstStop.computedDelay / 60)
                    : null;

                const delayBadgeHTML = (delayMinutes !== null && filteredStops.length > 0) ? (() => {
                    let icon, label, color;
                    if (Math.abs(delayMinutes) <= 1) {
                        icon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
                        label = t("ontime");
                        color = "#15d85d";
                    } else if (delayMinutes < -1) {
                        icon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
                        label = `${Math.abs(delayMinutes)} ${t("min")} ${t("early")}`;
                        color = "#1a5ecc";
                    } else {
                        icon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
                        label = `${delayMinutes} ${t("min")} ${t("late")}`;
                        color = delayMinutes > 5 ? "#b31313" : "#db6a18";
                    }
                    return `<span>
                        <span class="stops-icon-badge" style="border: 2px solid ${color}44; ">
                            <span style="display:flex; align-items:center;">${icon}</span>
                            <span class="stops-badge-label">${label}</span>
                        </span>
                    </span>`;
                })() : "";

                const iconClock = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

                const iconOccupancy = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;

                const occupancyBadge = occupancyStatusText !== "" ? `
                    <span class="stops-icon-badge">
                        ${iconOccupancy}
                        <span class="stops-badge-label">${occupancyStatusText}</span>
                    </span>` : "";

                const iconStatus = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M8 14V15M16 14V15M5 11H19M6 18V19.5C6 19.7761 6.22386 20 6.5 20V20C6.77614 20 7 19.7761 7 19.5V18M17 18V19.5C17 19.7761 17.2239 20 17.5 20V20C17.7761 20 18 19.7761 18 19.5V18M19 6V6C19 4.34315 17.6569 3 16 3H8C6.34315 3 5 4.34315 5 6V6M19 6V16C19 17.1046 18.1046 18 17 18H7C5.89543 18 5 17.1046 5 16V6M19 6H5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>`;


                const statusBadge = status !== "" ? `
                    <span class="stops-icon-badge">
                        ${iconStatus}
                        <span class="stops-badge-label">${status}</span>
                    </span>` : "";

                const terminusWait = getTerminusInfo(tripId, stopId, window.staticStopTimes);
                const terminusBadgeHTML = terminusWait ? `
                    <span class="stops-icon-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">

                            <path d="M16 16.01L16.01 15.9989"/>
                            <path d="M6 16.01L6.01 15.9989"/>
                            <path d="M20 22V15V8M20 8H18L18 2H22V8H20Z"/>
                            <path d="M4 20V22H6V20H4Z"/>
                            <path d="M14 20V22H16V20H14Z"/>
                            <path d="M16 20H2.6C2.26863 20 2 19.7314 2 19.4V12.6C2 12.2686 2.26863 12 2.6 12H16"/>
                            <path d="M14 8H6M14 2H6C3.79086 2 2 3.79086 2 6V8"/>

                        </svg>
                        <span class="stops-badge-label">${terminusWait === "imminent" ? t("imminentdeparture") : t("departurein") + " " + terminusWait}</span>
                    </span>` : "";

                if (terminusWait) {
                    stopsHeaderText = `
                        <div class="stops-header-widget">
                            <div class="stops-icons-row">
                                ${terminusBadgeHTML}
                                ${statusBadge}
                            </div>
                        </div>`;
                } else if (filteredStops.length === 0) {
                    stopsHeaderText = `
                        <div class="stops-header-widget" style="margin-bottom: 8px;">
                            <div class="stops-icons-row">
                                <span class="stops-icon-badge">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                                    <span class="stops-badge-label">${t("notinservicemaj")}</span>
                                </span>
                            </div>
                        </div>`;

                } else {
                    const firstStopDelay = filteredStops[0].delay || 0;
                    const minutes = Math.max(0, Math.ceil(firstStopDelay / 60));

                    if (filteredStops.length === 1 && minutes === 0) {
                        stopsHeaderText = `
                            <div class="stops-header-widget">
                                <div class="stops-icons-row">
                                    ${terminusBadgeHTML}
                                    ${delayBadgeHTML}
                                    <span class="stops-icon-badge">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                        <span class="stops-badge-label">${scheduleRelationshipText}</span>
                                    </span>
                                    ${occupancyBadge}
                                    ${statusBadge}
                                </div>
                            </div>`;

                    } else if (filteredStops.length === 1) {
                        stopsHeaderText = `
                            <div class="stops-header-widget">
                                <div class="stops-icons-row">
                                    ${terminusBadgeHTML}
                                    ${delayBadgeHTML}
                                    <span class="stops-icon-badge">
                                        ${iconClock}
                                        <span class="stops-badge-label">${scheduleRelationshipText}</span>
                                    </span>
                                    ${occupancyBadge}
                                    ${statusBadge}
                                </div>
                            </div>`;

                    } else if (minutes > 3) {
                        stopsHeaderText = `
                            <div class="stops-header-widget">
                                <div class="stops-icons-row">
                                    ${terminusBadgeHTML}
                                    ${delayBadgeHTML}
                                    <span class="stops-icon-badge">
                                        ${iconClock}
                                        <span class="stops-badge-label">${scheduleRelationshipText}</span>
                                    </span>
                                    ${occupancyBadge}
                                    ${statusBadge}
                                </div>
                            </div>`;

                    } else {
                        stopsHeaderText = `
                            <div class="stops-header-widget">
                                <div class="stops-icons-row">
                                    ${terminusBadgeHTML}
                                    ${delayBadgeHTML}
                                    <span class="stops-icon-badge">
                                        ${iconClock}
                                        <span class="stops-badge-label">${scheduleRelationshipText}</span>
                                    </span>
                                    ${occupancyBadge}
                                    ${statusBadge}
                                </div>
                            </div>`;
                    }
                }

                let stopsListHTML = '';
                if (filteredStops.length > 0) {
                    stopsListHTML = filteredStops.map(stop => {
                        const stopTime = stop.arrivalTime || stop.departureTime;
                        let timeLeftText = '';

                        if (stopTime && stopTime.includes(':')) {
                            const parts = stopTime.split(':').map(Number);
                            const now = new Date();
                            const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
                            let arrivalSeconds = parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
                            
                            let diff = arrivalSeconds - nowSeconds;
                            if (diff < -3600) diff += 86400;
                            
                            timeLeftText = diff <= 60 ? t("imminent") : `${Math.ceil(diff / 60)} min`;
                        } else if (stopTime && !isNaN(stopTime)) {
                            const diff = Math.floor(Number(stopTime) - Date.now() / 1000);
                            timeLeftText = diff <= 60 ? t("imminent") : `${Math.ceil(diff / 60)} min`;
                        }
                        
                        const stopName = stopNameMap[stop.stopId] || stop.stopId;
                                                
                        return `
                        <li style="list-style: none; padding: 0px; display: flex; justify-content: space-between;">
                            <div class="stop-name-container" style="position: relative; overflow: hidden; max-width: 70%; white-space: nowrap;">
                                <div class="stop-name-wrapper" style="position: relative; display: inline-block; padding-right: 10px;">
                                    <div class="stop-name" style="position: relative; display: inline-block;">${stopName}</div>
                                </div>
                            </div>
                            <div class="time-container" style="position: relative; min-height: 1.2em; text-align: right;">
                                <div class="time-display" 
                                    data-time-left="${timeLeftText}" 
                                    data-departure-time="${stop.arrivalTime || stop.departureTime || "Inconnu"}">
                                    ${timeLeftText}
                                </div>
                                <svg class="time-indicator" xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <g class="rss-waves">
                                        <path class="rss-arc-large" d="M4 4a16 16 0 0 1 16 16"></path>
                                        <path class="rss-arc-small" d="M4 11a9 9 0 0 1 9 9"></path>
                                    </g>
                                    <circle class="rss-dot" cx="5" cy="19" r="1"></circle>
                                </svg>
                            </div>
                        </li>`;
                    }).join('');
                }

                const nextStopsHTML = `
                    <div style="position: relative; max-height: 120px;">
                        <ul style="padding: 0; margin: 0; list-style-type: none; max-height: 120px;">
                            ${stopsListHTML}
                        </ul>
                    </div>
                `;

                initTimeToggle();

                const delayInfo = tripUpdates[tripId] ? tripUpdates[tripId].stopUpdates.find(update => update.stopId === stopId) : null;

                const arrivalDelay = delayInfo ? delayInfo.arrivalDelay : 0; 
                const scheduledArrival = delayInfo ? delayInfo.scheduledArrival : null; 

                                
                function getTextColorForBackground(bgColor, options = {}) {
                    const {
                        contrastRatio = 4.5,
                        darkColor = '#1a1a1a',
                        lightColor = '#f8f9fa',
                        useGradient = false 
                    } = options;

                    let r, g, b, a = 1;

                    if (!bgColor) return darkColor;

                    bgColor = bgColor.trim();

                    if (bgColor.startsWith('rgb')) {
                        const values = bgColor.match(/\d+(\.\d+)?/g);
                        if (values) {
                            r = parseInt(values[0]);
                            g = parseInt(values[1]);
                            b = parseInt(values[2]);
                            a = values[3] ? parseFloat(values[3]) : 1;
                        } else {
                            return darkColor;
                        }
                    } else {
                        // Parse hex colors
                        if (/^#([a-f\d])([a-f\d])([a-f\d])$/i.test(bgColor)) {
                            bgColor = bgColor.replace(/^#([a-f\d])([a-f\d])([a-f\d])$/i,
                                (_, r, g, b) => '#' + r + r + g + g + b + b);
                        }

                        if (bgColor.length === 7) {
                            r = parseInt(bgColor.slice(1, 3), 16);
                            g = parseInt(bgColor.slice(3, 5), 16);
                            b = parseInt(bgColor.slice(5, 7), 16);
                        } else if (bgColor.length === 9) {
                            r = parseInt(bgColor.slice(1, 3), 16);
                            g = parseInt(bgColor.slice(3, 5), 16);
                            b = parseInt(bgColor.slice(5, 7), 16);
                            a = parseInt(bgColor.slice(7, 9), 16) / 255;
                        } else if (bgColor.length === 8 && bgColor.startsWith('#')) {
                            r = parseInt(bgColor.slice(1, 3), 16);
                            g = parseInt(bgColor.slice(3, 5), 16);
                            b = parseInt(bgColor.slice(5, 7), 16);
                            a = parseInt(bgColor.slice(7, 9), 16) / 255;
                        } else {
                            return darkColor;
                        }
                    }

                    // Clamp values
                    r = Math.max(0, Math.min(255, r));
                    g = Math.max(0, Math.min(255, g));
                    b = Math.max(0, Math.min(255, b));

                    // Calculate luminance of background
                    const srgb = [r, g, b].map(c => {
                        const val = c / 255;
                        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
                    });
                    const luminance = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];

                    // Helper function to calculate luminance from hex
                    const getLuminance = (color) => {
                        const hex = color.replace('#', '');
                        const r = parseInt(hex.substr(0, 2), 16) / 255;
                        const g = parseInt(hex.substr(2, 2), 16) / 255;
                        const b = parseInt(hex.substr(4, 2), 16) / 255;
                        const srgb = [r, g, b].map(c => 
                            c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
                        );
                        return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
                    };

                    // Calculate contrast ratios
                    const darkLuminance = getLuminance(darkColor);
                    const lightLuminance = getLuminance(lightColor);

                    const contrastWithDark = luminance > darkLuminance 
                        ? (luminance + 0.05) / (darkLuminance + 0.05)
                        : (darkLuminance + 0.05) / (luminance + 0.05);
                    
                    const contrastWithLight = luminance > lightLuminance 
                        ? (luminance + 0.05) / (lightLuminance + 0.05)
                        : (lightLuminance + 0.05) / (luminance + 0.05);

                    const isMediumDark = luminance >= 0.12 && luminance <= 0.35;

                    if (contrastWithDark >= contrastRatio && contrastWithLight >= contrastRatio) {
                        if (isMediumDark) {
                            return lightColor;
                        }
                        return luminance > 0.18 ? darkColor : lightColor;
                    } 
                    else if (contrastWithDark >= contrastRatio) {
                        if (isMediumDark) {
                            return lightColor;
                        }
                        return darkColor;
                    } 
                    // Si seule la couleur claire passe
                    else if (contrastWithLight >= contrastRatio) {
                        return lightColor;
                    } 
                    // Aucune ne passe vraiment le test
                    else {
                        // Pour les couleurs moyennes-foncées, forcer le clair
                        if (isMediumDark) {
                            return lightColor;
                        }
                        
                        // Seuil abaissé à 0.15 pour préférer le clair sur les fonds sombres
                        if (luminance < 0.15) {
                            return lightColor; 
                        }
                        
                        // Sinon prendre le meilleur contraste disponible
                        return contrastWithDark > contrastWithLight ? darkColor : lightColor;
                    }
                }
                    
                    

                const backgroundColor = lineColors[line] || '#000000';
                const textColor = getTextColorForBackground(backgroundColor);


                let arrivalTime = 'Inconnu';
                if (scheduledArrival) {
                    const arrivalDate = new Date(scheduledArrival * 1000);
                    arrivalTime = arrivalDate.toLocaleTimeString();
                }

                let delayMessage = 'À l\'heure';
                if (arrivalDelay > 0) {
                    delayMessage = `En retard de ${arrivalDelay} secondes`;
                } else if (arrivalDelay < 0) {
                    delayMessage = `En avance de ${Math.abs(arrivalDelay)} secondes`;
                }

                let remainingTimeMessage = t("endstop");
                if (nextStops.length > 1) {
                    const penultimateStop = nextStops[nextStops.length - 2]; // avant der arrêt
                    const scheduledArrivalPenultimate = penultimateStop.departureTime;

                    if (scheduledArrivalPenultimate && scheduledArrivalPenultimate.includes(":")) {
                        const [hours, minutes] = scheduledArrivalPenultimate.split(':').map(num => parseInt(num, 10));

                        const now = new Date();
                        const scheduledArrivalDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

                        const currentTime = new Date();
                        const timeRemaining = Math.max(scheduledArrivalDate - currentTime, 0);
                        const minutesRemaining = Math.floor(timeRemaining / 60000);
                        const secondsRemaining = Math.floor((timeRemaining % 60000) / 1000);

                        remainingTimeMessage = ` ${minutesRemaining} ${t("minutes")}.`;
                    } else {
                        remainingTimeMessage = ' ' + t("unknownarrival");
                    }
                }


                


                window.openFullPopup = function(markerId) {
                    if (markers[markerId]) {
                        markers[markerId].fire('click');
                    }
                };

                if (typeof window.minimalTooltipStates === 'undefined') {
                    window.minimalTooltipStates = {};
                }

                if (!document.getElementById('minimal-tooltip-styles')) {
                    const styles = document.createElement('style');
                    styles.id = 'minimal-tooltip-styles';
                    styles.textContent = `
                        .minimal-tooltip-container {
                            background: transparent !important;
                            border: none !important;
                            box-shadow: none !important;
                            padding: 0 !important;
                            margin: 0 !important;
                        }
                        
                        .minimal-tooltip-container::before {
                            display: none !important;
                        }
                        
                        .leaflet-tooltip-top::before,
                        .leaflet-tooltip-bottom::before,
                        .leaflet-tooltip-left::before,
                        .leaflet-tooltip-right::before,
                        .leaflet-tooltip-center::before {
                            display: none !important;
                        }
                        
                        .leaflet-tooltip {
                            background: transparent !important;
                            border: none !important;
                            box-shadow: none !important;
                        }
                        
                        @keyframes popIn {
                            0% {
                                transform: scale(0) translateY(45px);
                            }
                            50% {
                                transform: scale(1.1) translateY(-6px);
                            }
                            100% {
                                transform: scale(1) translateY(0);
                            }
                        }
                        
                        @keyframes popOut {
                            0% {
                                transform: scale(1) translateY(0);
                            }
                            100% {
                                transform: scale(0) translateY(10px);
                            }
                        }
                        
                        .minimal-popup-appear {
                            animation: popIn 0.4s cubic-bezier(0.4, 0, 1, 1);
                        }
                        
                        .minimal-popup-disappear {
                            animation: popOut 0.3s cubic-bezier(0.4, 0, 1, 1);
                        }
                    `;
                    document.head.appendChild(styles);
                }

                const tooltipPool = [];
                let maxPoolSize = 50;

                function getFromPool() {
                    return tooltipPool.pop() || null;
                }

                function returnToPool(tooltip) {
                    if (tooltipPool.length < maxPoolSize) {
                        tooltipPool.push(tooltip);
                    }
                }

                function generatePopupContent(vehicle, line, lastStopName, nextStopsHTML, vehicleOptionsBadges, vehicleBrandHtml, stopsHeaderText, backgroundColor, textColor, id) {
                    const cacheKey = `${id}-${line}-${nextStopsHTML.substring(0, 80)}`;

                    if (contentCache.get(cacheKey)) {
                        return contentCache.get(cacheKey);
                    }

                    const popupContent = `
                        <div class="popup-container" data-vehicle-id="${id}" style="box-shadow: 0px 0px 20px 0px ${backgroundColor}9c; background-color: ${backgroundColor}9c; color: ${textColor};">
                            
                            <button onclick="shareVehicleId('${vehicle.vehicle.id}')" title="${t("share")}" class="share-button">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${textColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 3C10.3431 3 9 4.34315 9 6C9 7.65685 10.3431 9 12 9C13.6569 9 15 7.65685 15 6" />
                                    <path d="M5.5 15C3.84315 15 2.5 16.3431 2.5 18C2.5 19.6569 3.84315 21 5.5 21C7.15685 21 8.5 19.6569 8.5 18" />
                                    <path d="M18.5 21C16.8431 21 15.5 19.6569 15.5 18C15.5 16.3431 16.8431 15 18.5 15C20.1569 15 21.5 16.3431 21.5 18" />
                                    <path d="M20 13C20 10.6106 18.9525 8.46589 17.2916 7M4 13C4 10.6106 5.04752 8.46589 6.70838 7M10 20.748C10.6392 20.9125 11.3094 21 12 21C12.6906 21 13.3608 20.9125 14 20.748" />
                                </svg>
                            </button>

                            <button onclick="openVehicleNavigation('${id}', markerPool.get('${id}'))" title="Naviguer" class="share-button" style="right: 48px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${textColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                                </svg>
                            </button>

                            <div class="vehicle-info-section" style="color: ${textColor};">
                                <div class="light-beam beam1"></div>
                                <div class="light-beam beam2"></div>
                                <div class="light-beam beam3"></div>
                                <div class="vehicle-main-content">
                                    <p class="line-title">${t("line")} ${lineName[line] || t("unknownarrival")}</p>
                                    <p class="vehicle-direction" id="popup-direction-${id}">➜ ${lastStopName}</p>
                                    <div>
                                        <div class="vehicle-brand-container">${vehicleBrandHtml}</div>
                                        <div class="vehicle-options-container">
                                            <div class="options-scroll-area">
                                                <div class="options custom-scrollbar">
                                                    <span class="parc-badge">
                                                        <svg class="parc-icon" width="17" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M10 2.00879C7.52043 2.04466 6.11466 2.22859 5.17157 3.17167C4 4.34324 4 6.22886 4 10.0001V12.0001C4 15.7713 4 17.657 5.17157 18.8285C6.34315 20.0001 8.22876 20.0001 12 20.0001C15.7712 20.0001 17.6569 20.0001 18.8284 18.8285C20 17.657 20 15.7713 20 12.0001V10.0001C20 6.22886 20 4.34324 18.8284 3.17167C17.8853 2.22859 16.4796 2.04466 14 2.00879" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path> <path d="M20 13H16M4 13H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M15.5 16H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M7 16H8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M6 19.5V21C6 21.5523 6.44772 22 7 22H8.5C9.05228 22 9.5 21.5523 9.5 21V20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M18 19.5V21C18 21.5523 17.5523 22 17 22H15.5C14.9477 22 14.5 21.5523 14.5 21V20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M20 9H21C21.5523 9 22 9.44772 22 10V11C22 11.3148 21.8518 11.6111 21.6 11.8L20 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M4 9H3C2.44772 9 2 9.44772 2 10V11C2 11.3148 2.14819 11.6111 2.4 11.8L4 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M4.5 5H8.25M19.5 5H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path> </g></svg>
                                                        <span class="parc-number">${(vehicle.vehicle.label || vehicle.vehicle.id || t("unknownparc")).toString().padStart(3, '0')}</span>
                                                        <span class="parc-number-hidden">${(vehicle.vehicle.label || vehicle.vehicle.id || t("unknownparc"))}</span>
                                                    </span>
                                                    ${vehicleOptionsBadges}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="stops-section" style="color: ${textColor};">
                                <div class="stops-header" id="popup-header-${id}">${stopsHeaderText}</div>
                                <ul>
                                    <div id="popup-stops-${id}" class="nextStopsContent next-stops-content">
                                        ${nextStopsHTML}
                                    </div>
                                </ul>
                            </div>
                        </div>
                    `;

                    contentCache.set(cacheKey, popupContent);
                    return popupContent;
                }

                function animateTooltip(tooltip, newLatLng, duration = 1000) {
                    if (!tooltip || !tooltip._container) return;

                    const startLatLng = tooltip.getLatLng();
                    const endLatLng = newLatLng;
                    const startTime = performance.now();

                    if (tooltip.animationFrame) {
                        cancelAnimationFrame(tooltip.animationFrame);
                    }

                    function easeInOutQuad(t) {
                        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                    }

                    function animate(currentTime) {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const easedProgress = easeInOutQuad(progress);

                        const lat = startLatLng.lat + (endLatLng.lat - startLatLng.lat) * easedProgress;
                        const lng = startLatLng.lng + (endLatLng.lng - startLatLng.lng) * easedProgress;

                        tooltip.setLatLng([lat, lng]);

                        if (progress < 1) {
                            tooltip.animationFrame = requestAnimationFrame(animate);
                        }
                    }

                    tooltip.animationFrame = requestAnimationFrame(animate);
                }


                function patchPopupContent(marker, id, { lastStopName, nextStopsHTML, stopsHeaderText } = {}) {
                    if (!marker.isPopupOpen()) return false;

                    const popupNode = marker.getPopup()._contentNode;
                    if (!popupNode) return false;

                    let updated = false;

                    if (lastStopName !== undefined) {
                        const dirEl = popupNode.querySelector(`#popup-direction-${id}`);
                        if (dirEl && dirEl.textContent !== `➜ ${lastStopName}`) {
                            dirEl.textContent = `➜ ${lastStopName}`;
                            updated = true;
                        }
                    }

                    if (stopsHeaderText !== undefined) {
                        const headerEl = popupNode.querySelector(`#popup-header-${id}`);
                        if (headerEl) {
                            headerEl.innerHTML = stopsHeaderText;
                            updated = true;
                        }
                    }

                    if (nextStopsHTML !== undefined) {
                        const stopsEl = popupNode.querySelector(`#popup-stops-${id}`);
                        if (stopsEl) {
                            stopsEl.innerHTML = nextStopsHTML;
                            updated = true;
                        }
                    }

                    return updated;
                }

                function updatePopupContent(marker, vehicle, line, lastStopName, nextStopsHTML, vehicleOptionsBadges, vehicleBrandHtml, stopsHeaderText, backgroundColor, textColor, id) {
                    const popup = marker.getPopup();
                    if (!popup) return false;
                    
                    const newContent = generatePopupContent(vehicle, line, lastStopName, nextStopsHTML, vehicleOptionsBadges, vehicleBrandHtml, stopsHeaderText, backgroundColor, textColor, id);
                    
                    // màj si le contenu a changé
                    if (popup.getContent() !== newContent) {
                        popup.setContent(newContent);
                        return true;
                    }
                    return false;
                }

                const MinimalPopupAnimationManager = {
                    rafId: null,
                    handlers: new Set(),
                    
                    schedule(callback) {
                        this.cancel();
                        this.rafId = requestAnimationFrame(callback);
                    },
                    
                    cancel() {
                        if (this.rafId) {
                            cancelAnimationFrame(this.rafId);
                            this.rafId = null;
                        }
                    },
                    
                    cleanup() {
                        this.cancel();
                        this.handlers.clear();
                    }
                };

                function updateMinimalPopups() {
                    MinimalPopupAnimationManager.schedule(() => {
                        const currentZoom = map.getZoom();
                        const showMinimal = currentZoom >= 17 && currentZoom < 20;
                        
                        if (!showMinimal) {
                            markerPool.active.forEach((marker, id) => {
                                if (marker) createOrUpdateMinimalTooltip(id, false);
                            });
                            return;
                        }
                        
                        const bounds = map.getBounds();
                        
                        markerPool.active.forEach((marker, markerId) => {
                            if (!marker) return;
                            
                            const markerLatLng = marker.getLatLng();
                            const isInBounds = bounds.contains(markerLatLng);
                            const shouldShow = showMinimal && !marker.isPopupOpen() && isInBounds;
                            
                            if (shouldShow) {
                                createOrUpdateMinimalTooltip(markerId, true);
                                if (marker.minimalPopup) {
                                    marker.minimalPopup.setLatLng(markerLatLng);
                                }
                            } else {
                                createOrUpdateMinimalTooltip(markerId, false);
                            }
                        });
                    });
                }


            if (markerPool.has(id)) {
                const marker = markerPool.get(id);
                animateMarker(marker, [latitude, longitude]);

                if (navVehicleId === id) {
                    const payload = { type: 'vehicleNavUpdate', lat: latitude, lon: longitude };
                    const iframe = document.getElementById('webview-frame');
                    if (iframe?.contentWindow) iframe.contentWindow.postMessage(payload, '*');
                    if (navWindow && !navWindow.closed) navWindow.postMessage(payload, '*');
                }
                
                if (marker.minimalPopup) {
                    createOrUpdateMinimalTooltip(id, true);
                    animateTooltip(marker.minimalPopup, L.latLng(latitude, longitude));
                }
                
                const hasChanges = (
                    marker.line !== line ||
                    marker.destination !== lastStopName ||
                    marker._lastNextStopsHTML !== nextStopsHTML
                );

                if (hasChanges) {
                    marker.vehicleData = vehicle;
                    marker.destination = lastStopName;
                    marker._lastNextStopsHTML = nextStopsHTML;

                    if (marker.line !== line) {
                        marker.line = line;
                        markerPool.updateMarkerStyle(marker, line, bearing);
                        
                        if (marker.isPopupOpen()) {
                            const menubtm = document.getElementById('menubtm');
                            if (menubtm) {
                                const color = lineColors[line] || '#000000';
                                lastActiveColor = color;
                                menubtm.style.backgroundColor = `${color}9c`;
                                
                                const textColor = TextColorUtils.getOptimal(color);
                                StyleManager.applyMenuStyle(textColor);
                            }
                        }
                    }
                    
                    updateLinesDisplay();

                    if (marker.isPopupOpen()) {
                        patchPopupContent(marker, id, { lastStopName, nextStopsHTML, stopsHeaderText });
                    } else {
                        const cacheKey = `${id}-${line}-${nextStopsHTML.substring(0, 80)}`;
                        contentCache.cache.delete(cacheKey);

                        const newContent = generatePopupContent(
                            vehicle, line, lastStopName, nextStopsHTML,
                            vehicleOptionsBadges, vehicleBrandHtml, stopsHeaderText,
                            backgroundColor, textColor, id
                        );
                        const popup = marker.getPopup();
                        if (popup) {
                            popup.setContent(newContent);
                        }
                    }
                }
                
                if (marker._icon) {
                    const arrowElement = marker._icon.querySelector('.marker-arrow');
                    if (arrowElement) {
                        arrowElement.style.transform = `rotate(${bearing - 90}deg)`;
                    }
                }
                
                if (selectedLine && marker.line !== selectedLine) {
                    if (map.hasLayer(marker)) {
                        map.removeLayer(marker);
                    }
                } else {
                    if (!map.hasLayer(marker)) {
                        map.addLayer(marker);
                    }
                }
                
                updateMinimalPopupsGlobal();
                
            } else {
                const marker = markerPool.acquire(id, latitude, longitude, line, bearing);
                marker.line = line;
                marker.vehicleData = vehicle;
                marker.destination = lastStopName;
                marker._lastNextStopsHTML = nextStopsHTML;
                
                if (!selectedLine || selectedLine === line) {
                    marker.addTo(map);
                }

                const popupPlaceholder = L.popup().setContent('<div style="padding:10px;color:white;font-family:League Spartan;">⏳ Chargement...</div>');
                marker.bindPopup(popupPlaceholder);

                eventManager.on(marker, 'popupopen', function(e) {
                    if (marker.minimalPopup) {
                        createOrUpdateMinimalTooltip(id, false);
                    }

                    const popup = marker.getPopup();
                    if (popup && !marker._popupGenerated) {
                        marker._popupGenerated = true;
                        requestAnimationFrame(() => {
                            const popupContent = generatePopupContent(
                                vehicle, line, lastStopName, nextStopsHTML,
                                vehicleOptionsBadges, vehicleBrandHtml, stopsHeaderText,
                                backgroundColor, textColor, id
                            );
                            popup.setContent(popupContent);
                            popup.update();
                        });
                    }

                    if (e.popup && e.popup._contentNode) {
                        const popupElement = e.popup._contentNode.parentElement;
                        if (popupElement) {
                            popupElement.classList.remove('hide');
                            popupElement.classList.add('show');
                        }
                    }
                }, id);

                eventManager.on(marker, 'popupclose', function(e) {
                    if (e.popup && e.popup._contentNode) {
                        const popupElement = e.popup._contentNode.parentElement;
                        if (popupElement) {
                            popupElement.classList.remove('show');
                            popupElement.classList.add('hide');
                            setTimeout(() => updateMinimalPopupsGlobal(), 10);
                        }
                    }
                }, id);

                eventManager.on(marker, 'click', function() {
                    if (marker.minimalPopup) {
                        createOrUpdateMinimalTooltip(id, false);
                    }
                }, id);
                
                updateMinimalPopupsGlobal();
            }
        }
});



const activeIds = Array.from(markerPool.active.keys());
activeIds.forEach(id => {
    if (!activeVehicleIds.has(id)) {
        delete window.minimalTooltipStates[id];
        markerPool.release(id);
    }
});

        
let isMenuVisible = true;

// ==================== VIRTUAL SCROLLING ====================
class VirtualScroller {
    constructor(container, itemHeight = 80) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.visibleItems = [];
        this.allItems = [];
        this.scrollTop = 0;
        this.containerHeight = 0;
    }
    
    setItems(items) {
        this.allItems = items;
        this.updateVisibleItems();
    }
    
    updateVisibleItems() {
        this.containerHeight = this.container.clientHeight;
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.ceil((this.scrollTop + this.containerHeight) / this.itemHeight);
        
        this.visibleItems = this.allItems.slice(
            Math.max(0, startIndex - 2),
            Math.min(this.allItems.length, endIndex + 2)
        );
        
        return {
            items: this.visibleItems,
            offsetTop: Math.max(0, (startIndex - 2) * this.itemHeight)
        };
    }
    
    onScroll(scrollTop) {
        this.scrollTop = scrollTop;
        return this.updateVisibleItems();
    }
}

function createNearbyVehiclesControl() {
    if (window.nearbyVehiclesControlInstance) {
        return window.nearbyVehiclesControlInstance;
    }

    const NearbyVehiclesControl = L.Control.extend({
        options: {
            position: 'topleft'
        },

        initialize: function(map) {
            L.Control.prototype.initialize.call(this, { map: map });
            this._lastUpdateCenter = null;
        },

        onAdd: function(map) {
            if (this._container) {
                return this._container;
            }

            this._container = L.DomUtil.create('div', 'nearby-vehicles-control');
            this._container.style.cssText = `
                position: absolute;
                width: max-content;
                font-family: 'League Spartan', sans-serif;
                margin-left: 12px;
                background-color: rgba(0, 0, 0, 0.3);
                border-radius: 15px;
                box-shadow: 0 4px 20px 4px rgba(0, 0, 0, 0.2);
                z-index: 1000;
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                overflow: hidden;
                transition: all 0.5s cubic-bezier(0.25, 1.2, 0.5, 1);
                max-height: 60px;
                opacity: 0;
                display: none;
            `;

            const header = L.DomUtil.create('div', 'nearby-vehicles-header');
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                cursor: pointer;
            `;

            const title = L.DomUtil.create('h3', '');
            title.textContent = 'Véhicules à proximité';
            title.style.cssText = `
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: white;
                text-shadow: 0 1px 2px rgba(0,0,0,0.3);
            `;


            header.appendChild(title);
            this._container.appendChild(header);

            this._listContainer = L.DomUtil.create('div', 'nearby-vehicles-list');
            this._listContainer.style.cssText = `
                max-height: 350px;
                overflow-y: auto;
                padding: 10px 15px;
                opacity: 0;
                transform: translateY(-20px);
                transition: all 0.5s cubic-bezier(0.25, 1.5, 0.5, 1);
            `;
            this._container.appendChild(this._listContainer);

            this._isExpanded = false;
            this._isVisible = false;

            header.addEventListener('click', () => {
                this.toggleExpand();
            });


            map.on('moveend', () => this._updateVehiclesIfNeeded(map));

            return this._container;
        },

        _updateVehiclesIfNeeded: function(map) {
            const currentCenter = map.getCenter();
            const distanceMoved = this._lastUpdateCenter 
                ? currentCenter.distanceTo(this._lastUpdateCenter) 
                : Infinity;

            if (!this._lastUpdateCenter || distanceMoved > 500) {
                this._lastUpdateCenter = currentCenter;
                
                if (this._isExpanded) {
                    this.show();
                }
            }
        },

        show: function() {
            this._container.style.display = 'block';
            
            setTimeout(() => {
                this._container.style.opacity = '1';
            }, 10);

            const userLocation = map.getCenter();

            const closestVehicles = Object.values(markers)
                .filter(marker => marker.options && marker.options.icon)
                .map(marker => ({
                    marker: marker,
                    distance: userLocation.distanceTo(marker.getLatLng())
                }))
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 5);

            this._listContainer.innerHTML = '';

            closestVehicles.forEach((item) => {
                const marker = item.marker;
                const distance = (item.distance / 1000).toFixed(1);
                
                const vehicleId = marker.id;
                const line = marker.line;
                const backgroundColor = lineColors[line] || '#000000';
                const textColor = 'white';

                const vehicleItem = L.DomUtil.create('div', 'nearby-vehicle-item');
                vehicleItem.style.cssText = `
                    display: flex;
                    align-items: center;
                    margin-bottom: 10px;
                    background-color: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    padding: 10px;
                    cursor: pointer;
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                    position: relative;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                `;

                vehicleItem.innerHTML = `
                    <div style="flex-grow: 1; z-index: 1; position: relative;">
                        <strong>Ligne ${lineName[line] || 'Inconnue'}</strong>
                        <div style="font-size: 0.8em; opacity: 0.7;">
                            à ${distance} km
                        </div>
                    </div>
                    <div style="
                        background: transparent; 
                        color: white; 
                        padding: 5px 10px; 
                        border-radius: 5px; 
                        z-index: 1; 
                        position: relative;
                        border: 1px solid white;
                    ">
                        ${vehicleId}
                    </div>
                `;

                vehicleItem.addEventListener('click', () => {
                    map.setView(marker.getLatLng(), 15);
                    marker.openPopup();
                    this.collapse();
                });

                this._listContainer.appendChild(vehicleItem);
            });

            if (!this._isExpanded) {
                this.expand();
            }

            this._isVisible = true;
            return this;
        },

        hide: function() {
            this._container.style.opacity = '0';
            
            setTimeout(() => {
                this._container.style.display = 'none';
            }, 300);

            this._isVisible = false;
            this._isExpanded = false;
            return this;
        },

        expand: function() {
            const header = this._container.querySelector('.nearby-vehicles-header');
            const listContainer = this._listContainer;

            this._container.style.maxHeight = '500px';
            listContainer.style.opacity = '1';
            listContainer.style.transform = 'translateY(0)';
            

            this._isExpanded = true;
            return this;
        },

        collapse: function() {
            const header = this._container.querySelector('.nearby-vehicles-header');
            const listContainer = this._listContainer;

            this._container.style.maxHeight = '60px';
            listContainer.style.opacity = '0';
            listContainer.style.transform = 'translateY(-20px)';
            

            this._isExpanded = false;
            return this;
        },

        toggleExpand: function() {
            if (this._isExpanded) {
                this.collapse();
            } else {
                this.expand();
            }
            return this;
        }
    });

    const nearbyVehiclesControl = new NearbyVehiclesControl(map);
    map.addControl(nearbyVehiclesControl);

    window.nearbyVehiclesControlInstance = nearbyVehiclesControl;

    window.nearbyVehiclesControl = {
        show: () => nearbyVehiclesControl.show(),
        hide: () => nearbyVehiclesControl.hide(),
        expand: () => nearbyVehiclesControl.expand(),
        collapse: () => nearbyVehiclesControl.collapse(),
        toggleExpand: () => nearbyVehiclesControl.toggleExpand()
    };

    return nearbyVehiclesControl;
}

createNearbyVehiclesControl();

let menuScroller = null;
// ==================== FIN VIRTUAL SCROLLING ====================

const menubottom1 = document.getElementById('menubtm');


        function showMenu() {
            cacheBoutonsenHaut();
            soundsUX('MBF_SelectedVehicle_DoorOpen');
            window.isMenuShowed = true;
            const mapp = document.getElementById('map');
            mapp.style.opacity = '0.5';
            const menu = document.getElementById('menu');
            const menubotom = document.getElementById('menubottom');
            menu.classList.remove('hidden');
            if (localStorage.getItem('transparency') === 'true') {
                const map = document.getElementById('map');
                map.classList.add('hiddennotransition');
                map.classList.remove('appearnotransition');
                map.classList.remove('hidden');
                map.classList.remove('appear');
                menu.style.display = 'block'; 
                mapp.style.animationPlayState = 'running';
            } else {
                const map = document.getElementById('map');
                map.classList.add('hidden');
                map.classList.remove('appear');
                map.classList.remove('hiddennotransition');
                map.classList.remove('appearnotransition');

                menu.style.display = 'block'; 
                mapp.style.animationPlayState = 'running';
            }

            isMenuVisible = true; 
            menubottom1.classList.remove('slide-downb');
            menubottom1.classList.add('slide-upb');
 
            menubottom1.addEventListener('transitionend', () => {
            if (menubottom1.classList.contains('slide-up')) {
            menubottom1.style.display = 'none';
            }
            }, { once: true });
            MenuManager._handleScrollAnimations();

        }

        const menubutton = document.getElementById('menubutton');
        menubutton.onclick = showMenu; 

        const closeMap = document.getElementById('map');
        closeMap.onclick = () => {
            const menu = document.getElementById('menu');
            const map = document.getElementById('map');
            map.style.opacity = '1';
            menu.classList.add('hidden');
            if (localStorage.getItem('transparency') === 'true') {
                const map = document.getElementById('map');
                map.classList.remove('hiddennotransition');
                map.classList.add('appearnotransition');
                map.classList.remove('hidden');
                map.classList.remove('appear');
            } else {
                const map = document.getElementById('map');
                map.classList.remove('hidden');
                map.classList.add('appear');
                map.classList.remove('hiddennotransition');
                map.classList.remove('appearnotransition');
            }
            window.isMenuShowed = false;
            menu.addEventListener('animationend', function onAnimationEnd(event) {
                if (event.animationName === 'slideInBounceInv' && menu.classList.contains('hidden')) { 
                    menu.style.display = 'none';
                }
            });

            const menubottom1 = document.getElementById('menubtm');
            menubottom1.style.display = 'flex';

            setTimeout(() => {
                menubottom1.classList.remove('slide-upb');
                menubottom1.classList.add('slide-downb');
            }, 10);
                isMenuVisible = false; 
            };
            
        updateMenu();    
        updateActiveLines();  
    } catch (error) {
        return;
    }
}


function updateActiveLines() {
    const activeLinesSet = new Set();
    
    markerPool.active.forEach((marker) => {
        if (marker.line) {
            activeLinesSet.add(marker.line);
        }
    });
    
    geoJsonLines.forEach(layer => {
        const routeId = layer.feature.properties.route_id;
        
        const hasVehicles = activeLinesSet.has(routeId);
        const isFilteredIn = selectedLines.length === 0 || selectedLines.includes(routeId);
        
        if (hasVehicles && isFilteredIn) {
            if (!map.hasLayer(layer)) {
                map.addLayer(layer);
            }
        } else {
            if (map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
        }
    });
    
    //updateBusStopsForActiveLines(activeLinesSet);
}


const FluentSettingsMenu = (function() {
  let menuElement = null;
  let isOpen = false;
  let sections = {};
  let langSwitcher = null;
  
  const DEFAULT_CONFIG = {
    title: "Paramètres",
    accentColor: "#0078d7",
    width: "400px",
    height: "500px",
    zIndex: 10000,
    showCloseButton: true,
    animation: true
  };
  
  let options = { ...DEFAULT_CONFIG };
  

  function createStyles() {
    if (document.getElementById('fluent-settings-styles')) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'fluent-settings-styles';
    styleElement.textContent = `
      @keyframes fluentFadeIn {
        from { transform: translate(-50%, -50%) scale(0); }
        to { transform: translate(-50%, -50%) scale(1); }
      }
      
      @keyframes fluentBackdropFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .fluent-settings-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
        z-index: ${options.zIndex - 1};
        display: none;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
        .fluent-settings-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: ${options.width};
        height: ${options.height};
        background-color: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        display: none;
        flex-direction: column;
        font-family: 'League Spartan', sans-serif;
        z-index: ${options.zIndex};
        overflow: hidden;
        opacity: 0;
        position: absolute;
        }

      
      .fluent-settings-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      }
      
      .fluent-settings-title {
        font-size: 18px;
        font-weight: 600;
        color: #333;
        margin: 0;
      }
      
      .fluent-settings-close {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: transparent;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        color: #666;
        transition: background-color 0.2s;
      }
      
      .fluent-settings-close:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }
      
      .fluent-settings-content {
        flex: 1;
        overflow-y: auto;
        padding: 0;
      }
      
      .fluent-settings-section {
        padding: 0;
        margin: 0;
      }
      
      .fluent-settings-section-title {
        font-size: 14px;
        font-weight: 600;
        color: ${options.accentColor};
        padding: 12px 20px 8px;
        margin: 0;
      }
      
      .fluent-settings-item {
        display: flex;
        align-items: center;
        padding: 12px 20px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .fluent-settings-item:hover {
        background-color: rgba(0, 0, 0, 0.03);
      }
      
      .fluent-settings-item-icon {
        width: 18px;
        height: 18px;
        margin-right: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        color: #666;
      }
      
      .fluent-settings-item-content {
        flex: 1;
      }
      
      .fluent-settings-item-label {
        font-size: 14px;
        color: #333;
        margin-bottom: 3px;
      }
      
      .fluent-settings-item-description {
        font-size: 12px;
        color: #666;
      }
      
      .fluent-settings-item-control {
        margin-left: 10px;
      }
      
      .fluent-settings-submenu-indicator {
        margin-left: 8px;
        color: #666;
        font-size: 10px;
      }
      
      .fluent-settings-back {
        display: flex;
        align-items: center;
        padding: 12px 20px;
        cursor: pointer;
        background-color: rgba(0, 0, 0, 0.02);
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      }
      
      .fluent-settings-back:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }
      
      .fluent-settings-back-icon {
        margin-right: 10px;
        font-size: 12px;
      }
      
      .fluent-settings-back-text {
        font-size: 14px;
        color: #555;
      }
      
    .fluent-settings-submenu {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        transition: transform 0.3s ease;
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        overflow-y: auto;
    }
      
      .fluent-switch {
        position: relative;
        display: inline-block;
        width: 40px;
        height: 20px;
      }
      
      .fluent-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      
      .fluent-switch-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: .4s;
        border-radius: 20px;
      }
      
      .fluent-switch-slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
      }
      
      input:checked + .fluent-switch-slider {
        background-color: ${options.accentColor};
      }
      
      input:checked + .fluent-switch-slider:before {
        transform: translateX(20px);
      }
      
      .fluent-select {
        padding: 5px 10px;
        border-radius: 4px;
        border: 1px solid #ddd;
        background-color: rgba(255, 255, 255, 0.8);
        font-family: 'League Spartan', sans-serif;
        font-size: 14px;
        color: #333;
      }
      
      .fluent-select:focus {
        outline: none;
        border-color: ${options.accentColor};
      }
    `;
    
    document.head.appendChild(styleElement);
  }
  

  function createMenuElement() {
    const backdrop = document.createElement('div');
    backdrop.className = 'fluent-settings-backdrop';
    
    const container = document.createElement('div');
    container.className = 'fluent-settings-container';
    
    const header = document.createElement('div');
    header.className = 'fluent-settings-header';

    // mhhhh les bonnes pizzas à l'ananas
    const pizza = document.getElementById('menuicon');
    const ananas = document.getElementById('myscheduleicon');
    const bousse = document.getElementById('vehicleicon');
    const mamamia = document.getElementById('actuicon');

    let naderbousse = 0;
    header.addEventListener('click', () => {
    naderbousse++;

    if (naderbousse === 5) {
        pizza.src = 'https://mybusfinder.fr/mamamialapizza.png'; 
        ananas.src = 'https://mybusfinder.fr/mamamialapizza.png'; 
        bousse.src = 'https://mybusfinder.fr/mamamialapizza.png';         
        mamamia.src = 'https://mybusfinder.fr/mamamialapizza.png'; 
    }
    });
    
    const title = document.createElement('h2');
    title.className = 'fluent-settings-title';
    title.textContent = options.title;
    
    header.appendChild(title);
    
    if (options.showCloseButton) {
      const closeButton = document.createElement('button');
      closeButton.className = 'fluent-settings-close';
      closeButton.innerHTML = '✕';
      closeButton.addEventListener('click', close);
      header.appendChild(closeButton);
    }
    
    container.appendChild(header);
    
    const content = document.createElement('div');
    content.className = 'fluent-settings-content';
    container.appendChild(content);
    
    document.body.appendChild(backdrop);
    document.body.appendChild(container);
    
    backdrop.addEventListener('click', close);
    
    menuElement = {
      backdrop,
      container,
      content
    };
  }
  

  function open() {
    if (!menuElement) {
      createStyles();
      createMenuElement();
      renderSections();
    }
    
    menuElement.backdrop.style.display = 'block';
    menuElement.container.style.display = 'flex';
    
    menuElement.container.offsetHeight;
    
    menuElement.backdrop.style.opacity = '1';
    menuElement.container.style.opacity = '1';
    
    if (options.animation) {
      menuElement.container.style.animation = 'fluentFadeIn 0.5s cubic-bezier(.99,0,.53,1.28)';
      menuElement.backdrop.style.animation = 'fluentBackdropFadeIn 0.3s forwards';
    }
    
    isOpen = true;
  }
  

  function close(e) {
    if (!menuElement || !isOpen) return;
    
    menuElement.backdrop.style.opacity = '0';
    menuElement.container.style.opacity = '0';
    
    setTimeout(() => {
      menuElement.backdrop.style.display = 'none';
      menuElement.container.style.display = 'none';
      
      const submenus = menuElement.container.querySelectorAll('.fluent-settings-submenu');
      submenus.forEach(submenu => {
        submenu.style.transform = 'translateX(100%)';
      });
    }, 300);
    
    isOpen = false;
    e.stopPropagation();

  }
  

  function createSection(id, title) {
    if (sections[id]) {
      console.warn(`Une section avec l'ID "${id}" existe déjà.`);
      return sections[id];
    }
    
    sections[id] = {
      id,
      title,
      items: []
    };
    
    return sections[id];
  }
  

  function addToggle(sectionId, id, options) {
    const section = sections[sectionId];
    if (!section) {
      console.error(`Section "${sectionId}" non trouvée`);
      return;
    }
    
    section.items.push({
      type: 'toggle',
      id,
      icon: options.icon || '⚙️',
      label: options.label || 'Option',
      description: options.description || '',
      value: options.value || false,
      onChange: options.onChange || function() {}
    });
    
    return this;
  }
  

  function addSelect(sectionId, id, options) {
    const section = sections[sectionId];
    if (!section) {
      console.error(`Section "${sectionId}" non trouvée`);
      return;
    }
    
    section.items.push({
      type: 'select',
      id,
      icon: options.icon || '⚙️',
      label: options.label || 'Option',
      description: options.description || '',
      value: options.value || '',
      options: options.options || [],
      onChange: options.onChange || function() {}
    });
    
    return this;
  }
  
function addSubmenu(sectionId, id, options) {
  const section = sections[sectionId];
  if (!section) {
    console.error(`Section "${sectionId}" non trouvée`);
    return;
  }
  
  const submenuId = `submenu-${id}`;
  
  if (!sections[submenuId]) {
    createSection(submenuId, options.title || 'Sous-menu');
  }
  
  section.items.push({
    type: 'submenu',
    id,
    submenuId,
    icon: options.icon || '⚙️',
    label: options.label || 'Sous-menu',
    description: options.description || '',
    onclick: options.onclick || null 
  });
  
  return this;
}
  

  function addLanguageSwitcher(sectionId, options = {}) {
    const section = sections[sectionId];
    if (!section) {
      console.error(`Section "${sectionId}" non trouvée`);
      return;
    }
    
    const languages = options.languages || [
      { code: 'fr', name: 'Français 🇫🇷' },
      { code: 'en', name: 'English 🇬🇧' }
    ];
    
    section.items.push({
      type: 'language',
      id: 'language-switcher',
      icon: options.icon || '🌐',
      label: options.label || 'Langue',
      description: options.description || 'Changer la langue de l\'interface',
      languages,
      currentLang: options.currentLang || (window.i18n ? window.i18n.currentLang : languages[0].code),
      onChange: options.onChange || function(lang) {
        if (window.i18n) {
          const newLang = lang;
          
          if (newLang !== window.i18n.currentLang) {
            if (langSwitcher && langSwitcher.updateCurrentLanguage) {
              langSwitcher.updateCurrentLanguage(newLang);
            }
            
            const transitionOverlay = document.createElement('div');
            transitionOverlay.style.position = 'fixed';
            transitionOverlay.style.top = '0';
            transitionOverlay.style.left = '0';
            transitionOverlay.style.width = '100%';
            transitionOverlay.style.height = '100%';
            transitionOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
            transitionOverlay.style.zIndex = '9999';
            transitionOverlay.style.opacity = '0';
            transitionOverlay.style.transition = 'opacity 0.4s ease';
            document.body.appendChild(transitionOverlay);
            
            setTimeout(() => {
              transitionOverlay.style.opacity = '1';
              
              const urlParams = new URLSearchParams(window.location.search);
              urlParams.set('lang', newLang);
              
              localStorage.setItem('preferredLanguage', newLang);
              
              setTimeout(() => {
                window.location.search = urlParams.toString();
              }, 300);
            }, 50);
          }
        }
      }
    });
    
    if (window.createLanguageSwitcher) {
      langSwitcher = window.createLanguageSwitcher();
    } else if (window.langSwitcher) {
      langSwitcher = window.langSwitcher;
    }
    
    return this;
  }
  

  function renderSections() {
    if (!menuElement) return;
    
    menuElement.content.innerHTML = '';
    
    Object.values(sections).forEach(section => {
      if (section.id.startsWith('submenu-')) return; 
      
      renderSection(section);
    });
  }
  

  function renderSection(section) {
    const sectionElement = document.createElement('div');
    sectionElement.className = 'fluent-settings-section';
    sectionElement.dataset.sectionId = section.id;
    
    const titleElement = document.createElement('h3');
    titleElement.className = 'fluent-settings-section-title';
    titleElement.textContent = section.title;
    sectionElement.appendChild(titleElement);
    
    section.items.forEach(item => {
      const itemElement = renderItem(item, section.id);
      sectionElement.appendChild(itemElement);
    });
    
    menuElement.content.appendChild(sectionElement);
    
    section.items.forEach(item => {
      if (item.type === 'submenu') {
        renderSubmenu(item.submenuId, section.id, item.label);
      }
    });
  }
  

  function renderItem(item, sectionId) {
    const itemElement = document.createElement('div');
    itemElement.className = 'fluent-settings-item';
    itemElement.dataset.itemId = item.id;
    
    const iconElement = document.createElement('div');
    iconElement.className = 'fluent-settings-item-icon';
    iconElement.textContent = item.icon;
    itemElement.appendChild(iconElement);
    
    const contentElement = document.createElement('div');
    contentElement.className = 'fluent-settings-item-content';
    
    const labelElement = document.createElement('div');
    labelElement.className = 'fluent-settings-item-label';
    labelElement.textContent = item.label;
    contentElement.appendChild(labelElement);
    
    if (item.description) {
      const descElement = document.createElement('div');
      descElement.className = 'fluent-settings-item-description';
      descElement.textContent = item.description;
      contentElement.appendChild(descElement);
    }
    
    itemElement.appendChild(contentElement);
    
    const controlElement = document.createElement('div');
    controlElement.className = 'fluent-settings-item-control';
    
    switch (item.type) {
      case 'toggle':
        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'fluent-switch';
        
        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.checked = item.value;
        toggleInput.addEventListener('change', (e) => {
          item.value = e.target.checked;
          if (item.onChange) item.onChange(item.value);
          safeVibrate([30, 40, 30], true);
        });
        
        const toggleSlider = document.createElement('span');
        toggleSlider.className = 'fluent-switch-slider';
        
        toggleLabel.appendChild(toggleInput);
        toggleLabel.appendChild(toggleSlider);
        controlElement.appendChild(toggleLabel);
        break;
        
      case 'select':
        const select = document.createElement('select');
        select.className = 'fluent-select';
        
        item.options.forEach(option => {
          const optionElement = document.createElement('option');
          optionElement.value = option.value;
          optionElement.textContent = option.label;
          if (option.value === item.value) {
            optionElement.selected = true;
          }
          select.appendChild(optionElement);
        });
        
        select.addEventListener('change', (e) => {
          item.value = e.target.value;
          if (item.onChange) item.onChange(item.value);
        });
        
        controlElement.appendChild(select);
        break;
        
        case 'submenu':
        const indicator = document.createElement('span');
        indicator.className = 'fluent-settings-submenu-indicator';
        indicator.textContent = '❯';
        controlElement.appendChild(indicator);
        
        itemElement.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            if (item.onclick && typeof item.onclick === 'function') {
            item.onclick(event);
            safeVibrate([50], true);
            return;
            }
            
            const submenu = menuElement.container.querySelector(`.fluent-settings-submenu[data-submenu-id="${item.submenuId}"]`);
            if (submenu) {
            submenu.style.transform = 'translateX(0)';
            }
        });
        break;
        
      case 'language':
        const langSelect = document.createElement('select');
        langSelect.className = 'fluent-select';
        
        item.languages.forEach(lang => {
          const optionElement = document.createElement('option');
          optionElement.value = lang.code;
          optionElement.textContent = lang.name;
          if (lang.code === item.currentLang) {
            optionElement.selected = true;
          }
          langSelect.appendChild(optionElement);
        });
        
        langSelect.addEventListener('change', (e) => {
          item.currentLang = e.target.value;
          safeVibrate([50, 30, 50], true);
          if (item.onChange) item.onChange(item.currentLang);
        });
        
        controlElement.appendChild(langSelect);
        break;
    }
    
    itemElement.appendChild(controlElement);
    
    return itemElement;
  }
  
  function renderSubmenu(submenuId, parentSectionId, title) {
    const submenuSection = sections[submenuId];
    if (!submenuSection) return;
    
    const submenuElement = document.createElement('div');
    submenuElement.className = 'fluent-settings-submenu';
    submenuElement.dataset.submenuId = submenuId;
    submenuElement.style.transform = 'translateX(100%)';
    
    const backButton = document.createElement('div');
    backButton.className = 'fluent-settings-back';
    
    const backIcon = document.createElement('span');
    backIcon.className = 'fluent-settings-back-icon';
    backIcon.textContent = '❮';
    backButton.appendChild(backIcon);
    
    const backText = document.createElement('span');
    backText.className = 'fluent-settings-back-text';
    backText.textContent = `${t("backto")} ${sections[parentSectionId].title}`;
    backButton.appendChild(backText);
    
    backButton.addEventListener('click', () => {
      submenuElement.style.transform = 'translateX(100%)';
    });
    
    submenuElement.appendChild(backButton);
    
    const headerElement = document.createElement('h3');
    headerElement.className = 'fluent-settings-section-title';
    headerElement.textContent = title || submenuSection.title;
    submenuElement.appendChild(headerElement);
    
    submenuSection.items.forEach(item => {
      const itemElement = renderItem(item, submenuId);
      submenuElement.appendChild(itemElement);
    });
    
    menuElement.container.appendChild(submenuElement);
    
    submenuSection.items.forEach(item => {
      if (item.type === 'submenu') {
        renderSubmenu(item.submenuId, submenuId, item.label);
      }
    });
  }

  function init(customOptions = {}) {
    options = { ...DEFAULT_CONFIG, ...customOptions };
    
    if (menuElement) {
      menuElement.backdrop.remove();
      menuElement.container.remove();
      menuElement = null;
      
      const oldStyles = document.getElementById('fluent-settings-styles');
      if (oldStyles) oldStyles.remove();
      
      createStyles();
    }
    
    return this;
  }
  
  return {
    init,
    open,
    close,
    createSection,
    addToggle,
    addSelect,
    addSubmenu,
    addLanguageSwitcher
  };
})();

setTimeout(() => {
    if (localStorage.getItem('locateonstart') === 'true') {
        locateUser();
    } 
}, 2000);


const receivedSettings = {};

window.addEventListener('message', function(event) {

    if (event.data.type === 'schedule') {
        showUpdatePopup('schedule.html')
        safeVibrate([30], true);
    }

    if (event.data.type === 'news') {
        showUpdatePopup('alerts.html');
        safeVibrate([30], true);
    }

    if (event.data.type === 'settings') {
        FluentSettingsMenu.open();
        safeVibrate([30], true);
    }

    if (event.data.type === 'mbh') {
        showUpdatePopup('histovec.html');
        safeVibrate([30], true);
    }

    if (event.data.type === 'boutique') {
        const boutiqueLink = globalSettings.boutique;
        if (!boutiqueAvailable) {
            showFluentPopup({
                title: t('noboutique'),
                message: t('noboutiqueinfo'),
                buttons: {
                    primary: t('understood'),
                    primaryAction: () => {
                        fluentPopupManager.close();
                    }

                }
            });
        } else {
            showUpdatePopup(boutiqueLink); 
        }
        safeVibrate([30], true);
    }

    if (event.data.type === 'openmap') {
    let timespressed = parseInt(localStorage.getItem('threetimespress'), 10);
    if (Number.isNaN(timespressed)) timespressed = 0;

    timespressed++;
    localStorage.setItem('threetimespress', String(timespressed));

    const accueil = document.getElementById('accueil');

    if (timespressed !== 3) {
        safeVibrate([30], true);
        accueil.classList.add('hide');
        accueil.classList.remove("affiche")
        const menubottom1 = document.getElementById('menubtm');
        menubottom1.style.display = 'flex';
        window.isMenuShowed = false;
    
        setTimeout(() => {
            menubottom1.classList.remove('slide-upb');
            menubottom1.classList.add('slide-downb');
            setTimeout(() => {
                accueil.style.display = 'none';
            }, 500);
        }, 10);

    } else {

        showFluentPopup({
        title: t('threetimestitle'),
        message: t('threetimesinfo'),
        buttons: {
            primary: t('yes'),
            primaryAction: () => {
            localStorage.setItem('nepasafficheraccueil', 'true');
            safeVibrate([30], true);
            accueil.classList.add('hide');
            accueil.classList.remove('affiche');
            const menubottom1 = document.getElementById('menubtm');
            menubottom1.style.display = 'flex';
            window.isMenuShowed = false;

            setTimeout(() => {
                menubottom1.classList.remove('slide-upb');
                menubottom1.classList.add('slide-downb');
                setTimeout(() => (accueil.style.display = 'none'), 500);
            }, 10);

            fluentPopupManager.close();
            },
            secondary: t('no'),
            secondaryAction: () => {
                timespressed++;
                localStorage.setItem('threetimespress', timespressed.toString());
                fluentPopupManager.close();
            }

        }
    });
}
}

    if (event.data.type === 'settingUpdate') {
        const { setting, value } = event.data;
        receivedSettings[setting] = value;        
        handleSettingUpdate(setting, value);
        
    } else if (event.data.type === 'settingsComplete') {
        console.log('OOBE terminée !!');
        console.log('Params', receivedSettings);
        localStorage.setItem('OutOfBoxExperienceTerminee', 'true');
        applyAllSettings(receivedSettings);
    }




    function handleSettingUpdate(setting, value) {
    switch(setting) {
        case 'language':
            console.log('Redémarrage app pr changement langue...', value);
            window.location.reload();
            break;
        case 'theme':
            console.log('Thème sélectionné:', value);
            changeColorBkg(value);
            break;
            
        case 'mapview':
            localStorage.setItem('isStandardView', value);
            break;
            
        case 'transparency':
            localStorage.setItem('transparency', value);
            break;
            
        case 'locateonstart':
            localStorage.setItem('locateonstart', value);
            break;
            
        case 'spottingmode':
            toggleSunOrientation(value);
            break;
            
        case 'darkmap':
            localStorage.setItem('darkmap', value);
            window.location.reload();
            break;
            
        default:
            console.log('Parametre inconnu :(', setting, value);
    }
}
});

function afficherMenu() {
    const accueil = document.getElementById('accueil');
    accueil.classList.remove('hide');
    accueil.classList.add("affiche")
    accueil.style.display = 'block';
    window.isMenuShowed = true;
    soundsUX('MBF_Popup');

    const menubottom1 = document.getElementById('menubtm');

    setTimeout(() => {
        menubottom1.classList.add('slide-upb');
        menubottom1.classList.remove('slide-downb');
        setTimeout(() => {
            menubottom1.style.display = 'none';
            accueil.style.display = 'block';
        }, 500);
    }, 10);

    
}

async function modeSombre() {
    const mapPane = await map.getPanes().tilePane;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        mapPane.style.filter = 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)';
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        if (event.matches) {
            mapPane.style.filter = 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)';
        } else {
            mapPane.style.filter = 'none';
        }
    });
}






// ==================== FETCH ADAPTATIF ====================
let lastTripUpdateTimestamp = 0;
let worker;
let fetchInProgress = false;

const FetchManager = {
    baseInterval: 4000,
    currentInterval: 4000,
    minInterval: 4000,
    maxInterval: 30000,
    consecutiveErrors: 0,
    consecutiveSuccess: 0,
    
    onSuccess() {
        this.consecutiveErrors = 0;
        this.consecutiveSuccess++;
        
        if (this.consecutiveSuccess > 3) {
            this.currentInterval = Math.max(
                this.minInterval, 
                this.currentInterval - 500
            );
        }
    },
    
    onError() {
        this.consecutiveSuccess = 0;
        this.consecutiveErrors++;
        
        this.currentInterval = Math.min(
            this.maxInterval,
            this.currentInterval * 1.5
        );
        
        console.warn(`Fetch error, new interval: ${this.currentInterval}ms`);
    },
    
    getInterval() {
        return this.currentInterval;
    },
    
    reset() {
        this.currentInterval = this.baseInterval;
        this.consecutiveErrors = 0;
        this.consecutiveSuccess = 0;
    }
};
// ==================== FIN FETCH ADAPTATIF ====================

class LRUCache {
    constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    
    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, value);
    }
    
    get(key) {
        if (!this.cache.has(key)) {
            return undefined;
        }
        
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }
    
    clear() {
        this.cache.clear();
    }
}

const contentCache = new LRUCache(50);
const colorCache = new LRUCache(100);
const textColorCache = new LRUCache(100);

let workerInstance = null;
let workerRestartAttempts = 0;
const MAX_WORKER_RESTARTS = 3;

function initWorker() {
    if (workerRestartAttempts >= MAX_WORKER_RESTARTS) {
        console.warn('Trop de redémarrages worker, mode fallback');
        return;
    }
    
    try {
        if (workerInstance) {
            workerInstance.terminate();
            workerInstance = null;
        }
        
        workerInstance = new Worker('worker.js');
        workerRestartAttempts = 0; 
        
        workerInstance.onerror = (error) => {
            console.error('Erreur worker', error);
            workerRestartAttempts++;
            
            if (workerRestartAttempts < MAX_WORKER_RESTARTS) {
                setTimeout(() => {
                    if (workerInstance) {
                        workerInstance.terminate();
                        workerInstance = null;
                    }
                    initWorker();
                }, 2000);
            } else {
                console.warn('Worker désactivé après échecs répétés');
                if (workerInstance) {
                    workerInstance.terminate();
                    workerInstance = null;
                }
            }
        };
        
        worker = workerInstance;
        
    } catch (error) {
        console.error('Worker non supporté', error);
        worker = null;
        workerInstance = null;
    }
}

async function fetchTripUpdates() {
    if (fetchInProgress) return Promise.resolve(null);
    
    fetchInProgress = true;
    const fetchStartTime = performance.now();
    
    try {
        let timeoutId;
        const controller = typeof AbortController !== 'undefined' 
            ? new AbortController() 
            : null;
        
        const fetchOptions = {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache', // Safari a besoin de ça
                'Pragma': 'no-cache'
            }
        };
        
        if (controller) {
            fetchOptions.signal = controller.signal;
            timeoutId = setTimeout(() => controller.abort(), 8000); // 8s pour Safari
        }
        
        const response = await fetch('proxy-cors/proxy_tripupdate.php', fetchOptions);
        
        if (timeoutId) clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const buffer = await response.arrayBuffer();
        const data = await decodeProtobuf(buffer);
        
        // Safari verifier si le worker existe
        if (!worker) {
            const processedData = processTripsSync(data);
            tripUpdates = processedData;
            fetchInProgress = false;
            return tripUpdates;
        }
        
        return new Promise((resolve, reject) => {
            const workerTimeoutId = setTimeout(() => {
                reject(new Error('Worker timeout'));
                fetchInProgress = false;
            }, 5000);
            
            worker.onmessage = (e) => {
                clearTimeout(workerTimeoutId);
                tripUpdates = e.data.tripUpdates;
                resolve(e.data.tripUpdates);
                fetchInProgress = false;
            };
            
            worker.onerror = (error) => {
                clearTimeout(workerTimeoutId);
                console.error('Worker error:', error);
                reject(error);
                fetchInProgress = false;
            };
            
            worker.postMessage(data);
        });
    } catch (error) {
        console.error('Erreur récupération trip updates:', error);
        fetchInProgress = false;
        throw error;
    }
}

function processTripsSync(data) {
    const updates = {};
    
    if (!data.entity) return updates;
    
    data.entity.forEach(entity => {
        if (entity.tripUpdate) {
            const tripId = entity.tripUpdate.trip.tripId;
            const stopUpdates = [];
            
            if (entity.tripUpdate.stopTimeUpdate) {
                entity.tripUpdate.stopTimeUpdate.forEach(stopUpdate => {
                    const stopId = stopUpdate.stopId || '';
                    const arrivalDelay = stopUpdate.arrival ? stopUpdate.arrival.delay : 0;
                    const departureDelay = stopUpdate.departure ? stopUpdate.departure.delay : 0;
                    
                    stopUpdates.push({
                        stopId: stopId,
                        arrivalDelay: arrivalDelay,
                        departureDelay: departureDelay
                    });
                });
            }
            
            updates[tripId] = {
                stopUpdates: stopUpdates
            };
        }
    });
    
    return updates;
}

let fetchTimerId = null;

function startFetchUpdates() {
    if (fetchTimerId) return;

    async function scheduleFetch() {
        try {
            await fetchTripUpdates().catch(err => {
                FetchManager.onError();
            });

            await fetchVehiclePositions().catch(err => {
                FetchManager.onError();
            });

            FetchManager.onSuccess();
        } catch (error) {
            console.warn('Erreur lors des mises à jour', error);
        } finally {
            fetchTimerId = setTimeout(scheduleFetch, FetchManager.getInterval());
        }
    }

    scheduleFetch();
}

let navWindow = null;
let navVehicleId = null;
let navIntervalId = null;

function openVehicleNavigation(vehicleId, marker) {
    const latlng  = marker.getLatLng();
    const line    = marker.line || '';
    const color   = (lineColors[line] || '#1DB954').replace('#', '');
    const label   = String(marker.vehicleData?.vehicle?.label || marker.vehicleData?.vehicle?.id || vehicleId);
    const lineLbl = lineName[line] || line;

    const params = new URLSearchParams({
        lat:          latlng.lat,
        lon:          latlng.lng,
        lineName:     lineLbl,
        vehicleLabel: label,
        lineColor:    encodeURIComponent('#' + color)
    });

    const navUrl = `../navigate.html?${params.toString()}`;

    if (typeof showUpdatePopupLocalBus === 'function') {
        showUpdatePopupLocalBus(navUrl);
        navVehicleId = vehicleId;
        _startNavPositionBroadcast(vehicleId);
        return;
    }

    navWindow = window.open(navUrl, 'mbf_nav',
        'width=400,height=750,location=no,menubar=no,toolbar=no');
    navVehicleId = vehicleId;
    _startNavPositionBroadcast(vehicleId);
}

function _startNavPositionBroadcast(vehicleId) {
    if (navIntervalId) clearInterval(navIntervalId);

    navIntervalId = setInterval(() => {
        const marker = markerPool.get(vehicleId);
        if (!marker) return;

        const latlng = marker.getLatLng();
        const payload = { type: 'vehicleNavUpdate', lat: latlng.lat, lon: latlng.lng };

        // iframe dans showUpdatePopup
        const iframe = document.getElementById('webview-frame');
        if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage(payload, '*');
        }
        // fenêtre standalone
        if (navWindow && !navWindow.closed) {
            navWindow.postMessage(payload, '*');
        }
        // si les deux sont fermes, arreter
        if ((!iframe || iframe.src === '') && (!navWindow || navWindow.closed)) {
            clearInterval(navIntervalId);
            navIntervalId = null;
        }
    }, 2000); 
}

window.addEventListener('message', e => {
    if (e.data?.type === 'closeNav') {
        if (navIntervalId) { clearInterval(navIntervalId); navIntervalId = null; }
        navVehicleId = null;
        if (typeof closeUpdatePopup === 'function') closeUpdatePopup();
        if (navWindow && !navWindow.closed) navWindow.close();
        navWindow = null;
    }
});


async function main() {
    try {
        initWorker();
        await initializeGTFS();
        gtfsInitialized = true;
        mapEventHandlers.attach(window.mapInstance);
        
        await fetchTripUpdates().catch(console.error);

        await Promise.all([
            fetchVehiclePositions(),
            loadGeoJsonLines(),
            modeSombre(),
            hideLoadingScreen()
        ]);

        loadGeoJsonLines();
        startFetchUpdates();

        setTimeout(() => {
            toastTopRight.info('Map data from OSM contributors, licensed under ODbL.', {
                duration: 7000,
                buttons: [
                    {
                    label: 'See more',
                    style: 'primary',
                    onClick: (close) => {
                        close();
                        showFluentPopup({
                        title: "OpenStreetMap data",
                        message: "OpenStreetMap (OSM) is a free, collaborative mapping project built by volunteers worldwide. It provides open geographic data : roads, paths, transit stops, used by My Bus Finder to display the map. The data is licensed under the Open Database License (ODbL), which allows free use as long as attribution is preserved.",
                        buttons: {
                            primary: "Understood",
                            primaryAction: () => { fluentPopupManager.close(); },
                            secondary: "Discover more",
                            secondaryAction: () => {
                            window.open('https://www.openstreetmap.org', '_blank');
                            fluentPopupManager.close();
                            }
                        }
                        });
                    }
                    },
                    {
                    label: 'OK',
                    style: 'ghost',
                    onClick: (close) => close()
                    }
                ]
            });
        }, 3000);
        
    } catch (error) {
        console.error("Erreur critique dans main():", error);
        toastBottomRight.error("Internal error : unable to initialize app.");
        soundsUX('MBF_NotificationError');
    }
}


// ==================== NETTOYAGE GLOBAL ====================
window.addEventListener('beforeunload', () => {
    MinimalPopupAnimationManager.cleanup();
    mapEventHandlers.cleanup();
    destroyTimeToggle();

    if (markerPool)     markerPool.clear();
    if (eventManager)   eventManager.clear();
    if (TooltipManager) TooltipManager.clear();
    if (StyleManager)   StyleManager.clearAll();
    if (AnimationManager) AnimationManager.cancelAll();

    if (workerInstance) {
        workerInstance.terminate();
        workerInstance = null;
    }

    if (fetchTimerId) {
        clearTimeout(fetchTimerId);
        fetchTimerId = null;
    }

    if (navIntervalId) {
        clearInterval(navIntervalId);
        navIntervalId = null;
    }

    contentCache.clear();
    colorCache.clear();
    textColorCache.clear();
    TextColorUtils.clearCache();

    if (window.mapInstance) {
        window.mapInstance.remove();
        window.mapInstance = null;
    }
});


setInterval(() => {
    if (TextColorUtils && TextColorUtils.cache.size > 50) {
        const keysToDelete = Array.from(TextColorUtils.cache.keys()).slice(0, 25);
        keysToDelete.forEach(key => TextColorUtils.cache.delete(key));
    }
    StyleCleanupManager.cleanup();
}, 60000);

if (performance && performance.memory) {
    setInterval(() => {
        const memory = performance.memory;
        if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8) {
            TextColorUtils.cache.clear();
            contentCache.clear();
            colorCache.clear();
            textColorCache.clear();
        }
    }, 60000);
}

// ==================== FIN NETTOYAGE GLOBAL ====================

main().catch(error => {
    console.error("Erreur critique lors de l'initialisation de l'application :", error);  
    toastBottomRight.error("Critical error: unable to start the application.");
    soundsUX('MBF_NotificationError');
});
