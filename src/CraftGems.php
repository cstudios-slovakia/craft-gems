<?php

namespace gemini\craftgems;

use Craft;
use craft\base\Plugin;
use craft\events\RegisterTemplateRootsEvent;
use craft\web\View;
use yii\base\Event;
use gemini\craftgems\models\Settings;

class CraftGems extends Plugin
{
    public static $plugin;
    public bool $hasCpSettings = true;
    public bool $hasCpSection = false;

    public function init()
    {
        parent::init();
        self::$plugin = $this;

        $this->setComponents([
            'geminiService' => \gemini\craftgems\services\GeminiService::class,
        ]);

        // Register template roots
        Event::on(
            View::class,
            View::EVENT_REGISTER_CP_TEMPLATE_ROOTS,
            function (RegisterTemplateRootsEvent $event) {
                $event->roots['craft-gems'] = __DIR__ . '/templates';
            }
        );

        // Inject JS into CP
        if (Craft::$app->request->isCpRequest) {
            Event::on(
                View::class,
                View::EVENT_BEFORE_RENDER_PAGE_TEMPLATE,
                function (Event $event) {
                    $settings = CraftGems::$plugin->getSettings();
                    $view = Craft::$app->view;
                    $gemsJson = json_encode(['gems' => $settings->gems ?: []]);

                    // Register the variables into the global window scope first
                    $view->registerJs("window.craftGemsSettings = {$gemsJson};", View::POS_HEAD);

                    // Then register our script
                    $url = Craft::$app->assetManager->getPublishedUrl(__DIR__ . '/resources/asset-processor.js', true);
                    $view->registerJsFile($url, ['depends' => [\craft\web\assets\cp\CpAsset::class]]);
                }
            );
        }
    }

    protected function createSettingsModel(): ?\craft\base\Model
    {
        return new Settings();
    }

    protected function settingsHtml(): ?string
    {
        return Craft::$app->view->renderTemplate(
            'craft-gems/settings',
            [
                'settings' => $this->getSettings()
            ]
        );
    }
}
