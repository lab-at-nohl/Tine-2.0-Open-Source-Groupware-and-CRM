/* 
 * Tine 2.0
 * 
 * @license     http://www.gnu.org/licenses/agpl.html AGPL Version 3
 * @author      Cornelius Weiss <c.weiss@metaways.de>
 * @copyright   Copyright (c) 2007-2008 Metaways Infosystems GmbH (http://www.metaways.de)
 * @version     $Id$
 */
 
Date.msSECOND = 1000;
Date.msMINUTE = 60 * Date.msSECOND;
Date.msHOUR   = 60 * Date.msMINUTE;
Date.msDAY    = 24 * Date.msHOUR;
Date.msWEEK   =  7 * Date.msDAY;

Ext.ns('Tine.Calendar');

Tine.Calendar.CalendarPanel = Ext.extend(Ext.Panel, {
    /**
     * @cfg {Tine.Calendar.someView} view
     */
    view: null,
    /**
     * @cfg {Ext.data.Store} store
     */
    store: null,
    /**
     * @cfg {Bool} border
     */
    border: false,
    /**
     * @cfg {String} loadMaskText
     */
    loadMaskText: 'Loading events, please wait...',
    /**
     * @private
     */
    initComponent: function() {
        Tine.Calendar.CalendarPanel.superclass.initComponent.call(this);
        
        this.app = Tine.Tinebase.appMgr.get('Calendar');
        
        this.selModel = this.selModel || new Tine.Calendar.EventSelectionModel();
        
        this.autoScroll = false;
        this.autoWidth = false;
        
        this.relayEvents(this.view, ['changeView', 'changePeriod', 'click', 'dblclick', 'contextmenu']);
        
        this.store.on('beforeload', this.onBeforeLoad, this);
        this.store.on('load', this.onLoad, this);
    },
    
    getSelectionModel: function() {
        return this.selModel;
    },
    
    getStore: function() {
        return this.store;
    },
    
    getView: function() {
        return this.view;
    },
    
    onAddEvent: function(event) {
        this.setLoading(true);
        
        // remove temporary id
        if (event.get('id').match(/new/)) {
            event.set('id', '');
        }
        
        if (event.isRecurBase()) {
            this.loadMask.show();
        }
        
        Tine.Calendar.backend.saveRecord(event, {
            scope: this,
            success: function(createdEvent) {
                if (createdEvent.isRecurBase()) {
                    this.store.load({refresh: true});
                } else {
                    this.store.remove(event);
                    this.store.add(createdEvent);
                    this.setLoading(false);
                    this.view.getSelectionModel().select(createdEvent);
                }
            }
        });
    },
    
    onBeforeLoad: function(store, options) {
        if (! options.refresh) {
            if (this.rendered) {
                this.loadMask.show();
            }
            this.store.each(this.view.removeEvent, this.view);
        }
        
        options.params = options.params || {};
        
        var filter = options.params.filter ? options.params.filter : [];
        filter.push({field: 'period', operator: 'within', value: this.getView().getPeriod() });
    },
    
    onLoad: function() {
        if (this.rendered) {
            this.loadMask.hide();
        }
    },
    
    onUpdateEvent: function(event) {
        this.setLoading(true);
        //console.log('A existing event has been updated -> call backend saveRecord');
        
        if (event.isRecurBase()) {
            this.loadMask.show();
        }
        
        if (event.isRecurBase()) {
            Ext.MessageBox.confirm(
                this.app.i18n._('Confirm Update of Series'),
                this.app.i18n._('Do you realy want to update all events of this recuring event series?'),
                function(btn) {
                    if(btn == 'yes') {
                        this.loadMask.show();
                        this.onUpdateEventAction(event);
                        this.store.load({refresh: true});
                    } else {
                        this.loadMask.show();
                        this.store.load({refresh: true});
                    }
                }, this
            );
        } else if (event.isRecurInstance()) {
            this.updateeMethodWin = new Ext.Window({
                modal: true,
                title: this.app.i18n._('Update Event'),
                html:  this.app.i18n._('Do you want to update the whole series, or just this event'),
                buttons: [{
                    text: this.app.i18n._('Update nothing'),
                    scope: this,
                    handler: function() {
                        this.loadMask.show();
                        this.store.load({refresh: true});
                        this.updateeMethodWin.close();
                    }
                }, {
                    text: this.app.i18n._('Update whole series'),
                    scope: this,
                    handler: function() {
                        this.loadMask.show();
                        
                        var options = {
                            scope: this,
                            success: function() {
                                this.store.load({refresh: true});
                            },
                            failure: function () {
                                this.loadMask.hide();;
                                Ext.MessageBox.alert(Tine.Tinebase.tranlation._hidden('Failed'), this.app.i18n._('Failed not update recurring event series')); 
                            }
                        };
                        
                        Tine.Calendar.backend.updateRecurSeries(event, options);
                        this.updateeMethodWin.close();
                    }
                }, {
                    text: this.app.i18n._('Update this event only'),
                    scope: this,
                    handler: function() {
                        var options = {
                            scope: this,
                            success: function(updatedEvent) {
                                event =  this.store.indexOf(event) != -1 ? event : this.store.getById(event.id);
                    
                                this.store.remove(event);
                                this.store.add(updatedEvent);
                                this.setLoading(false);
                                this.view.getSelectionModel().select(updatedEvent);
                            },
                            failure: function () {
                                Ext.MessageBox.alert(Tine.Tinebase.tranlation._hidden('Failed'), this.app.i18n._('Failed not update event')); 
                            }
                        };
                        
                        Tine.Calendar.backend.createRecurException(event, false, false, options);
                        this.updateeMethodWin.close();
                    }
                }]
            });
            this.updateeMethodWin.show();
        } else {
            this.onUpdateEventAction(event);
        }
    },
    
    onUpdateEventAction: function(event) {
        Tine.Calendar.backend.saveRecord(event, {
            scope: this,
            success: function(updatedEvent) {
                //console.log('Backend returned updated event -> replace event in view');
                if (updatedEvent.isRecurBase()) {
                    this.store.load({refresh: true});
                } else {
                    event =  this.store.indexOf(event) != -1 ? event : this.store.getById(event.id);
                    
                    this.store.remove(event);
                    this.store.add(updatedEvent);
                    this.setLoading(false);
                    this.view.getSelectionModel().select(updatedEvent);
                }
            }
        });
    },
    
    setLoading: function(bool) {
        var tbar = this.getTopToolbar();
        if (tbar && tbar.loading) {
            tbar.loading[bool ? 'disable' : 'enable']();
        }
    },
    
    /*
    onRemoveEvent: function(store, event, index) {
        console.log(event);
        console.log('A existing event has been deleted -> call backend delete'); 
    },
    */
    
    /**
     * @private
     */
    onRender: function(ct, position) {
        Tine.Calendar.CalendarPanel.superclass.onRender.apply(this, arguments);
        
        var c = this.body;
        this.el.addClass('cal-panel');
        this.view.init(this);
        
        // quick add/update actions
        this.view.on('addEvent', this.onAddEvent, this);
        this.view.on('updateEvent', this.onUpdateEvent, this);
        
        this.view.on("click", this.onClick, this);
        this.view.on("dblclick", this.onDblClick, this);
        this.view.on("contextmenu", this.onContextMenu, this);
        
        c.on("keydown", this.onKeyDown, this);
        //this.relayEvents(c, ["keypress"]);
        
        this.view.render();
    },
    
    /**
     * @private
     */
    afterRender : function(){
        Tine.Calendar.CalendarPanel.superclass.afterRender.call(this);
        
        this.loadMask = new Ext.LoadMask(this.body, {msg: this.loadMaskText});
        this.view.layout();
        this.view.afterRender();
        
        this.viewReady = true;
    },
    
    /**
     * @private
     */
    onResize: function(ct, position) {
        Tine.Calendar.CalendarPanel.superclass.onResize.apply(this, arguments);
        if(this.viewReady){
            this.view.layout();
        }
    },
    
    /**
     * @private
     */
    processEvent : function(name, event){
        //console.log('Tine.Calendar.CalendarPanel::processEvent "' + name + '" on envent: ' + event.id );
    },
    
    /**
     * @private
     */
    onClick : function(event, e){
        this.processEvent("click", event);
    },

    /**
     * @private
     */
    onContextMenu : function(event, e){
        this.processEvent("contextmenu", event);
    },

    /**
     * @private
     */
    onDblClick : function(event, e){
        this.processEvent("dblclick", event);
    },
    
    /**
     * @private
     */
    onKeyDown : function(e){
        this.fireEvent("keydown", e);
    }
    
});