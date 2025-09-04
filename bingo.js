 (function($){
     $(document).ready(function(){
         const ss = window.sessionStorage;
         const playersCount = Number(ss.getItem('playersCount') || '0');
         const gross = Number(ss.getItem('gross') || '0');
         const GamePrize = Number(ss.getItem('GamePrize') || '0');
         const systemCut = Number(ss.getItem('systemCut') || '0');
         const retailorCut = Number(ss.getItem('retailorCut') || '0');
         const reduceCartelaPrice = JSON.parse(ss.getItem('reduceCartelaPrice') || 'false');
         const activeCards = JSON.parse(ss.getItem('activeCards') || '[]');
         const activeCartdsBinogoNumber = JSON.parse(ss.getItem('activeCartdsBinogoNumber') || '[]');

        const cartelaPrice = Number(ss.getItem('cartelaPrice') || '0');
        const pattern = ss.getItem('pattern') || '1';
        const requiredLines = parseInt(pattern, 10) || 1; // Default to 1 line if pattern is invalid
        
        const $gamePrizeEl = $('#GamePrize > h2');
        const $betEl = $('#bet > h2');
         if ($gamePrizeEl.length) { $gamePrizeEl.text(GamePrize); }
         if ($betEl.length) { $betEl.text(cartelaPrice); }

         // Build id -> raw string columns map from session (no extra session writes)
         const idToCols = {};
         try {
             activeCartdsBinogoNumber.forEach(function(card){
                 if (!card || typeof card !== 'object') return;
                 const id = String(card.id || '').trim();
                 if (!id) return;
                 idToCols[id] = {
                     B: String(card.B || ''),
                     I: String(card.I || ''),
                     N: String(card.N || ''),
                     G: String(card.G || ''),
                     O: String(card.O || '')
                 };
             });
         } catch(e) {}

         // Game settings
         let gameSpeed = 3000;
         const audioBase = '/wp-content/uploads/2025/08';

                 let interval = null;
        let gamePaused = false;
        let allowedPatterns = [];
        let numbers = [];
        let currentIndex = 0;
        let calledCount = 0;
        let gameStarted = false; // Track if play button was pressed at least once
        let gameDataSent = false; // Track if game end data was already sent

                 // Audio cache for better performance
        const audioCache = {};
        
        function playAudio(file){
            try {
                const audioUrl = audioBase + '/' + file;
                
                // Use cached audio or create new one
                if (!audioCache[file]) {
                    audioCache[file] = new Audio();
                    audioCache[file].src = audioUrl;
                    audioCache[file].preload = 'auto';
                }
                
                const audio = audioCache[file];
                audio.currentTime = 0; // Reset to beginning
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(function(){});
                }
            } catch(e) {}
        }

         (function prewarmAudio(){
             try {
                 ["Game-paused.mp3","game-resumed.mp3"].forEach(function(f){
                     const a = new Audio();
                     a.preload = 'auto';
                     a.src = audioBase + '/' + f;
                 });
             } catch(e) {}
         })();

         function highlightBall(num){
             $(".bingo_bals").removeClass("bingo_selected_ball");
             if(num<=15) $("#bingo_ball_B").addClass("bingo_selected_ball");
             else if(num<=30) $("#bingo_ball_I").addClass("bingo_selected_ball");
             else if(num<=45) $("#bingo_ball_N").addClass("bingo_selected_ball");
             else if(num<=60) $("#bingo_ball_G").addClass("bingo_selected_ball");
             else $("#bingo_ball_O").addClass("bingo_selected_ball");
         }

         function updateNumber(num){
             let letter="";
             if(num<=15) letter="B";
             else if(num<=30) letter="I";
             else if(num<=45) letter="N";
             else if(num<=60) letter="G";
             else letter="O";

             $(".calledBingoNumber").removeClass("currentNumber");
             let $currentNumEl = $("#bingo_num_"+num);
             if($currentNumEl.length) $currentNumEl.addClass("calledBingoNumber currentNumber");

             let $h2 = $("#called_number_text>h2");
             if($h2.length){
                 $h2.text(letter+" "+num);
                 $h2.removeClass("currentNumberAnimate");
                 void $h2[0].offsetWidth;
                 $h2.addClass("currentNumberAnimate");
             }

             calledCount++;
             let $countH2 = $("#called_numbers_count>h2");
             if($countH2.length) $countH2.text(calledCount);

             $(document).trigger("bingo:numberCalled");
         }

         function generateNumbers(){
             let arr=[];
             while(arr.length<75){
                 let r=Math.floor(Math.random()*75)+1;
                 if(!arr.includes(r)) arr.push(r);
             }
             return arr;
         }

         function callNextNumber(){
             if(currentIndex>=numbers.length){
                 clearInterval(interval);
                 interval=null;
                 return;
             }
             let num=numbers[currentIndex++];
             playAudio(num+".mp3");
             highlightBall(num);
             updateNumber(num);
         }

         numbers = generateNumbers();

         // Simplified state updates
         function updateUIState(){
             const canCheck = currentIndex >= 5 && calledCount >= 5;
             $("#open_check_popup").prop("disabled", !canCheck);
             $("#check_number_input").prop("disabled", !canCheck);
             $("#check_player_btn").prop("disabled", !canCheck);
         }
         $(document).on("bingo:numberCalled", updateUIState);
         updateUIState();

         // Simplified popup handlers
         $(document).on("click", "#open_check_popup", function(e){
             e.preventDefault();
             if (interval) { 
                 clearInterval(interval); 
                 interval = null; 
                 gamePaused = true; 
                 $("#play_pause_game .elementor-button-text").text("Resume"); 
                 playAudio("Game-paused.mp3"); 
             }
             $("#check_box").removeClass("checkBox_hiddne");
         });
         
         $(document).on("click", "#closeCheckbox", function(e){
             e.preventDefault();
             $("#check_box").addClass("checkBox_hiddne");
             $("#checkMessage > h2").text("");
                         // Clear grid
            ["b","i","n","g","o"].forEach(function(l){ 
                for (let i=1;i<=5;i++){ 
                    const sel = '#bingo_check_'+l+i; 
                    const $cell = $(sel);
                    // Clear text from any child element
                    $cell.find('> p, > h2, > span, > div').text('');
                    $cell.removeClass('checkCardNumWhiteMatch bingoLineComplete'); 
                } 
            });
             // Resume if paused
             if (!interval && gamePaused) { 
                 interval = setInterval(callNextNumber, gameSpeed); 
                 gamePaused = false; 
                 $("#play_pause_game .elementor-button-text").text("Pause"); 
                 playAudio("game-resumed.mp3"); 
             }
         });

         // Parse comma-separated values per column into array of strings
         function parseColumnValues(raw){
             return String(raw || '')
                 .split(',')
                 .map(function(x){ return String(x).trim(); });
         }

         $(document).on("click", "#check_player_btn", function(){
             if (interval) { clearInterval(interval); interval = null; playAudio("Game-paused.mp3"); }
             const inputNum = String($("#check_number_input").val() || '').trim();
             const $msg = $("#checkMessage > h2");
             if (!inputNum) { 
                $msg.html('<span style="color:red;font-weight:bold;">ካርታ ቁጥር ያስገቡ</span>'); 
                ["b","i","n","g","o"].forEach(function(l){ 
                    for (let i=1;i<=5;i++){ 
                        const sel = '#bingo_check_'+l+i; 
                        $(sel).find('> p, > h2, > span, > div').text(''); 
                        $(sel).removeClass('checkCardNumWhiteMatch bingoLineComplete'); 
                    } 
                }); 
                return; 
            }
             
             // Ensure the ID is among active cards
                         if (!activeCards.includes(inputNum)) { 
                $msg.html('<span style="color:red;font-weight:bold;">ካርታ አልተመዘገበም</span>'); 
                ["b","i","n","g","o"].forEach(function(l){ 
                    for (let i=1;i<=5;i++){ 
                        const sel = '#bingo_check_'+l+i; 
                        $(sel).find('> p, > h2, > span, > div').text(''); 
                        $(sel).removeClass('checkCardNumWhiteMatch bingoLineComplete'); 
                    } 
                });
                return; 
            }

            const colsRaw = idToCols[inputNum];
            if (!colsRaw) { 
                $msg.html('<span style="color:red;font-weight:bold;">ካርታ አልተገኘም</span>'); 
                ["b","i","n","g","o"].forEach(function(l){ 
                    for (let i=1;i<=5;i++){ 
                        const sel = '#bingo_check_'+l+i; 
                        $(sel).find('> p, > h2, > span, > div').text(''); 
                        $(sel).removeClass('checkCardNumWhiteMatch bingoLineComplete'); 
                    } 
                });
                return; 
            }

             // Build value arrays by splitting the comma-separated fields
             const B = parseColumnValues(colsRaw.B);
             const I = parseColumnValues(colsRaw.I);
             const N = parseColumnValues(colsRaw.N);
             const G = parseColumnValues(colsRaw.G);
             const O = parseColumnValues(colsRaw.O);
             const letters = ['B','I','N','G','O'];
             const columns = { B, I, N, G, O };

             // Called numbers normalized as strings without leading zeros
             const calledNums = numbers.slice(0, currentIndex).map(function(n){ return String(n).replace(/^0+/, ''); });

            // Prepare grid selection map - try different selectors
            const gridLetters = ['b','i','n','g','o'];
            const gridCells = {};
            gridLetters.forEach(function(lower){
                gridCells[lower] = [];
                for (let i=1; i<=5; i++){
                    const selector = '#bingo_check_'+lower+i;
                    const $cell = $(selector);
                    // Try different possible child selectors
                    const $textEl = $cell.find('> p').length ? $cell.find('> p') : 
                                   $cell.find('> h2').length ? $cell.find('> h2') : 
                                   $cell.find('> span').length ? $cell.find('> span') : 
                                   $cell.find('> div').length ? $cell.find('> div') : $cell;
                    gridCells[lower].push({ cell: $cell, textEl: $textEl });
                }
            });

            // Fill text and highlight called numbers
            letters.forEach(function(letter, colIndex){
                const lower = letter.toLowerCase();
                const vals = columns[letter] || [];
                const slots = gridCells[lower];
                for (let row=0; row<5; row++){
                    const slot = slots[row]; if (!slot) continue;
                    // Center free space
                    if (letter==='N' && row===2) {
                        slot.textEl.text('');
                        slot.cell.addClass('checkCardNumWhiteMatch');
                        slot.cell.removeClass('bingoLineComplete');
                        continue;
                    }
                    const numVal = vals[row] ? String(vals[row]).trim() : '';
                    const norm = numVal.replace(/^0+/, '');
                    slot.textEl.text(numVal);
                    if (norm && calledNums.includes(norm)) {
                        slot.cell.addClass('checkCardNumWhiteMatch');
                    } else {
                        slot.cell.removeClass('checkCardNumWhiteMatch');
                    }
                }
            });

             // Build numeric grid for line checks (0 for empty/center)
             const grid = [];
             for (let r=0; r<5; r++){
                 grid[r] = [];
                 for (let c=0; c<5; c++){
                     if (r===2 && c===2) { grid[r][c] = 0; continue; }
                     const colLetter = letters[c];
                     const arr = columns[colLetter] || [];
                     const vStr = arr[r] ? String(arr[r]).trim() : '';
                     const v = vStr ? parseInt(vStr, 10) : 0;
                     grid[r][c] = Number.isFinite(v) ? v : 0;
                 }
             }

             // Line completion checks
             let completedCells = Array.from({length: 5}, () => Array(5).fill(false));
             let completedLines = [];

             // Horizontal
             for (let r=0; r<5; r++){
                 let ok = true; let hasNumbers = false;
                 for (let c=0; c<5; c++){
                     if (r===2 && c===2) continue;
                     const v = grid[r][c];
                     if (v !== 0) { hasNumbers = true; if (!calledNums.includes(String(v))) { ok = false; break; } }
                 }
                 if (ok && hasNumbers) { completedLines.push({type:'horizontal', index:r}); for (let c=0;c<5;c++) completedCells[r][c] = true; }
             }
             // Vertical
             for (let c=0; c<5; c++){
                 let ok = true; let hasNumbers = false;
                 for (let r=0; r<5; r++){
                     if (r===2 && c===2) continue;
                     const v = grid[r][c];
                     if (v !== 0) { hasNumbers = true; if (!calledNums.includes(String(v))) { ok = false; break; } }
                 }
                 if (ok && hasNumbers) { completedLines.push({type:'vertical', index:c}); for (let r=0;r<5;r++) completedCells[r][c] = true; }
             }
             // Diagonals
             let ok1 = true; let has1 = false;
             for (let i=0; i<5; i++){ if (i===2) continue; const v = grid[i][i]; if (v !== 0) { has1 = true; if (!calledNums.includes(String(v))) { ok1 = false; break; } } }
             if (ok1 && has1) { completedLines.push({type:'diagonal', index:0}); for (let i=0;i<5;i++) completedCells[i][i] = true; }
             let ok2 = true; let has2 = false;
             for (let i=0; i<5; i++){ if (i===2) continue; const v = grid[i][4-i]; if (v !== 0) { has2 = true; if (!calledNums.includes(String(v))) { ok2 = false; break; } } }
             if (ok2 && has2) { completedLines.push({type:'diagonal', index:1}); for (let i=0;i<5;i++) completedCells[i][4-i] = true; }

             // Highlight completed lines on the UI
             letters.forEach(function(letter, c){
                 const lower = letter.toLowerCase();
                 const slots = gridCells[lower];
                 for (let r=0; r<5; r++){
                     const slot = slots[r]; if (!slot) continue;
                     if (completedCells[r][c] && !(r===2 && c===2)) {
                         slot.cell.addClass('bingoLineComplete');
                     } else {
                         slot.cell.removeClass('bingoLineComplete');
                     }
                 }
             });

			// Compute special patterns
			function isCornersComplete(){
				const corners = [[0,0],[0,4],[4,0],[4,4]];
				for (let i=0;i<corners.length;i++){
					const [r,c] = corners[i];
					const v = grid[r][c];
					if (v===0 || !calledNums.includes(String(v))) return false;
				}
				return true;
			}
			function isMiddlesComplete(){
				const middles = [[2,0],[2,4],[0,2],[4,2]];
				for (let i=0;i<middles.length;i++){
					const [r,c] = middles[i];
					const v = grid[r][c];
					if (v===0 || !calledNums.includes(String(v))) return false;
				}
				return true;
			}

			// Filter lines by allowedPatterns
			let eligibleCount = 0;
			const allowH = allowedPatterns.includes('Any Horizontal');
			const allowV = allowedPatterns.includes('Any Vertical');
			const allowD = allowedPatterns.includes('Any Diagonal');
			const allowC = allowedPatterns.includes('4 Single Corner');
			const allowM = allowedPatterns.includes('4 Single Middle');
			if (allowH) eligibleCount += completedLines.filter(x => x.type==='horizontal').length;
			if (allowV) eligibleCount += completedLines.filter(x => x.type==='vertical').length;
			if (allowD) eligibleCount += completedLines.filter(x => x.type==='diagonal').length;
			if (allowC && isCornersComplete()) eligibleCount += 1; // counts as one line
			if (allowM && isMiddlesComplete()) eligibleCount += 1; // counts as one line

			// Final result based on allowed patterns
			const hasWinningLine = eligibleCount >= requiredLines;
			console.log('Pattern check - Required lines:', requiredLines, 'eligibleCount:', eligibleCount, 'allowedPatterns:', allowedPatterns);
			if (hasWinningLine) { 
				$msg.html('<span style="color:green;font-weight:bold;">አሸንፏል</span>'); 
				playAudio('won.mp3'); 
			} else { 
				$msg.html('<span style="color:red;font-weight:bold;">አላሸነፈም</span>'); 
				playAudio('didnt-win.mp3'); 
			}
		});

         // Runtime fetch and start logic preserved below (unchanged other than readability)
         async function fetchRuntime() {
             try {
                 const url = window.ajaxurl || '/wp-admin/admin-ajax.php';
                 const form = new FormData();
                 form.append('action', 'bingo_get_runtime');
                 form.append('_', String(Date.now()));
                 const resp = await fetch(url, { method: 'POST', body: form, cache: 'no-store', credentials: 'same-origin', headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } });
                 const payload = await resp.json().catch(function(){ return null; });
                 if (!payload) return null;
                 const data = payload && payload.success ? payload.data : payload;
                 return { cartelas_balance: Number((data && data.cartelas_balance) || 0), game_speed: Number((data && data.game_speed) || 3), checking_pattern: (data && Array.isArray(data.checking_pattern)) ? data.checking_pattern : [] };
             } catch (e) { return null; }
         }

         async function startGameWithValidation() {
             try {
                 const url = window.ajaxurl || '/wp-admin/admin-ajax.php';
                 const form = new FormData();
                 form.append('action', 'bingo_start_game');
                 form.append('systemCut', String(systemCut));
                 form.append('retailorCut', String(retailorCut));
                 form.append('gross', String(gross));
                 form.append('_', String(Date.now()));
                 const resp = await fetch(url, { method: 'POST', body: form, cache: 'no-store', credentials: 'same-origin', headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } });
                 const payload = await resp.json().catch(function(){ return null; });
                 if (!payload) return false;
                 if (payload.success) { return true; }
                 const msg = payload.data && payload.data.message ? payload.data.message : 'Game start failed';
                 alert(msg); return false;
             } catch (e) { alert('Unable to start game. Please try again.'); return false; }
         }

                 $(document).on("click", "#play_pause_game a.elementor-button", async function(e){
            e.preventDefault();
            const $btn=$(this);
            if ($btn.prop('disabled')) return;

            if(interval && !gamePaused){
                // Pause - no API call needed, instant response
                clearInterval(interval); 
                interval=null; 
                gamePaused=true; 
                $btn.find('.elementor-button-text').text('Resume'); 
                playAudio('Game-paused.mp3');
                return; // Exit early, no need to disable button
            } else if(gamePaused){
                // Resume - no API call needed, instant response
                interval=setInterval(callNextNumber,gameSpeed); 
                gamePaused=false; 
                $btn.find('.elementor-button-text').text('Pause'); 
                playAudio('game-resumed.mp3');
                return; // Exit early, no need to disable button
            } else {
                // Starting new game - only then do we need API calls
                $btn.prop('disabled', true);
                if (!navigator.onLine) { 
                    alert('No internet connection.'); 
                    $btn.prop('disabled', false); 
                    return; 
                }
                
                const runtime = await fetchRuntime();
                if (!runtime) { 
                    alert('Unable to fetch game settings.'); 
                    $btn.prop('disabled', false); 
                    return; 
                }
                
                const fetchedSpeed = Number(runtime.game_speed || 3);
                gameSpeed = (Number.isFinite(fetchedSpeed) ? fetchedSpeed : 3) * 1000;
                allowedPatterns = Array.isArray(runtime.checking_pattern) ? runtime.checking_pattern : [];

                const validated = await startGameWithValidation();
                if (!validated) { 
                    $btn.prop('disabled', false); 
                    return; 
                }
                
                gameStarted = true; // Mark that game was started
                numbers = numbers && numbers.length === 75 ? numbers : generateNumbers();
                currentIndex = 0; 
                calledCount = 0; 
                callNextNumber(); 
                interval = setInterval(callNextNumber, gameSpeed); 
                $btn.find('.elementor-button-text').text('Pause');
                $btn.prop('disabled', false);
            }
        });

                 function sendGameEndData() {
            // Only send data if the game was actually started (play button pressed) and not already sent
            if (!gameStarted || gameDataSent) {
                return;
            }
            
            // Mark as sent immediately to prevent race conditions
            gameDataSent = true;
            
            try {
                const url = window.ajaxurl || '/wp-admin/admin-ajax.php';
                const form = new FormData();
                form.append('action', 'bingo_end_game');
                form.append('playersCount', String(playersCount));
                form.append('gross', String(gross));
                form.append('retailorCut', String(retailorCut));
                form.append('gameSessionId', String(Date.now()) + '_' + Math.random().toString(36).substr(2, 9)); // Unique session ID
                form.append('_', String(Date.now()));
                if (navigator.sendBeacon) { navigator.sendBeacon(url, form); }
                else { fetch(url, { method: 'POST', body: form, keepalive: true }).catch(function(){}); }
            } catch (e) {}
        }


                 // Single event handler to prevent multiple calls
        function handlePageExit() {
            sendGameEndData();
            // Remove listeners after first call to prevent duplicates
            window.removeEventListener('beforeunload', handlePageExit);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
        
        function handleVisibilityChange() {
            if (document.visibilityState === 'hidden') {
                sendGameEndData();
                // Remove listeners after first call to prevent duplicates
                window.removeEventListener('beforeunload', handlePageExit);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            }
        }
        
        window.addEventListener('beforeunload', handlePageExit);
        document.addEventListener('visibilitychange', handleVisibilityChange);
     });
 })(jQuery);

