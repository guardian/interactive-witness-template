define([
    'pegasus',
    'backbone',
    'lazyload',
    'text!templates/itemTemplate.html',
    'text!templates/modalTemplate.html',
    'text!templates/headerTemplate.html',
    'text!templates/footerTemplate.html'
], function(
    pegasus,
    backbone,
    lazyload,
    itemTmpl,
    modalTmpl,
    headerTmpl,
    footerTmpl
) {
   'use strict';

   var  sheetUrl = 'http://interactive.guim.co.uk/spreadsheetdata/0Aoi-l6_XQTv5dG9HNHJqdXlKeGtDb0pvUHdOWTBBUHc.json',
        sheetName = $('figure.element-interactive').attr('data-alt'),
        itemCollection,
        isWeb = typeof window.guardian === "undefined" ? false : true,
        lastModal,
        page = 1,
        pageSize = 100,
        totalNumber = 0,
        perRow = 4,
        counter = 0,
        noticeboard,
        votedInterestingBy,
        order; 

    function init(el, context, config, mediator) {
        pegasus(sheetUrl).then(function (spreadsheet) {
            app(spreadsheet.sheets[sheetName][0]);
        });
    }

    function app(data) {
        noticeboard = data.noticeboard;
        votedInterestingBy = (data.votedinterestingby) ? '&votedInterestingBy=' + data.votedinterestingby : '';
        order = data.order;
        var Item = Backbone.Model.extend(),
            ItemList = Backbone.Collection.extend({
                model: Item,
                url: 'http://n0ticeapis.com/2/search?noticeboard=' + noticeboard + '&pageSize=' + pageSize + '&page=' + page + '&order=' + order + votedInterestingBy,
                sync : function(method, collection, options) {
                    options.dataType = "jsonp";
                    options.cache = true;
                    options.jsonpCallback = "witnessVisuals";
                    return Backbone.sync(method, collection, options);
                },
                parse: function(resp) {
                    totalNumber = resp.numberFound;
                    return resp.results;
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
                render: function() {
                    if(page*pageSize - modal.models[0].attributes.position < 5) {
                        loadMorePosts();
                    }

                    var modalTemplate = this.template({model: this.model.models[0].toJSON(), data: data, number: totalNumber});
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
                                img.src = modalView.model.models[0].attributes.updates[0].image.extralarge;
                                img.onload = function () {
                                   $(e.currentTarget).css('background-image', 'url(' + img.src + ')');
                                }

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
                    var e = event || window.event;

                    if (e.keyCode == 39 && window.location.hash.substring(0,5) == '#item' && modalView.model.models[0].attributes.nextItem) {
                        if(location.replace && window.history && window.history.back) {
                            location.replace('#item-' + modalView.model.models[0].attributes.nextItem);
                        } else {
                            window.location.hash = 'item-' + modalView.model.models[0].attributes.nextItem;
                        }
                    }

                    if (e.keyCode == 37 && window.location.hash.substring(0,5) == '#item' && modalView.model.models[0].attributes.prevItem) {
                        if(location.replace && window.history && window.history.back) {
                            location.replace('#item-' + modalView.model.models[0].attributes.prevItem);
                        } else {
                            window.location.hash = 'item-' + modalView.model.models[0].attributes.prevItem;
                        }
                    }
                },
                addNavAtts: function(itemID) {
                    this.model.shift();
                    this.model.unshift(items.where({ id: 'report/' + itemID }));

                    var indexPos = _.indexOf(items.models, items.where({ id: 'report/' + itemID })[0]);

                    this.model.models[0].set('position', (indexPos+1));
                    
                    if(items.at(indexPos+1)) {
                        this.model.models[0].set('nextItem', items.at(indexPos+1).attributes.id.substring(7));
                    }

                    if(items.at(indexPos-1)) {
                        this.model.models[0].set('prevItem', items.at(indexPos-1).attributes.id.substring(7));
                    }

                    this.render();
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
                    sortIDs = data.favourites.toString().split(","),
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
                        item.set({border: false}); 
                        if(item.attributes.updates[0].hasOwnProperty('image')) {
                            if(item.attributes.updates[0].image.orientation == 'landscape') {
                                counter += 2;
                            } else {
                                counter += 1;
                            }
                        } else {
                            counter += 1;
                        }
                        
                        if(counter == perRow + 1) {
                            sliced = _.filter(items.slice(i, items.length), function (item) {
                                return (item.attributes.updates[0].hasOwnProperty('image') && item.attributes.updates[0].image.orientation === 'portrait') || !item.attributes.updates[0].hasOwnProperty('image');
                            });
                            if(sliced.length > 0) {
                                toMove = that.model.where({id: sliced[0].attributes.id});
                                that.model.remove(toMove);
                                toMove[0].attributes.border = false;
                                that.model.add(toMove, {at: i});
                                counter = 0;
                            } else {
                                counter = 2;
                            }
                        } else if(counter == perRow) {
                            counter = 0;
                        } else {
                            item.set({border: true}); 
                        }
                    });
                }

                //end

                _.each(this.model.models, function(item){
                    var itemTemplate = this.template({item: item.toJSON(), trunc: trunc, page: page});
                    var $template = $(itemTemplate);
                    toAppend += itemTemplate;
                }, this);

                $(toAppend).appendTo(this.el);

                var $main = $(".main");
                $(window).scroll(_.debounce(function() {
                    if(pageSize*(page-1) < totalNumber && $(".main").offset().top + $(".main").height() - 1500 < $(window).scrollTop() + $(window).height()) {
                        loadMorePosts();
                    }
                }, 250));

                setTimeout(function() {
                    $(".page-" + page + " .background-image").lazyload();
                }, 100);

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
                        data: data,
                        numberFound: commafy(totalNumber),
                        isWeb: isWeb
                    }),
                    footerTemplate = _.template(footerTmpl),
                    footerHTML = footerTemplate({
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

        function loadMorePosts() { 
            page++;
            $.ajax({
                url: 'http://n0ticeapis.com/2/search?noticeboard=' + noticeboard + '&pageSize=' + pageSize + '&page=' + page + '&order=' + order + votedInterestingBy,
                jsonp: 'callback',
                jsonpCallback: "witnessVisuals" + page,
                cache: true,
                dataType: 'jsonp',
                data: {
                    format: "json"
                },
                success: function( response ) {
                    response.results.map(function(result, i) {
                        items.add(result);
                    });
                    console.log(items);

                    var toAppend = '', toMove, sliced;

                    // reorder collection to avoid gaps in the grid
                    if($(document).width() > 980) {

                        _.each(items.models, function(item, i) {
                            item.set({border: false});
                            if(i > (page-1)*pageSize - 1) {
                                if(item.attributes.updates[0].hasOwnProperty('image')) {
                                    if(item.attributes.updates[0].image.orientation == 'landscape') {
                                        counter += 2;
                                    } else {
                                        counter += 1;
                                    }
                                } else {
                                    counter += 1;
                                }
                                
                                if(counter == perRow + 1) {
                                    sliced = _.filter(items.slice(i, items.length), function (item) {
                                        return (item.attributes.updates[0].hasOwnProperty('image') && item.attributes.updates[0].image.orientation === 'portrait') || !item.attributes.updates[0].hasOwnProperty('image');
                                    });
                                    if(sliced.length > 0) {
                                        toMove = items.where({id: sliced[0].attributes.id});
                                        items.remove(toMove);
                                        toMove[0].attributes.border = false;
                                        items.add(toMove, {at: i});
                                        counter = 0;
                                    } else {
                                        counter = 2;
                                    }
                                } else if(counter == perRow) {
                                    counter = 0;
                                } else {
                                    item.set({border: true}); 
                                }
                            }
                        });
    
                    }

                    //end

                    _.each(items.slice((page-1)*pageSize), function(val, key) {
                        var template = _.template(itemTmpl);
                        var itemTemplate = template({item: val.attributes, trunc: trunc, page: page});
                        var $template = $(itemTemplate); 

                        toAppend += itemTemplate;
                    });

                    $(".main").append(toAppend);

                    setTimeout(function () {
                        $(".page-" + page + " .background-image").lazyload();
                    }, 100);
                }
            });
        }
    }

    function trunc(text, limit) {
        var textSubstr = text.substr(0,limit),
            firstSentence = textSubstr.substr(0, textSubstr.lastIndexOf('.'));

        if (firstSentence) {
            return firstSentence + '.';
        } else {
            return textSubstr + '...';
        }
    }

    function commafy( num ) {
        return num.toString().replace(/,/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ","); 
    }

    return {
        init: init
    };
});
