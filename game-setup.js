(function($){
    $(document).ready(function(){
        // Game setup script - only stores essential data in sessionStorage
        // This runs on the setup page before navigating to /game
        
        let activeCards = [];
        let activeCardsBingoNumber = [];
        let cartelaPrice = 0;
        let pattern = '1';
        
        // Function to validate and store game data
        function storeGameData() {
            // Validate required data
            if (!activeCards.length) {
                alert('Please select at least one card');
                return false;
            }
            
            if (!cartelaPrice || cartelaPrice <= 0) {
                alert('Please set a valid cartela price');
                return false;
            }
            
            // Store only essential data in sessionStorage
            sessionStorage.setItem('activeCards', JSON.stringify(activeCards));
            sessionStorage.setItem('activeCardsBingoNumber', JSON.stringify(activeCardsBingoNumber));
            sessionStorage.setItem('cartelaPrice', cartelaPrice.toString());
            sessionStorage.setItem('pattern', pattern);
            
            return true;
        }
        
        // Function to add a card to active cards
        function addCard(cardId, cardData) {
            if (!activeCards.includes(cardId)) {
                activeCards.push(cardId);
                if (cardData) {
                    activeCardsBingoNumber.push(cardData);
                }
            }
        }
        
        // Function to remove a card from active cards
        function removeCard(cardId) {
            const index = activeCards.indexOf(cardId);
            if (index > -1) {
                activeCards.splice(index, 1);
                // Also remove from bingoNumber array
                const bingoIndex = activeCardsBingoNumber.findIndex(card => card.id === cardId);
                if (bingoIndex > -1) {
                    activeCardsBingoNumber.splice(bingoIndex, 1);
                }
            }
        }
        
        // Function to set cartela price
        function setCartelaPrice(price) {
            cartelaPrice = parseFloat(price) || 0;
        }
        
        // Function to set pattern
        function setPattern(patternValue) {
            pattern = patternValue || '1';
        }
        
        // Event handler for start game button
        $(document).on('click', '#start_game_btn', function(e) {
            e.preventDefault();
            
            if (storeGameData()) {
                // Navigate to game page
                window.location.href = '/game';
            }
        });
        
        // Expose functions for external use
        window.gameSetup = {
            addCard: addCard,
            removeCard: removeCard,
            setCartelaPrice: setCartelaPrice,
            setPattern: setPattern,
            getActiveCards: function() { return activeCards; },
            getCartelaPrice: function() { return cartelaPrice; },
            getPattern: function() { return pattern; }
        };
        
        // Initialize from existing sessionStorage if available (for page refresh)
        const storedCards = sessionStorage.getItem('activeCards');
        const storedBingoNumbers = sessionStorage.getItem('activeCardsBingoNumber');
        const storedPrice = sessionStorage.getItem('cartelaPrice');
        const storedPattern = sessionStorage.getItem('pattern');
        
        if (storedCards) {
            try {
                activeCards = JSON.parse(storedCards);
            } catch(e) {
                activeCards = [];
            }
        }
        
        if (storedBingoNumbers) {
            try {
                activeCardsBingoNumber = JSON.parse(storedBingoNumbers);
            } catch(e) {
                activeCardsBingoNumber = [];
            }
        }
        
        if (storedPrice) {
            cartelaPrice = parseFloat(storedPrice) || 0;
        }
        
        if (storedPattern) {
            pattern = storedPattern;
        }
    });
})(jQuery);