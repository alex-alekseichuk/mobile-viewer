/**
 * CMS backbone based client
 */

var Cms = {};

$(function(){
Cms.alert = {
    error: function(message) {
        this._show(message, 'alert-error');
    },
    success: function(message) {
        this._show(message, 'alert-success');
    },
    info: function(message) {
        this._show(message, 'alert-info');
    },
    _show: function(message, cssClass) {
        if (!cssClass)
            cssClass = '';
        if (this._cssClass && this._cssClass != cssClass) {
            $('div.alert').removeClass(this._cssClass);
        }
        this._cssClass = cssClass;
        if (this._cssClass)
            $('div.alert').addClass(this._cssClass);
        $('span', 'div.alert').html(message);
        if ($('div.alert').is(':visible'))
            $('div.alert').fadeOut('fast', function(){$('div.alert').fadeIn('fast');});
        else
            $('div.alert').slideDown('fast');
        if (Cms.alert._timer)
            clearTimeout(Cms.alert._timer);
        Cms.alert._timer = setTimeout(function() {
            Cms.alert._timer = 0;
            Cms.alert.close();
        }, 5000);
    },
    close: function() {
        if (Cms.alert._timer)
            clearTimeout(Cms.alert._timer);
        $('div.alert').slideUp('fast');
    },
    hide: function() {
        $('div.alert').hide();
    }
};

Cms.pages = {
    _pages: [],
    list: function(id) {
        var s = "";
        for (var i =0, n = this._pages.length; i < n; ++i)
            s += '<option value="' + this._pages[i].id + '"' +
                (id === this._pages[i].id ? ' selected="selected"' : '') +
                '>' + this._pages[i].title + '</option>';
        return s;
    },
    init: function(callback) {
        var self = this;
        $.ajax({
            type: 'GET',
            url: 'pages',
            error: function(xhr, textStatus, errorThrown) {
                Cms.alert.error("Can't load pages list.");
            },
            success: function(data) {
                self._pages = data;
                self.sort();
                if (typeof callback === 'function')
                    callback();
            }
        });
    },
    sort: function() {
        this._pages.sort(function(l,r){return l.title < r.title ? -1 : 1});
    },
    delete: function(id) {
        for (var i=0, n = this._pages.length; i < n; ++i)
            if (this._pages[i].id == id) {
                this._pages.splice(i, 1);
                return;
            }
    },
    sync: function(id, title) {
        for (var i=0, n = this._pages.length; i < n; ++i)
            if (this._pages[i].id == id) {
                this._pages[i].title = title;
                this.sort();
                return;
            }
        this._pages.push({id:id, title:title});
        this.sort();
    }
};

Cms.NodeItem = Backbone.Model.extend({
    urlRoot: 'nodeItem',
    initialize: function() {
    }
});
Cms.NodeItems = Backbone.Collection.extend({
    model: Cms.NodeItem,
    comparator: function(model) {
        return model.get('rank');
    }
});
Cms.Node = Backbone.Model.extend({
    urlRoot: 'node',
    defaults:{
        id:null,
        title:"",
        text:"",
        tags:"",
        type:"",
        items:new Cms.NodeItems(),
        linkId:null
    },
    initialize: function() {
        this.bind("invalid", function(model, error){
            Cms.alert.error(error);
        });
        this.bind('destroy', function(){
            Cms.pages.init();
            //Cms.pages.delete(this.get("id"));
        }, this);
        this.bind('sync', function(){
            Cms.pages.sync(this.get("id"), this.get("title"));
        }, this);
    },
    validate: function (attrs) {
        if (typeof attrs.title !== 'undefined') {
            if (!_.isString(attrs.title) || attrs.title.length === 0 ) {
                return "Title should not be empty string.";
            }
        }
    },
    parse: function(response) {
        this.attributes.items.reset(response.items);
        delete response.items;
        return response;
    }
});

Cms.EditNodeItemView = Backbone.View.extend({
    tagName:"li",
    class:"ui-state-default",
    template: _.template($('#editNodeItem').html()),
    events: {
        "click a": "openItem",
        "drop": "drop"
    },
    initialize: function() {
        this.model.bind("change", this.render, this);
        this.model.bind("destroy", this.close, this);
    },
    render:function() {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    },
    close: function() {
        $(this.el).unbind();
        $(this.el).remove();
    },
    openItem: function() {
        Cms.alert.hide();
        Cms.router.navigate("#!/node/" + this.model.id, true);
    },
    drop: function(event, index) {
        this.$el.parent().trigger('update-sort', [this.model, index]);
    }
});
Cms.EditNodeItemsView = Backbone.View.extend({
    tagName: 'ol',
    id: 'items',
    events: {
    },
    initialize:function () {
    },
    render: function() {
        var self = this;
        $(this.el).bind('update-sort', function(event, model, position) {self.updateSort(event, model, position);});

        $(this.el).children().remove();

        //var ms = this.collection.models;
        _.each(this.collection.models, function (item) {
            $(this.el).append(new Cms.EditNodeItemView({model:item}).render().el);
        }, this);

        // make items sortable
        $(this.el).sortable({
            helper: 'clone',
            cursor: 'move',
            stop: function(event, ui){
                ui.item.trigger('drop', ui.item.index());
            }
        });

        return this;
    },
    updateSort: function(event, model, position) {
        var self = this;
        this.collection.remove(model);
        this.collection.each(function (model, index) {
            var rank = index;
            if (index >= position)
                rank += 1;
            model.set('rank', rank);
        });

        model.set('rank', position);
        this.collection.add(model, {at: position});

        // to update ranks on server:
        var ids = this.collection.pluck('id').join(',');
        $.ajax({
            type: 'PUT',
            url: 'items/order',
            data: ids,
            error: function(xhr, textStatus, errorThrown) {
                Cms.alert.error("Can't reorder.");
                Cms.node.fetch();
            }
        });
    }
});
Cms.BaseNodeView = Backbone.View.extend({
    _toggleSections: function(type) {
        if ('link' == type)
        {
            $('#linkContainer', this.el).show();
        } else {
            $('#linkContainer', this.el).hide();
        }
        if ('link' == type || 'root' == type || 'search' == type || 'feedback' == type)
        {
            $('#contentContainer', this.el).hide();
        } else {
            $('#contentContainer', this.el).show();
        }
        if ('menu' == type || 'list' == type)
            $('#itemsBox', this.el).show();
        else
            $('#itemsBox', this.el).hide();
    },
    checkType: function(type) {
        this._toggleSections($(this.el).find("input[name=type]:checked").val());
    }
});
Cms.EditNodeView = Cms.BaseNodeView.extend({
    el: $("#block"),
    template: _.template($('#editNode').html()),
    events: {
        "click button#save": "save",
        "click input[name=type]": "checkType",
        "click button#blankNode": "blankNode",
        "click button#back": "back",
        "click button#delete": "delete"
    },
    initialize: function() {
        this.model.bind("sync", this.render, this);
        _.bindAll(this, 'checkType');
        this.items = new Cms.EditNodeItemsView({
            collection: this.model.attributes.items
        });
    },
    render: function() {
        $(this.el).html(this.template(Cms.node.toJSON()));

        // render items
        $('#itemsBox', this.el).append(this.items.render().el);

        $("textarea#text").cleditor({
            width: "100%"
        })[0].focus();

        // toggle the sections
        var type = this.model.get('type');
        this._toggleSections(type);

        return this;
    },
    save: function() {
        //alert($(this.el).find("textarea#text").val().substring(0, 100));
        this.model.save({
            title: $(this.el).find("input#title").val(),
            text: $(this.el).find("textarea#text").val(),
            tags: $(this.el).find("input#tags").val(),
            linkId: $(this.el).find("select#linkId").val(),
            type: $(this.el).find("input[name=type]:checked").val()
        }, {
            success: function(model, resp) {
                Cms.alert.success('Saved.');
            },
            error: function(err) {
                Cms.alert.error(err);
            }
        });
    },
    blankNode: function() {
        Cms.router.navigate('#!/blank/' + this.model.get('id'), true);
    },
    back: function() {
        window.history.back();
    },
    delete: function() {
        if (confirm('Are you sure you really want to delete this node and all its items?')) {
            this.model.destroy({
                success: function(model, resp) {
                    window.history.back();
                    Cms.alert.success('Deleted.');
                },
                error: function(err) {
                    Cms.alert.error(err);
                }
            });
        }
    }
});

Cms.BlankNodeView = Cms.BaseNodeView.extend({
    el: $("#block"),
    template: _.template($('#blankNode').html()),
    events: {
        "click input[name=type]": "checkType",
        "click button#addNode": "addNode"
    },
    initialize: function() {
        _.bindAll(this, 'checkType');
    },
    render:function () {
        $(this.el).html(this.template(Cms.node.toJSON()));

        $("textarea#text").cleditor({
            width: "100%"
        })[0].focus();

        // toggle the sections
        var type = this.model.get('type');
        this._toggleSections(type);

        return this;
    },
    addNode: function () {
        this.model.save({
            title: $(this.el).find("input#title").val(),
            text: $(this.el).find("textarea#text").val(),
            tags: $(this.el).find("input#tags").val(),
            linkId: $(this.el).find("select#linkId").val(),
            type: $(this.el).find("input[name=type]:checked").val()
        }, {
            success: function(model, resp) {
                Cms.router.navigate("#!/node/" + model.get('id'), {replace:true});
                Cms.alert.success('Added.');
            },
            error: function(err) {
                Cms.alert.error(err);
            }
        });
    }
});

Cms.Router = Backbone.Router.extend({
    routes: {
        "": "openRoot", // default
        "!/node/:id": "openNode", // open node for edit
        "!/blank/:parentId": "blankNode" // open blank node form for insertion
    },
    openRoot: function () {
        //Cms.alert.hide();
        Cms.node.set("id", 0);
        Cms.node.fetch({
            success: function(node, response) {
            },
            error: function(node, response) {
                if (404 == response.status) {
                    Cms.node.set("id", undefined);
                    Cms.node.set("parentId", undefined);
                    Cms.views.blankNode.render();
                }
                else
                    Cms.alert.error(response.responseText);
            }
        });
    },
    openNode: function(id) {
        //Cms.alert.hide();
        Cms.node.set("id", id);
        Cms.node.fetch({
            success: function(node, response) {
            },
            error: function(node, response) {
                Cms.alert.error(response.responseText);
            }
        });
    },
    blankNode: function(parentId) {
        Cms.alert.hide();
        var path = Cms.node.get("path");
        Cms.node.set("path", (path ? path + ',' : '') + Cms.node.get("id"));
        Cms.node.set("parentId", Cms.node.get("id"));
        Cms.node.set("id", undefined);
        Cms.views.blankNode.render();
    }
});

Cms.deploy = function() {
    if (confirm('Are you sure to deploy new version?')) {
        $.ajax({
            type: 'GET',
            url: 'build',
            error: function(xhr, textStatus, errorThrown) {
                Cms.alert.error(textStatus);
            },
            success: function() {
                Cms.alert.success("Deployed.");
            }
        });
    }
}

$("div.alert button.close").click(Cms.alert.close); // init alert box
$(".deploy").click(Cms.deploy); // init deploy button(s)

Cms.alert.info("Loading...");
Cms.pages.init(function(){
    Cms.alert.hide();
    Cms.node = new Cms.Node({id:0});
    Cms.views = {
        blankNode: new Cms.BlankNodeView({model:Cms.node}),
        editNode: new Cms.EditNodeView({model:Cms.node})
    };
    Cms.router = new Cms.Router();

    //Backbone.history.start({pushState: true, root: ""});
    Backbone.history.start({root: ""});
    //Cms.router.navigate();
});

});

