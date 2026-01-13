<?php

namespace gemini\craftgems\controllers;

use Craft;
use craft\web\Controller;
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
}
