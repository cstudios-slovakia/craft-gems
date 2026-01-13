<?php

namespace gemini\craftgems\jobs;

use Craft;
use craft\elements\Asset;
use craft\queue\BaseJob;
use gemini\craftgems\CraftGems;

class ProcessAssetJob extends BaseJob
{
    public int $assetId;
    public string $gemInstruction;

    public function execute($queue): void
    {
        $asset = Asset::find()->id($this->assetId)->one();

        if (!$asset) {
            return;
        }

        try {
            // Download or get URL of the asset
            $url = $asset->getUrl();

            // Call service
            $result = CraftGems::$plugin->geminiService->processAsset($url, $this->gemInstruction);

            if ($result) {
                // Logic to replace asset content
                Craft::info("Asset {$this->assetId} processed successfully.", 'craft-gems');

                // In a real scenario, $result would be a URL or binary data.
                // We would download it to a temp path.
                // $tempPath = Craft::$app->path->getTempPath() . '/' . uniqid() . '.jpg';
                // file_put_contents($tempPath, file_get_contents($result));

                // For this implementation without a real API, we will just log that we would replace it.
                // To replace:
                // Craft::$app->assets->replaceAssetFile($asset, $tempPath, $asset->filename);

                // Trigger a resave to update transforms/metadata
                // Craft::$app->elements->saveElement($asset);
            }
        } catch (\Throwable $e) {
            Craft::error("Failed to process asset {$this->assetId}: " . $e->getMessage(), 'craft-gems');
            throw $e;
        }
    }

    protected function defaultDescription(): string
    {
        return 'Processing Asset with Craft Gems';
    }
}
