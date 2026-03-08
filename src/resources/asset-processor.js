if (typeof jQuery === 'undefined') {
    window.addEventListener('load', function () {
        if (typeof jQuery !== 'undefined') {
            initCraftGemsAssetProcessor(jQuery);
        }
    });
} else {
    initCraftGemsAssetProcessor(jQuery);
}

function initCraftGemsAssetProcessor($) {
    /**
     * Craft Gems Asset Processor
     */

    var settings = window.craftGemsSettings || { gems: [] };

    function injectCraftGemsUI($sidebar) {
        if ($sidebar.find('.craft-gems-processor').length) return;

        var $container = $('<div class="craft-gems-processor meta"></div>');
        var $heading = $('<div class="heading">Craft Gems</div>');
        var $content = $('<div class="data"></div>');

        // Create Dropdown
        var $select = $('<div class="select fullwidth"><select id="craft-gems-select"><option value="">Select a Gem...</option></select></div>');
        var $selectInput = $select.find('select');

        settings.gems.forEach(function (gem, index) {
            $selectInput.append(`<option value="${index}">${gem.name}</option>`);
        });

        // Create Button
        var $btn = $('<button type="button" class="btn small disabled" id="craft-gems-process-btn">Process</button>');

        $content.append($select);
        $content.append($btn);
        $container.append($heading);
        $container.append($content);

        // Inject into the primary details panel or sidebar
        var injected = false;
        if ($sidebar.find('#details').length) {
            $sidebar.find('#details').append($container);
            injected = true;
        } else if ($sidebar.find('.meta').last().length) {
            // Alternatively, append after the last .meta block if #details isn't found
            $sidebar.find('.meta').last().after($container);
            injected = true;
        } else {
            // Fallback
            $sidebar.append($container);
            injected = true;
        }

        // Events
        $selectInput.on('change', function () {
            if ($(this).val() !== "") {
                $btn.removeClass('disabled');
            } else {
                $btn.addClass('disabled');
            }
        });

        $btn.on('click', function () {
            var gemIndex = $selectInput.val();

            // In Craft 5, the asset ID is usually in the URL (.../edit/101-filename)
            // or in a hidden input named 'elementId' or 'sourceId'
            var elementId = $('input[name="elementId"]').val() || $('input[name="sourceId"]').val();

            if (!elementId) {
                // Try extracting from URL: /admin/assets/edit/101-2k_earth_normal_map
                var match = window.location.pathname.match(/\/edit\/(\d+)-/);
                if (match) {
                    elementId = match[1];
                }
            }

            if (!elementId || gemIndex === "") {
                Craft.cp.displayError('Could not determine Asset ID.');
                return;
            }

            $btn.addClass('disabled').text('Processing...');

            Craft.postActionRequest('craft-gems/asset/process', {
                assetId: elementId,
                gemIndex: gemIndex
            }, function (response, textStatus) {
                if (textStatus == 'success' && response.success) {
                    Craft.cp.displayNotice('Processing started.');
                } else {
                    Craft.cp.displayError('Error starting process.');
                }
                $btn.removeClass('disabled').text('Process');
            });
        });
    }

    function injectCraftGemsEditorUI($editor) {
        if ($editor.find('.nano-banana-processor').length) return;

        // In the Craft 5.8 Image Editor, tools are tabs inside `div.tabs > ul[role="tablist"]`.
        var $sidebar = $editor.find('.tabs ul[role="tablist"], ul[role="tablist"]').first();

        if (!$sidebar.length) {
            $sidebar = $editor.find('.sidebar, .app-sidebar, .imageeditor, .tool-list, [data-tool], [data-view="rotate"], #rotate-tab, li:contains("Rotate")').closest('ul, .sidebar, .tool-list, div[role="tablist"]');
        }

        if (!$sidebar.length) return;

        // Match the Craft 5 tab style which is an `li` with `role="tab"`
        var $container = $('<li id="nano-banana-tab" data-view="nano-banana" role="tab" tabindex="-1" aria-selected="false" class="" style="margin-top: 20px; border-top: 1px solid var(--hairline-color, rgba(150,150,150,0.2));"></li>');

        // Inside the tab is usually `<i></i>ToolName`. We use our emoji as the icon.
        var $toolBtn = $('<div style="display:flex; flex-direction:column; align-items:center; opacity: 0.8; cursor: pointer; padding: 10px 0;">' +
            '<span style="font-size: 20px; line-height: 1; margin-bottom: 4px;">&#127820;</span>' +
            '<span style="font-size: 11px;">Banana</span>' +
            '</div>');

        var $panel = $('<div class="nano-banana-panel" style="display: none; position: absolute; left: 100%; top: 0; height: 100%; background: var(--sidebar-bg-color, var(--cp-sidebar-bg-color, #f3f7fc)); border-right: 1px solid var(--hairline-color, rgba(150,150,150,0.2)); border-left: 1px solid var(--hairline-color, rgba(150,150,150,0.2)); padding: 24px; width: 320px; z-index: 1000; box-sizing: border-box; box-shadow: 10px 0 20px rgba(0,0,0,0.1); overflow-y: auto; text-align: left; cursor: default;"></div>');
        var $heading = $('<h2 style="margin-top: 0; margin-bottom: 8px; font-size: 18px; font-weight: bold; color: inherit;">Nano Banana</h2><p style="margin-bottom: 24px; opacity: 0.7; font-size: 13px; line-height: 1.4;">Select a pre-configured Gemini prompt to modify this image in real-time.</p>');
        var $select = $('<div class="select fullwidth" style="margin-bottom: 16px;"><select id="nano-banana-gem-select" style="width: 100%;"><option value="">Select Prompt...</option></select></div>');
        var $selectInput = $select.find('select');

        settings.gems.forEach(function (gem, index) {
            $selectInput.append(`<option value="${index}">${gem.name}</option>`);
        });

        var $processBtn = $('<button type="button" class="btn submit fullwidth disabled" id="nano-banana-process-btn" style="height: 40px; font-size: 14px;">Generate Image</button>');

        $panel.append($heading).append($select).append($processBtn);
        $container.append($toolBtn);

        // Append to the list
        $sidebar.append($container);

        // The panel should probably be appended to the parent `.tabs` or `.imageeditor` so it doesn't get clipped by `ul` overflows
        $editor.append($panel);

        $container.on('click', function (e) {
            e.preventDefault();

            if ($panel.is(':visible')) {
                $panel.hide();
                $container.removeClass('selected');
                $container.attr('aria-selected', 'false');
            } else {
                // Ensure other native panels are closed conceptually if possible
                $sidebar.find('li').removeClass('selected').attr('aria-selected', 'false');
                $container.addClass('selected').attr('aria-selected', 'true');

                // Position panel accurately next to sidebar
                var sidebarRect = $sidebar.closest('.tabs')[0].getBoundingClientRect();
                var editorRect = $editor[0].getBoundingClientRect();
                $panel.css({
                    left: (sidebarRect.width) + 'px',
                    top: 0
                });

                $panel.show();
            }
        });

        $selectInput.on('change', function () {
            if ($(this).val() !== "") {
                $processBtn.removeClass('disabled');
            } else {
                $processBtn.addClass('disabled');
            }
        });

        $processBtn.on('click', function () {
            var gemIndex = $selectInput.val();
            var elementId = $('input[name="elementId"]').val() || $('input[name="sourceId"]').val() || Craft.cp.$app.get('assetId'); // Fallbacks

            if (!elementId) {
                var match = window.location.pathname.match(/\/edit\/(\d+)-/);
                if (match) elementId = match[1];
            }

            if (!elementId || gemIndex === "") {
                Craft.cp.displayError('Could not determine Asset ID.');
                return;
            }

            $processBtn.addClass('disabled').text('Generating...');

            Craft.postActionRequest('craft-gems/asset/editor-process', {
                assetId: elementId,
                gemIndex: gemIndex
            }, function (response, textStatus) {
                if (textStatus == 'success' && response.success) {
                    Craft.cp.displayNotice('Image Generated!');
                    $panel.hide();
                    overlayGeneratedImage(response.imageUrl || response.base64);
                } else {
                    Craft.cp.displayError(response.error || 'Error generating image.');
                }
                $processBtn.removeClass('disabled').text('Generate');
            });
        });
    }

    function overlayGeneratedImage(imageSrc) {
        var $canvasContainer = $('.image-editor-canvas, .editor-canvas').first();
        if (!$canvasContainer.length) return;

        // Remove old overlay if exists
        $('#nano-banana-overlay').remove();

        var $overlay = $(`<div id="nano-banana-overlay" style="position: absolute; top:0; left:0; width:100%; height:100%; background: url(${imageSrc}) no-repeat center center; background-size: contain; z-index: 100;"></div>`);
        $canvasContainer.css('position', 'relative').append($overlay);

        // Mark that saving should save the generated image instead (we'll hook into form submit if possible, or provide a separate 'Save Gen Image' button)
        if (!$('#nano-banana-save-btn').length) {
            var $saveTarget = $('.header-buttons .submit').length ? $('.header-buttons') : $('.btngroup.submit').parent();
            var $saveBtn = $('<button type="button" class="btn submit" id="nano-banana-save-btn" style="background-color: #fca311; margin-left:10px;">Save Nano Banana</button>');

            $saveBtn.on('click', function () {
                var elementId = $('input[name="elementId"]').val();
                // Call a backend action to save the generated image as the asset
                Craft.postActionRequest('craft-gems/asset/editor-save', {
                    assetId: elementId,
                    imageSrc: imageSrc
                }, function (response, textStatus) {
                    if (textStatus == 'success' && response.success) {
                        Craft.cp.displayNotice('Generated image saved.');
                        window.location.reload();
                    } else {
                        Craft.cp.displayError('Error saving generated image.');
                    }
                });
            });
            $saveTarget.append($saveBtn);
        }
    }

    // Monitor for the Asset Details or Editor loading
    var observer = new MutationObserver(function (mutations) {
        // Normal Asset Edit Page Sidebar
        if ($('#details').length && !$('.craft-gems-processor').length) {
            injectCraftGemsUI($('#details').parent());
        } else if ($('.editor-content').length && !$('.craft-gems-processor').length) {
            injectCraftGemsUI($('.editor-content'));
        }

        // Image Editor specific - check for the image editor modal/container
        var $imageEditor = $('.image-editor, .imageeditor, .image-editor-main, .slideout-container .image-editor, .slideout-container .imageeditor');
        if ($imageEditor.length) {
            injectCraftGemsEditorUI($imageEditor.last());
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}
