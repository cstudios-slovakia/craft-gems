<?php

namespace gemini\craftgems\controllers;

use Craft;
use craft\web\Controller;
use craft\elements\Asset;
use gemini\craftgems\CraftGems;
use gemini\craftgems\jobs\ProcessAssetJob;

class AssetController extends Controller
{
    protected array|int|bool $allowAnonymous = false;

    public function actionProcess()
    {
        $this->requirePostRequest();
        $this->requireAcceptsJson();

        $assetId = (int) Craft::$app->request->getBodyParam('assetId');
        $gemIndex = Craft::$app->request->getBodyParam('gemIndex');

        if (!$assetId || $gemIndex === null) {
            return $this->asFailure('Missing asset ID or Gem selection.');
        }

        $settings = CraftGems::$plugin->getSettings();
        $gems = $settings->gems;

        if (!isset($gems[$gemIndex])) {
            return $this->asFailure('Invalid Gem selected.');
        }

        $gem = $gems[$gemIndex];
        $instruction = $gem['instruction'] ?? '';

        // Push to queue
        Craft::$app->queue->push(new ProcessAssetJob([
            'assetId' => $assetId,
            'gemInstruction' => $instruction,
        ]));

        return $this->asSuccess('Asset processing started in background.');
    }

    public function actionEditorProcess()
    {
        $this->requirePostRequest();
        $this->requireAcceptsJson();

        $assetId = (int) Craft::$app->request->getBodyParam('assetId');
        $gemIndex = Craft::$app->request->getBodyParam('gemIndex');

        if (!$assetId || $gemIndex === null) {
            return $this->asFailure('Missing asset ID or Gem selection.');
        }

        $asset = \craft\elements\Asset::find()->id($assetId)->one();
        if (!$asset) {
            return $this->asFailure('Asset not found.');
        }

        $settings = CraftGems::$plugin->getSettings();
        $gems = $settings->gems;

        if (!isset($gems[$gemIndex])) {
            return $this->asFailure('Invalid Gem selected.');
        }

        $gem = $gems[$gemIndex];
        $instruction = $gem['instruction'] ?? '';

        try {
            // Wait for response synchronously for the editor
            $base64Image = CraftGems::$plugin->geminiService->editImage($asset, $instruction);

            if ($base64Image) {
                return $this->asJson([
                    'success' => true,
                    'base64' => $base64Image
                ]);
            }

            return $this->asFailure('Image generation failed or returned no data.');
        } catch (\Throwable $e) {
            Craft::error("Editor process failed: " . $e->getMessage(), 'craft-gems');
            return $this->asFailure('Error generating image: ' . $e->getMessage());
        }
    }

    public function actionEditorSave()
    {
        $this->requirePostRequest();
        $this->requireAcceptsJson();

        $assetId = (int) Craft::$app->request->getBodyParam('assetId');
        $imageSrc = Craft::$app->request->getBodyParam('imageSrc');

        if (!$assetId || !$imageSrc) {
            return $this->asFailure('Missing asset ID or image data.');
        }

        $asset = \craft\elements\Asset::find()->id($assetId)->one();
        if (!$asset) {
            return $this->asFailure('Asset not found.');
        }

        try {
            // Expecting data:image/jpeg;base64,...
            if (preg_match('/^data:image\/(\w+);base64,/', $imageSrc, $type)) {
                $imageSrc = substr($imageSrc, strpos($imageSrc, ',') + 1);
                $type = strtolower($type[1]); // jpg, png, gif

                // Save to temp file
                $tempPath = Craft::$app->path->getTempPath() . '/craft-gems-editor-' . uniqid() . '.' . $type;
                file_put_contents($tempPath, base64_decode($imageSrc));

                // Save replacing existing asset
                $volume = $asset->getVolume();
                Craft::$app->elements->saveElement($asset);
                // Update file directly or create a new version
                Craft::$app->assets->replaceAssetFile($asset, $tempPath, $asset->filename);

                unlink($tempPath);

                return $this->asJson(['success' => true]);
            } else {
                return $this->asFailure('Invalid image data format.');
            }
        } catch (\Throwable $e) {
            Craft::error("Editor save failed: " . $e->getMessage(), 'craft-gems');
            return $this->asFailure('Error saving image: ' . $e->getMessage());
        }
    }
}
