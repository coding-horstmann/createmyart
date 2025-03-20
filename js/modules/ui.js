/**
 * UI Module - Enthält alle Funktionen zur Benutzeroberfläche
 */

export const UIModule = {
    /**
     * Zeigt den Ladeindikator an
     */
    showLoading: function() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'flex';
        }
    },
    
    /**
     * Versteckt den Ladeindikator
     */
    hideLoading: function() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    },
    
    /**
     * Rendert die Warenkorbeinträge
     */
    renderCartItems: function() {
        const cartItems = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total');
        
        if (!cartItems || !cartTotal || !window.CartModule) return;
        
        const cart = window.CartModule.getCart();
        
        // Warenkorb leeren
        cartItems.innerHTML = '';
        
        if (cart.length === 0) {
            cartItems.innerHTML = '<p class="empty-cart">Dein Warenkorb ist leer</p>';
            cartTotal.textContent = '0,00 €';
            return;
        }
        
        // Elemente zum Warenkorb hinzufügen
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-image">
                    <img src="${item.imageUrl}" alt="${item.title}">
                </div>
                <div class="cart-item-details">
                    <h3>${item.title}</h3>
                    <p class="cart-item-price">${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(item.price)}</p>
                </div>
                <button class="remove-item" data-id="${item.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
            cartItems.appendChild(cartItem);
            
            // Event-Listener für Entfernen-Button
            cartItem.querySelector('.remove-item').addEventListener('click', function() {
                window.CartModule.removeFromCart(item.id);
                window.UIModule.renderCartItems();
                window.UIModule.updateCartCount();
            });
        });
        
        // Gesamtsumme aktualisieren
        const total = window.CartModule.calculateTotal();
        cartTotal.textContent = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(total);
    },
    
    /**
     * Aktualisiert den Warenkorbzähler
     */
    updateCartCount: function() {
        const cartCount = document.getElementById('cart-count');
        if (!cartCount || !window.CartModule) return;
        
        const cart = window.CartModule.getCart();
        cartCount.textContent = cart.length;
        
        if (cart.length > 0) {
            cartCount.style.display = 'flex';
        } else {
            cartCount.style.display = 'none';
        }
    },
    
    /**
     * Zeigt eine benutzerdefinierte Warnung an
     * @param {string} title - Der Titel der Warnung
     * @param {string} message - Die Nachricht der Warnung
     */
    showAlert: function(title, message) {
        const customAlertModal = document.getElementById('custom-alert-modal');
        const customAlertTitle = document.getElementById('custom-alert-title');
        const customAlertMessage = document.getElementById('custom-alert-message');
        
        if (!customAlertModal || !customAlertTitle || !customAlertMessage) return;
        
        customAlertTitle.textContent = title;
        customAlertMessage.textContent = message;
        
        // Zeige Modal und Hintergrund
        customAlertModal.classList.add('active');
        document.getElementById('modal-backdrop').classList.add('active');
    }
};

// Stelle das Modul global zur Verfügung für bestehenden Code
window.UIModule = UIModule; 