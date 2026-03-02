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
        if ($context.find('#details').length) {
            $context.find('#details').append($container);
            injected = true;
        } else if ($context.find('.meta').last().length) {
            // Alternatively, append after the last .meta block if #details isn't found
            $context.find('.meta').last().after($container);
            injected = true;
        } else {
            // Fallback
            $context.append($container);
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

    // Monitor for the Asset Editor loading
    var observer = new MutationObserver(function (mutations) {
        // In Craft 5, check if the details panel or the main edit form has rendered
        if ($('#details').length && !$('.craft-gems-processor').length) {
            injectCraftGemsUI($('#details').parent());
        } else if ($('.editor-content').length && !$('.craft-gems-processor').length) {
            injectCraftGemsUI($('.editor-content'));
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}
