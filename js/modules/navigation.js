/**
 * Navigation Module - Enthält Funktionen zur Navigation und URL-Handling
 * Verantwortlich für Scrollverhalten, Anker-Handling und mobile Navigation
 */

export const NavigationModule = {
    /**
     * Initialisiert die Navigation
     */
    init() {
        try {
            this.setupLegalPagesNavigation();
            this.handleScrollToSection();
            this.setupSmoothScrolling();
            this.handleHashInUrl();
            this.setupMobileMenu();
        } catch (error) {
            console.error('Fehler bei der Initialisierung der Navigation:', error);
        }
    },
    
    /**
     * Richtet die Navigation für rechtliche Seiten ein
     */
    setupLegalPagesNavigation() {
        // Prüfe, ob wir uns auf einer der rechtlichen Seiten befinden
        const isLegalPage = window.location.pathname.includes('agb.html') || 
                            window.location.pathname.includes('datenschutz.html') || 
                            window.location.pathname.includes('impressum.html') || 
                            window.location.pathname.includes('widerrufsrecht.html');
        
        if (isLegalPage) {
            // Finde alle Links in der Navigation
            const navLinks = document.querySelectorAll('.main-nav ul li a');
            
            // Füge Event-Listener zu den Links hinzu
            navLinks.forEach(link => {
                const href = link.getAttribute('href');
                
                // Wenn der Link zur Hauptseite mit einem Anker führt
                if (href && href.startsWith('index.html#')) {
                    link.addEventListener('click', function(e) {
                        // Speichere den Ziel-ID für die spätere Verwendung
                        const targetId = href.split('#')[1];
                        
                        // Setze ein Flag im sessionStorage
                        sessionStorage.setItem('scrollToSection', targetId);
                    });
                }
            });
        }
    },
    
    /**
     * Behandelt Scrolling zu bestimmten Abschnitten nach Seitenwechsel
     */
    handleScrollToSection() {
        // Wenn ein scrollToSection-Flag im sessionStorage vorhanden ist
        const scrollToSection = sessionStorage.getItem('scrollToSection');
        
        if (scrollToSection) {
            // Entferne das Flag aus dem sessionStorage
            sessionStorage.removeItem('scrollToSection');
            
            // Finde das Zielelement
            const targetElement = document.getElementById(scrollToSection);
            
            if (targetElement) {
                // Warte einen Moment, bis die Seite geladen ist
                setTimeout(() => {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        }
    },
    
    /**
     * Richtet das Mobile-Menü ein
     */
    setupMobileMenu() {
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                // Verwende die globale toggleMobileMenu-Funktion, wenn verfügbar
                if (window.toggleMobileMenu) {
                    window.toggleMobileMenu();
                } else {
                    const mainNav = document.querySelector('.main-nav');
                    if (mainNav) {
                        mainNav.classList.toggle('active');
                        mobileMenuBtn.classList.toggle('active');
                    }
                }
            });
            
            // Bei Klick auf einen Menüpunkt in der mobilen Ansicht das Menü schließen
            const menuLinks = document.querySelectorAll('.main-nav a');
            menuLinks.forEach(link => {
                link.addEventListener('click', () => {
                    const mainNav = document.querySelector('.main-nav');
                    if (mainNav && mainNav.classList.contains('active')) {
                        mainNav.classList.remove('active');
                        mobileMenuBtn.classList.remove('active');
                    }
                });
            });
        }
    },
    
    /**
     * Scrollt zu einem Element mit bestimmter ID
     * @param {string} elementId - Die ID des Elements
     */
    scrollToElement: function(elementId) {
        const targetElement = document.getElementById(elementId);
        
        if (targetElement) {
            // Berechne die Position des Zielelements und füge einen Offset hinzu
            const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
            const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
            
            // Standard-Offset
            let offsetValue = 20;
            
            // Spezifische Offsets für bestimmte Abschnitte
            if (elementId === 'create-section') {
                offsetValue = 10; // Kleinerer Offset für den Erstellungsbereich
            } else if (elementId === 'inspiration' || elementId === 'hints') {
                offsetValue = 30; // Größerer Offset für Inspiration und FAQ
            } else if (elementId === 'contact') {
                offsetValue = 25; // Mittlerer Offset für Kontakt
            }
            
            // Scrolle zur berechneten Position
            const offsetPosition = targetPosition - headerHeight - offsetValue;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            
            // Aktiviere den entsprechenden Navigationslink
            this.highlightActiveNavLink(elementId);
        }
    },
    
    /**
     * Richtet Smooth Scrolling für Anker-Links ein
     */
    setupSmoothScrolling: function() {
        // Für alle Anker-Links auf der aktuellen Seite
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        
        anchorLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Verhindere Standard-Navigation
                e.preventDefault();
                
                // Hole das Ziel aus dem href-Attribut
                const targetId = link.getAttribute('href').slice(1);
                
                // Wenn das Ziel existiert und nicht leer ist
                if (targetId && targetId !== '') {
                    this.scrollToElement(targetId);
                    
                    // Wenn Mobile-Menü geöffnet ist, schließen
                    const mainNav = document.querySelector('.main-nav');
                    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
                    
                    if (mainNav && mainNav.classList.contains('active')) {
                        mainNav.classList.remove('active');
                        if (mobileMenuBtn) {
                            mobileMenuBtn.classList.remove('active');
                        }
                    }
                }
            });
        });
    },
    
    /**
     * Behandelt Hash in URL beim Seitenstart
     */
    handleHashInUrl: function() {
        // Prüfe, ob ein Hash in der URL vorhanden ist
        if (window.location.hash) {
            // Warte einen Moment, bis die Seite geladen ist
            setTimeout(() => {
                const targetId = window.location.hash.substring(1);
                this.scrollToElement(targetId);
            }, 300);
        }
    },
    
    /**
     * Hebt den aktiven Navigationslink basierend auf der Abschnitts-ID hervor
     * @param {string} sectionId - Die ID des aktiven Abschnitts
     */
    highlightActiveNavLink: function(sectionId) {
        // Finde alle Navigationslinks
        const navLinks = document.querySelectorAll('.main-nav ul li a');
        
        // Entferne zuerst alle aktiven Klassen
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Finde den Link, der auf diesen Abschnitt zeigt
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            
            if (href && (href === '#' + sectionId || href.endsWith('#' + sectionId))) {
                link.classList.add('active');
            }
        });
    }
};

// Stelle das Modul global zur Verfügung für bestehenden Code
window.NavigationModule = NavigationModule; 