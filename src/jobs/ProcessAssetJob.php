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
            $resultText = CraftGems::$plugin->geminiService->processAsset($asset, $this->gemInstruction);

            if ($resultText) {
                Craft::info("Asset {$this->assetId} processed successfully.", 'craft-gems');

                // The generic request was to "process" the asset. We will append the text to the asset title for now, 
                // but this could easily be mapped to a custom field instead.
                $originalTitle = $asset->title;
                $asset->title = trim($originalTitle . ' - ' . $resultText);

                // Save the updated element, circumventing validation if needed, but standard save is best
                if (!Craft::$app->elements->saveElement($asset)) {
                    Craft::error("Failed to save updated asset title: " . implode(', ', $asset->getFirstErrors()), 'craft-gems');
                }
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
