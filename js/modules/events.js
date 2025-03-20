/**
 * Events Module - Enthält alle Event-Listener und deren Handler
 */

export const EventsModule = {
    /**
     * Initialisiert alle Event-Listener
     */
    init: function() {
        this.setupCartEvents();
        this.setupModalEvents();
        this.setupFAQAccordion();
        this.setupFormEvents();
        this.setupNavigation();
    },
    
    /**
     * Richtet Warenkorb-Events ein
     */
    setupCartEvents: function() {
        // Warenkorb-Icon und Schließen-Button
        const cartIcon = document.getElementById('cart-icon');
        const closeSidebarButton = document.querySelector('.close-sidebar');
        const cartSidebar = document.getElementById('cart-sidebar');
        const cartSidebarBackdrop = document.getElementById('cart-sidebar-backdrop');
        
        if (cartIcon && cartSidebar && cartSidebarBackdrop) {
            // Warenkorb öffnen
            cartIcon.addEventListener('click', function(e) {
                e.preventDefault();
                cartSidebar.classList.add('active');
                cartSidebarBackdrop.classList.add('active');
                document.body.classList.add('no-scroll');
            });
            
            // Warenkorb schließen mit Button
            if (closeSidebarButton) {
                closeSidebarButton.addEventListener('click', function() {
                    cartSidebar.classList.remove('active');
                    cartSidebarBackdrop.classList.remove('active');
                    document.body.classList.remove('no-scroll');
                });
            }
            
            // Warenkorb schließen mit Backdrop-Klick
            cartSidebarBackdrop.addEventListener('click', function() {
                cartSidebar.classList.remove('active');
                cartSidebarBackdrop.classList.remove('active');
                document.body.classList.remove('no-scroll');
            });
        }
        
        // Warenkorbaktualisierung
        window.addEventListener('cartUpdated', function() {
            if (window.UIModule) {
                window.UIModule.renderCartItems();
                window.UIModule.updateCartCount();
            }
        });
    },
    
    /**
     * Richtet Modal-Events ein
     */
    setupModalEvents: function() {
        // Alle Schließen-Buttons für Modals
        const closeModalButtons = document.querySelectorAll('.close-modal');
        const modalBackdrop = document.getElementById('modal-backdrop');
        
        if (closeModalButtons && modalBackdrop) {
            // Jeder Schließen-Button schließt sein Modal
            closeModalButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const modal = this.closest('.modal');
                    if (modal) {
                        modal.classList.remove('active');
                        modalBackdrop.classList.remove('active');
                        document.body.classList.remove('no-scroll');
                    }
                });
            });
            
            // Klick auf Hintergrund schließt Modal
            modalBackdrop.addEventListener('click', function() {
                const activeModals = document.querySelectorAll('.modal.active');
                activeModals.forEach(modal => {
                    modal.classList.remove('active');
                });
                modalBackdrop.classList.remove('active');
                document.body.classList.remove('no-scroll');
            });
        }
    },
    
    /**
     * Richtet FAQ-Akkordeon ein
     */
    setupFAQAccordion: function() {
        const faqItems = document.querySelectorAll('.faq-item');
        
        faqItems.forEach(item => {
            const header = item.querySelector('.faq-header');
            
            header.addEventListener('click', function() {
                // Alle anderen schließen
                faqItems.forEach(otherItem => {
                    if (otherItem !== item && otherItem.classList.contains('active')) {
                        otherItem.classList.remove('active');
                    }
                });
                
                // Aktuelles Element umschalten
                item.classList.toggle('active');
            });
        });
    },
    
    /**
     * Richtet Formular-Events ein
     */
    setupFormEvents: function() {
        const contactForm = document.getElementById('contact-form');
        
        if (contactForm) {
            contactForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Formulardaten sammeln
                const formData = new FormData(this);
                
                // Hier würde die Formulardatenverarbeitung kommen
                console.log('Formular abgeschickt', Object.fromEntries(formData));
                
                // Erfolgsmeldung anzeigen
                if (window.UIModule) {
                    window.UIModule.showAlert(
                        'Nachricht gesendet', 
                        'Vielen Dank für deine Nachricht. Wir werden uns in Kürze bei dir melden!'
                    );
                }
                
                // Formular zurücksetzen
                this.reset();
            });
        }
    },
    
    /**
     * Richtet Navigation ein
     */
    setupNavigation: function() {
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const mainNav = document.querySelector('.main-nav');
        
        if (mobileMenuBtn && mainNav) {
            mobileMenuBtn.addEventListener('click', function() {
                // Verwende die globale toggleMobileMenu-Funktion, wenn verfügbar
                if (window.toggleMobileMenu) {
                    window.toggleMobileMenu();
                } else {
                    mainNav.classList.toggle('active');
                    this.classList.toggle('active');
                }
            });
        }
        
        // Smooth Scroll für Anker-Links
        const navLinks = document.querySelectorAll('a[href^="#"]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                
                if (targetId === '#') return;
                
                e.preventDefault();
                
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    // Scroll zum Element
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    // Wenn Mobile-Menü geöffnet ist, schließen
                    if (mainNav && mainNav.classList.contains('active')) {
                        mainNav.classList.remove('active');
                        if (mobileMenuBtn) {
                            mobileMenuBtn.classList.remove('active');
                        }
                    }
                }
            });
        });
    }
};

// Stelle das Modul global zur Verfügung für bestehenden Code
window.EventsModule = EventsModule; 