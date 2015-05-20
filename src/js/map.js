define([
    'd3',
    'topojson'
], function(
    d3,
    topojson
) {
    'use strict';


    function getWindowSize() {
        var d = document,
            e = d.documentElement,
            g = d.getElementsByTagName('body')[0],
            w = window.innerWidth || e.clientWidth || g.clientWidth,
            h = window.innerHeight|| e.clientHeight|| g.clientHeight;

        return {
            width: w, 
            height: h
        };    
    }


    function getSvgSize(size) {
        var svgData,
            type = [
                { s: 200, w: 1300, h: 560 },               
                { s: 180, w: 1140, h: 520 },               
                { s: 160, w: 980,  h: 480 }               
            ];

        if (size.width >  1300) { svgData = type[0]; }
        else if (size.width > 1140) { svgData = type[1]; }
        else if (size.width >  980) { svgData = type[2]; }
        else { 
            return; 
        }

        return svgData;   
    }

    function createSvg(mapJson, signerData) {
        var svg, svgMap, svgPins, svgPinCircles, svgPinTexts, svgVoronoi;

        function init() {
            // map
            svg  = d3.select(".map").append("svg");

            svgMap = svg.selectAll(".path-map")
            .data(topojson.feature(mapJson, mapJson.objects.countries).features)
            .enter().append("path")
            .attr("class", function(d) {
                return "path-map code-" + d.id;
            });

            // pins
            svgPins = svg.selectAll("g")
            .data(signerData)
            .enter().append("g")
            .attr("class", function(d, i) { return "item-" + i; });

            svgPinCircles = svgPins.append("circle")
            .attr("class", "pin")
            .attr("r", 3);

            svgPinTexts = svgPins.append("text")
            .classed("hide", true)
            .text(function(d) { return d.origin; });       
        }
        
        function draw(size) {

            var svgData = getSvgSize(size),
                proj = d3.geo.mercator().scale(svgData.s)
                         .translate([svgData.w/2.1, svgData.h/1.8]),
                path = d3.geo.path().projection(proj);

            var points = [];
            signerData.forEach(function(d) {
                points.push(proj(d.coord));
            });

            var voronoi = d3.geom.voronoi()
            .clipExtent([[0, 0], [svgData.w, svgData.h]]);

            // map
            svg
            .attr("width", svgData.w)
            .attr("height", svgData.h);

            svgMap
            .attr("d", path);

            // pins
            svgPinCircles.attr("transform", function(d, i) {
                return "translate(" + points[i] + ")";
            });
            svgPinTexts.attr("transform", function(d, i) { 
                return "translate(" + points[i] + ")";
            });     
 
            // voronoi: for mouse event
            svgVoronoi = svg.selectAll(".path-voronoi")
            .data(voronoi(points));
            // update
            svgVoronoi.attr("d", function(d) {
                return "M" + d.join("L") + "Z";
            });
            // create new
            svgVoronoi.enter().append("path")
            .attr("class", "path-voronoi")
            .attr("d", function(d) {
                return "M" + d.join("L") + "Z";
            })
            .on("mouseover", function(d, i) {
                d3.select(".item-" + i + " .pin")
                .classed("pin-hovered", true);
                d3.select(".item-" + i + " text")
                .classed("hide", false);       
                d3.select(".code-" + signerData[i].countrycode)
                .classed("path-map-hovered", true);       
            })
            .on("mouseleave", function(d, i) {
                d3.select(".item-" + i + " .pin")
                .classed("pin-hovered", false);
                d3.select(".item-" + i + " text")
                .classed("hide", true);           
                d3.select(".code-" + signerData[i].countrycode)
                .classed("path-map-hovered", false);       
            })
            .on("click", function(d, i) {
                window.location.hash = "#item-" + signerData[i].id;
            });        
            // exit
            svgVoronoi.exit().remove();
        }

        return {
            init: init,
            draw: draw
        };
    }


    function render(mapJson, signerData) {

        var map = createSvg(mapJson, signerData);
        map.init();

        var to = null;
        function draw() {
            if (to) {
                clearTimeout(to);
                to = null;
            }
            to = setTimeout(function() {
                //check if redraw
                var size = getWindowSize();
                if (size.width < 980) {
                    console.log("empty drawing");
                    d3.select(".map svg").classed("hide", true);
                } else {
                    d3.select(".map svg").classed("hide", false);
                    map.draw(size);
                }
            }, 100);
        }
        draw();
        
        // draw on resize
        d3.select(window).on('resize', draw); 
    }

    return { 
        render: render
    };
});
