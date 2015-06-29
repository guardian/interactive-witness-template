define([
], function(
) {
    'use strict';

    function langSwitch() {
        $(".js-english").click(function() { 
            $(".h-english").toggleClass("d-n");
            $(".h-greek").toggleClass("d-n");
        });
        $(".js-greek").click(function() { 
            $(".h-english").toggleClass("d-n");
            $(".h-greek").toggleClass("d-n");
        });
    }

    return langSwitch;
});
