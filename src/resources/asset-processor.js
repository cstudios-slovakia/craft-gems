(function ($) {
    /**
     * Craft Gems Asset Processor
     */

    // We can't easily hook into the exact moment the sidebar is rendered without a specific event.
    // However, Craft usually fires 'activate-element-editor' or similar.
    // A simple polling approach or delegating from the body is robust for now.

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

        // Inject after the "File" info or at the bottom
        // $sidebar is likely .element-sidebar
        $sidebar.append($container);

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
            var elementId = $sidebar.closest('form').find('input[name="elementId"]').val(); // This might vary depending on context

            // If we are in a modal, the element ID might be available differently.
            // Let's rely on Craft.elementEditor or the sidebar context.
            // A more robust way inside the Assets section is getting the ID from the URL or the element itself.
            // But let's assume we can grab it from a specific data attribute or input.
            if (!elementId) {
                // Try to find it in the modal
                elementId = $sidebar.closest('.element-editor').data('element-id');
            }

            if (!elementId || gemIndex === "") return;

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

    // Monitor for the Asset Editor sidebar
    // This typically appears in .element-editor .sidebar

    // Garnish listener for element editor show?
    // Using a MutationObserver is effective for catching dynamic modals.
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType === 1) {
                        // Check if this is the element editor modal or sidebar
                        var $node = $(node);
                        if ($node.hasClass('element-sidebar')) {
                            injectCraftGemsUI($node);
                        }
                        // Also check standard asset editor overlay
                        if ($node.find('.element-sidebar').length) {
                            injectCraftGemsUI($node.find('.element-sidebar'));
                        }
                    }
                });
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

})(jQuery);
