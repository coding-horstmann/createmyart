/**
 * Cart Module - Enthält alle Funktionen zur Warenkorbverwaltung
 * Zentrale Verwaltung aller Warenkorboperationen mit localStorage-Persistierung
 */

export const CartModule = {
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
     * Speichert den Warenkorb im localStorage
     * @param {Array} cart - Der zu speichernde Warenkorb
     */
    saveCart(cart) {
        localStorage.setItem('cart', JSON.stringify(cart));
        // Event auslösen für UI-Updates
        window.dispatchEvent(new CustomEvent('cartUpdated'));
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