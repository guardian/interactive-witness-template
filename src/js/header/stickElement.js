define([
], function(
) {
    'use strict';

    function stickElement() {
        var d = document,
            elAnchorT = d.querySelector(".main"),
            elAnchorB = d.querySelector("footer"),
            elSticky = d.querySelector(".footer-sticky"),
            cn = elSticky.className;

        function stickIfNeeded() { 
        var pOffset = $(window).scrollTop(),
            offsetT = elAnchorT.offsetTop,
            offsetB = elAnchorB.offsetTop - $(window).height();
            //console.log(pOffset); 
            //console.log(offsetT, offsetB); 
        
            if (pOffset >= offsetT && pOffset <= offsetB) {
                elSticky.className = cn + " sticky";
                //console.log("sticky");
            } else {
                elSticky.className = cn;
            }   
        }
        
        window.addEventListener("scroll", _.throttle(stickIfNeeded, 500)); 
    }

    return stickElement;
});
