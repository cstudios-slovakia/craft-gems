<?php

namespace gemini\craftgems\services;

use Craft;
use craft\base\Component;
use gemini\craftgems\CraftGems;
use GuzzleHttp\Client;

class GeminiService extends Component
{
    /**
     * Sends an image to a Gemini Gem for processing.
     *
     * @param string $imageUrl
     * @param string $instruction
     * @return string|null The processed result (likely a URL or text, depending on the Gem)
     */
    public function processAsset(string $imageUrl, string $instruction): ?string
    {
        $settings = CraftGems::$plugin->getSettings();
        $apiKey = $settings->apiKey;

        if (!$apiKey) {
            Craft::error('Gemini API Key not set.', 'craft-gems');
            return null;
        }

        // Placeholder for actual Gemini API call
        Craft::info("Processing asset $imageUrl with instruction: $instruction", 'craft-gems');

        return "processed_result_placeholder";
    }
}
