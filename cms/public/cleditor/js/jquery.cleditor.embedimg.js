/**
 @preserve CLEditor Embed Image Plugin v1.0.0
 http://premiumsoftware.net/cleditor
 requires CLEditor v1.2.2 or later

 Copyright 2013, Alexander Alexeychuk
 Dual licensed under the MIT or GPL Version 2 licenses.
 */

// ==ClosureCompiler==
// @compilation_level SIMPLE_OPTIMIZATIONS
// @output_file_name jquery.cleditor.embedimg.min.js
// ==/ClosureCompiler==

(function($) {
    var hidden_frame_name = '__upload_iframe';
    // Define the image button by replacing the standard one
    $.cleditor.buttons.image = {
        name: 'image',
        title: 'Embed Image',
        command: 'inserthtml',
        popupName: 'image',
        popupClass: 'cleditorPrompt',
        stripIndex: $.cleditor.buttons.image.stripIndex,
        popupContent:
            '<iframe style="width:0;height:0;border:0;" name="' + hidden_frame_name + '" />' +
                '<table cellpadding="0" cellspacing="0">' +
                '<tr><td>Choose a File:</td></tr>' +
                '<tr><td> ' +
                '<form method="post" enctype="multipart/form-data" action="" target="' + hidden_frame_name + '">' +
                '<input id="imageName" name="imageName" type="file" /></form> </td></tr>' +
                '</table><input type="button" value="Submit">',
        buttonClick: imageButtonClick,
        uploadUrl: 'embedImage' // default url
    };

    function closePopup(editor) {
        editor.hidePopups();
        editor.focus();
    }

    function imageButtonClick(e, data) {
        var editor = data.editor,
            $iframe = $(data.popup).find('iframe'),
            $file = $(data.popup).find(':file');
        $file.val(''); // clear previously selected file and url
        $(data.popup)
            .children(":button")
            .unbind("click")
            .bind("click", function(e) {
                if($file.val()) { // proceed if any file was selected
                    $iframe.bind('load', function() {
                        var data_url;
                        try {
                            data_url = $iframe.get(0).contentWindow.document.getElementById('image').innerHTML;
                        } catch(e) {};
                        if(data_url) {
                            var html = '<img align="left" src="' + data_url + '" />';
                            editor.execCommand(data.command, html, null, data.button);
                        } else {
                            alert('An error occured during image upload!');
                        }
                        $iframe.unbind('load');
                        closePopup(editor);
                    });
                    $(data.popup).find('form').attr('action', $.cleditor.buttons.image.uploadUrl).submit();
                }
            });
    }
})(jQuery);
