<?php
// Fresh runtime data for bingo.js: cartelas_balance and game_speed

// Helper: send no-cache headers
function bingo_send_nocache_headers() {
    if (!headers_sent()) {
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Cache-Control: post-check=0, pre-check=0', false);
        header('Pragma: no-cache');
        header('Expires: Wed, 11 Jan 1984 05:00:00 GMT');
        header('Content-Type: application/json; charset=' . get_option('blog_charset'));
    }
}

// Authenticated users
add_action('wp_ajax_bingo_get_runtime', function(){
    bingo_send_nocache_headers();

    $user_id = get_current_user_id();
    if (!$user_id) {
        wp_send_json_error(['message' => 'Not logged in'], 401);
    }

    // Read ACF fields attached to the current user
    $cartelas_balance = intval(get_field('cartelas_balance', 'user_' . $user_id));
    $game_speed = intval(get_field('game_speed', 'user_' . $user_id));
    $checking_pattern = get_field('checking_pattern', 'user_' . $user_id);

    // Sensible defaults if empty
    if ($game_speed <= 0) { $game_speed = 3; }
    if ($cartelas_balance < 0) { $cartelas_balance = 0; }

    // Normalize checking_pattern to array of strings
    if (!is_array($checking_pattern)) { $checking_pattern = $checking_pattern ? [$checking_pattern] : []; }

    wp_send_json_success([
        'cartelas_balance' => $cartelas_balance,
        'game_speed' => $game_speed,
        'checking_pattern' => array_values(array_filter(array_map('strval', $checking_pattern)))
    ]);
});

// Game initialization handler: calculate game values and validate balance
add_action('wp_ajax_bingo_init_game', function(){
    bingo_send_nocache_headers();
    
    $user_id = get_current_user_id();
    if (!$user_id) {
        wp_send_json_error(['message' => 'Not logged in'], 401);
    }
    
    // Check user role
    if (!user_can($user_id, 'um_retailor')) {
        wp_send_json_error(['message' => 'Insufficient permissions'], 403);
    }
    
    // Sanitize and validate input
    $active_cards = json_decode(stripslashes($_POST['activeCards'] ?? '[]'), true);
    $cartela_price = floatval($_POST['cartelaPrice'] ?? 0);
    
    if (!is_array($active_cards) || empty($active_cards)) {
        wp_send_json_error(['message' => 'Invalid active cards'], 400);
    }
    
    if ($cartela_price <= 0) {
        wp_send_json_error(['message' => 'Invalid cartela price'], 400);
    }
    
    // Backend constants
    $player_threshold = 5;
    $retailor_cut_percentage = 0.20;
    $system_commission_percentage = 0.20;
    
    // Calculate game values
    $number_of_players = count($active_cards);
    $gross = $cartela_price * $number_of_players;
    
    // Only apply cuts if players meet threshold
    if ($number_of_players >= $player_threshold) {
        $retailor_cut = $gross * $retailor_cut_percentage;
        $system_commission = $retailor_cut * $system_commission_percentage;
    } else {
        $retailor_cut = 0;
        $system_commission = 0;
    }
    
    $game_prize = $gross - $retailor_cut;
    
    // Check user balance
    $cartelas_balance = intval(get_field('cartelas_balance', 'user_' . $user_id)) ?: 0;
    $can_play = $cartelas_balance >= $system_commission;
    
    // Return only essential data to frontend
    wp_send_json_success([
        'gamePrize' => $game_prize,
        'canPlay' => $can_play,
        // Backend data for game start API call
        'gameData' => [
            'systemCommission' => $system_commission,
            'retailorCut' => $retailor_cut,
            'gross' => $gross,
            'numberOfPlayers' => $number_of_players
        ]
    ]);
});

// Game start handler: check balance, deduct systemCut, increment sales/profit
add_action('wp_ajax_bingo_start_game', function(){
    bingo_send_nocache_headers();
    
    $user_id = get_current_user_id();
    if (!$user_id) {
        wp_send_json_error(['message' => 'Not logged in'], 401);
    }
    
    // Check user role
    if (!user_can($user_id, 'um_retailor')) {
        wp_send_json_error(['message' => 'Insufficient permissions'], 403);
    }
    
    // Sanitize and validate input
    $system_cut = floatval($_POST['systemCut'] ?? 0);
    $retailor_cut = floatval($_POST['retailorCut'] ?? 0);
    $gross = floatval($_POST['gross'] ?? 0);
    $number_of_players = intval($_POST['numberOfPlayers'] ?? 0);
    
    if ($system_cut < 0 || $retailor_cut < 0 || $gross < 0 || $number_of_players < 0) {
        wp_send_json_error(['message' => 'Invalid amounts'], 400);
    }
    
    // Get current balance
    $current_balance = intval(get_field('cartelas_balance', 'user_' . $user_id)) ?: 0;
    
    // Check if balance is sufficient
    if ($current_balance < $system_cut) {
        wp_send_json_error(['message' => 'Not enough balance'], 400);
    }
    
    // Use database transaction for atomicity
    global $wpdb;
    $wpdb->query('START TRANSACTION');
    
    try {
        // Deduct system cut from balance
        $new_balance = $current_balance - $system_cut;
        update_field('cartelas_balance', $new_balance, 'user_' . $user_id);
        
        // Increment total_sales by gross
        $current_sales = intval(get_field('total_sales', 'user_' . $user_id)) ?: 0;
        update_field('total_sales', $current_sales + $gross, 'user_' . $user_id);
        
        // Increment total_profit by retailor cut
        $current_profit = intval(get_field('total_profit', 'user_' . $user_id)) ?: 0;
        update_field('total_profit', $current_profit + $retailor_cut, 'user_' . $user_id);
        
        // Update today_games_json with unique game ID
        $today_games_json = get_field('today_games_json', 'user_' . $user_id);
        $json_array = json_decode($today_games_json, true) ?: [];
        
        // Generate unique game ID to avoid duplicates
        $game_id = uniqid('game_' . $user_id . '_', true);
        
        // Append new game session data
        $json_array[] = [
            'game_id' => $game_id,
            'start_time' => current_time('mysql'),
            'players_count' => $number_of_players,
            'gross' => $gross,
            'retailor_cut' => $retailor_cut,
            'system_cut' => $system_cut
        ];
        
        update_field('today_games_json', json_encode($json_array, JSON_UNESCAPED_UNICODE), 'user_' . $user_id);
        
        $wpdb->query('COMMIT');
        
        wp_send_json_success([
            'new_balance' => $new_balance,
            'game_id' => $game_id,
            'message' => 'Game started successfully'
        ]);
        
    } catch (Exception $e) {
        $wpdb->query('ROLLBACK');
        wp_send_json_error(['message' => 'Database error'], 500);
    }
});


?>

