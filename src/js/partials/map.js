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
                { type: 0 },               
                { type: 1, s: 200, w: 1300, h: 560 },               
                { type: 2, s: 180, w: 1140, h: 520 },               
                { type: 3,s: 160, w: 980,  h: 480 }               
            ];

        if (size.width >  1300) { svgData = type[1]; }
        else if (size.width > 1140) { svgData = type[2]; }
        else if (size.width >  980) { svgData = type[3]; }
        else { 
            svgData = type[0]; 
        }

        return svgData;   
    }


    function onMouseLeave(d, i) {
        // highlight
        d3.select(".item-" + i)
        .classed("circle-hovered", false);
        d3.select(".code-" + d.countrycode)
        .classed("path-map-hovered", false);       
        // preview
        //d3.select(".preview").classed("d-n", true);
    } 
    
    function onMouseEnter(d, i, ptX, ptY) {
        document.querySelector(".js-name").textContent = d.name;
        document.querySelector(".js-city").textContent = d.city;
        // image
        var img = document.querySelector(".js-img");
        if (d.image === undefined) {
            img.src = "@@assetPath@@/imgs/witness/empty.png";
        } else {
            img.src = d.image;
        }
    
        // highlight
        d3.select(".item-" + i)
        .classed("circle-hovered", true);
        d3.select(".code-" + d.countrycode)
        .classed("path-map-hovered", true);       
        
        // preview           
        d3.select(".preview")
        .classed("d-n", false) 
        .style("top", (ptY - 32) + "px")
        .style("left", function() {
            var x = ptX;
            return ((x > 185) ? (x - 208) : (x + 16)) + "px";
        });
    }


    function createSvg(mapJson, itemDataRaw) {
        var svg, svgMap, svgPins, svgVoronoi;
        var itemData = [];

        function init() {
            // data check
            itemDataRaw.forEach(function(item, i) {
                var coord = item.coord;
                item.coord = [parseFloat(coord[0]), parseFloat(coord[1])];
                if (isNaN(item.coord[0]) || isNaN(item.coord[1])) {
                    var row = i + 2;
                    window.alert("Friendly warngin: " +
                        "Either latitude and/or longtitude value on row " + 
                        row + " in your google spreadsheet is not valid."
                    );
                } else {
                    itemData.push(item);
                }
            });
            
            svg  = d3.select(".map").append("svg").classed("d-n", true);
            
            // map
            svgMap = svg.selectAll(".path-map")
            .data(topojson.feature(mapJson, mapJson.objects.countries).features)
            .enter().append("path")
            .attr("class", function(d) {
                return "path-map code-" + d.id;
            });

            // pins
            svgPins = svg.selectAll("circle")
            .data(itemData)
            .enter().append("circle")
            .attr("class", function(d, i) { return "circle item-" + i; })
            .attr("r", 3);
       }
        
        function draw(svgData, flag) {

            var proj = d3.geo.mercator().scale(svgData.s)
                         .translate([svgData.w/2.1, svgData.h/1.8]),
                path = d3.geo.path().projection(proj);

            var points = [];
            itemData.forEach(function(d) {
                points.push(proj(d.coord));
            });

            var voronoi = d3.geom.voronoi()
            .clipExtent([[0, 0], [svgData.w, svgData.h]]);

            svg
            .attr("width", svgData.w)
            .attr("height", svgData.h)
            .on("mouseleave", function() {
                // preview
                d3.select(".preview").classed("d-n", true);
            });

            // map
            svgMap
            .attr("d", path);

            // pins
            svgPins.attr("transform", function(d, i) {
                return "translate(" + points[i] + ")";
            });

            // voronoi: for mouse event
            svgVoronoi = svg.selectAll(".path-voronoi")
            .data(voronoi(points));

            // update
            svgVoronoi
            .attr("d", function(d) {
                if(d === undefined) { return; }
                return "M" + d.join("L") + "Z";
            })
            .on("mouseenter", function(d, i) {
                onMouseEnter(itemData[i], i, points[i][0], points[i][1]);
            });

            // create new
            svgVoronoi.enter().append("path")
            .attr("class", "path-voronoi")
            .attr("d", function(d) {
                if(d === undefined) { return; }
                return "M" + d.join("L") + "Z";
            })
            .on("mouseleave", function(d, i) {
                onMouseLeave(itemData[i], i);
            })
            .on("mouseenter", function(d, i) {
                onMouseEnter(itemData[i], i, points[i][0], points[i][1]);
           })
            .on("click", function(d, i) {
                window.location.hash = "#item-" + itemData[i].id;
                flag.isMap = true;
            });        
 
            // exit
            svgVoronoi.exit().remove();
        }
        
        return {
            init: init,
            draw: draw
        };
    }

    var type = 0;
    function render(mapJson, itemData, flag) {

        var map = createSvg(mapJson, itemData);
        map.init();

        var to = null;
        function draw() {
            if (to) {
                clearTimeout(to);
                to = null;
            }
            to = setTimeout(function() {
                var size = getWindowSize(),
                    data = getSvgSize(size);

                //check if redraw
                if (type === data.type) { return; }
                type = data.type;
                //console.log("redraw:", data.type);
                
                var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                //console.log(isMobile);

                if (size.width < 980 || isMobile) {
                    //console.log("hide interactive map");
                    //TODO: show staic map?
                    d3.select(".map svg").classed("d-n", true);
                } else {
                    d3.select(".map svg").classed("d-n", false);
                    map.draw(data, flag);
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
