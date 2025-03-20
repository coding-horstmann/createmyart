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
        this.loadCart();
        this.setupEventListeners();
        this.updateCartCount();
    },
    
    // Event-Listener einrichten
    setupEventListeners() {
        // Warenkorb-Icon Klick-Event
        document.getElementById('cart-icon').addEventListener('click', this.toggleCartSidebar.bind(this));
        
        // Schließen-Button Event
        document.querySelector('.cart-sidebar .close-sidebar').addEventListener('click', this.hideCartSidebar.bind(this));
        
        // Hintergrund-Klick Event
        document.getElementById('cart-sidebar-backdrop').addEventListener('click', this.hideCartSidebar.bind(this));
        
        // Checkout-Button Event
        document.getElementById('checkout-btn').addEventListener('click', () => {
            this.hideCartSidebar();
            
            // Prüfen, ob der Warenkorb leer ist
            if (this.cart.length === 0) {
                UIModule.showCustomAlert('Hinweis', 'Dein Warenkorb ist leer. Bitte füge zuerst ein Produkt hinzu.');
                return;
            }
            
            // Checkout-Modal anzeigen
            // Diese Funktion ist in checkout.js definiert
            if (window.CheckoutModule) {
                window.CheckoutModule.showCheckoutModal(this.cart);
            } else {
                console.error('CheckoutModule nicht gefunden. Wurde checkout.js geladen?');
                UIModule.showCustomAlert('Fehler', 'Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.');
            }
        });
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
        cartCount.textContent = this.cart.length;
    },
    
    // Lädt den Warenkorb aus dem lokalen Speicher
    loadCart() {
        const cartData = localStorage.getItem('cart');
        if (cartData) {
            this.cart = JSON.parse(cartData);
        }
    },
    
    // Speichert den Warenkorb im lokalen Speicher
    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
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