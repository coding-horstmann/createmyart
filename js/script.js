// Importiere die Runware API
import { RunwareAPI } from './modules/runware-api.js';

document.addEventListener('DOMContentLoaded', function() {
    // Import von Modulen (werden in separaten Dateien definiert)
    const modulePromises = [];
    
    try {
        // Alle Module parallel laden
        modulePromises.push(
            import('./modules/cart.js').then(module => {
                window.CartModule = module.CartModule;
            }),
            
            import('./modules/ui.js').then(module => {
                window.UIModule = module.UIModule;
            }),
            
            import('./modules/events.js').then(module => {
                window.EventsModule = module.EventsModule;
            }),
            
            import('./modules/validation.js').then(module => {
                window.ValidationModule = module.ValidationModule;
            }),
            
            import('./checkout.js').then(module => {
                window.checkoutInstance = module.checkout;
            }),
            
            import('./modules/navigation.js').then(module => {
                window.NavigationModule = module.NavigationModule;
            })
        );
        
        // Warten bis alle Module geladen sind, dann initialisieren
        Promise.all(modulePromises)
            .then(() => {
                // Navigation sofort initialisieren
                if (window.NavigationModule) {
                    window.NavigationModule.init();
                }
                // Hauptinitialisierung starten
                init();
            })
            .catch(err => console.error('Fehler beim Laden der Module:', err));
    } catch (error) {
        console.error('Fehler beim Importieren der Module:', error);
        // Fallback: Trotzdem versuchen zu initialisieren
        init();
    }
    
    // Cache für DOM-Elemente
    const elementCache = {};
    
    /**
     * Hilfsfunktion zum Abrufen von DOM-Elementen mit Caching
     * @param {string} selector - CSS-Selektor oder ID (mit #)
     * @param {boolean} [all=false] - Ob alle passenden Elemente zurückgegeben werden sollen
     * @returns {Element|NodeList|null} - Das gefundene Element oder null
     */
    function getElement(selector, all = false) {
        // Caching-Schlüssel erstellen (mit all-Parameter)
        const cacheKey = all ? `all:${selector}` : selector;
        
        // Wenn das Element bereits im Cache ist, gib es zurück
        if (elementCache[cacheKey]) {
            return elementCache[cacheKey];
        }
        
        // Andernfalls suche das Element und speichere es im Cache
        let element;
        
        try {
            if (all) {
                // querySelectorAll gibt ein NodeList zurück, das forEach unterstützt
                element = document.querySelectorAll(selector);
            } else if (selector.startsWith('#')) {
                // Optimierung für ID-Selektoren
                element = document.getElementById(selector.substring(1));
            } else {
                element = document.querySelector(selector);
            }
            
            elementCache[cacheKey] = element;
            return element;
        } catch (error) {
            console.error(`Fehler beim Abrufen des Elements "${selector}":`, error);
            return null;
        }
    }
    
    // Platzhalterbilder für die Entwicklung
    const placeholderImages = [
        getElement('#placeholder-1')?.src,
        getElement('#placeholder-2')?.src,
        getElement('#placeholder-3')?.src
    ].filter(Boolean);
    
    // State Management - Zentraler Anwendungszustand
    let state = {
        generationsLeft: getGenerationsLeft(),
        generatedImages: loadGeneratedImagesFromStorage() || [],
        cart: window.CartModule ? window.CartModule.getCart() : []
    };
    
    /**
     * Lädt gespeicherte Bilder aus dem LocalStorage
     * @returns {Array} Array mit gespeicherten Bildern
     */
    function loadGeneratedImagesFromStorage() {
        try {
            const savedImages = localStorage.getItem('generatedImages');
            return savedImages ? JSON.parse(savedImages) : [];
        } catch (error) {
            console.error('Fehler beim Laden der gespeicherten Bilder:', error);
            return [];
        }
    }
    
    /**
     * Speichert generierte Bilder im LocalStorage
     * @param {Array} images Array mit Bildern
     */
    function saveGeneratedImagesToStorage(images) {
        try {
            localStorage.setItem('generatedImages', JSON.stringify(images));
        } catch (error) {
            console.error('Fehler beim Speichern der Bilder:', error);
        }
    }
    
    // Funktionen
    function init() {
        try {
            // Firebase initialisieren, falls verfügbar
            if (window.FirebaseAPI) {
                window.FirebaseAPI.initializeFirebase();
            }
            
            // Validation Module initialisieren
            if (window.ValidationModule && window.ValidationModule.init) {
                window.ValidationModule.init();
            }
            
            // Cart Module initialisieren
            if (window.CartModule && window.CartModule.init) {
                window.CartModule.init();
            }
            
            // State Cart initialisieren
            state.cart = window.CartModule ? window.CartModule.getCart() : [];
            
            // Event-Listener und UI-Elemente einrichten
            setupEventListeners();
            renderCartItems();
            updateCartCount();
            updateCheckoutButton();
            setupFAQAccordion();
            updateGenerationsCounter();
            
            // Scroll-Funktionen einrichten
            handleHashInUrl();
            setupSmoothScrolling();
            
            // Prüfen, ob eine Bestellbestätigung angezeigt werden soll
            checkForOrderConfirmation();
            
            // Event-Listener für abgeschlossene Bestellungen hinzufügen
            window.addEventListener('orderCompleted', function() {
                // UI aktualisieren
                renderCartItems();
                updateCartCount();
                updateCheckoutButton();
            });
            
            // Globale Funktionen für Warenkorb-Updates
            window.updateCartUI = function() {
                renderCartItems();
                updateCartCount();
                updateCheckoutButton();
            };
            
            // Warenkorb-Updates überwachen
            window.addEventListener('cartUpdated', function() {
                renderCartItems();
                updateCartCount();
                updateCheckoutButton();
            });
            
            // Loading-Overlay entfernen
            const loadingOverlay = getElement('#loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            // Mobile Menü aktivieren
            if (window.NavigationModule) {
                window.NavigationModule.setupMobileMenu();
            } else {
                setupMobileMenu();
            }
            
            // Zeige gespeicherte Bilder an
            if (state.generatedImages.length > 0) {
                state.generatedImages.forEach(image => {
                    displayGeneratedImage(image);
                });
            }
        } catch (error) {
            console.error('Fehler bei der Initialisierung:', error);
        }
    }
    
    function setupMobileMenu() {
        // Hamburger-Menü aktivieren
        const mobileMenuBtn = getElement('.mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', function() {
                if (window.toggleMobileMenu) {
                    window.toggleMobileMenu();
                } else {
                    const mainNav = getElement('.main-nav');
                    if (mainNav) {
                        mainNav.classList.toggle('active');
                        this.classList.toggle('active');
                    }
                }
            });
        }
    }
    
    function setupEventListeners() {
        try {
            // Bild generieren
            const generateBtn = document.getElementById('generate-btn');
            if (generateBtn) {
                generateBtn.addEventListener('click', handleImageGeneration);
            }
            
            const promptInput = document.getElementById('prompt-input');
            if (promptInput) {
                promptInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && e.ctrlKey) {
                        handleImageGeneration(e);
                    }
                });
            }
            
            // Warenkorb öffnen
            const cartIcon = document.getElementById('cart-icon');
            if (cartIcon) {
                cartIcon.addEventListener('click', openCartSidebar);
            }
            
            const closeSidebarButton = document.querySelector('.close-sidebar');
            if (closeSidebarButton) {
                closeSidebarButton.addEventListener('click', closeCartSidebar);
            }
            
            const cartSidebarBackdrop = document.getElementById('cart-sidebar-backdrop');
            if (cartSidebarBackdrop) {
                cartSidebarBackdrop.addEventListener('click', closeCartSidebar);
            }
            
            // Modals schließen
            const closeModalButtons = document.querySelectorAll('.close-modal');
            if (closeModalButtons) {
                closeModalButtons.forEach(button => {
                    button.addEventListener('click', closeAllModals);
                });
            }
            
            // Klick außerhalb des Modal-Inhalts schließt das Modal
            const modals = document.querySelectorAll('.modal');
            if (modals) {
                modals.forEach(modal => {
                    modal.addEventListener('click', function(e) {
                        if (e.target === this) {
                            closeAllModals();
                        }
                    });
                });
            }
            
            // Custom Alert Button
            const customAlertButton = document.getElementById('custom-alert-button');
            if (customAlertButton) {
                customAlertButton.addEventListener('click', function() {
                    const customAlertModal = document.getElementById('custom-alert-modal');
                    if (customAlertModal) {
                        customAlertModal.style.display = 'none';
                    }
                });
            }
            
            // Zur Kasse Button
            const checkoutBtn = getElement('#checkout-btn');
            if (checkoutBtn) {
                checkoutBtn.addEventListener('click', function() {
                    closeCartSidebar();
                    openCheckoutModal();
                });
            }
            
            // Weiter einkaufen Button
            const continueShoppingBtn = getElement('#continue-shopping');
            if (continueShoppingBtn) {
                continueShoppingBtn.addEventListener('click', continueShopping);
            }
            
            // Kontaktformular
            const contactForm = getElement('#contact-form');
            if (contactForm) {
                contactForm.addEventListener('submit', handleContactForm);
            }
            
            // Checkout-Formular
            const checkoutForm = getElement('#checkout-form');
            if (checkoutForm) {
                checkoutForm.addEventListener('submit', handleCheckout);
            }
        } catch (error) {
            console.error('Fehler beim Einrichten der Event-Listener:', error);
        }
    }
    
    function setupFAQAccordion() {
        try {
            // FAQ-Items
            const faqItems = document.querySelectorAll('.faq-item');
            
            faqItems.forEach(item => {
                const questionElement = item.querySelector('.faq-question');
                
                questionElement.addEventListener('click', () => {
                    item.classList.toggle('active');
                });
            });
            
            // Produktsicherungsverordnung
            const productSafetyRegulation = document.querySelector('.product-safety-regulation');
            if (productSafetyRegulation) {
                const toggleElement = productSafetyRegulation.querySelector('.regulation-toggle');
                
                toggleElement.addEventListener('click', () => {
                    productSafetyRegulation.classList.toggle('active');
                });
            }
        } catch (error) {
            console.error('Fehler beim Einrichten des FAQ-Akkordeons:', error);
        }
    }
    
    // Bildgenerierung
    async function handleImageGeneration(e) {
        e.preventDefault();
        
        // Werte aus dem Formular holen
        const promptInput = getElement('#prompt-input');
        const prompt = promptInput.value.trim();
        
        // Validierung
        if (!prompt) {
            showCustomAlert('Bitte gib einen Prompt ein, um ein Bild zu erstellen.');
            return;
        }
        
        // Prompt validieren
        const validationResult = ValidationModule.validatePrompt(prompt);
        if (!validationResult.valid) {
            showCustomAlert(validationResult.errors[0]);
            return;
        }
        
        // Prüfen, ob noch Generierungen übrig sind
        const generationsLeft = getGenerationsLeft();
        if (generationsLeft <= 0) {
            showCustomAlert(
                'Du hast dein tägliches Limit an Bildgenerierungen erreicht. Versuche es morgen wieder!',
                'Limit erreicht',
                true
            );
            return;
        }
        
        // Loading-Anzeige anzeigen
        const loadingIndicator = getElement('#loading-indicator');
        const resultsContainer = getElement('#results-container');
        
        if (loadingIndicator) loadingIndicator.style.display = 'flex';
        
        // Bildgenerierung starten
        try {
            // Runware API verwenden
            let result;
            try {
                console.log('Starte Bildgenerierung mit Prompt:', prompt);
                result = await RunwareAPI.generateImage(prompt);
                console.log('Runware API Antwort erhalten:', result);
            } catch (apiError) {
                console.error('Primäre Bildgenerierung fehlgeschlagen:', apiError);
                console.warn('Versuche Fallback-Generierung...');
                try {
                    result = await RunwareAPI.generateImageFallback(prompt);
                } catch (fallbackError) {
                    console.error('Fallback-Generierung fehlgeschlagen:', fallbackError);
                    if (prompt.length < 3) {
                        throw new Error('Gib mehr als 2 Buchstaben ein.');
                    } else {
                        throw fallbackError;
                    }
                }
            }
            
            if (!result) {
                throw new Error('Keine Bilddaten erhalten');
            }
            
            console.log('Verarbeite Bildgenerierungsergebnis:', result);
            
            // Prüfen, ob die URL im richtigen Format vorhanden ist
            if (!result.url && result.imageURL) {
                // Falls die API imageURL statt url zurückgibt
                console.log('Verwende imageURL statt url:', result.imageURL);
                result.url = result.imageURL;
            }
            
            if (!result.url) {
                throw new Error('Keine URL in den Bilddaten erhalten');
            }
            
            // Bild anzeigen
            const imageData = {
                id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                url: result.url,
                prompt: prompt,
                timestamp: Date.now(),
                metadata: result.metadata || { prompt }
            };
            
            console.log('Bildanzeige vorbereitet:', imageData);
            
            // Zum State hinzufügen und anzeigen
            state.generatedImages.push(imageData);
            saveGeneratedImagesToStorage(state.generatedImages);
            
            // Loading-Anzeige ausblenden und Ergebniscontainer anzeigen
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (resultsContainer) resultsContainer.style.display = 'grid';
            
            displayGeneratedImage(imageData);
            
            // Generierungszähler aktualisieren
            setGenerationsLeft(generationsLeft - 1);
            updateGenerationsCounter();
            
        } catch (error) {
            console.error('Fehler bei der Bildgenerierung:', error);
            
            // Lade-Anzeige ausblenden
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            // Fehlermeldung anzeigen
            showCustomAlert(`Bei der Bildgenerierung ist ein Fehler aufgetreten: ${error.message}`);
        }
    }
    
    function displayGeneratedImage(image) {
        console.log('Zeige generiertes Bild an:', image);
        
        // Stellen Sie sicher, dass der Ergebniscontainer sichtbar ist
        const resultsContainer = document.getElementById('results-container');
        const loadingIndicator = document.getElementById('loading-indicator');
        
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        if (resultsContainer) {
            resultsContainer.style.display = 'grid';
        }
        
        // Kürze den Prompt auf die erste Zeile
        const promptLines = image.prompt.split('\n');
        let displayPrompt = promptLines[0];
        
        // Wenn der Prompt mehrere Zeilen hat oder die erste Zeile sehr lang ist
        if (promptLines.length > 1 || displayPrompt.length > 100) {
            // Kürze den Text auf maximal 100 Zeichen
            displayPrompt = displayPrompt.substring(0, 100);
            displayPrompt += '...';
        }
        
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.innerHTML = `
            <div class="result-image" data-id="${image.id}">
                <img src="${image.url}" alt="Generiertes Poster" onload="this.parentElement.classList.add('loaded')">
                <div class="image-loading">Bild wird geladen...</div>
                <button class="delete-image-btn" data-id="${image.id}" title="Bild löschen">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
            <div class="result-details">
                <div class="prompt-display">
                    <label>Dein Prompt:</label>
                    <div class="prompt-text-container">
                        <span class="prompt-text">${displayPrompt}</span>
                        <button class="copy-prompt-btn" data-prompt="${image.prompt}" title="Prompt kopieren">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
                <div class="size-selection">
                    <label for="size-${image.id}">Größe auswählen*</label>
                    <select id="size-${image.id}" required>
                        <option value="">Bitte wählen</option>
                        <option value="21x29.7">21 x 29,70 cm (20,65 €)</option>
                        <option value="29.7x42">29,70 x 42 cm A3 (33,73 €)</option>
                        <option value="42x59.4">42 x 59,40 cm A2 (37,80 €)</option>
                        <option value="50x70">50 x 70 cm (33,70 €)</option>
                        <option value="59.4x84.1">59,40 x 84,10 cm A1 (50,63 €)</option>
                        <option value="84.1x118.9">84,10 x 118,90 cm A0 (50,63 €)</option>
                    </select>
                </div>
                <div class="result-actions">
                    <button class="btn btn-outline add-to-cart-btn" data-id="${image.id}">In den Warenkorb</button>
                    <button class="btn btn-primary buy-now-btn" data-id="${image.id}">Direkt kaufen</button>
                </div>
            </div>
        `;
        
        // Füge das Element am Anfang des Containers ein
        if (resultsContainer) {
            // Stelle sicher, dass der Container sichtbar ist
            resultsContainer.style.display = 'grid';
            
            if (resultsContainer.firstChild) {
                resultsContainer.insertBefore(resultItem, resultsContainer.firstChild);
            } else {
                resultsContainer.appendChild(resultItem);
            }
            
            // Event-Listener für das Bild (Vorschau)
            const imageElement = resultItem.querySelector('.result-image');
            if (imageElement) {
                imageElement.addEventListener('click', (e) => {
                    // Nicht die Vorschau öffnen, wenn auf den Delete-Button geklickt wurde
                    if (!e.target.closest('.delete-image-btn')) {
                        openImagePreview(image.url);
                    }
                });
            }
            
            // Event-Listener für "In den Warenkorb"
            const addToCartBtn = resultItem.querySelector('.add-to-cart-btn');
            if (addToCartBtn) {
                addToCartBtn.addEventListener('click', () => {
                    addToCart(image);
                });
            }
            
            // Event-Listener für "Direkt kaufen"
            const buyNowBtn = resultItem.querySelector('.buy-now-btn');
            if (buyNowBtn) {
                buyNowBtn.addEventListener('click', () => {
                    buyNow(image);
                });
            }
            
            // Event-Listener für den Kopieren-Button
            const copyPromptBtn = resultItem.querySelector('.copy-prompt-btn');
            if (copyPromptBtn) {
                copyPromptBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    copyPromptToClipboard(e.currentTarget);
                });
            }
            
            // Event-Listener für den Löschen-Button
            const deleteBtn = resultItem.querySelector('.delete-image-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteGeneratedImage(image.id);
                });
            }
        } else {
            console.error('Ergebniscontainer nicht gefunden');
        }
    }
    
    // Funktion zum Kopieren des Prompts in die Zwischenablage
    function copyPromptToClipboard(button) {
        const prompt = button.getAttribute('data-prompt');
        
        // Modernes Clipboard API verwenden
        navigator.clipboard.writeText(prompt)
            .then(() => {
                // Anzeige einer kurzen Bestätigung
                const originalIcon = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i>';
                button.title = "Kopiert!";
                
                // Nach 2 Sekunden den ursprünglichen Zustand wiederherstellen
                setTimeout(() => {
                    button.innerHTML = originalIcon;
                    button.title = "Prompt kopieren";
                }, 2000);
            })
            .catch((err) => {
                console.error('Fehler beim Kopieren des Textes: ', err);
                
                // Fallback zur alten Methode
                const textarea = document.createElement('textarea');
                textarea.value = prompt;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'absolute';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                
                // Selektiere und kopiere den Text
                textarea.select();
                document.execCommand('copy');
                
                // Entferne das temporäre Element
                document.body.removeChild(textarea);
                
                // Anzeige einer kurzen Bestätigung
                const originalIcon = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i>';
                button.title = "Kopiert!";
                
                // Nach 2 Sekunden den ursprünglichen Zustand wiederherstellen
                setTimeout(() => {
                    button.innerHTML = originalIcon;
                    button.title = "Prompt kopieren";
                }, 2000);
            });
    }
    
    // Warenkorb-Funktionen
    function addToCart(image) {
        const sizeSelect = document.getElementById(`size-${image.id}`);
        if (!sizeSelect) {
            console.error(`Größenauswahl für Bild ${image.id} nicht gefunden`);
            return;
        }
        
        const selectedSize = sizeSelect.value;
        
        if (!selectedSize) {
            showCustomAlert('Bitte wähle eine Größe aus.', 'Fehlende Angabe');
            return;
        }
        
        const price = getPrice(selectedSize);
        
        const cartItem = {
            id: window.CartModule ? window.CartModule.generateUniqueId() : `cart_${Date.now()}`,
            imageId: image.id, // Original-Bild-ID beibehalten
            url: image.url,
            prompt: image.prompt,
            size: selectedSize,
            price: price
        };
        
        // Zum Warenkorb hinzufügen (CartModule verwenden)
        window.CartModule.addToCart(cartItem);
        // State aktualisieren für andere Funktionen
        state.cart = window.CartModule.getCart();
        
        // Öffne den Warenkorb automatisch
        openCartSidebar({ preventDefault: () => {} });
    }
    
    function buyNow(image) {
        const sizeSelect = document.getElementById(`size-${image.id}`);
        if (!sizeSelect) {
            console.error(`Größenauswahl für Bild ${image.id} nicht gefunden`);
            return;
        }
        
        const selectedSize = sizeSelect.value;
        
        if (!selectedSize) {
            showCustomAlert('Bitte wähle eine Größe aus.', 'Fehlende Angabe');
            return;
        }
        
        const price = getPrice(selectedSize);
        
        const cartItem = {
            id: window.CartModule.generateUniqueId(),
            imageId: image.id, // Original-Bild-ID beibehalten
            url: image.url,
            prompt: image.prompt,
            size: selectedSize,
            price: price
        };
        
        // Leere den Warenkorb und füge nur dieses Item hinzu
        window.CartModule.clearCart();
        window.CartModule.addToCart(cartItem);
        // State aktualisieren für andere Funktionen
        state.cart = window.CartModule.getCart();
        
        // Öffne direkt den Checkout
        openCheckoutModal();
    }
    
    function removeFromCart(itemId) {
        window.CartModule.removeFromCart(itemId);
        // State aktualisieren für andere Funktionen
        state.cart = window.CartModule.getCart();
    }
    
    function updateCartCount() {
        const cartCount = document.getElementById('cart-count');
        if (cartCount) {
            // Korrekte Anzahl aus CartModule holen
            const count = window.CartModule.getItemCount();
            cartCount.textContent = count;
        }
        
        // Aktualisiere auch den Checkout-Button, wenn sich die Anzahl der Artikel im Warenkorb ändert
        updateCheckoutButton();
    }
    
    function updateCheckoutButton() {
        const checkoutBtn = document.getElementById('checkout-button');
        if (!checkoutBtn) return;
        
        // Warenkorb-Überprüfung
        const cartIsEmpty = window.CartModule ? window.CartModule.isEmpty() : state.cart.length === 0;
        
        if (cartIsEmpty) {
            checkoutBtn.setAttribute('disabled', 'disabled');
            checkoutBtn.classList.add('disabled');
        } else {
            checkoutBtn.removeAttribute('disabled');
            checkoutBtn.classList.remove('disabled');
        }
    }
    
    function renderCartItems() {
        const cartItems = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total');
        
        if (!cartItems || !cartTotal) return;
        
        cartItems.innerHTML = '';
        
        // Aktuellen Warenkorb aus CartModule holen
        const currentCart = window.CartModule.getCart();
        // Warenkorb in state synchronisieren für andere Funktionen
        state.cart = currentCart;
        
        // Gesamtpreis berechnen
        let totalPrice = calculateCartTotal();
        
        if (currentCart.length === 0) {
            cartItems.innerHTML = '<p class="empty-cart-message">Dein Warenkorb ist leer.</p>';
            cartTotal.textContent = '0,00 €';
            updateCheckoutButton();
            return;
        }
        
        currentCart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.classList.add('cart-item');
            
            const formattedPrice = (item.price / 100).toFixed(2).replace('.', ',');
            
            cartItem.innerHTML = `
                <div class="cart-item-image">
                    <img src="${item.url}" alt="Bestelltes Poster">
                </div>
                <div class="cart-item-details">
                    <p class="cart-item-prompt">${item.prompt}</p>
                    <p class="cart-item-size">${formatSize(item.size)}</p>
                    <p class="cart-item-price">${formattedPrice} €</p>
                </div>
                <button class="remove-item" data-id="${item.id}"><i class="fas fa-trash-alt"></i></button>
            `;
            
            cartItems.appendChild(cartItem);
            
            // Event-Listener für Remove-Button
            const removeBtn = cartItem.querySelector('.remove-item');
            removeBtn.addEventListener('click', function() {
                removeFromCart(item.id);
            });
        });
        
        // Gesamtpreis anzeigen
        const formattedTotal = (totalPrice / 100).toFixed(2).replace('.', ',');
        cartTotal.textContent = `${formattedTotal} €`;
    }

    function renderCheckoutItems() {
        const checkoutItems = document.getElementById('checkout-items');
        const checkoutTotal = document.getElementById('checkout-total');
        
        if (!checkoutItems || !checkoutTotal) return;
        
        checkoutItems.innerHTML = '';
        let totalPrice = 0;
        
        if (state.cart.length === 0) {
            checkoutItems.innerHTML = '<p>Dein Warenkorb ist leer.</p>';
            checkoutTotal.textContent = '0,00 €';
            return;
        }
        
        state.cart.forEach(item => {
            const checkoutItem = document.createElement('div');
            checkoutItem.classList.add('checkout-item');
            
            const formattedPrice = (item.price / 100).toFixed(2).replace('.', ',');
            totalPrice += item.price;
            
            checkoutItem.innerHTML = `
                <div class="checkout-item-image">
                    <img src="${item.url}" alt="Poster">
                </div>
                <div class="checkout-item-details">
                    <p class="checkout-item-title">KI-generiertes Poster</p>
                    <p class="checkout-item-size">Größe: ${formatSize(item.size)}</p>
                    <p class="checkout-item-price">Preis: ${formattedPrice} €</p>
                </div>
            `;
            
            checkoutItems.appendChild(checkoutItem);
        });
        
        // Gesamtpreis aktualisieren
        const formattedTotal = (totalPrice / 100).toFixed(2).replace('.', ',');
        checkoutTotal.textContent = formattedTotal + ' €';
    }
    
    function openCartSidebar(e) {
        e.preventDefault();
        renderCartItems();
        
        const cartSidebar = document.getElementById('cart-sidebar');
        const cartSidebarBackdrop = document.getElementById('cart-sidebar-backdrop');
        
        if (cartSidebar && cartSidebarBackdrop) {
            cartSidebar.classList.add('active');
            cartSidebarBackdrop.classList.add('active');
            document.body.style.overflow = 'hidden'; // Verhindert Scrollen der Seite im Hintergrund
        }
    }
    
    function closeCartSidebar() {
        const cartSidebar = document.getElementById('cart-sidebar');
        const cartSidebarBackdrop = document.getElementById('cart-sidebar-backdrop');
        
        if (cartSidebar && cartSidebarBackdrop) {
            cartSidebar.classList.remove('active');
            cartSidebarBackdrop.classList.remove('active');
            document.body.style.overflow = ''; // Stellt Scrollen wieder her
        }
    }
    
    function openImagePreview(imageUrl) {
        const previewImage = document.getElementById('preview-image');
        const imagePreviewModal = document.getElementById('image-preview-modal');
        
        if (previewImage && imagePreviewModal) {
            previewImage.src = imageUrl;
            imagePreviewModal.style.display = 'block';
            imagePreviewModal.classList.add('active');
        }
    }
    
    function openCheckoutModal() {
        // Aktualisiere den State vor der Überprüfung
        if (window.CartModule) {
            state.cart = window.CartModule.getCart();
        }
        
        // Verhindere das Öffnen des Checkout-Modals, wenn der Warenkorb leer ist
        const cartIsEmpty = window.CartModule ? window.CartModule.isEmpty() : state.cart.length === 0;
        
        if (cartIsEmpty) {
            showCustomAlert('Der Warenkorb ist leer. Bitte füge zuerst Artikel hinzu.', 'Warenkorb leer');
            return;
        }
        
        renderCheckoutItems();
        
        const checkoutModal = document.getElementById('checkout-modal');
        if (checkoutModal) {
            checkoutModal.style.display = 'block';
            checkoutModal.classList.add('active');
            
            // Initialisiere das Checkout-Formular
            const form = document.getElementById('checkout-form');
            if (form && window.checkoutInstance) {
                // Formular zurücksetzen falls nötig
                form.reset();
                
                // Warenkorb an die Checkout-Instanz übergeben
                window.checkoutInstance.updateCart(state.cart);
            }
        }
    }
    
    function closeAllModals() {
        const imagePreviewModal = document.getElementById('image-preview-modal');
        const checkoutModal = document.getElementById('checkout-modal');
        const confirmationModal = document.getElementById('confirmation-modal');
        const customAlertModal = document.getElementById('custom-alert-modal');
        
        const modals = [imagePreviewModal, checkoutModal, confirmationModal, customAlertModal];
        modals.forEach(modal => {
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
        });
    }
    
    // Funktion zur Anzeige von Custom Alerts
    function showCustomAlert(message, title = 'Hinweis', isLimitReached = false) {
        console.log('Custom Alert:', message);
        
        try {
            const alertModal = document.getElementById('custom-alert-modal');
            const alertTitle = document.getElementById('custom-alert-title');
            const alertMessage = document.getElementById('custom-alert-message');
            
            if (alertModal && alertTitle && alertMessage) {
                // Titel und Nachricht setzen
                alertTitle.textContent = title;
                alertMessage.textContent = message;
                
                // Spezielles Styling für Limit-Meldungen
                if (isLimitReached) {
                    alertModal.classList.add('limit-reached');
                } else {
                    alertModal.classList.remove('limit-reached');
                }
                
                // Modal anzeigen
                alertModal.style.display = 'block';
                alertModal.classList.add('active');
                
                // Event-Listener für Button zum Schließen
                const alertButton = document.getElementById('custom-alert-button');
                if (alertButton) {
                    // Entferne vorhandene Event-Listeners, um doppelte zu vermeiden
                    const newBtn = alertButton.cloneNode(true);
                    alertButton.parentNode.replaceChild(newBtn, alertButton);
                    
                    newBtn.addEventListener('click', function() {
                        alertModal.style.display = 'none';
                        alertModal.classList.remove('active');
                    });
                }

                // Event-Listener für Schließen-Button
                const closeBtn = alertModal.querySelector('.close-modal');
                if (closeBtn) {
                    // Entferne vorhandene Event-Listeners, um doppelte zu vermeiden
                    const newCloseBtn = closeBtn.cloneNode(true);
                    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
                    
                    newCloseBtn.addEventListener('click', function() {
                        alertModal.style.display = 'none';
                        alertModal.classList.remove('active');
                    });
                }
            } else {
                // Fallback, wenn das Modal nicht existiert
                alert(message);
            }
        } catch (error) {
            console.error('Fehler beim Anzeigen des Custom Alerts:', error);
            alert(message);
        }
    }
    
    // Funktion global verfügbar machen
    window.showCustomAlert = showCustomAlert;
    
    // Checkout-Formular abhandeln
    async function handleCheckout(e) {
        e.preventDefault();
        console.log("Checkout-Formular abgesendet");
        
        try {
            // Checkout-Instanz finden
            const checkout = window.checkoutInstance;
            
            if (!checkout) {
                console.error("Checkout-Instanz nicht gefunden!");
                showCustomAlert("Es ist ein Fehler aufgetreten. Bitte laden Sie die Seite neu und versuchen Sie es erneut.");
                return;
            }
            
            // Validiere das Formular
            if (!checkout.validateForm()) {
                console.log("Formularvalidierung fehlgeschlagen");
                return;
            }
            
            // Kundendaten sammeln
            const firstNameField = getElement('checkout-firstname');
            const lastNameField = getElement('checkout-lastname');
            const emailField = getElement('checkout-email');
            const streetField = getElement('checkout-street');
            const houseNumberField = getElement('checkout-house-number');
            const zipField = getElement('checkout-zip');
            const cityField = getElement('checkout-city');
            const countryField = getElement('checkout-country');
            
            // Kunden-Update nur ausführen, wenn alle Felder vorhanden sind
            if (firstNameField && lastNameField && emailField && streetField && houseNumberField && zipField && cityField) {
                const customerData = {
                    firstName: firstNameField.value,
                    lastName: lastNameField.value,
                    name: `${firstNameField.value} ${lastNameField.value}`,
                    email: emailField.value,
                    street: streetField.value,
                    houseNumber: houseNumberField.value,
                    address: `${streetField.value} ${houseNumberField.value}`,
                    zip: zipField.value,
                    city: cityField.value,
                    country: countryField ? countryField.value : 'DE',
                    fullAddress: `${streetField.value} ${houseNumberField.value}, ${zipField.value} ${cityField.value}`
                };
                
                // Kundendaten aktualisieren
                checkout.updateCustomer(customerData);
            }
            
            // Zahlungsmethode prüfen
            const paymentMethod = document.querySelector('input[name="payment-method"]:checked');
            
            if (paymentMethod) {
                // Direkt den Wert übergeben, nicht das Event-Objekt
                checkout.updatePaymentMethod(paymentMethod.value);
            } else {
                console.error("Keine Zahlungsmethode ausgewählt!");
                
                // Zeige Validierungsfehler für Zahlungsmethode
                const paymentContainer = getElement('.payment-options');
                if (paymentContainer) {
                    paymentContainer.classList.add('validation-error');
                    paymentContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                
                showCustomAlert("Bitte wählen Sie eine Zahlungsmethode aus.");
                return;
            }
            
            // Warenkorb aus localStorage laden
            const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
            checkout.updateCart(cartItems);
            
            // Formular abschicken - die Logik für PayPal oder andere Zahlungen wird
            // jetzt vollständig in der handleSubmit-Methode der Checkout-Klasse behandelt
            checkout.handleSubmit(e);
            
        } catch (error) {
            console.error("Fehler beim Checkout-Prozess:", error);
            showCustomAlert("Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.");
        }
    }
    
    function continueShopping() {
        closeAllModals();
        window.scrollTo({
            top: getElement('create-section').offsetTop - 20,
            behavior: 'smooth'
        });
    }
    
    // Kontaktformular
    function handleContactForm(e) {
        e.preventDefault();
        
        const name = getElement('name').value;
        const email = getElement('email').value;
        const message = getElement('message').value;
        
        // reCAPTCHA Validierung
        const recaptchaResponse = grecaptcha.getResponse();
        if (!recaptchaResponse) {
            showCustomAlert('Bitte bestätige, dass du kein Robot bist.', 'Captcha-Bestätigung fehlt');
            return;
        }
        
        // Hier würde normalerweise ein AJAX-Request an den Server gesendet werden
        // Beispiel für einen Fetch-Request:
        /*
        fetch('api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                message,
                recaptchaToken: recaptchaResponse
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Vielen Dank für deine Nachricht! Wir werden uns so schnell wie möglich bei dir melden.');
                getElement('contact-form').reset();
                grecaptcha.reset();
            } else {
                alert('Es gab ein Problem beim Senden deiner Nachricht. Bitte versuche es später erneut.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Es gab ein Problem beim Senden deiner Nachricht. Bitte versuche es später erneut.');
        });
        */
        
        // Für Demo-Zwecke:
        alert('Vielen Dank für deine Nachricht! Wir werden uns so schnell wie möglich bei dir melden.');
        getElement('contact-form').reset();
        grecaptcha.reset();
    }
    
    // Hilfsfunktionen für lokalen Speicher
    function getGenerationsLeft() {
        // Prüfe, ob das Limit heute zurückgesetzt werden muss
        const today = new Date().toDateString();
        const lastReset = localStorage.getItem('lastGenerationReset');
        
        if (lastReset !== today) {
            localStorage.setItem('generationsLeft', 30);
            localStorage.setItem('lastGenerationReset', today);
            return 30;
        }
        
        const left = localStorage.getItem('generationsLeft');
        return left ? parseInt(left) : 30;
    }
    
    function setGenerationsLeft(count) {
        localStorage.setItem('generationsLeft', count);
    }
    
    function updateGenerationsCounter() {
        const remainingGenerations = document.getElementById('remaining-generations');
        if (remainingGenerations) {
            remainingGenerations.textContent = state.generationsLeft;
        }
    }
    
    // Funktion, um Änderungen am DOM zu überwachen
    function setupMutationObserver() {
        // Erstelle einen MutationObserver, der Änderungen am DOM überwacht
        const observer = new MutationObserver(function(mutations) {
            // Überprüfe, ob die Änderungen relevant sind (betreffen den Dropdown-Link)
            let shouldFix = false;
            
            for (const mutation of mutations) {
                // Wenn die Änderung den Dropdown-Link betrifft
                if (mutation.target.classList && mutation.target.classList.contains('dropdown') ||
                    mutation.target.parentElement && mutation.target.parentElement.classList && 
                    mutation.target.parentElement.classList.contains('dropdown')) {
                    shouldFix = true;
                    break;
                }
            }
            
            // Nur wenn die Änderungen relevant sind, führe fixLegalPagesDropdown aus
            if (shouldFix) {
                fixLegalPagesDropdown();
            }
        });
        
        // Konfiguriere den Observer, um nur Änderungen an Attributen und am Inhalt des Dropdown-Menüs zu überwachen
        const config = { attributes: true, childList: true, subtree: true };
        
        // Finde das Dropdown-Element
        const dropdown = document.querySelector('.dropdown');
        if (dropdown) {
            // Starte die Überwachung nur für das Dropdown-Element
            observer.observe(dropdown, config);
        }
    }
    
    // Funktion zum Behandeln von Hash-Links in der URL
    function handleHashInUrl() {
        // Wenn das NavigationModule verfügbar ist, benutze dessen Implementierung
        if (window.NavigationModule) {
            window.NavigationModule.handleHashInUrl();
            return;
        }

        // Fallback-Implementierung, wenn kein NavigationModule verfügbar ist
        if (window.location.hash) {
            setTimeout(() => {
                const targetId = window.location.hash.substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    // Berechne die Position des Zielelements und füge einen Offset hinzu
                    const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
                    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
                    
                    // Standard-Offset
                    let offsetValue = 20;
                    
                    // Spezifische Offsets für bestimmte Abschnitte
                    if (targetId === 'create-section') {
                        offsetValue = 10; // Kleinerer Offset für den Erstellungsbereich
                    } else if (targetId === 'inspiration' || targetId === 'hints') {
                        offsetValue = 30; // Größerer Offset für Inspiration und FAQ
                    } else if (targetId === 'contact') {
                        offsetValue = 25; // Mittlerer Offset für Kontakt
                    }
                    
                    // Scrolle zur berechneten Position
                    const offsetPosition = targetPosition - headerHeight - offsetValue;
                    
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }, 300);
        }
    }

    function setupSmoothScrolling() {
        // Wenn das NavigationModule verfügbar ist, benutze dessen Implementierung
        if (window.NavigationModule) {
            window.NavigationModule.setupSmoothScrolling();
            return;
        }

        // Fallback-Implementierung für Smooth Scrolling
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        
        anchorLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Verhindere Standard-Navigation
                e.preventDefault();
                
                // Hole das Ziel aus dem href-Attribut
                const targetId = link.getAttribute('href').slice(1);
                
                // Wenn das Ziel existiert und nicht leer ist
                if (targetId && targetId !== '') {
                    const targetElement = document.getElementById(targetId);
                    
                    if (targetElement) {
                        const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
                        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
                        const offsetValue = 20;
                        const offsetPosition = targetPosition - headerHeight - offsetValue;
                        
                        window.scrollTo({
                            top: offsetPosition,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });
    }

    function getPrice(size) {
        switch(size) {
            case '21x29.7': return 2065; // 20,65 € in Cent
            case '29.7x42': return 3373; // 33,73 € in Cent
            case '42x59.4': return 3780; // 37,80 € in Cent
            case '50x70': return 3370; // 33,70 € in Cent
            case '59.4x84.1': return 5063; // 50,63 € in Cent
            case '84.1x118.9': return 5063; // 50,63 € in Cent
            default: return 3370; // Standard-Preis für den Fall eines unbekannten Formats
        }
    }
    
    function formatSize(sizeCode) {
        switch(sizeCode) {
            case '21x29.7': return '21 x 29,70 cm';
            case '29.7x42': return '29,70 x 42 cm A3';
            case '42x59.4': return '42 x 59,40 cm A2';
            case '50x70': return '50 x 70 cm';
            case '59.4x84.1': return '59,40 x 84,10 cm A1';
            case '84.1x118.9': return '84,10 x 118,90 cm A0';
            default: return sizeCode;
        }
    }
    
    // Prüfen, ob eine Bestellbestätigung angezeigt werden soll
    function checkForOrderConfirmation() {
        // Prüfe URL-Parameter
        const urlParams = new URLSearchParams(window.location.search);
        const showConfirmation = urlParams.get('confirmation');
        
        // Prüfe LocalStorage auf gespeicherte Bestätigung
        const savedConfirmation = localStorage.getItem('showOrderConfirmation');
        
        if (showConfirmation && savedConfirmation) {
            try {
                const confirmationData = JSON.parse(savedConfirmation);
                const timestamp = confirmationData.timestamp;
                const now = new Date().getTime();
                
                // Nur anzeigen, wenn die Bestätigung nicht älter als 5 Minuten ist
                if (now - timestamp < 5 * 60 * 1000) {
                    // Bestellnummer anzeigen
                    const orderNumber = document.getElementById('order-number');
                    if (orderNumber && confirmationData.orderId) {
                        orderNumber.textContent = `#${confirmationData.orderId}`;
                    }
                    
                    // Modal anzeigen
                    confirmationModal.style.display = 'block';
                    confirmationModal.classList.add('active');
                }
                
                // LocalStorage-Eintrag löschen
                localStorage.removeItem('showOrderConfirmation');
                
                // URL-Parameter entfernen
                const newUrl = window.location.pathname + window.location.hash;
                window.history.replaceState({}, document.title, newUrl);
            } catch (error) {
                console.error('Fehler beim Anzeigen der Bestellbestätigung:', error);
            }
        }
    }

    // Gesamtsumme des Warenkorbs berechnen
    function calculateCartTotal() {
        // Benutze CartModule, wenn verfügbar, ansonsten berechne manuell
        if (window.CartModule) {
            return window.CartModule.calculateTotal();
        }
        
        return state.cart.reduce((total, item) => {
            return total + (parseFloat(item.price) || 0);
        }, 0);
    }

    // Loading-Overlay entfernen, falls vorhanden
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }

    // Funktion zum Löschen eines generierten Bildes
    function deleteGeneratedImage(imageId) {
        // Finde das Bild im State
        const imageIndex = state.generatedImages.findIndex(img => img.id === imageId);
        if (imageIndex !== -1) {
            // Entferne das Bild aus dem State
            state.generatedImages.splice(imageIndex, 1);
            // Speichere die aktualisierten Bilder im LocalStorage
            saveGeneratedImagesToStorage(state.generatedImages);
            
            // Entferne das Bild aus der UI
            const imageElement = document.querySelector(`.result-image[data-id="${imageId}"]`);
            if (imageElement && imageElement.parentElement) {
                imageElement.parentElement.remove();
            }
        }
    }
});

// Globale Funktion für das Umschalten des Mobile-Menüs
window.toggleMobileMenu = function() {
    const mainNav = document.querySelector('.main-nav');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    
    if (mainNav && mobileMenuBtn) {
        mainNav.classList.toggle('active');
        mobileMenuBtn.classList.toggle('active');
    }
};

// Globaler Event-Listener für das Hamburger-Menü, damit es auf allen Seiten funktioniert
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) {
        // Alte Event-Listener entfernen
        const oldListener = function() {
            const nav = document.querySelector('.main-nav');
            if (nav) {
                nav.classList.toggle('active');
            }
        };
        mobileMenuBtn.removeEventListener('click', oldListener);
        
        // Neuen Event-Listener hinzufügen
        mobileMenuBtn.addEventListener('click', function() {
            window.toggleMobileMenu();
        });
    }
}); 