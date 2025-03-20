/**
 * Checkout-Modul für die Bestellabwicklung
 * Verwaltet die Funktionalität für den Checkout-Prozess
 */

import { ValidationModule } from './validation.js';
import { UIModule } from './ui.js';

// Öffentliche API des Moduls
export const CheckoutModule = {
    currentOrder: null,
    
    // Initialisierung
    init() {
        this.setupEventListeners();
        
        // Globalen Zugriff für andere Module ermöglichen
        window.CheckoutModule = this;
    },
    
    // Event-Listener einrichten
    setupEventListeners() {
        // Checkout-Formular Absenden
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', this.handleCheckoutSubmit.bind(this));
        }
        
        // Zahlungsmethode-Wechsel
        const paymentMethods = document.querySelectorAll('input[name="payment-method"]');
        paymentMethods.forEach(method => {
            method.addEventListener('change', this.handlePaymentMethodChange.bind(this));
        });
        
        // Schließen-Button im Checkout-Modal
        const closeModal = document.querySelector('#checkout-modal .close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', this.hideCheckoutModal.bind(this));
        }
        
        // "Weiter einkaufen" Button im Bestätigungs-Modal
        const continueShoppingBtn = document.getElementById('continue-shopping');
        if (continueShoppingBtn) {
            continueShoppingBtn.addEventListener('click', () => {
                document.getElementById('confirmation-modal').classList.remove('active');
                // Warenkorb leeren nach erfolgreicher Bestellung
                this.clearCart();
            });
        }
    },
    
    // Zeigt das Checkout-Modal an
    showCheckoutModal(cart) {
        this.currentOrder = {
            items: [...cart],
            total: this.calculateTotal(cart)
        };
        
        // Checkout-Elemente füllen
        this.populateCheckoutItems();
        
        // Modal anzeigen
        document.getElementById('checkout-modal').classList.add('active');
    },
    
    // Blendet das Checkout-Modal aus
    hideCheckoutModal() {
        document.getElementById('checkout-modal').classList.remove('active');
    },
    
    // Füllt die Bestellübersicht im Checkout
    populateCheckoutItems() {
        const checkoutItemsContainer = document.getElementById('checkout-items');
        const checkoutTotal = document.getElementById('checkout-total');
        
        // Container leeren
        checkoutItemsContainer.innerHTML = '';
        
        // Elemente hinzufügen
        this.currentOrder.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'checkout-item';
            itemElement.innerHTML = `
                <div class="checkout-item-info">
                    <p class="checkout-item-name">${item.name}</p>
                    <p class="checkout-item-size">Größe: ${item.size}</p>
                </div>
                <div class="checkout-item-price">${item.price.toFixed(2).replace('.', ',')} €</div>
            `;
            checkoutItemsContainer.appendChild(itemElement);
        });
        
        // Gesamtsumme aktualisieren
        checkoutTotal.textContent = this.currentOrder.total.toFixed(2).replace('.', ',') + ' €';
    },
    
    // Berechnet die Gesamtsumme des Warenkorbs
    calculateTotal(cart) {
        return cart.reduce((total, item) => total + item.price, 0);
    },
    
    // Behandelt die Änderung der Zahlungsmethode
    handlePaymentMethodChange(event) {
        const paymentMethod = event.target.value;
        const paypalContainer = document.getElementById('paypal-button-container');
        
        if (paymentMethod === 'paypal') {
            // PayPal-Container anzeigen (wird in der paypal-integration.js gefüllt)
            paypalContainer.style.display = 'block';
        } else {
            // PayPal-Container ausblenden
            paypalContainer.style.display = 'none';
        }
    },
    
    // Behandelt das Absenden des Checkout-Formulars
    handleCheckoutSubmit(event) {
        event.preventDefault();
        
        // Formular validieren
        if (!this.validateCheckoutForm()) {
            return;
        }
        
        // Zahlungsmethode überprüfen
        const paymentMethod = document.querySelector('input[name="payment-method"]:checked');
        if (!paymentMethod) {
            UIModule.showCustomAlert('Hinweis', 'Bitte wähle eine Zahlungsmethode aus.');
            return;
        }
        
        // Bei Kreditkartenzahlung direkt den Bestellprozess starten
        if (paymentMethod.value === 'credit-card') {
            this.processOrder();
        }
        // Bei PayPal-Zahlung erfolgt die Bestellverarbeitung über den PayPal-Button
    },
    
    // Validiert das Checkout-Formular
    validateCheckoutForm() {
        // Hier könnten spezifische Validierungen erfolgen
        return ValidationModule.validateForm(document.getElementById('checkout-form'));
    },
    
    // Verarbeitet die Bestellung
    processOrder() {
        // Zeige Ladeoverlay
        UIModule.showLoadingOverlay('Deine Bestellung wird verarbeitet...');
        
        // Sammle Formulardaten
        const formData = this.collectFormData();
        
        // Bestellnummer generieren
        const orderNumber = this.generateOrderNumber();
        
        // In einer echten Anwendung würde hier ein API-Aufruf erfolgen
        // Für Demozwecke simulieren wir eine erfolgreiche Bestellung
        setTimeout(() => {
            // Ladeoverlay ausblenden
            UIModule.hideLoadingOverlay();
            
            // Bestellnummer anzeigen
            document.getElementById('order-number').textContent = orderNumber;
            
            // Checkout-Modal ausblenden und Bestätigungsmodal anzeigen
            this.hideCheckoutModal();
            document.getElementById('confirmation-modal').classList.add('active');
            
            // Bestellung in localStorage speichern (für Demo-Zwecke)
            this.saveOrder(orderNumber, formData);
        }, 2000);
    },
    
    // Sammelt die Formulardaten
    collectFormData() {
        return {
            firstname: document.getElementById('checkout-firstname').value,
            lastname: document.getElementById('checkout-lastname').value,
            email: document.getElementById('checkout-email').value,
            phone: document.getElementById('checkout-phone').value,
            street: document.getElementById('checkout-street').value,
            houseNumber: document.getElementById('checkout-house-number').value,
            zip: document.getElementById('checkout-zip').value,
            city: document.getElementById('checkout-city').value,
            country: document.getElementById('checkout-country').value,
            paymentMethod: document.querySelector('input[name="payment-method"]:checked').value,
            items: this.currentOrder.items,
            total: this.currentOrder.total
        };
    },
    
    // Generiert eine Bestellnummer
    generateOrderNumber() {
        const date = new Date();
        const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `ORD-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${randomDigits}`;
    },
    
    // Speichert die Bestellung
    saveOrder(orderNumber, orderData) {
        // Bestehende Bestellungen laden
        const orders = JSON.parse(localStorage.getItem('orders') || '{}');
        
        // Neue Bestellung hinzufügen
        orders[orderNumber] = {
            ...orderData,
            date: new Date().toISOString(),
            status: 'pending'
        };
        
        // Bestellungen speichern
        localStorage.setItem('orders', JSON.stringify(orders));
    },
    
    // Leert den Warenkorb
    clearCart() {
        localStorage.removeItem('cart');
        // Event auslösen für UI-Updates
        window.dispatchEvent(new CustomEvent('cartUpdated'));
    }
};

// Modul initialisieren, wenn das DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
    CheckoutModule.init();
}); 