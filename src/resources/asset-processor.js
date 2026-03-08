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

        // Try to find the exact sidebar containing the image editor tools (Rotate/Crop)
        var $sidebar = $editor.find('.image-editor-sidebar, .sidebar').first();

        // If not found, look for the parent of the Rotate button
        if (!$sidebar.length) {
            var $rotateBtn = $editor.find('button:contains("Rotate"), .btn:contains("Rotate")');
            if ($rotateBtn.length) {
                $sidebar = $rotateBtn.closest('div').parent();
            }
        }

        if (!$sidebar.length) return;

        var $container = $('<div class="nano-banana-processor" style="margin-top:20px; padding: 20px 24px; border-top: 1px solid rgba(255,255,255,0.1);"></div>');
        var $heading = $('<div class="heading" style="color: #ccc; margin-bottom: 15px; font-weight: 500; font-size: 11px; text-transform: uppercase;">Nano Banana</div>');

        var $select = $('<div class="select fullwidth" style="margin-bottom: 10px;"><select id="nano-banana-gem-select" style="width: 100%;"><option value="">Select Prompt...</option></select></div>');
        var $selectInput = $select.find('select');

        settings.gems.forEach(function (gem, index) {
            $selectInput.append(`<option value="${index}">${gem.name}</option>`);
        });

        var $btn = $('<button type="button" class="btn submit small disabled" id="nano-banana-process-btn" style="margin-top: 10px; width: 100%;">Generate Image</button>');

        $container.append($heading);
        $container.append($select);
        $container.append($btn);

        $sidebar.append($container);

        $selectInput.on('change', function () {
            if ($(this).val() !== "") {
                $btn.removeClass('disabled');
            } else {
                $btn.addClass('disabled');
            }
        });

        $btn.on('click', function () {
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

            $btn.addClass('disabled').text('Generating...');

            Craft.postActionRequest('craft-gems/asset/editor-process', {
                assetId: elementId,
                gemIndex: gemIndex
            }, function (response, textStatus) {
                if (textStatus == 'success' && response.success) {
                    Craft.cp.displayNotice('Image Generated!');
                    // Overlay the returned image on the editor canvas
                    overlayGeneratedImage(response.imageUrl || response.base64);
                } else {
                    Craft.cp.displayError(response.error || 'Error generating image.');
                }
                $btn.removeClass('disabled').text('Generate Image');
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
        var $imageEditor = $('.image-editor, .image-editor-main, .slideout-container .image-editor');
        if ($imageEditor.length) {
            injectCraftGemsEditorUI($imageEditor.last());
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}
