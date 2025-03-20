/**
 * Cart Module - Enthält alle Funktionen zur Warenkorbverwaltung
 * Zentrale Verwaltung aller Warenkorboperationen mit localStorage-Persistierung
 */

import { ValidationModule } from './validation.js';
import { UIModule } from './ui.js';

// Öffentliche API des Moduls
export const CartModule = {
    cart: [],
    
    // Initialisierung
    init() {
        console.log('CartModule.init() wurde aufgerufen');
        try {
            this.loadCart();
            this.setupEventListeners();
            this.updateCartCount();
            console.log('CartModule vollständig initialisiert');
        } catch (error) {
            console.error('Fehler bei der Initialisierung des CartModule:', error);
        }
    },
    
    // Event-Listener einrichten
    setupEventListeners() {
        // Warenkorb-Icon Klick-Event
        const cartIcon = document.getElementById('cart-icon');
        if (cartIcon) {
            cartIcon.addEventListener('click', this.toggleCartSidebar.bind(this));
        } else {
            console.warn('Element #cart-icon nicht gefunden');
        }
        
        // Schließen-Button Event
        const closeButton = document.querySelector('.cart-sidebar .close-sidebar');
        if (closeButton) {
            closeButton.addEventListener('click', this.hideCartSidebar.bind(this));
        } else {
            console.warn('Element .cart-sidebar .close-sidebar nicht gefunden');
        }
        
        // Hintergrund-Klick Event
        const backdrop = document.getElementById('cart-sidebar-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', this.hideCartSidebar.bind(this));
        } else {
            console.warn('Element #cart-sidebar-backdrop nicht gefunden');
        }
        
        // Checkout-Button Event
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                this.hideCartSidebar();
                
                // Prüfen, ob der Warenkorb leer ist
                if (this.cart.length === 0) {
                    if (window.UIModule) {
                        window.UIModule.showCustomAlert('Hinweis', 'Dein Warenkorb ist leer. Bitte füge zuerst ein Produkt hinzu.');
                    } else {
                        alert('Dein Warenkorb ist leer. Bitte füge zuerst ein Produkt hinzu.');
                    }
                    return;
                }
                
                // Checkout-Modal anzeigen
                // Diese Funktion ist in checkout.js definiert
                if (window.CheckoutModule) {
                    window.CheckoutModule.showCheckoutModal(this.cart);
                } else {
                    console.error('CheckoutModule nicht gefunden. Wurde checkout.js geladen?');
                    if (window.UIModule) {
                        window.UIModule.showCustomAlert('Fehler', 'Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.');
                    } else {
                        alert('Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.');
                    }
                }
            });
        } else {
            console.warn('Element #checkout-btn nicht gefunden');
        }
    },
    
    // Warenkorb-Sidebar anzeigen/ausblenden
    toggleCartSidebar() {
        const sidebar = document.getElementById('cart-sidebar');
        const backdrop = document.getElementById('cart-sidebar-backdrop');
        
        sidebar.classList.toggle('active');
        backdrop.classList.toggle('active');
    },
    
    // Warenkorb-Sidebar ausblenden
    hideCartSidebar() {
        const sidebar = document.getElementById('cart-sidebar');
        const backdrop = document.getElementById('cart-sidebar-backdrop');
        
        sidebar.classList.remove('active');
        backdrop.classList.remove('active');
    },
    
    // Aktualisiert die Warenkorb-Anzeige
    updateCartCount() {
        const cartCount = document.getElementById('cart-count');
        if (cartCount) {
            cartCount.textContent = this.cart.length;
        } else {
            console.warn('Element #cart-count nicht gefunden');
        }
    },
    
    // Lädt den Warenkorb aus dem lokalen Speicher
    loadCart() {
        const cartData = localStorage.getItem('cart');
        if (cartData) {
            this.cart = JSON.parse(cartData);
        }
    },
    
    // Speichert den Warenkorb im lokalen Speicher
    saveCart(cart) {
        try {
            // Wenn ein Warenkorb-Objekt übergeben wurde, dieses verwenden
            if (cart) {
                this.cart = cart;
            }
            localStorage.setItem('cart', JSON.stringify(this.cart));
            
            // Event auslösen für andere Module
            const event = new CustomEvent('cartUpdated', { detail: { cart: this.cart } });
            window.dispatchEvent(event);
            
            console.log('Warenkorb gespeichert:', this.cart);
        } catch (error) {
            console.error('Fehler beim Speichern des Warenkorbs:', error);
        }
    },
    
    /**
     * Fügt ein Produkt zum Warenkorb hinzu
     * @param {Object} product - Das hinzuzufügende Produkt
     * @returns {Object} - Das hinzugefügte Produkt mit ID
     */
    addToCart(product) {
        const cart = this.getCart();
        product.id = this.generateUniqueId();
        cart.push(product);
        this.saveCart(cart);
        return product;
    },
    
    /**
     * Entfernt ein Produkt aus dem Warenkorb
     * @param {string} productId - Die ID des zu entfernenden Produkts
     */
    removeFromCart(productId) {
        const cart = this.getCart();
        const updatedCart = cart.filter(item => item.id !== productId);
        this.saveCart(updatedCart);
    },
    
    /**
     * Holt den Warenkorb aus dem localStorage
     * @returns {Array} - Der aktuelle Warenkorb
     */
    getCart() {
        const cart = localStorage.getItem('cart');
        return cart ? JSON.parse(cart) : [];
    },
    
    /**
     * Berechnet die Gesamtsumme des Warenkorbs
     * @returns {number} - Die Gesamtsumme
     */
    calculateTotal() {
        const cart = this.getCart();
        return cart.reduce((total, item) => total + (parseFloat(item.price) || 0), 0);
    },
    
    /**
     * Leert den Warenkorb
     */
    clearCart() {
        this.saveCart([]);
    },
    
    /**
     * Generiert eine eindeutige ID für Warenkorbprodukte
     * @returns {string} - Eine eindeutige ID
     */
    generateUniqueId() {
        return `${Date.now().toString(36)}${Math.random().toString(36).substr(2)}`;
    },
    
    /**
     * Prüft, ob der Warenkorb leer ist
     * @returns {boolean} - True wenn der Warenkorb leer ist
     */
    isEmpty() {
        return this.getCart().length === 0;
    },
    
    /**
     * Gibt die Anzahl der Produkte im Warenkorb zurück
     * @returns {number} - Anzahl der Produkte
     */
    getItemCount() {
        return this.getCart().length;
    }
};

// Stelle das Modul global zur Verfügung für bestehenden Code
window.CartModule = CartModule; 