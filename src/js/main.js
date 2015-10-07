define([
    'backbone',
    'lazyload',
    'partials/footerStickElement',
    'text!templates/itemTemplate.html',
    'text!templates/modalTemplate.html',
    'text!templates/headerTemplate.html',
    'text!templates/footerTemplate.html'
], function(
    backbone,
    lazyload,
    stickElement,
    itemTmpl,
    modalTmpl,
    headerTmpl,
    footerTmpl
) {
    'use strict';

    var sheetKey = "1pud1zX_Op9B5ch9BHLCm0bvg3MlqknWmAVZeE-S-5F0",
        sheetUrl = 'http://interactive.guim.co.uk/spreadsheetdata/' + sheetKey + '.json',
        isWeb = typeof window.guardian === "undefined" ? false : true,
        lastModal,
        page = 1,
        perRow = 4,
        counter = 0,
        dataHeader = []; 

    function init() {
        app();
    }

    function app() {

        var Item = Backbone.Model.extend(),
            ItemList = Backbone.Collection.extend({
            model: Item,
            url  : sheetUrl, 
            sync : function(method, collection, options) {
                options.dataType = "json";
                return Backbone.sync(method, collection, options);
            },
            parse: function(resp) {
                var dataContent = resp.sheets.CONTENT;
                dataHeader = resp.sheets.HEADER[0];
                
                dataContent.map(function(d, i) {
                    
                    d.id = i + 1;
                    d.headline = d.name;

                    // img_flag 0 => no image 
                    // img_flag 1 => image with source and orientation
                    if (d.imgflag === 1) {
                        var img = {};
                        
                        img.src = d.imgsrc;
                        img.orientation = (d.imgorientation === "l") ? "landscape" : "portrait";
                        d.image = img;
                    }
                    
                    return d;
                });
                //console.log(dataContent);
                return dataContent;
            }
        }),
        ModalItem = Backbone.Collection.extend({
            model: Item
        });

        var ModalView = Backbone.View.extend({
            template: _.template(modalTmpl),
            initialize: function() {
                $(document).on('keydown', this.keydown);
                $('.element-interactive').after('<div class="overlay__container"><div class="overlay__body"></div></div>');
            },
            render: function(itemID) {
                if (itemID < 1) { itemID = items.length; }
                else if (itemID > items.length) { itemID = 1; }
                //console.log(itemID, "[render]");
                
                var item = items.where({id: parseInt(itemID)})[0];
                
                //console.log(item);                
                var modalTemplate = this.template({model: item.toJSON(), data: dataHeader, number: items.models.length});

                $('.overlay__body').html(modalTemplate);
                $('body').scrollTop(0);
                $('.overlay__container').addClass('overlay__container--show');
                $('html').addClass('dropdown-open');

                if(location.replace && window.history && window.history.back) {
                    $('.nav-icon--next, .nav-icon--prev').click(function(e) {
                        if(e.currentTarget.hash) {
                            e.preventDefault();
                            location.replace(e.currentTarget.hash);
                        }
                    });
                    if(history.length > 1) {
                        $('.nav-icon--close, .headline-highlight').click(function(e) {
                            e.preventDefault(); 
                            window.history.back();
                        });
                    }
                }

                $('.overlay__image--landscape').click(function(e) {
                    if($(document).width() > 1140) {
                        $('.overlay__content').addClass('overlay__content--fade');
                        setTimeout(function () {
                            $(e.currentTarget).toggleClass('overlay__image--expand');

                            var img = new Image();
                            img.src = modalView.model.models[0].image.src;
                            img.onload = function () {
                                $(e.currentTarget).css('background-image', 'url(' + img.src + ')');
                            };

                            $('.overlay__content').toggleClass('overlay__content--expand');
                        }, 100);
                        setTimeout(function () {
                            $('.overlay__content').removeClass('overlay__content--fade');
                        }, 100);
                    }
                });

                return this;
            },
            keydown: function(event) {
                var e = event || window.event,
                    hash = window.location.hash,
                    itemID = parseInt(hash.slice(hash.indexOf('-')+1, hash.length));
                
                if (e.keyCode == 39 && hash.substring(0,5) == '#item' /*&& modalView.model.models[0].attributes.nextItem*/) {
                    var nextID = (itemID+1) > items.length ? 1 : (itemID+1);
                    
                    if(location.replace && window.history && window.history.back) {
                        //location.replace('#item-' + modalView.model.models[0].attributes.nextItem);
                        location.replace('#item-' + nextID);
                    } else {
                        //window.location.hash = 'item-' + modalView.model.models[0].attributes.nextItem;
                        window.location.hash = 'item-' + nextID;
                    }
                }

                if (e.keyCode == 37 && window.location.hash.substring(0,5) == '#item' /*&& modalView.model.models[0].attributes.prevItem*/) {
                    var prevID = (itemID-1) < 1 ? items.length : (itemID-1);
                    
                    if(location.replace && window.history && window.history.back) {
                        //location.replace('#item-' + modalView.model.models[0].attributes.prevItem);
                        location.replace('#item-' + prevID);
                    } else {
                        //window.location.hash = 'item-' + modalView.model.models[0].attributes.prevItem;
                        window.location.hash = 'item-' + prevID;
                    }
                }
            },
            addNavAtts: function(itemID) {
                this.model.shift();
                this.model.unshift(items.where({ id: itemID }));
                //var indexPos = _.indexOf(items.models, items.where({ id: itemID })[0]);
                //this.model.models[0].set('position', (indexPos+1));
                
                itemID = parseInt(itemID);
                if (itemID < 1) { itemID = items.length; }
                else if (itemID > items.length) { itemID = 1; }
                //console.log(itemID, "[nav]")
               
                var item = items.where({id: itemID})[0],
                    itemsLength = items.length;
                
                item.set('position', itemID);

                if(itemID !== itemsLength) {
                    item.set('nextItem', (itemID + 1));
                } else {
                    item.set('nextItem', 1);
                }

                if(itemID !== 1) {
                    item.set('prevItem', (itemID - 1));
                } else {
                    item.set('prevItem', itemsLength);
                }

                this.render(itemID);
            }
        });

        var modal = new ModalItem,
            modalView = new ModalView({model: modal});

        var ItemsView = Backbone.View.extend({
            template: _.template(itemTmpl),
            initialize: function() {
                this.setElement('<div class="main"></div>');
            },
            render: function() {
                var that = this,
                    sliced,
                toMove,
                sortIDs = '',//data.favourites.toString().split(","),
                    toAppend = '';

                if(sortIDs) {
                    sortIDs.reverse().map(function(id) {
                        var toAdd = that.model.where({ id: 'report/' + id });
                        that.model.remove(toAdd);
                        that.model.unshift(toAdd);
                    });
                }
                counter = 0;
                // reorder collection to avoid gaps in the grid
                if($(document).width() > 980) {
                    _.each(this.model.models, function(item, i) {
                        if(item.attributes.hasOwnProperty('image')) {

                            if(item.attributes.image.orientation == 'landscape') {
                                counter += 2;
                            } else {
                                counter += 1;
                            }
                        } else {
                            counter += 1;
                        }

                        if(counter == perRow + 1) {
                            sliced = _.filter(items.slice(i, items.length), function (item) {
                                return (item.attributes.hasOwnProperty('image') && item.attributes.image.orientation === 'portrait') || !item.attributes.hasOwnProperty('image');
                            });
                            if(sliced.length > 0) {
                                toMove = that.model.where({id: sliced[0].attributes.id});
                                that.model.remove(toMove);
                                that.model.add(toMove, {at: i});
                                counter = 0;
                            } else {
                                counter = 2;
                            }
                        } else if(counter == perRow) {
                            counter = 0;
                        }
                    });
                }

                //end

                _.each(this.model.models, function(item){
                    //console.log(this.model);
                    //console.log(item.toJSON());
                    var i = item.attributes;
                    item.attributes.body = i.contribution;
                    var itemTemplate = this.template({item: item.toJSON(), trunc: trunc, page: page});
                    var $template = $(itemTemplate);
                    toAppend += itemTemplate;
                }, this);

                $(toAppend).appendTo(this.el);

                /*var $main = $(".main");
                  $(window).scroll(_.throttle(function() {
                  if(pageSize*(page-1) < totalNumber && $(".main").offset().top + $(".main").height() - 1500 < $(window).scrollTop() + $(window).height()) {
                  loadMorePosts();
                  }
                  }, 250));*/

                setTimeout(function() {
                    $(".page-" + page + " .background-image").lazyload();
                }, 50);

                return this;
            }
        });

        var items = new ItemList;

        var AppView = Backbone.View.extend({
            render: function(){
                var itemsView = new ItemsView({model:items}),
                    html = itemsView.render().el,
                    headerTemplate = _.template(headerTmpl),
                    headerHTML = headerTemplate({
                        data: dataHeader,
                        isWeb: isWeb
                    }),
                    footerTemplate = _.template(footerTmpl),
                    footerHTML = footerTemplate({
                        data: dataHeader,
                        isWeb: isWeb
                    });

                $('.element-interactive').html(html);
                $('.main').before(headerHTML).after(footerHTML);

                $(window).scroll(_.debounce(function(){
                    if($(window).scrollTop() > 0) {
                        var $back = $('.back-to-top');
                        $back.addClass('back-to-top--scrolled');
                        $back.click(function(e) { 
                            window.scrollTo(0,0);
                        });
                    } else {
                        $('.back-to-top').removeClass('back-to-top--scrolled');
                    }
                }, 250));

                // $('div.background-image').lazyload();
               
                stickElement();

                return this;
            },

            initialize: function(){
                var fetchOptions = {};
                fetchOptions.success = this.render;
                fetchOptions.dataType = "jsonp";
                items.fetch(fetchOptions).complete(function() {
                    initRouter();
                });
            }
        });

        var App = new AppView;

        var AppRouter = Backbone.Router.extend({
            routes: {
                "item-*itemID": "modalRoute",
                "*actions": "closeRoute"
            }
        });

        // items.on("add", function(item) {
        //     var template = _.template(itemTmpl);
        //     var itemTemplate = template({item: item.toJSON(), trunc: trunc});
        //     var $template = $(itemTemplate);

        //     $template.appendTo(".main");
        // })

        function initRouter() {
            var app_router = new AppRouter;

            app_router.on('route:modalRoute', function(itemID) {
                //console.log(items.models[itemID].attritube.headline);
                //console.log(itemID);
                //itemID = items.models[itemID].id;
                if(itemID !== null) {
                    lastModal = itemID;
                    modalView.addNavAtts(itemID);
                }
            });

            app_router.on('route:closeRoute', function() {
                $('.overlay__container').removeClass('overlay__container--show');
                $('html').removeClass('dropdown-open');
               
                if(lastModal) {
                    window.scrollTo(0,$('#item-' + lastModal + '').offset().top);
                }   
            });

            Backbone.history.start();
        }
    }

    function trunc(text, limit) {
        //TODO: remove temp code
        if (text === undefined) { return; }

        var textSubstr = text.substr(0,limit),
            firstSentence = textSubstr.substr(0, textSubstr.lastIndexOf('.'));

        if (firstSentence) {
            return firstSentence + '.';
        } else {
            return textSubstr + '...';
        }
    }

    return {
        init: init
    };
});
