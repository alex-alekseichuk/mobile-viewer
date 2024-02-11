var app = {
    testMode:false,
    structure:{
        id:1,title:"Test",type:"menu",text:'This is a test. <a href="http://ya.ru/#some">ya.ru</a>',nodes:[
            {
                id:2,title:"Page 2",type:"list",text:"This is a page 2.",tags:["page2", "page"],nodes:[
                    {
                        id:4,title:"Page 4",text:"This is a page 2.",tags:["page2", "page"]
                    },
                    {
                        id:5,title:"Page 5",text:"This is a page 3. <a href=\"#node2\">Page2</a>",tags:["page3", "page"]
                    }
                ]
            },
            {
                id:3,title:"Page Link To Menu",type:"link",linkId:"2",tags:["page3", "page"]
            }
        ]
    },

    state: {NODE:0, SEARCH:1, SEARCH_NODE:2, FEEDBACK:3, FEEDBACK_DONE:4},
    currentState:undefined,
    currentNode:undefined,

    searchQuery:undefined,
    searchIndex:undefined,
    searchNodes:[],

    // history
    _history:[],
    pushHistory: function() {
        switch(app.currentState) {
            case app.state.SEARCH:
                app._history.push({state:app.state.SEARCH, query:app.searchQuery});
                break;
            case app.state.SEARCH_NODE:
                app._history.push({state:app.state.SEARCH_NODE, node:app.currentNode, query:app.searchQuery, index:app.searchIndex});
                break;
            case app.state.NODE:
                app._history.push({state:app.state.NODE, node:app.currentNode});
                break;
            case app.state.FEEDBACK:
                app._history.push({state:app.state.FEEDBACK});
                break;
        }
    },
    popHistory: function() {
        if (0 == app._history.length)
            return undefined;
        return app._history.pop();
    },

    // Application Constructor
    initialize: function() {
        // we need 2 sec. timeout during splash window anyway
        app._splashTimeout = setTimeout(function() {
            delete app._splashTimeout;
            if (app._json) {
                app.initStructure(app._json);
                delete app._json;
            }
        }, 2000);

        // Bind any events that are required on startup. Common events are:
        // 'load', 'deviceready', 'offline', and 'online'.
        this._start();
    },
    _start:function(){
        if (app.testMode) {
            //app.structure.path = [];         // set initial path
            app.structure.index = 0;         // set the index of root node
            this._initNodes(app.structure);  // set parent and path for all nodes recursively
            this.initUI();
            setTimeout(function(){
                $.mobile.changePage('#root');
            }, 1000);
        } else {
            document.addEventListener('deviceready', function(){app.onDeviceReady();}, false);
        }
    },
    onDeviceReady: function() {
        Storage.readCurrentVersion(function(jsonOldStructure) {
            if (!jsonOldStructure) {
                app._cantLoadLocalDb();
                return;
            }
            Storage.checkNewVersion(function(jsonNewStructure){
                if (jsonNewStructure)
                    app.initStructure(jsonNewStructure);
                else
                    app.initStructure(jsonOldStructure);
            });
        });
    },
    _cantLoadLocalDb:function() {
        Util.messageBox("Kunnen lokale database niet laden", Util.exit, '', 'Uitgang');
    },

    _checkNewVersion: function() {
        Storage.checkNewVersion(function(jsonNewStructure){
            if(jsonNewStructure) {
                Util.messageBox("Nieuwe versie geïnstalleerd.", function(){
                    app.updateStructure(jsonNewStructure);
                }, "Nieuwe versie");
            }
        });
    },
    _initNodes:function(parent){
        for (var i= 0,n=parent.nodes.length;i<n;++i) {
            var node = parent.nodes[i];
            node.parent = parent;
            node.index = i;
            if (node.nodes)
                app._initNodes(node);
        }
    },
    initStructure:function(json){
        if (app._splashTimeout) {
            app._json = json;
            return;
        }
        app.initUI();               // called once
        app.updateStructure(json);  // may be called latter again

        // try to check new version on app open and online
        document.addEventListener('resume', function() {app._checkNewVersion();}, false);
        document.addEventListener('online', function() {app._checkNewVersion();}, false);
    },
    updateStructure: function(json) {
        //json.path = [];         // set initial path
        json.index = 0;         // set index of the root node
        this._initNodes(json);  // set parent and path for all nodes recursively
        app.structure = json;           // use new structure
        $.mobile.changePage('#root');   // start using from root node
    },
    initUI:function(){
        var w = window.innerWidth < window.innerHeight ? window.innerWidth : window.innerHeight;
        if (w < 400) {
            $('.logo').addClass('tiny_logo');
            $('.promo').addClass('tiny_promo');
            //$('.btn-back, .btn-search, .btn-star').attr('data-iconpos', 'notext');
        } else {
            $('.logo').addClass('small_logo');
            $('.promo').addClass('small_promo');
        }

        $('#searchPage').children(":jqmData(role=content)").before(
            w < 480
            ? '<div style="margin: 0 5px;"><form action="#search" method="get" id="searchForm"><input type="search" autocapitalize="off" name="query" id="query" value="" style="width:100%"  maxlength="32" /><a href="#search" data-role="button" data-theme="b" data-inline="true" style="float:right;margin-top:0;">Zoeken</a><div style="clear:both;"></div></form></div>'
            : '<form action="#search" method="get" id="searchForm"><table class="search"><tr><td style="width:100%;"><input type="search" autocapitalize="off" name="query" id="query" value="" style="width:100%" maxlength="32" /></td><td style="width:auto;"><a href="#search" data-role="button" data-theme="b">zoeken</a></td></tr></table></form>'
        );

        if (w < 300)
            var toolbar = '<div class="ui-grid-a" data-theme="c"><div class="ui-block-a logo" data-theme="c"></div><div class="ui-block-b"><div data-role="navbar"><ul><li><a href="#search" data-icon="search">zoeken</a></li><li><a href="#share" data-icon="share">delen</a></li></ul></div></div></div>';
        else if (w < 400)
            var toolbar = '<div class="ui-grid-a" data-theme="c"><div class="ui-block-a logo" data-theme="c" style="width:33%"></div><div class="ui-block-b" style="width:66%"><div data-role="navbar"><ul><li><a href="#search" data-icon="search">zoeken</a></li><li><a href="#feedback" data-icon="question">vragen</a></li><li><a href="#share" data-icon="share">delen</a></li></ul></div></div></div>';
        else
            var toolbar = '<div class="ui-grid-a" data-theme="c"><div class="ui-block-a logo" data-theme="c" style="width:25%"></div><div class="ui-block-b" style="width:75%"><div data-role="navbar"><ul><li><a href="#back" data-icon="back">terug</a></li><li><a href="#search" data-icon="search">zoeken</a></li><li><a href="#feedback" data-icon="question">vragen</a></li><li><a href="#share" data-icon="share">delen</a></li></ul></div></div></div>';
        $('div.header').prepend(toolbar);

        $('#btnFeedback').click(function(){app._onFeedback();});
        $('.logo').click(function(){$.mobile.changePage('#root');});
        document.addEventListener('backbutton', function(e){e.preventDefault();app._onBackKeyDown();}, true);
        $(document).on('pagebeforechange', function(e, data) {
            app._onPageBeforeChange(data.toPage, e);
            //if (!app.onPageBeforeChange(data.toPage))
            //    e.preventDefault();
        });
        $.event.special.swipe.horizontalDistanceThreshold = 60;
        $('body')
            .bind("swipeleft", function() {$.mobile.changePage("#next");})
            .bind("swiperight", function() {$.mobile.changePage("#prev");});

        window.addEventListener("orientationchange", app._onOrientationChange, true);
    },

    // UI events
    _onOrientationChange: function(){},
    _onBackKeyDown: function(){
        $.mobile.changePage("#exit");
    },

    _lookUpRecursive:function(id, node){
        if (node.id == id)
            return node;
        if (node.nodes)
            for (var i = 0, n = node.nodes.length; i < n; ++i) {
                var foundNode = app._lookUpRecursive(id, node.nodes[i]);
                if (foundNode)
                    return foundNode;
            }
    },
    _searchByTagsRecursive:function(node){
        var found = false;
        if (node.tags && node.tags.length > 0) {
            var isBreak = false;
            for (var i1 = 0, n1 = node.tags.length; i1 < n1; ++i1) {
                for (var i2 = 0, n2 = app._searchTags.length; i2 < n2; ++i2) {
                    if (node.tags[i1] === app._searchTags[i2]) {
                        app.searchNodes.push(node);
                        isBreak = true;
                        break;
                    }
                }
                if (isBreak)
                    break;
            }
        }
        if (node.nodes)
            for (var i = 0,n=node.nodes.length;i<n;++i)
                app._searchByTagsRecursive(node.nodes[i]);
    },
    _searchByTags:function() {
        // clear prev. search results
        app.searchNodes.splice(0, app.searchNodes.length);

        if (!app.searchQuery)
            return;

        // split search query into tokens
        var tokens = [];
        var qs = app.searchQuery.replace(/\s+/g, ' ').split(' ');
        for (var i = 0,n=qs.length;i<n;++i){
            if (qs[i]) {
                tokens.push(qs[i].toLowerCase());
            }
        }

        // actually, search
        if (tokens.length > 0) {
            if (tokens.length > 1)
                tokens.push(tokens.join(' '));
            app._searchTags = tokens;
            app._searchByTagsRecursive(app.structure);
        }
    },

    _onShare:function() {
        var subject = 'Advocaten.nl';
        var text = '';
        var url = 'http://www.advocaten.nl';
        switch (app.currentState) {
            case app.state.NODE:
            case app.state.SEARCH_NODE:
                subject = app.currentNode.title;
                text = app.text;
                url = "http://www.advocaten.nl/online/node/" + app.currentNode.id;
                break;
        }
        cordova.exec(function(status) {
            //alert('Share done');
        }, function(err) {
            //alert('Share failed');
        }, "Share", '', [{url:url, subject: subject, text: text}]);
    },

    _isEmailCorrect: function (email) {
        var regex = /^([a-zA-Z0-9_\.\-\+])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
        if (regex.test(email))
            return true;
        return false;
    },
    _resetFeedbackForm: function() {
        $("select#selField option:first").attr('selected', 'selected');
        $("select#selField").prev().find("span").find("span").html($("select#selField option:selected").html());
        $('textarea#question').val('');
        $('input#name').val('');
        $('input#email').val('');
        $('#question').height(app.feedbackTextHeight);
    },
    _onFeedback:function() {
        if (Connection.NONE == navigator.network.connection.type) {
            alert('Maak verbinding met internet om te verzenden');
            return;
        }
        var data = {
            type:$("select#selField option:selected").val(),
            question:$.trim($('textarea#question').val()),
            name: $.trim($('input#name').val()),
            email:$.trim($('input#email').val())
        };
        if (0 == data.type || !data.question || !data.name || !data.email) {
            alert('Alle velden invullen');
            return;
        }
        if (data.question.length < 10) {
            alert('Stel een inhoudelijke vraag');
            return;
        }
        if (data.question.length > 2000) {
            alert('Stel een inhoudelijke vraag van maximaal 2000 tekens');
            return;
        }
        if (data.name.length < 2) {
            alert('Geef een naam op');
            return;
        }
        if (data.name.length > 50){
            alert('Stel een inhoudelijke naam van maximaal 50 tekens');
            return;
        }
        if (data.email.length > 50){
            alert('Stel een inhoudelijke email adres van maximaal 50 tekens');
            return;
        }
        if (!app._isEmailCorrect(data.email)) {
            alert('Geef  correct email adres');
            return;
        }
        $.mobile.showPageLoadingMsg($.mobile.loadingMessageTheme, 'zenden...', false);
        $.ajax({
            url:Storage.FEEDBACK_URL,
            type:'post',
            contentType: 'application/json',
            data:JSON.stringify(data),
            cache:false,
            success: function () {
                $.mobile.hidePageLoadingMsg();
                app._resetFeedbackForm();
                $.mobile.changePage("#feedbackDone");
            },
            error:function(){
                $.mobile.hidePageLoadingMsg();
                alert("Uw vraag kon niet worden verzonden");
            }
        });
    },

    _gotoRoot: function() {
        this._history = [];
        app.currentState = app.state.NODE;
        app.currentNode = app.structure;
    },
    _gotoSearch: function() {
        switch(app.currentState) {
            case app.state.NODE:
            case app.state.SEARCH_NODE:
            case app.state.FEEDBACK:
                app.pushHistory();
            case app.state.FEEDBACK_DONE:
                app.currentState = app.state.SEARCH;
                app.searchQuery = undefined;
                break;
            case app.state.SEARCH:
                var query = $('input#query').val();
                if (query !== app.searchQuery) {
                    app.searchQuery = query;
                    if (app.searchQuery.length <= 1) {
                        app.searchNodes.splice(0, app.searchNodes.length);
                        //'Te korte vraag.';
                    } else {
                        app._searchByTags();
                    }
                }
                break;
        }
    },
    _gotoFeedback: function() {
        if (app.state.FEEDBACK == app.currentState)
            return;
        app.pushHistory();
        app.currentState = app.state.FEEDBACK;
    },
    _onPageBeforeChange: function(toPage, event){
        if (typeof toPage === "string") {
            var hash = $.mobile.path.parseUrl(toPage).hash;
            var options = {changeHash:false, transition:'none'};
            if ('#root' === hash) {
                app._gotoRoot();
                //options.transition = "fade";
            } else if ('#node' === hash.substring(0, 5)) {
                var id = hash.substring(5);
                if (id) {
                    var node = app._lookUpRecursive(id, app.structure);
                    if (node) {
                        this.pushHistory();
                        app.currentState = app.state.NODE;
                        app.currentNode = node;
                    } else {
                        return;
                    }
                } else {
                    return;
                }
            } else if ('#child' === hash.substring(0, 6)) {
                var i = parseInt(hash.substring(6));
                switch(app.currentState) {
                    case app.state.SEARCH:
                        var nodes = app.searchNodes;
                        break;
                    case app.state.SEARCH_NODE:
                    case app.state.NODE:
                        var nodes = app.currentNode.nodes;
                        if ('link' == app.currentNode.type) {
                            var linkedNode = app._lookUpRecursive(app.currentNode.linkId, app.structure);
                            if (linkedNode)
                                nodes = linkedNode.nodes;
                        }
                        break;
                }
                if (!nodes || nodes.length <= i)
                    return;

                var targetNode = nodes[i];
                switch (targetNode.type) {
                    case 'root':
                        app._gotoRoot();
                        //options.transition = "fade";
                        break;
                    case 'search':
                        app.pushHistory();
                        app.currentState = app.state.SEARCH;
                        app.searchQuery = undefined;
                        break;
                    case 'feedback':
                        app.pushHistory();
                        app.currentState = app.state.FEEDBACK;
                        break;
                    default:
                        this.pushHistory();
                        switch(app.currentState) {
                            case app.state.SEARCH:
                                app.currentState = app.state.SEARCH_NODE;
                                app.searchIndex = i;
                                //app.currentNode = app._nodeByPath(nodes[i].path);
                                break;
                            case app.state.SEARCH_NODE:
                                app.currentState = app.state.NODE;
                                break;
                        }
                        app.currentNode = targetNode;
                        //options.transition = "slide";
                }
            } else if ('#search' === hash) {
                app._gotoSearch();
            } else if ('#share' === hash) {
                app._onShare();
                return;
            } else if ('#feedback' === hash) {
                app._gotoFeedback();
            } else if ('#feedbackDone' === hash) {
                if (app.state.FEEDBACK != app.currentState)
                    return;
                app.currentState = app.state.FEEDBACK_DONE;
            } else if ('#back' === hash || '#exit' === hash) {
                var hist = app.popHistory();
                if (!hist) {
                    if ('#exit' === hash)
                        Util.exit();
                    return;
                }
                app.currentState = hist.state;
                switch(hist.state) {
                    case app.state.NODE:
                        app.currentNode = hist.node;
                        break;
                    case app.state.SEARCH:
                        app.currentQuery = hist.query;
                        app._searchByTags();
                        //options.transition = "fade";
                        break;
                    case app.state.SEARCH_NODE:
                        app.searchQuery = hist.query;
                        app._searchByTags();
                        app.currentNode = hist.node;
                        app.searchIndex = hist.index;
                        break;
                }
                //options.transition = "slide";
                //options.reverse = true;
            } else if ('#prev' === hash || '#next' === hash) {
                var parentNodes = undefined;
                var i = 0;
                switch (app.currentState) {
                    case app.state.NODE:
                        if (typeof app.currentNode.parent !== 'undefined') {
                            var parentNode = app.currentNode.parent;
                            if (parentNode.type !== 'list' && parentNode.type !== 'menu')
                                return;
                            parentNodes = parentNode.nodes;
                            //i = app.currentNode.path[app.currentNode.path.length - 1];
                            i = app.currentNode.index;
                        }
                        break;
                    case app.state.SEARCH_NODE:
                        parentNodes = app.searchNodes;
                        i = app.searchIndex;
                        break;
                }
                if (!parentNodes)
                    return;
                var n = parentNodes.length;
                if (n <= 1)
                    return;

                if ('#prev' === hash) {
                    --i;
                    if (i < 0)
                        i = n - 1;
                } else {
                    ++i;
                    if (i >= n)
                        i = 0;
                }

                if (app.currentState === app.state.SEARCH_NODE)
                    app.searchIndex = i;

                var newType = parentNodes[i].type;
                if ('root' == newType) {
                    app._gotoRoot();
                } else if ('search' == newType) {
                    app._gotoSearch();
                } else if ('feedback' == newType) {
                    app._gotoFeedback();
                } else {
                    app.currentNode = parentNodes[i];
                }

                //options.transition = "slide";
                //options.reverse = ('#prev' === hash);

            } else {
                return true;
            }
            event.preventDefault();
            app.showCurrentNode(options);
        }
    },
    listButtons:function() {
        var parentNodes = undefined;
        var i = 0;
        switch (app.currentState) {
            case app.state.NODE:
                if (typeof app.currentNode.parent !== 'undefined') {
                    var parentNode = app.currentNode.parent;
                    if (parentNode.type !== 'list' && parentNode.type !== 'menu')
                        return;
                    parentNodes = parentNode.nodes;
                    //i = app.currentNode.path[app.currentNode.path.length - 1];
                    i = app.currentNode.index;
                }
                break;
            case app.state.SEARCH_NODE:
                parentNodes = app.searchNodes;
                i = app.searchIndex;
                break;
        }
        if (!parentNodes)
            return;
        var n = parentNodes.length;
        if (n <= 1)
            return;
        var nextTitle = parentNodes[(i + 1)%n].title;
        var prevTitle = parentNodes[(i + n - 1)%n].title;
        if (n > 2)
            return [prevTitle, nextTitle];
        else if (0 === i)
            return [undefined, nextTitle];
        else
            return [prevTitle, undefined];
    },
    showCurrentNode:function(options) {
        if (!options)
            options = {changeHash:false, transition:'none'};

        switch (app.currentState) {
            case app.state.NODE:
            case app.state.SEARCH_NODE:
                var listButtons = this.listButtons();

                // current page as a place to show the content
                //if (!samePage)
                app.currentPage = 0 === app.currentPage ? 1 : 0;
                var $page = $('#page' + app.currentPage);

                var $header = $page.children(":jqmData(role=header)");
                var $footer = $page.children(":jqmData(role=footer)");

                // specile list buttons in the footer
                var $listButtons = $footer;
                if (listButtons) {
                    // set text for prev. list-navigation button
                    var button = $listButtons.find('.ui-btn-text:first');
                    if (button.length === 0)
                        button = $listButtons.find('.btnLeft');
                    if (typeof listButtons[0] === 'undefined')
                        button.html('&nbsp;');
                    else
                        button.text(listButtons[0]);

                    // set text for next list-navigation button
                    button = $listButtons.find('.ui-btn-text:last');
                    if (button.length === 0)
                        button = $listButtons.find('.btnRight');
                    if (typeof listButtons[1] === 'undefined')
                        button.html('&nbsp;');
                    else
                        button.text(listButtons[1]);

                    $listButtons.show();
                } else {
                    $listButtons.hide();
                }

                window.scroll(0,0);

                $header.find("h1").html(app.currentNode.title);

                if ('link' === app.currentNode.type)
                    var node = app._lookUpRecursive(app.currentNode.linkId, app.structure);
                else
                    var node = app.currentNode;
                switch (node.type) {
                    case 'menu':
                        this.showMenu(node, $page);
                        break;
                    case 'list':
                        this.showList(node, $page);
                        break;
                    default:
                        this.showContent(node, $page);
                        break;
                }

                // correct right icon for right list button in footer
                if (listButtons) {
                    $listButtons.find('.ui-btn:last').removeClass('ui-btn-icon-left');
                    $listButtons.find('.ui-btn:last').addClass('ui-btn-icon-right');
                }

                break;
            case app.state.SEARCH:
                var $page = $('#searchPage');
                window.scroll(0,0);
                app.showSearch($page);
                break;
            case app.state.FEEDBACK:
                var $page = $('#feedbackForm');
                app.showCustomPage($page);
                if (!app.feedbackTextHeight)
                    app.feedbackTextHeight = $('#question').height();
                break;
            case app.state.FEEDBACK_DONE:
                var $page = $('#feedbackDone');
                app.showCustomPage($page);
                break;
        }

        $.mobile.changePage($page, options);
    },
    loadText: function(node, callback) {
        app.text = undefined;
        if (app.testMode) {
            if (node.text)
                callback(node.text);
            else
                callback('');
            return;
        }
        if (node.text)
        {
            if (node.text === true)
                Util.readLocalFile(node.id + ".html", function(text) {
                    app.text = text;
                    callback(text);
                }, function(){
                    callback('');
                })
            else {
                app.text = node.text;
                callback(node.text);
            }
        }
        else
            callback('');
    },
    showMenu:function(node, $page) {
        app.loadText(node, function(text){
            var $content = $page.children(':jqmData(role=content)');
            if (text)
                var markup = '<p class="text">' + text + '</p>';
            else
                var markup = '';
            if (node.nodes && node.nodes.length > 0) {
                markup += "<p>";
                for (var i = 0, n = node.nodes.length; i < n; ++i) {
                    var item = node.nodes[i];
                    markup += '<a href="#child' + i + '" data-role="button" data-theme="a">' + item.title + '</a>';
                }
                markup += "</p>";
            }
            $content.html(markup);
            $page.page();
            $content.find(":jqmData(role=button)").button();
        });
    },
    showList:function(node, $page) {
        app.loadText(node, function(text){
            var $content = $page.children(":jqmData(role=content)");
            if (text)
                var markup = '<p class="text">' + text + '</p>';
            else
                var markup = '';
            if (node.nodes && node.nodes.length > 0) {
                markup += '<ul data-role="listview" data-inset="true">';
                for (var i = 0, n = node.nodes.length; i < n; ++i) {
                    var item = node.nodes[i];
                    markup += '<li><a href="#child' + i + '">' + item.title + '</a></li>';
                }
                markup += "</ul>";
            }
            $content.html(markup);
            $page.page();
            $content.find(":jqmData(role=listview)").listview();
        });
    },
    showContent:function(node, $page) {
        app.loadText(node, function(text){
            var $content = $page.children(":jqmData(role=content)");
            if (text)
                var markup = '<div class="text">' + text + '</div>';
            else
                var markup = '';
            $content.html(markup);
            $page.page();
        });
    },
    showSearch:function($page) {
        var $content = $page.children(":jqmData(role=content)");
        var $query = $('input#query');
        var $results = $('div#results');

        if (typeof app.searchQuery !== 'undefined') {
            if (app.searchNodes.length > 0) {
                var markup = '<div><strong>' + app.searchNodes.length + '</strong> artikelen gevonden:</div><ul data-role="listview" data-inset="true">';
                for (var i = 0, n = app.searchNodes.length; i < n; ++i) {
                    var item = app.searchNodes[i];
                    markup += '<li><a href="#child' + i + '">' + item.title + '</a></li>';
                }
                markup += "</ul>";
            } else {
                var markup = '<div class="search_message">Niets gevonden. Probeer een andere zoekopdracht.</div>';
            }
        } else {
            var markup = '<div class="search_message">Geef een of meer woorden om te zoeken.</div>';
        }
        $results.html(markup);
        $page.page();
        $query.val(typeof app.searchQuery !== 'undefined' ? app.searchQuery : '');

        if (app.searchNodes.length > 0)
            $content.find(":jqmData(role=listview)").listview();
    },
    showCustomPage:function($page) {
        window.scroll(0,0);
        $page.page();
    }

};
