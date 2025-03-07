/*
 * Tine 2.0
 *
 * @license     http://www.gnu.org/licenses/agpl.html AGPL Version 3
 * @author      Philipp Schuele <p.schuele@metaways.de>
 * @copyright   Copyright (c) 2010 Metaways Infosystems GmbH (http://www.metaways.de)
 */

require('../../../css/widgets/PickerGridPanel.css');

Ext.ns('Tine.widgets.grid');

/**
 * Picker GridPanel
 *
 * @namespace   Tine.widgets.grid
 * @class       Tine.widgets.grid.PickerGridPanel
 * @extends     Ext.grid.GridPanel
 *
 * <p>Picker GridPanel</p>
 * <p><pre>
 * </pre></p>
 *
 * @license     http://www.gnu.org/licenses/agpl.html AGPL Version 3
 * @author      Philipp Schuele <p.schuele@metaways.de>
 * @copyright   Copyright (c) 2010 Metaways Infosystems GmbH (http://www.metaways.de)
 *
 * @param       {Object} config
 * @constructor
 * Create a new Tine.widgets.grid.PickerGridPanel
 */
Tine.widgets.grid.PickerGridPanel = Ext.extend(Ext.grid.EditorGridPanel, {
    /**
     * @cfg {Class} editDialogClass (optional)
     * editDialogClass having a static openWindow method
     */
    editDialogClass: null,

    /**
     * @cfg {Object} editDialogConfig (optional)
     */
    editDialogConfig: null,

    /**
     * @cfg {bool}
     * enable bottom toolbar
     */
    enableBbar: true,

    /**
     * @cfg {bool}
     * enable top toolbar (with search combo)
     */
    enableTbar: true,

    /**
     * store to hold records
     *
     * @type Ext.data.Store
     * @property store
     */
    store: null,

    /**
     * record class
     * @cfg {Tine.Tinebase.data.Record} recordClass
     */
    recordClass: null,

    /**
     * defaults for new records of this.recordClass
     * @cfg {Object} recordClass
     */
    recordDefaults: null,

    /**
     * refIdField for new dependend records
     * @cfg {String} refIdField
     */
    refIdField: null,

    /**
     * record class
     * @cfg {Tine.Tinebase.data.Record} recordClass
     */
    searchRecordClass: null,

    isMetadataModelFor: null,
    
    /**
     * search combo config
     * @cfg {} searchComboConfig
     */
    searchComboConfig: null,

    /**
     * is the row selected after adding?
     * @type Boolean
     */
    selectRowAfterAdd: true,

    /**
     * is the row highlighted after adding?
     * @type Boolean
     */
    highlightRowAfterAdd: false,

    /**
     * @type Ext.Menu
     * @property contextMenu
     */
    contextMenu: null,

    /**
     * @cfg {Array} contextMenuItems
     * additional items for contextMenu
     */
    contextMenuItems: null,

    /**
     * @cfg {Array} Array of column's config objects where the config options are in
     */
    configColumns: null,

    /**
     * @cfg {Bool} readOnly
     */
    readOnly: false,

    /**
     * @cfg {Bool} allowCreateNew
     * allow to create new records (local mode only atm.!)
     */
    allowCreateNew: false,

    /**
     * @cfg {Bool} allowDelete
     * allow to delete records
     */
    allowDelete: true,

    /**
     * config spec for additionalFilters - passed to RecordPicker
     *
     * @type: {object} e.g.
     * additionalFilterConfig: {config: { 'name': 'configName', 'appName': 'myApp'}}
     * additionalFilterConfig: {preference: {'appName': 'myApp', 'name': 'preferenceName}}
     * additionalFilterConfig: {favorite: {'appName': 'myApp', 'id': 'favoriteId', 'name': 'optionallyuseaname'}}
     */
    additionalFilterSpec: null,

    parentEditDialog: null,

    cls: 'x-wdgt-pickergrid',
    /**
     * @private
     */
    initComponent: function() {

        if (this.disabled) {
            this.disabled = false;
            this.readOnly = true;
        }

        this.contextMenuItems = (this.contextMenuItems !== null) ? this.contextMenuItems : [];
        this.configColumns = (this.configColumns !== null) ? this.configColumns : [];
        this.searchComboConfig = this.searchComboConfig || {};
        this.searchComboConfig.additionalFilterSpec = this.additionalFilterSpec;

        this.recordClass = _.isString(this.recordClass) ? Tine.Tinebase.data.RecordMgr.get(this.recordClass) : this.recordClass;
        this.labelField = this.labelField ? this.labelField : (this.recordClass && this.recordClass.getMeta ? this.recordClass.getMeta('titleProperty') : null);
        this.recordName = this.recordName ? this.recordName : (this.recordClass && this.recordClass.getRecordName ? this.recordClass.getRecordName() || i18n._('Record') : i18n._('Record'));

        if (String(this.labelField).match(/{/)) {
            this.labelField = this.labelField.match(/(?:{{\s*)(\w+)/)[1];
        }
        this.autoExpandColumn = this.autoExpandColumn? this.autoExpandColumn : this.labelField;

        this.initStore();
        this.initGrid();
        this.initActionsAndToolbars();

        this.on('afterrender', this.onAfterRender, this);
        this.on('rowdblclick', this.onRowDblClick, this);

        if (! this.editDialogConfig?.mode) {
            this.editDialogConfig = this.editDialogConfig || {};
            this.editDialogConfig.mode = (!this.refIdField || !this.recordClass.getModelConfiguration().fields[this.refIdField]?.config?.dependentRecords) ? 'remote' : 'local';
        }
        Tine.widgets.grid.PickerGridPanel.superclass.initComponent.call(this);
    },

    onAfterRender: function() {
        this.parentEditDialog = this.findParentBy(function (c) {
            return c instanceof Tine.widgets.dialog.EditDialog
        });

        this.setReadOnly(this.readOnly);
    },

    setReadOnly: function(readOnly) {
        this.readOnly = readOnly;
        var _ = window.lodash;

        var tbar = this.getTopToolbar();
        if (tbar) {
            this.getTopToolbar().items.each(function (item) {
                if (Ext.isFunction(item.setDisabled)) {
                    item.setDisabled(readOnly);
                } else if (item) {
                    item.disabled = readOnly;
                }
            }, this);
            tbar[readOnly ? 'hide' : 'show']();
        }
        var bbar = this.getBottomToolbar();
        if (bbar) {
            bbar[readOnly ? 'hide' : 'show']();
        }
        if (_.get(this, 'actionRemove.setDisabled')) {
            this.actionRemove.setDisabled(readOnly);
        }
        // pickerCombos doesn´t show
        this.doLayout();
    },

    /**
     * init store
     * @private
     */
    initStore: function() {

        if (!this.store) {
            this.store = new Ext.data.SimpleStore({
                sortInfo: this.defaultSortInfo || {
                    field: this.labelField,
                    direction: 'DESC'
                },
                fields: this.recordClass
            });
        }

        // focus+select new record
        this.store.on('add', this.focusAndSelect, this);
        this.store.on('beforeload', this.showLoadMask, this);
        this.store.on('load', this.hideLoadMask, this);

        this.store.on('add', this.onStoreChange, this);
        this.store.on('update', this.onStoreChange, this);
        this.store.on('remove', this.onStoreChange, this);
    },

    focusAndSelect: function(store, records, index) {
        (function() {
            if (this.rendered) {
                if (this.selectRowAfterAdd) {
                    this.getView().focusRow(index);
                    this.getSelectionModel().selectRow(index);
                } else if (this.highlightRowAfterAdd && records.length === 1){
                    // some eyecandy
                    var row = this.getView().getRow(index);
                    Ext.fly(row).highlight();
                }
            }
        }).defer(300, this);
    },

    /**
     * init actions and toolbars
     */
    initActionsAndToolbars: function() {

        this.actionCreate = new Ext.Action({
            text: String.format(i18n._('Create {0}'), this.recordName),
            hidden: !this.recordClass || !this.allowCreateNew,
            scope: this,
            handler: this.onCreate,
            iconCls: 'action_add'
        });

        this.actionEdit = new Ext.Action({
            text: String.format(i18n._('Edit {0}'), this.recordName),
            hidden: !this.recordClass || !(this.editDialogClass || Tine.widgets.dialog.EditDialog.getConstructor(this.recordClass)),
            scope: this,
            disabled: true,
            actionUpdater: function(action, grants, records) {
                action.setDisabled(!records.length);
            },
            handler: () => {
                const record = this.selModel.getSelected();
                const row = this.store.indexOf(record);
                this.onRowDblClick(this, row, )
            },
            iconCls: 'action_edit'
        });

        this.actionRemove = this.deleteAction = new Ext.Action({
            text: String.format(i18n._('Remove {0}'), this.recordName),
            hidden: this.hasOwnProperty('allowDelete') && !this.allowDelete,
            disabled: true,
            scope: this,
            handler: this.onRemove,
            iconCls: 'action_delete',
            actionUpdater: this.actionRemoveUpdater
        });

        // init actions
        this.actionUpdater = new Tine.widgets.ActionUpdater({
            recordClass: this.recordClass,
            evalGrants: this.evalGrants
        });
        this.actionUpdater.addActions([
            this.actionCreate,
            this.actionEdit,
            this.actionRemove
        ]);

        this.selModel.on('selectionchange', function(sm) {
            this.actionUpdater.updateActions(sm);
        }, this);

        var contextItems = [this.actionCreate, this.actionEdit, this.actionRemove];
        this.contextMenu = new Ext.menu.Menu({
            plugins: [{
                ptype: 'ux.itemregistry',
                key:   'Tinebase-MainContextMenu'
            }],
            items: contextItems.concat(this.contextMenuItems || [])
        });

        // removes temporarily added items
        this.contextMenu.on('hide', function() {
            if(this.contextMenu.hasOwnProperty('tempItems') && this.contextMenu.tempItems.length) {
                Ext.each(this.contextMenu.tempItems, function(item) {
                    this.contextMenu.remove(item.itemId);
                }, this);
            }
            this.contextMenu.tempItems = [];
        }, this);

        if (this.enableBbar) {
            this.bbar = new Ext.Toolbar({
                items: [
                    this.actionCreate,
                    this.actionEdit,
                    this.actionRemove
                ].concat(this.contextMenuItems || [])
            });
        }

        if (this.enableTbar) {
            this.initTbar();
        }
    },

    actionRemoveUpdater: function(action, grants, records) {
        action.setDisabled(this.readOnly || !records.length);
    },

    /**
     * init top toolbar
     */
    initTbar: function() {
        this.tbar = new Ext.Toolbar({
            items: [
                this.getSearchCombo()
            ],
            listeners: {
                scope: this,
                resize: this.onTbarResize
            }
        });
    },

    onTbarResize: function(tbar) {
        if (tbar.items.getCount() == 1) {
            var combo = tbar.items.get(0),
                gridWidth = this.getGridEl().getWidth(),
                offsetWidth = combo.getEl() ? combo.getEl().getLeft() - this.getGridEl().getLeft() : 0;

            if (tbar.items.getCount() == 1) {
                tbar.items.get(0).setWidth(gridWidth - offsetWidth);
            }
        }
    },

    /**
     * init grid (column/selection model, ctx menu, ...)
     */
    initGrid: function() {
        this.colModel = this.getColumnModel();

        this.selModel = new Ext.grid.RowSelectionModel({multiSelect:true});

        // remove non-plugin config columns
        var nonPluginColumns = [];
        for (var i=0; i < this.configColumns.length; i++) {
            if (!this.configColumns[i].init || typeof(this.configColumns[i].init) != 'function') {
                nonPluginColumns.push(this.configColumns[i]);
            }
        }
        for (var i=0; i < nonPluginColumns.length; i++) {
            this.configColumns.remove(nonPluginColumns[i]);
        }
        this.plugins = this.configColumns;
        this.plugins.push(new Ext.ux.grid.GridViewMenuPlugin({}))

        // // on selectionchange handler
        // this.selModel.on('selectionchange', function(sm) {
        //     var rowCount = sm.getCount();
        //     this.actionRemove.setDisabled(this.readOnly || rowCount == 0);
        // }, this);

        // on rowcontextmenu handler
        this.on('rowcontextmenu', this.onRowContextMenu.createDelegate(this), this);

        this.viewConfig = {
            autoFill: true,
            forceFit: true
        };
    },

    /**
     * take columns property if defined, otherwise create columns from record class propery
     * @return {}
     */
    getColumnModel: function() {
        var _ = window.lodash,
            me = this;

        if (! this.colModel) {
            if (!this.columns) {
                var labelColumn = {
                    id: this.labelField,
                    header: this.recordClass.getRecordsName(),
                    dataIndex: this.labelField,
                    renderer: this.labelRenderer ? this.labelRenderer : function(v,m,r) { return Ext.util.Format.htmlEncode(Ext.isFunction(r.getTitle) ? r.getTitle() : v)}
                };

                this.columns = [labelColumn];
            } else {
                // convert string cols
                _.each(me.columns, function(col, idx) {
                    if (_.isString(col)) {
                        var config = Tine.widgets.grid.ColumnManager.get(me.recordClass.getMeta('appName'), me.recordClass.getMeta('modelName'), col, 'editDialog');
                        if (config) {
                            me.columns[idx] = config;
                        }
                    }
                });
                _.remove(me.columns, _.isString)
            }

            this.colModel = new Ext.grid.ColumnModel({
                defaults: {
                    sortable: false
                },
                columns: this.columns
            });
        }

        return this.colModel;
    },

    /**
     * that's the context menu handler
     * @param {} grid
     * @param {} row
     * @param {} e
     */
    onRowContextMenu: function(grid, row, e) {
        e.stopEvent();

        this.fireEvent('beforecontextmenu', grid, row, e);

        var selModel = grid.getSelectionModel();
        if(!selModel.isSelected(row)) {
            selModel.selectRow(row);
        }

        this.contextMenu.showAt(e.getXY());
    },

    /**
     * @return {Tine.Tinebase.widgets.form.RecordPickerComboBox|this.searchComboClass}
     */
    getSearchCombo: function() {
        if (! this.searchCombo) {
            if (this.isMetadataModelFor !== null) {
                var mappingFieldDef = this.recordClass.getField(this.isMetadataModelFor),
                    mappingRecordClass = mappingFieldDef.getRecordClass()
                    this.searchRecordClass = mappingRecordClass;
            }
            
            var recordClass = (this.searchRecordClass !== null) ? Tine.Tinebase.data.RecordMgr.get(this.searchRecordClass) : this.recordClass,
                appName = recordClass.getMeta('appName');
                //model = recordClass.getModel();

            this.searchCombo = Tine.widgets.form.RecordPickerManager.get(appName, recordClass, Ext.apply({
                blurOnSelect: true,
                listeners: {
                    scope: this,
                    select: this.onAddRecordFromCombo
                }
            }, this.searchComboConfig));
        }

        return this.searchCombo;
    },

    /**
     * Is called when a record gets selected in the picker combo
     *
     * @param {Ext.form.ComboBox} picker
     * @param {Record} recordToAdd
     */
    onAddRecordFromCombo: function(picker, recordToAdd) {
        // sometimes there are no record data given
        if (! recordToAdd) {
           return;
        }
        
        if (this.isMetadataModelFor !== null) {
            var recordData = this.getRecordDefaults();
            recordData[this.isMetadataModelFor] = recordToAdd;
            var record = new this.recordClass(recordData);
        } else {
            var record = new this.recordClass(Ext.applyIf(recordToAdd.data, this.getRecordDefaults()), recordToAdd.id);
        }

        // check if already in
        if (! this.store.getById(record.id)) {
            this.store.add([record]);
            this.fireEvent('add', this, [record]);
        }

        picker.reset();
    },

    onCreate: function() {
        const record = Tine.Tinebase.data.Record.setFromJson(Ext.apply(this.recordClass.getDefaultData(), this.getRecordDefaults()), this.recordClass);
        const editDialogClass = this.editDialogClass || Tine.widgets.dialog.EditDialog.getConstructor(this.recordClass);
        const mode = this.editDialogConfig?.mode || editDialogClass.prototype.mode;

        if (mode === 'remote') {
            // prevent loading non existing remote record
            record.setId(0);
        }

        editDialogClass.openWindow(_.assign({
            record: Ext.encode(record.data),
            recordId: record.getId(),
            listeners: {
                scope: this,
                update: this.onEditDialogRecordUpdate
            }
        }, this.editDialogConfig || {}));
    },

    getRecordDefaults: function() {
        const defaults = {...this.recordDefaults || {} };
        if (this.refIdField) {
            defaults[this.refIdField] = this.parentEditDialog.record.getId();
        }

        return defaults;
    },

    /**
     * remove handler
     *
     * @param {} button
     * @param {} event
     */
    onRemove: function(button, event) {
        var selectedRows = this.getSelectionModel().getSelections();
        for (var i = 0; i < selectedRows.length; ++i) {
            if (this.fireEvent('beforeremoverecord', selectedRows[i]) !== false) {
                this.store.remove(selectedRows[i]);
            }
        }
        if (this.deleteOnServer === true) {
            this.recordClass.getProxy().deleteRecords(selectedRows);
        }
    },

    /**
     * key down handler
     * @private
     */
    onKeyDown: function(e){
        // no keys for quickadds etc.
        if (e.getTarget('input') || e.getTarget('textarea')) return;

        switch (e.getKey()) {
            case e.A:
                // select all records
                this.getSelectionModel().selectAll(true);
                e.preventDefault();
                break;
            case e.DELETE:
                // delete selected record(s)
                this.onRemove();
                break;
        }
    },

    showLoadMask: function() {
        var me = this;
        return me.afterIsRendered()
            .then(function() {
                if (! me.loadMask) {
                    me.loadMask = new Ext.LoadMask(me.getEl(), {msg: String.format(i18n._('Loading {0} ...'), me.recordClass.getRecordsName())});
                }
                me.loadMask.show.defer(100, me.loadMask);
            });
    },

    hideLoadMask: function() {
        if (this.loadMask) {
            this.loadMask.hide.defer(100, this.loadMask);
        }
        return Promise.resolve();
    },

    setValue: function(recordsdata) {
        var me = this,
            selectRowAfterAdd = me.selectRowAfterAdd,
            highlightRowAfterAdd = me.highlightRowAfterAdd;

        me.highlightRowAfterAdd = false;
        me.selectRowAfterAdd = false;

        me.store.clearData();
        _.each(recordsdata, function(recordData) {
            var record = Tine.Tinebase.data.Record.setFromJson(recordData, me.recordClass);
            me.store.addSorted(record);
        });

        (function() {
            me.highlightRowAfterAdd = highlightRowAfterAdd;
            me.selectRowAfterAdd = selectRowAfterAdd;
        }).defer(300, me)
    },

    getValue: function() {
        var me = this,
            data = [];

        Tine.Tinebase.common.assertComparable(data);

        me.store.each(function(record) {
            data.push(record.data);
        });

        return data;
    },

    onStoreChange: function() {
        const currentValue = this.getValue();
        this.fireEvent('change', this, currentValue, this.currentValue);
        this.currentValue = currentValue;
    },

    /* needed for isFormField cycle */
    markInvalid: Ext.form.Field.prototype.markInvalid,
    clearInvalid: Ext.form.Field.prototype.clearInvalid,
    getMessageHandler: Ext.form.Field.prototype.getMessageHandler,
    getName: Ext.form.Field.prototype.getName,
    validate: function() { return true; },

    // NOTE: shared with Tine.widgets.grid.QuickaddGridPanel
    onRowDblClick: function(grid, row, col) {
        var me = this,
            editDialogClass = this.editDialogClass || Tine.widgets.dialog.EditDialog.getConstructor(me.recordClass),
            record = me.store.getAt(row);

        if (editDialogClass) {
            editDialogClass.openWindow(_.assign({
                record: JSON.stringify(record.data),
                recordId: record.getId(),
                fixedFields: this.readOnly ? JSON.stringify(Object.assign(Object.fromEntries(record.constructor.getFieldNames().map((k, i) => [k, null])), record.data)) : null,
                listeners: {
                    scope: me,
                    update: me.onEditDialogRecordUpdate
                }
            }, this.editDialogConfig || {}));
        }
    },
    
    // recordChange from editDialog
    onEditDialogRecordUpdate: function(updatedRecord) {
        if (!updatedRecord.data) {
            updatedRecord = Tine.Tinebase.data.Record.setFromJson(updatedRecord, this.recordClass)
        }

        var idx = this.store.indexOfId(updatedRecord.id),
            isSelected = this.getSelectionModel().isSelected(idx);

        this.getStore().removeAt(idx);
        if (idx >= 0) {
            this.getStore().insert(idx, [updatedRecord]);
        } else {
            if (this.fireEvent('beforeaddrecord', updatedRecord, this) === false) return;
            this.getStore().add(updatedRecord);
        }

        if (isSelected) {
            this.getSelectionModel().selectRow(idx, true);
        }

        this.fireEvent('update', this, updatedRecord);
    }
});

Ext.reg('wdgt.pickergrid', Tine.widgets.grid.PickerGridPanel);
