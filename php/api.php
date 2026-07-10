<?php

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

function respond($data, $status)
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function steam_json($url)
{
    $curl = curl_init($url);
    curl_setopt_array($curl, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_USERAGENT => 'Steam Review Monitor/1.0',
        CURLOPT_HTTPHEADER => array('Accept: application/json'),
    ));

    $body = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $error = curl_error($curl);
    curl_close($curl);

    if ($body === false || $error !== '') {
        throw new Exception('Could not connect to Steam: ' . $error);
    }
    if ($status < 200 || $status >= 300) {
        throw new Exception('Steam API returned HTTP ' . $status);
    }

    $data = json_decode($body, true);
    if (!is_array($data)) {
        throw new Exception('Steam API returned invalid JSON');
    }
    return $data;
}

function configured_games()
{
    $path = __DIR__ . DIRECTORY_SEPARATOR . 'config.json';
    $body = @file_get_contents($path);
    $config = $body === false ? null : json_decode($body, true);
    if (!is_array($config) || !isset($config['games']) || !is_array($config['games'])) {
        throw new Exception('config.json is missing or invalid');
    }
    return $config['games'];
}

function requested_ids($value)
{
    $parts = explode(',', (string) $value);
    $ids = array();
    foreach ($parts as $part) {
        $id = trim($part);
        if ($id === '') {
            continue;
        }
        if (!preg_match('/^[0-9]+$/', $id)) {
            respond(array('error' => 'ids must contain comma-separated Steam app IDs'), 400);
        }
        if (!in_array($id, $ids, true)) {
            $ids[] = $id;
        }
    }
    if (count($ids) < 1 || count($ids) > 20) {
        respond(array('error' => 'ids must contain 1-20 Steam app IDs'), 400);
    }
    return $ids;
}

function game_details($ids)
{
    $games = array();
    foreach ($ids as $appId) {
        $name = 'Steam App ' . $appId;
        try {
            $url = 'https://store.steampowered.com/api/appdetails?appids=' . rawurlencode($appId);
            $data = steam_json($url);
            if (isset($data[$appId]['success']) && $data[$appId]['success'] &&
                isset($data[$appId]['data']['name'])) {
                $name = $data[$appId]['data']['name'];
            }
        } catch (Exception $ignored) {
            // Keep the readable App ID fallback if Steam details are unavailable.
        }
        $games[] = array('appId' => $appId, 'name' => $name);
    }
    return $games;
}

function reviews($appId)
{
    if (!preg_match('/^[0-9]+$/', $appId)) {
        respond(array('error' => 'appId must be a Steam app ID'), 400);
    }

    $url = 'https://store.steampowered.com/appreviews/' . rawurlencode($appId) .
        '?json=1&num_per_page=20&filter=recent&language=all&purchase_type=all';
    $data = steam_json($url);
    if (!isset($data['success']) || (int) $data['success'] !== 1) {
        throw new Exception('Steam API returned success=0');
    }

    $result = array();
    $sourceReviews = isset($data['reviews']) && is_array($data['reviews']) ? $data['reviews'] : array();
    $unanswered = 0;
    $cutoff = time() - 30 * 24 * 60 * 60;

    foreach ($sourceReviews as $review) {
        $developerResponse = isset($review['developer_response']) ? (string) $review['developer_response'] : '';
        $createdAt = isset($review['timestamp_created']) ? (int) $review['timestamp_created'] : 0;
        $needsResponse = $developerResponse === '' && $createdAt > $cutoff;
        if ($needsResponse) {
            $unanswered++;
        }
        $result[] = array(
            'id' => isset($review['recommendationid']) ? (string) $review['recommendationid'] : '',
            'author' => isset($review['author']['steamid']) ? (string) $review['author']['steamid'] : '',
            'text' => isset($review['review']) ? (string) $review['review'] : '',
            'thumbsUp' => !empty($review['voted_up']),
            'createdAt' => $createdAt,
            'developerResponse' => $developerResponse,
            'needsResponse' => $needsResponse,
        );
    }

    $totalReviews = isset($data['query_summary']['total_reviews'])
        ? (int) $data['query_summary']['total_reviews']
        : count($result);

    return array(
        'appId' => $appId,
        'totalFetched' => count($result),
        'totalReviews' => $totalReviews,
        'unansweredCount' => $unanswered,
        'reviews' => $result,
    );
}

try {
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    if ($action === 'games') {
        if (!isset($_GET['ids']) || trim($_GET['ids']) === '') {
            respond(configured_games(), 200);
        }
        respond(game_details(requested_ids($_GET['ids'])), 200);
    }
    if ($action === 'reviews') {
        if (!isset($_GET['appId'])) {
            respond(array('error' => 'appId is required'), 400);
        }
        respond(reviews((string) $_GET['appId']), 200);
    }
    respond(array('error' => 'Unknown action'), 404);
} catch (Exception $error) {
    respond(array('error' => $error->getMessage()), 502);
}
