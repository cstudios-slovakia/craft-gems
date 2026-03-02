<?php

namespace gemini\craftgems\services;

use Craft;
use craft\base\Component;
use craft\elements\Asset;
use gemini\craftgems\CraftGems;
use GuzzleHttp\Client;

class GeminiService extends Component
{
    /**
     * Sends an image to a Gemini Gem for processing and returns the result.
     * We'll use the gemini-1.5-pro model for multimodal (image + text) tasks or gemini-1.5-flash.
     *
     * @param Asset $asset The Craft CMS Asset
     * @param string $instruction The prompt instruction from the Gem
     * @return string|null The processed text result
     */
    public function processAsset(\craft\elements\Asset $asset, string $instruction): ?string
    {
        $settings = CraftGems::$plugin->getSettings();
        $apiKey = $settings->apiKey;

        if (!$apiKey) {
            Craft::error('Gemini API Key not set.', 'craft-gems');
            return null;
        }

        try {
            $stream = $asset->getStream();
            if (!$stream) {
                Craft::error('Could not read asset stream for ID ' . $asset->id, 'craft-gems');
                return null;
            }

            $mimeType = $asset->getMimeType();
            $base64Data = base64_encode(stream_get_contents($stream));

            $client = new \GuzzleHttp\Client([
                'base_uri' => 'https://generativelanguage.googleapis.com/',
            ]);

            $payload = [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $instruction],
                            [
                                'inlineData' => [
                                    'mimeType' => $mimeType,
                                    'data' => $base64Data,
                                ]
                            ]
                        ]
                    ]
                ]
            ];

            $response = $client->post('v1beta/models/gemini-1.5-flash:generateContent?key=' . $apiKey, [
                'json' => $payload,
                'headers' => [
                    'Content-Type' => 'application/json',
                ]
            ]);

            $body = json_decode($response->getBody()->getContents(), true);

            if (isset($body['candidates'][0]['content']['parts'][0]['text'])) {
                return $body['candidates'][0]['content']['parts'][0]['text'];
            }

            Craft::error('Unexpected Gemini API response format: ' . json_encode($body), 'craft-gems');
            return null;

        } catch (\Exception $e) {
            Craft::error('Gemini API Request Failed: ' . $e->getMessage(), 'craft-gems');
            return null;
        }
    }
}
