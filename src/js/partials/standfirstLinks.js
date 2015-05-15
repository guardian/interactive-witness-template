define([
], function(
) {
  'use strict';

  function render(text, linkData, className) {
    
    
    var texts, nText, nLink,
        el = document.querySelector("." + className),
        sf = text;

    el.textContent = "";
    linkData.forEach(function(d) {
      texts = sf.split(d.key);
      //console.log(texts);
      
      nText = document.createTextNode(d.key);
      nLink = document.createElement("a");
      nLink.href = d.link;
      nLink.appendChild(nText);
      //console.log(nLink);  
      
      nText = document.createTextNode(texts[0]);
      
      el.appendChild(nText);
      el.appendChild(nLink);
      sf = texts[1];
    });
    
    nText = document.createTextNode(sf);
    el.appendChild(nText);
  }

  return { 
    render: render
  };
});
