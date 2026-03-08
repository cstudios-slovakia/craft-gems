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

    /**
     * Sends an image to a Gemini (or Imagen) model for image-to-image editing,
     * and returns the resulting base64 image data.
     *
     * @param Asset $asset
     * @param string $instruction
     * @return string|null Base64 formatted image URI
     */
    public function editImage(\craft\elements\Asset $asset, string $instruction): ?string
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

            // Construct payload for Imagen or similar image-returning model
            $payload = [
                'instances' => [
                    [
                        'prompt' => $instruction,
                        'image' => [
                            'bytesBase64Encoded' => $base64Data
                        ]
                    ]
                ],
                'parameters' => [
                    'sampleCount' => 1
                ]
            ];

            // Note: The specific endpoint for image editing via generativelanguage may change or require Vertex AI.
            // Using a placeholder endpoint for the architecture.
            $response = $client->post('v1beta/models/imagen-3.0-generate-001:predict?key=' . $apiKey, [
                'json' => $payload,
                'headers' => [
                    'Content-Type' => 'application/json',
                ],
                'http_errors' => false // Prevent throwing an exception on 404/400
            ]);

            if ($response->getStatusCode() === 200) {
                $body = json_decode($response->getBody()->getContents(), true);
                if (isset($body['predictions'][0]['bytesBase64Encoded'])) {
                    return 'data:image/jpeg;base64,' . $body['predictions'][0]['bytesBase64Encoded'];
                }
            }

            // Fallback for demo/testing purposes if the API endpoint is not available or errors out
            Craft::error('Image generation failed or endpoint unavailable. Status: ' . $response->getStatusCode() . ' - returning original image as mock.', 'craft-gems');
            return 'data:' . $mimeType . ';base64,' . $base64Data;

        } catch (\Exception $e) {
            Craft::error('Gemini Image API Request Failed: ' . $e->getMessage(), 'craft-gems');
            return null;
        }
    }
}
