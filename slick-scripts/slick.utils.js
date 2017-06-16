/***
 * Contains SlickGrid Util class.
*/
/*new changes starts*/

var overlayPlugin;
var overlayPluginCanvas2;
var quickDataEntryPlugin;
var copyExtCpyMgr;
var commandQueueUndo = [];
var dataVisualization;
var formulaBuilderPlugin;
var formulaBuilderFormula;
var formulaBuilderAccountList;
var formulaBuilderFunctionList;
var freeFormFormulaADFTxtId;
var formulaBuilderResourceList;
var contextMenuResourceList = null;

var accountSelectorPlugin;
var accountSelectorAccountList;
var accountSelectorADFTxtId;
var accountSelectorResourceList;
var accountSelectorAccountListJSON;

var smrFormulaBar = null;

var sgReadOnlyDesc = "This cell is read-only";
var sgReadOnlyInvalidDesc = ""//Fix after merge
var sgHasAttachyDesc = "This cell has a document attached";
var sgHasNoteDesc = "This cell has a comment";
var sgHasSpDetailsDesc = "This cell contains supporting detail";
var sgIsDirtyDesc = "This cell has been modified";
var sgIsLockedDesc = "This cell is locked.";
var sgDataValidMsg = "This cell contains Data Validation Messages";
var sgSmartlist = "This cell contains Smart List entries.";
var sgLongTextDesc = "This cell contains text data.";
var sgRow = "Row";
var sgColum = "Column";
var sgSandboxCell = "This cell contains sandbox data that you have changed, but not published.";
var sgFormula = "Formula";  
var sgFormulaError = "#REF!";
var sgFormulaErrorTooltip = "Original Excel formula cannot be evaluated because of rows/column suppression or security filtering.";
var sgDateFormat = "Date Format" + ":" + "AutoDetect";

function onColumnResizeReports(options,column){
    if(options.sheetName!=null){
         if(columnResize[options.sheetName]==null){
            columnResize[options.sheetName] = {}
         }
         columnResize[options.sheetName][column.id+1] = {}
         columnResize[options.sheetName][column.id+1].previousWidth = column.previousWidth;
         columnResize[options.sheetName][column.id+1].newWidth = column.width;
    }
}

function applyWidthFromCache(options,columnsList){
    if(typeof columnResize == 'undefined' || columnResize[options.sheetName]==null){
        return;
    }else{
        var columnCache = columnResize[options.sheetName];
        for (var key in columnCache) {
            columnsList[key].width = columnCache[key].newWidth;
        }
    }
}

function registerFormulaBuilderPlugin(){       
    var fbOptions = {
        fbContainerID : "dragP",
        accountsJSON : formulaBuilderAccountList,
        functionJSON : formulaBuilderFunctionList,
        resourceString : formulaBuilderResourceList || null,
        toolbarMetaData : null,
        editorMeta : formulaBuilderFormula
    };
    formulaBuilderPlugin = new Planning.Plugins.FormulaBuilder(fbOptions)
    formulaBuilderPlugin.init();
}

function registerAccountSelectorPlugin(){       
    var accSelOptions = {
        containerID : "dragP",
        accountsJSON : accountSelectorAccountList,
        resourceString : accountSelectorResourceList || null
    };
    accountSelectorPlugin = new Planning.Plugins.AccountSelector(accSelOptions)
    accountSelectorPlugin.init();
}

function invokeAccountSelector(name,adfCompClientID,selectedKeys){
    if(accountSelectorPlugin==null){
        registerAccountSelectorPlugin();
    }
    accountSelectorPlugin.invokeAccountSelector();
    if(adfCompClientID==null)
        return;
    accountSelectorPlugin.setName(name);
    accountSelectorPlugin.setAdfClientID(adfCompClientID);
    accountSelectorPlugin.setSelectedKeys(selectedKeys);
    accountSelectorPlugin.show();
}

function invokeFindAccount(){
    if(accountSelectorPlugin==null){
        registerAccountSelectorPlugin();
    }
    accountSelectorPlugin.invokeFindAccountSelector();
    accountSelectorPlugin.showFindAccount();
}

function setAccountSelectorAccountList(list){
    accountSelectorAccountList = list;
}

function setAccountSelectorResourceList(list){
    accountSelectorResourceList = list;
}


function showFormulaBuilder(){
    formulaBuilderPlugin.show();
}

function setFormulaBuilderFormula(formula){
    formulaBuilderFormula = formula;
}

function setFormulaBuilderAccountList(list){
    formulaBuilderAccountList = list;
}

function setFormulaBuilderFunctionList(list){
    formulaBuilderFunctionList = list;
}

function setFormulaBuilderResourceList(list){
    formulaBuilderResourceList = list;
}

function setContextMenuResourceList(list){
    contextMenuResourceList = list;
    setContextMenuLabel();
}

function setContextMenuLabel(){;
    if(contextMenuResourceList !=null){
        $("#add-sibling-item").text(contextMenuResourceList[0]['LBL_ADD_SIBLING']);
        $("#add-child-item").text(contextMenuResourceList[0]['LBL_ADD_CHILD']);
        $("#edit-item").text(contextMenuResourceList[0]['LABEL_EDIT']);
        $("#delete-item").text(contextMenuResourceList[0]['LABEL_DELETE']);
       
        $("#sgmenu-add-sib").text(contextMenuResourceList[0]['LBL_ADD_SIBLING']);
        $("#sgmenu-add-child").text(contextMenuResourceList[0]['LBL_ADD_CHILD']);
        $("#sgmenu-edit").text(contextMenuResourceList[0]['LABEL_EDIT']);
        $("#sgmenu-delete").text(contextMenuResourceList[0]['LABEL_DELETE']);
    }
}

function registerPlugin(grid,isReport,sheetCharts,enableMenu,options){
    grid.setSelectionModel(new Slick.CellSelectionModel());
    grid.setOptions({editCommandHandler: queueAndExecuteCommandNew});
        //For CellCopyExternalManager
    var undoRedoBuffer = {
      commandQueue : [],
      commandCtr : 0,

      queueAndExecuteCommand : function(editCommand) {
        this.commandQueue[this.commandCtr] = editCommand;
        this.commandCtr++;
        editCommand.execute();
      },

      undo : function() {
        if (this.commandCtr == 0)
          return;

        this.commandCtr--;
        var command = this.commandQueue[this.commandCtr];
        if (command && Slick.GlobalEditorLock.cancelCurrentEdit()) {
          command.undo();
        }
      },
      redo : function() {
        if (this.commandCtr >= this.commandQueue.length)
          return;
        var command = this.commandQueue[this.commandCtr];
        this.commandCtr++;
        if (command && Slick.GlobalEditorLock.cancelCurrentEdit()) {
          command.execute();
        }
      }
    }
    var performHeaderCopy = false;
    
    if(options!=null && options.includeHeaderWhenCopying)
        performHeaderCopy = true;
        
    var pluginOptions = { 
        clipboardCommandHandler: function(editCommand){ undoRedoBuffer.queueAndExecuteCommand.call(undoRedoBuffer,editCommand); },
        includeHeaderWhenCopying : performHeaderCopy,
        dataItemColumnValueSetter : handlePasteCellExternal,
        dataorigin : grid.getDataOriginCol()
    };
    copyExtCpyMgr = new Slick.CellExternalCopyManager(pluginOptions)
    grid.registerPlugin(copyExtCpyMgr);
    grid.registerPlugin(new Slick.AutoTooltips());
    
     copyExtCpyMgr.onPasteCells.subscribe(function (e, args) {
        if(copyExtCpyMgr.getCutData()!=null)
            hsfGridCutPaste(e, args);
     });
    
    var overlayPluginOptions = { 
        multiFill : true,
        copyExtCpyMgr : copyExtCpyMgr
    };
    overlayPlugin = new Ext.Plugins.Overlays(overlayPluginOptions);
    overlayPlugin.onCopyRangeDown.subscribe(function (e, args) {
        selectRange(args);
    });
    overlayPlugin.onFillUpDown.subscribe(function (e, args) {
        handleFloodFill(e, args);
    });
    grid.registerPlugin(overlayPlugin);
    
    if(!isReport){
        var overlayPluginCanvas2Options = { 
            multiFill : true,
            copyExtCpyMgr : copyExtCpyMgr,
            isCanvas2 : true
        };
        overlayPluginCanvas2 = new Ext.Plugins.Overlays(overlayPluginCanvas2Options);
        overlayPluginCanvas2.onCopyRangeDown.subscribe(function (e, args) {
            selectRange(args);
        });
        overlayPluginCanvas2.onFillUpDown.subscribe(function (e, args) {
            handleFloodFill(e, args);
        });
        grid.registerPlugin(overlayPluginCanvas2);
    }
    var quickDataEntryPluginOptions = { 
    overlayPlugin : overlayPlugin,
        copyExtCpyMgr : copyExtCpyMgr
    };
    quickDataEntryPlugin = new Slick.Plugins.Quickdataentry(quickDataEntryPluginOptions);
    grid.registerPlugin(quickDataEntryPlugin);
    if(isReport){
        var dvOptions = { 
            sheetCharts : sheetCharts
        };
        dataVisualization = new Slick.Plugins.DataVisualization(dvOptions)
        grid.registerPlugin(dataVisualization);
        dataVisualization.drawCharts();
    }
    if(enableMenu){ 
        grid.onContextMenu.subscribe(function (e, args) {
            var $contextMenu = $('#contextMenu');
            $contextMenu.show().offset({top:args.top,left:args.left});
            /*try{
            ko.dataFor($contextMenu[0]).selectedCellNode = args.selectedCellNode;  
            ko.dataFor($contextMenu[0]).selectedCell = args.selectedCell;
            ko.dataFor($contextMenu[0]).activeRow = args.row;
            ko.dataFor($contextMenu[0]).activeCell = args.cell;
            }catch(ex){}*/
        });
        grid.onHeaderSelection.subscribe(function (e, args) {
            onHeaderRowSelection(args.row,args.cell);
           /* AdfPage.PAGE.findComponent($("#dragP")[0].offsetParent.id).findComponent("menuInfo").setValue(args.row + ";" + args.cell);
            AdfActionEvent.queue(AdfPage.PAGE.findComponent($("#dragP")[0].offsetParent.id).findComponent("menuInfo"),false);
            AdfActionEvent.queue(AdfPage.PAGE.findComponent($("#dragP")[0].offsetParent.id).findComponent("hdSelbtn"),false);*/
        });
    }
    
    
    if(isReport){            
        var formulaPluginOptions = {
            isCodeMirror: true,
            containerId:"#fmRegion",
            fxLabel: "fx"
        };
        smrFormulaBar = new Slick.Plugins.Formulabar(formulaPluginOptions);
        
        smrFormulaBar.onFormulaEdit.subscribe(function (e, args) {
            
        });
        
        smrFormulaBar.onInsertFormula.subscribe(function (e, args) {
        });
        
        smrFormulaBar.onCellChanged.subscribe(function (e, args) {
            var mbrFormula = grid.getDataItem(grid.getActiveCell().row)[grid.getActiveCell().cell].mbrFormula;
            if(mbrFormula!=null && mbrFormula.trim().substring(0, 1).match(/\=/)){
                smrFormulaBar.setFormula(mbrFormula.replace("=",''));
            }else{
                smrFormulaBar.setFormula(grid.getDataItem(grid.getActiveCell().row)[grid.getActiveCell().cell].unformattedVal);
            }
            smrFormulaBar.setEnabled(false);
        });
        
        smrFormulaBar.selectCellWithIndex.subscribe(function (e, args) {
            
        });
        
        smrFormulaBar.updateGridCellFormula.subscribe(function (e, args) {
           
        });
        
        grid.registerPlugin(smrFormulaBar);
    }
    
}

function registerColumnsResizeHandler(grid){
    grid.onColumnsResized.subscribe(function (e, args) {
        
    });
}

/***
 * select range of cells 
*/
function selectRange(args) {
    var bRange = {   
        'fromCell': args.range.fromCell,
        'fromRow': args.range.fromRow,
        'toCell': args.range.toCell,
        'toRow': args.range.toRow
    }
    grid.getSelectionModel().setSelectedRanges([bRange]);
}

/***
 * flood fill handler called during mouse up event
*/
function handleFloodFill(e, args){
    var floodFillData,floodFillRange = copyExtCpyMgr.getCopiedFloodFillRanges();
    var dragType,newValue,cellStyle,colId,dataType,column,cindex;
    if(args.range.fromRow == args.range.toRow && args.range.fromCell==args.range.toCell)
        dragType=-1;
    else{
        dragType=args.range.dragType;
        floodFillData = getCopiedData(floodFillRange[0],false);
        if(args.range.riverseColumnDrag){
            (dragType==1)?dragType=0:dragType=1;
        }
    }
    var srcRow = args.range.fromRow;
    var srcCol = args.range.fromCell;
    if(args.range.riverseRowDrag || args.range.riverseColumnDrag){
        srcRow = grid.getActiveCell().row;
        srcCol = grid.getActiveCell().cell;
    }
    if(dragType<0){
        column = grid.getColumns()[getDataCellIndex(args.range.fromCell)];
        if(args.range.riverseColumnDrag)
            column = grid.getColumns()[getDataCellIndex(args.range.toCell)];
    }
    if(args.range.riverseRowDrag){
        if(dragType<0){
            newValue = grid.getData()[args.range.toRow][column.index];
            cellStyle = null; 
            colId= parseInt(column.index.replace("col",""));
            if(grid.getData()[args.range.toRow][colId]!=null && grid.getData()[args.range.toRow][colId].cellStyle!=null){
                cellStyle = grid.getData()[args.range.toRow][colId].cellStyle;
            }
            dataType = grid.getCell(args.range.toRow,args.range.toCell).dataType;
        }
        var fromCell;
        if(args.range.fromCell!=args.range.toCell){
            if(args.range.riverseColumnDrag)
                fromCell = args.range.toCell;
            else
               fromCell = args.range.fromCell;
        }else{
            fromCell = args.range.fromCell;
        }
        if(dragType>-1){
            cindex= floodFillRange[0].fromCell;
            rindex = floodFillRange[0].fromRow;
            if(args.range.riverseColumnDrag)
                cindex=floodFillRange[0].toCell;
        }
        for (var i = args.range.toRow; i >= args.range.fromRow; i--) {
            if(!args.range.riverseColumnDrag){
                 for (var j = fromCell; j <= args.range.toCell; j++) {
                        if(dragType>-1){
                            newValue = floodFillData[rindex][cindex].value;
                            dataType = floodFillData[rindex][cindex].dataType;
                            cellStyle = floodFillData[rindex][cindex].cellStyle;
                        }
                        if(dragType>-1 && !(i>=floodFillRange[0].fromRow && i<=floodFillRange[0].toRow && j>=floodFillRange[0].fromCell && j<=floodFillRange[0].toCell))
                        if(!floodFillCells(i,j,dataType,newValue,cellStyle)){}
                        (cindex!=floodFillRange[0].toCell)?cindex++:cindex=floodFillRange[0].fromCell;
                 }
                 (rindex!=floodFillRange[0].toRow)?rindex++:rindex=floodFillRange[0].fromRow;
            }else{
                for (var j = fromCell; j >= args.range.fromCell; j--) {
                      if(dragType>-1){
                        newValue = floodFillData[rindex][cindex].value;
                        dataType = floodFillData[rindex][cindex].dataType;
                        cellStyle = floodFillData[rindex][cindex].cellStyle;
                      }
                      if(dragType>-1 && !(i>=floodFillRange[0].fromRow && i<=floodFillRange[0].toRow && j>=floodFillRange[0].fromCell && j<=floodFillRange[0].toCell))
                      if(!floodFillCells(i,j,dataType,newValue,cellStyle)){}
                      (cindex!=floodFillRange[0].fromCell)?cindex--:cindex=floodFillRange[0].toCell;
                 }
                 (rindex!=floodFillRange[0].toRow)?rindex++:rindex=floodFillRange[0].fromRow;
        }
        }
    }else{
        if(dragType<0){
            newValue = grid.getData()[args.range.fromRow][column.index];
            cellStyle = null;
            colId= parseInt(column.index.replace("col",""));
            if(grid.getData()[args.range.fromRow][colId]!=null && grid.getData()[args.range.fromRow][colId].cellStyle!=null)
                cellStyle = grid.getData()[args.range.fromRow][colId].cellStyle;
            dataType = grid.getCell(args.range.fromRow,args.range.fromCell).dataType;
        }
        var fromCell;
        if(args.range.fromCell!=args.range.toCell){
            if(args.range.riverseColumnDrag)
                fromCell = args.range.toCell;
            else
                fromCell = args.range.fromCell;
        }else{
            fromCell = args.range.fromCell;
        }
        if(dragType>-1){
            cindex= floodFillRange[0].fromCell;
            rindex = floodFillRange[0].fromRow;
            if(args.range.riverseColumnDrag)
                cindex=floodFillRange[0].toCell;
        }
        for (var i = args.range.fromRow; i <= args.range.toRow; i++) {
            if(!args.range.riverseColumnDrag){
                 for (var j = fromCell; j <= args.range.toCell; j++) {
                        if(dragType>-1){
                            newValue = floodFillData[rindex][cindex].value;
                            dataType = floodFillData[rindex][cindex].dataType;
                            cellStyle = floodFillData[rindex][cindex].cellStyle;
                        }
                        if(dragType>-1 && !(i>=floodFillRange[0].fromRow && i<=floodFillRange[0].toRow && j>=floodFillRange[0].fromCell && j<=floodFillRange[0].toCell))
                            if(!floodFillCells(i,j,dataType,newValue,cellStyle)){}
                        (cindex!=floodFillRange[0].toCell)?cindex++:cindex=floodFillRange[0].fromCell;
                }
                (rindex!=floodFillRange[0].toRow)?rindex++:rindex=floodFillRange[0].fromRow;
                cindex= floodFillRange[0].fromCell;
            }else{
                 for (var j = fromCell; j >= args.range.fromCell; j--) {
                    if(dragType>-1){
                        newValue = floodFillData[rindex][cindex].value;
                        dataType = floodFillData[rindex][cindex].dataType;
                        cellStyle = floodFillData[rindex][cindex].cellStyle;
                    }
                    if(dragType>-1 && !(i>=floodFillRange[0].fromRow && i<=floodFillRange[0].toRow && j>=floodFillRange[0].fromCell && j<=floodFillRange[0].toCell))
                        if(!floodFillCells(i,j,dataType,newValue,cellStyle)){}
                    (cindex!=floodFillRange[0].toCell)?cindex++:cindex=floodFillRange[0].fromCell;
                 }
                 (rindex!=floodFillRange[0].toRow)?rindex++:rindex=floodFillRange[0].fromRow;
                 cindex= floodFillRange[0].fromCell;
            }
        }
    }
    selectRange(args);
    grid.getEditorLock().commitCurrentEdit();
    
    if(grid.getOptions().enableAutoSubmit)
      autoSubmit();
}

/***
 * flood fill cells and do spreading
*/
function floodFillCells(i,j,dataType,newValue,style,updateWidth){
    try{
        var isFlood = true;
        var HspSlickCell =grid.getData()[i][j];
        if(HspSlickCell.status==2 || HspSlickCell.status==6){
            isFlood = false;
        }else{
             return false;
        }
        if (HspSlickCell && (HspSlickCell.types==6 || HspSlickCell.readOnly || HspSlickCell.isLocked || HspSlickCell.isSupporting) || !isCopyPaste(dataType,HspSlickCell.types) || HspSlickCell.types==-1) {
            grid.invalidateRow(i);
            grid.render(updateWidth);
            return false;
        }else{
          if(newValue==""){
            newValue = "";//slickGrid.PoundMissing; check for poundmissing
          }
          if(jQuery.type(newValue) === "string"){//Bug# 20341062    
               if((HspSlickCell.types < 4 && HspSlickCell.types > 0)) {
                   // var formatter = (HspSlickCell.types == DATA_TYPE_PERCENTAGE) ? Slick.Formatters.Percent : Slick.Formatters.Number;
               } else {
                   newValue = newValue.replace(/,/g,"");
               }
          }
          if((newValue.toString().trim()!=HspSlickCell.value.toString().trim())|| dataType==4){
              isFlood = true;
              var cellLabel = HspSlickCell.value;
              if(dataType==4){
                    var enumId = (HspSlickCell && HspSlickCell.enumerationId > 0) ? HspSlickCell.enumerationId : -1;
                    currentEnumId = enumId;
                    if(grid.getEnumerationCode(cellLabel)==null)
                        cellLabel="";
                    if(newValue.toString().trim()!=cellLabel.toString().trim()){
                        setFloodFillUndo(i,j,HspSlickCell,newValue,style,dataType,cellLabel,HspSlickCell.cellStyle);
                    }
              }else{  
                    setFloodFillUndo(i,j,HspSlickCell,newValue,style,dataType,cellLabel,HspSlickCell.cellStyle);
              }
              if(grid.getOptions().enableAutoSubmit) {
                    if(dataType==4){
                        var enumId = (HspSlickCell && HspSlickCell.enumerationId > 0) ? HspSlickCell.enumerationId : -1;
                        currentEnumId = enumId;
                         if(style!=null){
                            grid.getData()[i][j+grid.getDataOriginCol()].cellStyle = style;
                            grid.setDirtyFormatCell(i,j);
                         }
                         if(newValue!="" && grid.getEnumerationCode(newValue)!=null)
                            grid.commitCurrentSmartListEdit(grid.getEnumerationCode(newValue).toString(),true,i,j);
                         else{
                            if(newValue!=cellLabel || HspSlickCell.value.length>0)
                                grid.commitCurrentSmartListEdit(" ",true,i,j);
                         }
                    }else{
                        grid.updateClientCell(i, j, newValue, 'hotupdated',true);
                    }
              }else {
                    if(dataType==4){
                         var enumId = (HspSlickCell && HspSlickCell.enumerationId > 0) ? HspSlickCell.enumerationId : -1;
                         currentEnumId = enumId;
                         if(style!=null){
                            grid.getData()[i][j+grid.getDataOriginCol()].cellStyle = style;
                            grid.setDirtyFormatCell(i,j);
                         }
                         if(newValue!="" && grid.getEnumerationCode(newValue)!=null)
                            grid.commitCurrentSmartListEdit(grid.getEnumerationCode(newValue).toString(),true,i,j);
                          else{
                            if(newValue!=cellLabel || HspSlickCell.value.length>0)
                                grid.commitCurrentSmartListEdit(" ",true,i,j);
                          }
                    }else{
                        
                        grid.updateClientCell(i, j, newValue, 'dirty',true)
                    }
              }
              if(dataType!=4){
                /*if(HspSlickCell && grid.isNumericData(HspSlickCell.types)) {
                    grid.DoSpread(i,j);
                }
                grid.updateClientCalcCells(j); */
              }
          }
          if(style!=null && dataType!=4){
            if(!(HspSlickCell.cellStyle.trim()== style.trim())){
                if(!isFlood)
                    setFloodFillUndo(i,j,HspSlickCell,newValue,style,dataType,HspSlickCell.value,HspSlickCell.cellStyle);
                grid.getData()[i][j+grid.getDataOriginCol()].cellStyle = style;
                HspSlickCell.cellStyle = style;
                grid.setDirtyFormatCell(i,j);
                grid.invalidateRow(i);
                grid.render(updateWidth);
                return true;
            }
          }
          if(isFlood){
            grid.invalidateRow(i);
            grid.render(updateWidth);
          }
          return true;
        }
    }catch(ex){}
}


function setFloodFillUndo(i,j,HspSlickCell,newValue,style,dataType,cellValue,cellStyle){
        var floodFillCommand = {
            row: i,
            cell: j,
            HspSlickCell : HspSlickCell,
            serializedValue: newValue,
            serializedStyle: style,
            prevSerializedValue: cellValue,
            prevSerializedStyle: cellStyle,
            dataType : dataType,
            undo: function () {
              if(this.dataType==4){
                     var enumId = (this.HspSlickCell && this.HspSlickCell.enumerationId > 0) ? this.HspSlickCell.enumerationId : -1;
                     currentEnumId = enumId;
                     if(this.prevSerializedStyle!=null){
                        if(!(grid.getData()[this.row][this.cell+grid.getDataOriginCol()].cellStyle.trim()== this.prevSerializedStyle.trim())){
                            grid.getData()[this.row][this.cell+grid.getDataOriginCol()].cellStyle = this.prevSerializedStyle;
                            //grid.setDirtyFormatCell(this.row,this.cell);
                        }
                     }
                     if(this.prevSerializedValue!="" && grid.getEnumerationCode(this.prevSerializedValue)!=null)
                        grid.commitCurrentSmartListEdit(grid.getEnumerationCode(this.prevSerializedValue).toString(),true,this.row,this.cell);
                      else
                        grid.commitCurrentSmartListEdit(" ",true,this.row,this.cell);
                }else{
                    if(grid.getOptions().enableAutoSubmit) {
                            grid.updateClientCell(this.row,this.cell, this.prevSerializedValue, 'hotupdated',true)
                    }else{
                        grid.updateClientCell(this.row,this.cell, this.prevSerializedValue, 'dirty',true)
                    }
                }
                if(this.dataType!=4){
                    if(this.HspSlickCell && grid.isNumericData(this.HspSlickCell.types)) {
                        //grid.DoSpread(this.row,this.cell);
                    }
                    //grid.updateClientCalcCells(this.cell); 
                }
                if(this.prevSerializedStyle!=null && this.dataType!=4){
                    if(!(grid.getData()[this.row][this.cell+grid.getDataOriginCol()].cellStyle.trim()== this.prevSerializedStyle.trim())){
                        grid.getData()[this.row][this.cell+grid.getDataOriginCol()].cellStyle = this.prevSerializedStyle;
                        grid.setDirtyFormatCell(this.row,this.cell);
                        grid.invalidateRow(this.row);
                        grid.render();
                    }
                }
                if(grid.getOptions().enableAutoSubmit)
                    autoSubmit();
            }
          };
        queueAndExecuteCommandNew(null,null,floodFillCommand);
}
/*
function getCopiedData(args,copyStyle){
    var cutData = [];
    for (var i = 0; i <= args.toRow - args.fromRow; i++) {
        cutData[args.fromRow + i] = {}
        for (var j = 0; j <= args.toCell - args.fromCell; j++) {
            cutData[args.fromRow + i][args.fromCell + j] = {}
            cutData[args.fromRow + i][args.fromCell + j].value = grid.getData()[args.fromRow + i][columns[getDataCellIndex(args.fromCell) + j].field].value;
            cutData[args.fromRow + i][args.fromCell + j].dataType = grid.getData()[args.fromRow + i][columns[getDataCellIndex(args.fromCell) + j].field].types;
            if(copyStyle){
                if(grid.getData()[args.fromRow + i][getDataCellIndex(args.fromCell) + j]!=null && grid.getData()[args.fromRow + i][getDataCellIndex(args.fromCell) + j].cellStyle!=null)
                    cutData[args.fromRow + i][args.fromCell + j].cellStyle = grid.getData()[args.fromRow + i][getDataCellIndex(args.fromCell) + j].cellStyle;
                else
                    cutData[args.fromRow + i][args.fromCell + j].cellStyle = null;
            }
        }
    }
    return cutData;
}*/

function getDataCellIndex(cell){
    return cell + grid.getDataOriginCol();
}

function getDataRowIndex(row){
    return row + grid.getDataOriginRow();
}

function getDataCellIndexForShortcuts(cell){
    return cell - grid.getDataOriginCol();
}

function getDataRowIndexForShortcuts(row){
    return row - grid.getDataOriginRow();
}

 function isCopyPaste(srcDataType,dsnDataType) {
    if(srcDataType==dsnDataType){
        return true;
    }else if((srcDataType == grid.getConstants("DATA_TYPE_CURRENCY")) && (dsnDataType==grid.getConstants("DATA_TYPE_NONCURRENCY"))){
        return true;
    }else if((srcDataType == grid.getConstants("DATA_TYPE_NONCURRENCY")) && (dsnDataType==grid.getConstants("DATA_TYPE_CURRENCY"))){
        return true;
    }else if((srcDataType == grid.getConstants("DATA_TYPE_CURRENCY")) && (dsnDataType==grid.getConstants("DATA_TYPE_PERCENTAGE"))){
        return true;
    }else if((srcDataType == grid.getConstants("DATA_TYPE_PERCENTAGE")) && (dsnDataType==grid.getConstants("DATA_TYPE_CURRENCY"))){
        return true;
    }else if((srcDataType == grid.getConstants("DATA_TYPE_NONCURRENCY")) && (dsnDataType==grid.getConstants("DATA_TYPE_PERCENTAGE"))){
        return true;
    }else if((srcDataType == grid.getConstants("DATA_TYPE_PERCENTAGE")) && (dsnDataType==grid.getConstants("DATA_TYPE_NONCURRENCY"))){
        return true;
    }else if((dsnDataType == grid.getConstants("DATA_TYPE_UNSPECIFIED")) || (dsnDataType == grid.getConstants("DATA_TYPE_TEXT"))){
        return true;
    }else{
        return false;
    }
}

function queueAndExecuteCommandNew(item, column, editCommand) {
    commandQueueUndo.push(editCommand);
    if(editCommand.execute!=null)
        editCommand.execute();
}

function undoLastEdit() {
    var command = commandQueueUndo.pop();
    if (command && Slick.GlobalEditorLock.cancelCurrentEdit()) {
        setTimeout(function(){ command.undo(); grid.gotoCell(command.row, command.cell, false);}, 1000);
    }
}

function handlePasteCellExternal(item, columnDef, value, row, col){
    var doPaste = true;
    var HspSlickCell = grid.getData()[row][col];
    if (HspSlickCell && HspSlickCell.types == grid.getConstants("DATA_TYPE_CURRENCY")) {
      doPaste = isNaN(value)?false:true;
    } else if (HspSlickCell && HspSlickCell.types == grid.getConstants("DATA_TYPE_NONCURRENCY")) {
      doPaste = isNaN(value)?false:true;      
    } else if (HspSlickCell && HspSlickCell.types == grid.getConstants("DATA_TYPE_PERCENTAGE")) {
      doPaste = isNaN(value)?false:true;             
    } else if (HspSlickCell && HspSlickCell.types == grid.getConstants("DATA_TYPE_DATE")) {
          try {
            if(typeof grid.getConstants("DATE_PICKER_FORMAT") === 'undefined')
                  $.datepicker.parseDate("m/d/y", value);
            else
                $.datepicker.parseDate(grid.getConstants("DATE_PICKER_FORMAT"),value);
          } catch (err) {
              doPaste = false
          }
    }
    
    if ((HspSlickCell.status & grid.getConstants("READ_ONLY")) != 0) {
        doPaste = false;
    }
    if ((HspSlickCell.status & grid.getConstants("IS_LOCKED")) != 0) {
        doPaste = false;
    }
    if((HspSlickCell.status & grid.getConstants("WRITABLE")) != 0){
        doPaste = true;
    }
    if(doPaste){
        HspSlickCell.status += grid.getConstants("IS_DIRTY");
        grid.updateClientCell(row, col, value, 'dirty',true);
        grid.addToEditedCellsToCommit(grid.getCellNode(row, col),value);
        grid.invalidate();
        grid.render();
    }
        //floodFillCells(row,col,HspSlickCell.types,value,null,true)
}



/* new changes ends*/  
function toHtmlForSlickCell(code) {
    code = code.replace(/<br>/gi,'\n');
    code = code.replace(/&nbsp;/gi,'');
    code = code.replace(/\u2009/gi,'');
    code = code.replace(/<.*?>/g,'');
    code = code.replace(/&lt;/gi,'<');
    code = code.replace(/&gt;/gi,'>');
    code = code.replace(/&amp;/gi,'&');
    return code;
}

function getCurrentCellDescription(row,col){
    try{
        return toHtmlForSlickCell(getHeaderInfo(row,col) + " " + getColInfo(row,col));
    }catch(ex){
        return "";
    }
}

function getHeaderInfo(row,col){
    var rowNode = grid.getRowHeaderCache();
    var rowHeaderInfo = sgRow;
    rowHeaderInfo += " " + $(rowNode[row].rowNode).text().trim();
    return rowHeaderInfo;
}

function getColInfo(row,col){
    var hdInfo = grid.getHeaderInfo();
    var hdChildrens = hdInfo.children();
    var currHd = $(hdChildrens[col+slickGrid.DataOrigin_c]).data("column");
    var colHeaderInfo = sgColum;
    for(var c=0;c<$(currHd.parentColumns).size();c++){
        var name = currHd.parentColumns[c];
        name = name.substr(name.indexOf('$#H5P%#')+7, name.length);
      colHeaderInfo += " " + name;
    }
    if(currHd.name!="null")
        colHeaderInfo += " " +currHd.name;
    return colHeaderInfo;
}

function toHtmlSlickCell(text){ 
    text = text.replace(new RegExp("&#10;", 'g'), "\r\n");
    text = text.replace(new RegExp("&#13;", 'g'), "\r\n");
    return text;
}

function getTotalRows(){
     var toR = getArrayObjSize(grid.getData())-dummyRows-1;
     /*if(dummyRows==0){
        return toR-1;
    }*/
    return toR;
}

function getTotalColumns(){
     var toC = getArrayObjSize(grid.getColumns())-dummyCols-slickGrid.DataOrigin_c;
     if(dummyCols==0){
        return toC-1;
    }
    return toC;
}

function selectRow(row){
    if(grid.getCell(row,0).readOnly)
        grid.gotoCell(row,0,true);
    else
        grid.gotoCell(row,0,false);
    var goTocell = getTotalColumns();
    var bRange = {'fromCell': 0,'fromRow': row,'toCell': goTocell,'toRow': row};
    grid.getSelectionModel().setSelectedRanges([bRange]);
    overlayPlugin.setSelectAllHandler(new Slick.Range(row,0,row,goTocell),false,false);
}

function selectColumn(cell){
     if(grid.getCell(0,cell).readOnly)
        grid.gotoCell(0,cell,true);
    else
        grid.gotoCell(0,cell,false);
    var goTorow = getTotalRows();
    var bRange = {'fromCell': cell,'fromRow': 0,'toCell': cell,'toRow': goTorow};
    grid.getSelectionModel().setSelectedRanges([bRange]);
    overlayPlugin.setSelectAllHandler(new Slick.Range(0,cell,goTorow,cell),false,false);
}

function selectAllCells(){
    var goTorow = getTotalRows();
    var goTocell = getTotalColumns();
    var bRange = {'fromCell': 0,'fromRow': 0,'toCell': goTocell,'toRow': goTorow};
    grid.getSelectionModel().setSelectedRanges([bRange]);
    overlayPlugin.setSelectAllHandler(new Slick.Range(0,0,goTorow,goTocell),false,false);
}

/***
 * select range of cells 
*/
function selectRange(args) {
      var bRange = {   
        'fromCell': args.range.fromCell,
        'fromRow': args.range.fromRow,
        'toCell': args.range.toCell,
        'toRow': args.range.toRow


      }
      grid.getSelectionModel().setSelectedRanges([bRange]);
}

/***
 * flood fill cells and do spreading
*/
/*
function floodFillCells(i,j,dataType,newValue,style,updateWidth){
    try{
        var isFlood = false;
        var HspSlickCell = grid.getCell(i, j);
        if (HspSlickCell && (HspSlickCell.readOnly || HspSlickCell.isLocked || HspSlickCell.isSupporting) || !isCopyPaste(dataType,HspSlickCell.dataType) || HspSlickCell.dataType==-1) {
            grid.invalidateRow(i);
            grid.render(updateWidth);
            return false;
        }else{
          if(newValue==""){
            newValue = slickGrid.PoundMissing;
          }
          if(jQuery.type(newValue) === "string"){//Bug# 20341062    
               
               if((HspSlickCell.dataType < 4 && HspSlickCell.dataType > 0)) {
                    var formatter = (HspSlickCell.dataType == DATA_TYPE_PERCENTAGE) ? Slick.Formatters.Percent : Slick.Formatters.Number;
//                   newValue = formatter(i, j, newValue, null, null, null, HspSlickCell);
//                   newValue = newValue.replace(/%/g,"");
//                   newValue = (parseInt(newValue)/100).toString();
               } else {
                   if(HspSlickCell.dataType!=6)//Text type
                        newValue = newValue.replace(/,/g,"");
               }
          }
          if((newValue.toString().trim()!=HspSlickCell.cellValue.toString().trim())|| dataType==4){
              isFlood = true;
              var cellLabel = HspSlickCell.cellValue;
              if(dataType==4){
                    var enumId = (HspSlickCell && HspSlickCell.enumerationId > 0) ? HspSlickCell.enumerationId : -1;
                    currentEnumId = enumId;
                    if(grid.getEnumerationCode(cellLabel)==null)
                        cellLabel="";
                    if(newValue.toString().trim()!=cellLabel.toString().trim()){
                        setFloodFillUndo(i,j,HspSlickCell,newValue,style,dataType,cellLabel,HspSlickCell.cellStyle);
                    }
              }else{  
                    setFloodFillUndo(i,j,HspSlickCell,newValue,style,dataType,cellLabel,HspSlickCell.cellStyle);
              }
              if(grid.getOptions().enableAutoSubmit) {
                    if(dataType==4){
                        var enumId = (HspSlickCell && HspSlickCell.enumerationId > 0) ? HspSlickCell.enumerationId : -1;
                        currentEnumId = enumId;
                         if(style!=null && style!=""){
                            grid.getData()[i][j].cellStyle = style;
                            grid.setDirtyFormatCell(i,j);
                         }
                         if(newValue!="" && grid.getEnumerationCode(newValue)!=null)
                            grid.commitCurrentSmartListEdit(grid.getEnumerationCode(newValue).toString(),true,i,j);
                         else{
                            if(newValue!=cellLabel || HspSlickCell.cellValue.length>0)
                                grid.commitCurrentSmartListEdit(" ",true,i,j);
                         }
                    }else{
                        grid.updateClientCell(i, j, newValue, 'hotupdated',true);
                    }
              }else {
                    if(dataType==4){
                         var enumId = (HspSlickCell && HspSlickCell.enumerationId > 0) ? HspSlickCell.enumerationId : -1;
                         currentEnumId = enumId;
                         if(style!=null && style!=""){
                            grid.getData()[i][j].cellStyle = style;
                            grid.setDirtyFormatCell(i,j);
                         }
                         if(newValue!="" && grid.getEnumerationCode(newValue)!=null)
                            grid.commitCurrentSmartListEdit(grid.getEnumerationCode(newValue).toString(),true,i,j);
                          else{
                            if(newValue!=cellLabel || HspSlickCell.cellValue.length>0)
                                grid.commitCurrentSmartListEdit(" ",true,i,j);
                          }
                    }else{
                        grid.updateClientCell(i, j, newValue, 'dirty',true)
                    }
              }
              if(dataType!=4){
                if(HspSlickCell && grid.isNumericData(HspSlickCell.dataType)) {
                    grid.DoSpread(i,j);
                }
                grid.updateClientCalcCells(j); 
              }
          }
          if(style!=null && dataType!=4){
            if(!(HspSlickCell.cellStyle.trim()== style.trim())){
                if(!isFlood)
                    setFloodFillUndo(i,j,HspSlickCell,newValue,style,dataType,HspSlickCell.cellValue,HspSlickCell.cellStyle);
                grid.getData()[i][j+slickGrid.DataOrigin_c].cellStyle = style;
                HspSlickCell.cellStyle = style;
                grid.setDirtyFormatCell(i,j);
                grid.invalidateRow(i);
                grid.render(updateWidth);
                return true;
            }
          }
          if(isFlood){
            grid.invalidateRow(i);
            grid.render(updateWidth);
          }
          return true;
        }
    }catch(ex){}
}*/


function setFloodFillUndo(i,j,HspSlickCell,newValue,style,dataType,cellValue,cellStyle){
        var floodFillCommand = {
            row: i,
            cell: j,
            HspSlickCell : HspSlickCell,
            serializedValue: newValue,
            serializedStyle: style,
            prevSerializedValue: cellValue,
            prevSerializedStyle: cellStyle,
            dataType : dataType,
            undo: function () {
              if(this.dataType==4){
                     var enumId = (this.HspSlickCell && this.HspSlickCell.enumerationId > 0) ? this.HspSlickCell.enumerationId : -1;
                     currentEnumId = enumId;
                     if(this.prevSerializedStyle!=null){
                        if(!(grid.getData()[this.row][this.cell].cellStyle.trim()== this.prevSerializedStyle.trim())){
                            grid.getData()[this.row][this.cell].cellStyle = this.prevSerializedStyle;
                            grid.setDirtyFormatCell(this.row,this.cell);
                        }
                     }
                     if(this.prevSerializedValue!="" && grid.getEnumerationCode(this.prevSerializedValue)!=null)
                        grid.commitCurrentSmartListEdit(grid.getEnumerationCode(this.prevSerializedValue).toString(),true,this.row,this.cell);
                      else
                        grid.commitCurrentSmartListEdit(" ",true,this.row,this.cell);
                }else{
                    if(grid.getOptions().enableAutoSubmit) {
                            grid.updateClientCell(this.row,this.cell, this.prevSerializedValue, 'hotupdated',true)
                    }else{
                        grid.updateClientCell(this.row,this.cell, this.prevSerializedValue, 'dirty',true)
                    }
                }
                if(this.dataType!=4){
                    if(this.HspSlickCell && grid.isNumericData(this.HspSlickCell.dataType)) {
                        grid.DoSpread(this.row,this.cell);
                    }
                    grid.updateClientCalcCells(this.cell); 
                }
                if(this.prevSerializedStyle!=null && this.dataType!=4){
                    if(!(grid.getData()[this.row][this.cell].cellStyle.trim()== this.prevSerializedStyle.trim())){
                        grid.getData()[this.row][this.cell].cellStyle = this.prevSerializedStyle;
                        grid.setDirtyFormatCell(this.row,this.cell);
                        grid.invalidateRow(this.row);
                        grid.render();
                    }
                }
                if(grid.getOptions().enableAutoSubmit)
                    autoSubmit();
            }
          };
        queueAndExecuteCommandNew(null,null,floodFillCommand);
}

/***
 * flood fill handler called during mouse up event
*/
/*
function handleFloodFill(e, args){
    var floodFillData,floodFillRange = copyExtCpyMgr.getCopiedFloodFillRanges();
    var dragType,newValue,cellStyle,colId,dataType,column,cindex;
    if(args.range.fromRow == args.range.toRow && args.range.fromCell==args.range.toCell)
        dragType=-1;
    else{
        dragType=args.range.dragType;
        floodFillData = getCopiedData(floodFillRange[0],true);
        if(args.range.riverseColumnDrag){
            (dragType==1)?dragType=0:dragType=1;
        }
    }
    var srcRow = args.range.fromRow;
    var srcCol = args.range.fromCell;
    if(args.range.riverseRowDrag || args.range.riverseColumnDrag){
        srcRow = grid.getActiveCell().row;
        srcCol = grid.getActiveCell().cell;
    }
    if(dragType<0){
        column = grid.getColumns()[getDataCellIndex(args.range.fromCell)];
        if(args.range.riverseColumnDrag)
            column = grid.getColumns()[getDataCellIndex(args.range.toCell)];
    }
    if(args.range.riverseRowDrag){
        if(dragType<0){
            newValue = grid.getData()[args.range.toRow][column.index];
            cellStyle = null; 
            colId= parseInt(column.index.replace("col",""));
            if(grid.getData()[args.range.toRow][colId]!=null && grid.getData()[args.range.toRow][colId].cellStyle!=null){
                cellStyle = grid.getData()[args.range.toRow][colId].cellStyle;
            }
            dataType = grid.getCell(args.range.toRow,args.range.toCell).dataType;
        }
        var fromCell;
        if(args.range.fromCell!=args.range.toCell){
            if(args.range.riverseColumnDrag)
                fromCell = args.range.toCell;
            else
               fromCell = args.range.fromCell;
        }else{
            fromCell = args.range.fromCell;
        }
        if(dragType>-1){
            cindex= floodFillRange[0].fromCell;
            rindex = floodFillRange[0].fromRow;
            if(args.range.riverseColumnDrag)
                cindex=floodFillRange[0].toCell;
        }
        for (var i = args.range.toRow; i >= args.range.fromRow; i--) {
            if(!args.range.riverseColumnDrag){
                 for (var j = fromCell; j <= args.range.toCell; j++) {
                        if(dragType>-1){
                            newValue = floodFillData[rindex][cindex].value;
                            dataType = floodFillData[rindex][cindex].dataType;
                            cellStyle = floodFillData[rindex][cindex].cellStyle;
                        }
                        if(dragType>-1 && !(i>=floodFillRange[0].fromRow && i<=floodFillRange[0].toRow && j>=floodFillRange[0].fromCell && j<=floodFillRange[0].toCell))
                        if(!floodFillCells(i,j,dataType,newValue,cellStyle)){}
                        (cindex!=floodFillRange[0].toCell)?cindex++:cindex=floodFillRange[0].fromCell;
                 }
                 (rindex!=floodFillRange[0].toRow)?rindex++:rindex=floodFillRange[0].fromRow;
            }else{
                for (var j = fromCell; j >= args.range.fromCell; j--) {
                      if(dragType>-1){
                        newValue = floodFillData[rindex][cindex].value;
                        dataType = floodFillData[rindex][cindex].dataType;
                        cellStyle = floodFillData[rindex][cindex].cellStyle;
                      }
                      if(dragType>-1 && !(i>=floodFillRange[0].fromRow && i<=floodFillRange[0].toRow && j>=floodFillRange[0].fromCell && j<=floodFillRange[0].toCell))
                      if(!floodFillCells(i,j,dataType,newValue,cellStyle)){}
                      (cindex!=floodFillRange[0].fromCell)?cindex--:cindex=floodFillRange[0].toCell;
                 }
                 (rindex!=floodFillRange[0].toRow)?rindex++:rindex=floodFillRange[0].fromRow;
        }
        }
    }else{
        if(dragType<0){
            newValue = grid.getData()[args.range.fromRow][column.index];
            cellStyle = null;
            colId= parseInt(column.index.replace("col",""));
            if(grid.getData()[args.range.fromRow][colId]!=null && grid.getData()[args.range.fromRow][colId].cellStyle!=null)
                cellStyle = grid.getData()[args.range.fromRow][colId].cellStyle;
            dataType = grid.getCell(args.range.fromRow,args.range.fromCell).dataType;
        }
        var fromCell;
        if(args.range.fromCell!=args.range.toCell){
            if(args.range.riverseColumnDrag)
                fromCell = args.range.toCell;
            else
                fromCell = args.range.fromCell;
        }else{
            fromCell = args.range.fromCell;
        }
        if(dragType>-1){
            cindex= floodFillRange[0].fromCell;
            rindex = floodFillRange[0].fromRow;
            if(args.range.riverseColumnDrag)
                cindex=floodFillRange[0].toCell;
        }
        for (var i = args.range.fromRow; i <= args.range.toRow; i++) {
            if(!args.range.riverseColumnDrag){
                 for (var j = fromCell; j <= args.range.toCell; j++) {
                        if(dragType>-1){
                            newValue = floodFillData[rindex][cindex].value;
                            dataType = floodFillData[rindex][cindex].dataType;
                            cellStyle = floodFillData[rindex][cindex].cellStyle;
                        }
                        if(dragType>-1 && !(i>=floodFillRange[0].fromRow && i<=floodFillRange[0].toRow && j>=floodFillRange[0].fromCell && j<=floodFillRange[0].toCell))
                            if(!floodFillCells(i,j,dataType,newValue,cellStyle)){}
                        (cindex!=floodFillRange[0].toCell)?cindex++:cindex=floodFillRange[0].fromCell;
                }
                (rindex!=floodFillRange[0].toRow)?rindex++:rindex=floodFillRange[0].fromRow;
                cindex= floodFillRange[0].fromCell;
            }else{
                 for (var j = fromCell; j >= args.range.fromCell; j--) {
                    if(dragType>-1){
                        newValue = floodFillData[rindex][cindex].value;
                        dataType = floodFillData[rindex][cindex].dataType;
                        cellStyle = floodFillData[rindex][cindex].cellStyle;
                    }
                    if(dragType>-1 && !(i>=floodFillRange[0].fromRow && i<=floodFillRange[0].toRow && j>=floodFillRange[0].fromCell && j<=floodFillRange[0].toCell))
                        if(!floodFillCells(i,j,dataType,newValue,cellStyle)){}
                    (cindex!=floodFillRange[0].toCell)?cindex++:cindex=floodFillRange[0].fromCell;
                 }
                 (rindex!=floodFillRange[0].toRow)?rindex++:rindex=floodFillRange[0].fromRow;
                 cindex= floodFillRange[0].fromCell;
            }
        }
    }
    selectRange(args);
    grid.getEditorLock().commitCurrentEdit();
    
    if(grid.getOptions().enableAutoSubmit)
      autoSubmit();
}
*/
/***
 * To support shortcut keys on grid
*/
function handleGridKeyDown(e){
    try{
         var goTorow = 0;
         var goTocell = 0;
         var handled = false;
        if(e.ctrlKey || e.metaKey){
            if(e.which == 75){
                DoLock();
                handled = true;
            }else if(e.shiftKey){ // used for Ctrl + Shift + Dir -> for multiple cells selection
            }else if(e.which == 36){ //Ctrl+Home -> Moves focus to the first cell in grid
                grid.gotoCell(0,0,true);
                handled = true;
            }else if(e.which == 35){ //Ctrl+End -> Moves focus to the last cell of grid
                goTorow = getArrayObjSize(grid.getModel.grid.getData()())-dummyRows;
                goTocell = getDataCellIndexForShortcuts(getArrayObjSize(grid.getColumns()))-dummyCols;
                if(dummyRows==0){
                    goTorow= goTorow-1;
                }
                if(dummyCols==0){
                    goTocell= goTocell-1;
                }
                grid.gotoCell(goTorow,goTocell,true);
                handled = true;
            }else if(e.which == 65){ //CTRL+A -> Select All cells in pivot table
                selectAllCells();
                handled = true;
                copyExtCpyMgr.markRowColSelection(grid.getSelectionModel().getSelectedRanges());
            }else if(e.which == 39){ //Ctrl+Right Arrow -> Moves to last cell in current row
                goTorow = grid.getActiveCell().row;
                goTocell = getDataCellIndexForShortcuts(getArrayObjSize(grid.getColumns()))-dummyCols;
                if(dummyCols==0){
                    goTocell= goTocell-1;
                }
                grid.gotoCell(goTorow,goTocell,true);
                handled = true;
            }else if(e.which == 37){ //Ctrl+Left Arrow -> Moves to first cell in current row
                goTorow = grid.getActiveCell().row;
                goTocell = 0;
                grid.gotoCell(goTorow,goTocell,true);
                handled = true;
            }else if (e.which == 88) {  //Cut
                slickActionDoCut();
                handled = true;
            }else if (e.which == 67) {  //copy
                slickActionDoCopy();
                handled = true;
            }else if (e.which == 86) {  //paste
                console.log("key down intecepted utils");
                slickActionDoPaste();
                handled = true;
            }else if (e.which == 32){  
                selectColumn(grid.getActiveCell().cell);
                copyExtCpyMgr.markRowColSelection(grid.getSelectionModel().getSelectedRanges());
                handled = true;
            }else if(e.altKey && e.which == 66){
                formatSlickGridCell("chBold", "", 10);
                 handled = true;
            }else if(e.altKey && e.which == 73){
                formatSlickGridCell("chItalic", "", 10);
                 handled = true;
            }else if(e.altKey && e.which == 85){
                formatSlickGridCell("chUnderLine", "", 10);
                 handled = true;
            }else if(e.shiftKey && e.which == 82){
                if(grid.getCell(grid.getActiveCell().row,grid.getActiveCell().cell).isLocked){
                    grid.getCell(grid.getActiveCell().row,grid.getActiveCell().cell).isLocked = false;
                }
            }else if(e.altKey && e.which == 69){
                try{
                    this.parent.AdfPage.PAGE.findComponentByAbsoluteId(adfLayoutId.replace(/_/g,":")).findComponent("smartListOptions").findComponent("formatBtn").focus();
                }catch(ex){
                    top.getSlickFrame().parent.parent.focus();
                }
                handled = true;
            }
        }else if(e.shiftKey){ 
            if(e.which == 35){//Shift+End -> Moves focus to the last cell of first row of grid
                goTorow = 0;
                goTocell = getDataCellIndexForShortcuts(getArrayObjSize(grid.getColumns()))-dummyCols;
                if(dummyCols==0){
                    goTocell= goTocell-1;
                }
                grid.gotoCell(goTorow,goTocell,true);
                handled = true;
            }else if(e.which == 32){
                selectRow(grid.getActiveCell().row);
                copyExtCpyMgr.markRowColSelection(grid.getSelectionModel().getSelectedRanges());
                handled = true;
            }
        }else if(e.which == 27){  //Esc key : To discard current changes to cell and restore the previous state
            grid.resetActiveCell();
        }else if (e.which == 46) {  //Clear
            slickActionDoDelete();
            handled = true;
        }
        if(handled){
            e.stopPropagation();
            e.preventDefault();
        }

    }catch(ex){
        e.stopPropagation();
        e.preventDefault();
    }
}

function getCopiedData(args,copyStyle){
    var cutData = [];
    for (var i = 0; i <= args.toRow - args.fromRow; i++) {
        cutData[args.fromRow + i] = {}
        for (var j = 0; j <= args.toCell - args.fromCell; j++) {
            cutData[args.fromRow + i][args.fromCell + j] = {}
            cutData[args.fromRow + i][args.fromCell + j].value = grid.getData()[args.fromRow + i][grid.getColumns()[getDataCellIndex(args.fromCell) + j].field].value;
            /*if(grid.getData()[args.fromRow + i][grid.getColumns()[getDataCellIndex(args.fromCell) + j].field].status== 6){
                cutData[args.fromRow + i][args.fromCell + j].dataType = grid.getData()[args.fromRow + i][grid.getColumns()[getDataCellIndex(args.fromCell) + j].field].status;
            }else{
                cutData[args.fromRow + i][args.fromCell + j].dataType = grid.getData()[args.fromRow + i][grid.getColumns()[getDataCellIndex(args.fromCell) + j].field].status;
            }*/
            cutData[args.fromRow + i][args.fromCell + j].dataType = grid.getData()[args.fromRow + i][grid.getColumns()[getDataCellIndex(args.fromCell) + j].field].status;
            cutData[args.fromRow + i][args.fromCell + j].cellStyle = null;
            /*if(copyStyle){
                if(grid.getData()[args.fromRow + i][getDataCellIndex(args.fromCell) + j]!=null && grid.getData()[args.fromRow + i][getDataCellIndex(args.fromCell) + j].cellStyle!=null)
                    cutData[args.fromRow + i][args.fromCell + j].cellStyle = grid.getData()[args.fromRow + i][getDataCellIndex(args.fromCell) + j].cellStyle;
                else
                    cutData[args.fromRow + i][args.fromCell + j].cellStyle = null;
            }*/
        }
    }
    return cutData;
}

function cutPaste(e, args){
    if (args.from==null) {
        return;
    }
    var from = args.from[0];
    var to = args.ranges[0];
    var cutData = copyExtCpyMgr.getCutData();
    if(cutData==null || jQuery.isEmptyObject(cutData)){
        return;
    }
    for (var i = 0; i <= from.toRow - from.fromRow; i++) {
        for (var j = 0; j <= from.toCell - from.fromCell; j++) {
                val = cutData[from.fromRow + i][from.fromCell + j].value;
                var dataType = cutData[from.fromRow + i][from.fromCell + j].dataType;
                /*if(cutData[from.fromRow + i][from.fromCell + j]!=null && cutData[from.fromRow + i][from.fromCell + j].cellStyle!=null){
                    cellStyle = cutData[from.fromRow + i][from.fromCell + j].cellStyle;
                }*/
                floodFillCells(to.fromRow + i, to.fromCell + j,dataType,val,null);
        }
    }
    if(grid.getOptions().enableAutoSubmit)
        autoSubmit();
    grid.invalidate();
}

function handlePaste(e, args){
    if(grid.getOptions().enableAutoSubmit)
        autoSubmit();
    grid.invalidate();
}

function handleClear(args){
    for (var i = 0; i <= args.toRow - args.fromRow; i++) {
        for (var j = 0; j <= args.toCell - args.fromCell; j++) {
                var dataType = grid.getCell(args.fromRow + i,args.fromCell + j).dataType;
                floodFillCells(args.fromRow + i, args.fromCell + j,dataType,slickGrid.PoundMissing,null);
        }
    }
    if(grid.getOptions().enableAutoSubmit)
        autoSubmit();
    grid.invalidate();
}


function setRowDescriptions(){
    var rowValue = "";
    var colValue = "";
    var x = 0;
    if(document.getElementById("rowheadtable").rows.length>0){
        rowHdDesc = new Array (document.getElementById("rowheadtable").rows.length);
        var colLength = document.getElementById("rowheadtable").rows[0].cells.length
        for (z = 0; z < rowHdDesc.length; ++ z)
            rowHdDesc [z] = new Array (colLength);
        for(f=0;f < document.getElementById("rowheadtable").rows.length;f++){
            for(c=0;c < document.getElementById("rowheadtable").rows[f].cells.length;c++){
                if(document.getElementById("rowheadtable").rows[f].cells[c].rowSpan>1){
                    var rowSp = document.getElementById("rowheadtable").rows[f].cells[c].rowSpan;
                    var newName = $(document.getElementById("rowheadtable").rows[f].cells[c]).text();
                    for(p =0; p < rowSp ; p++){
                        rowDescription[x] = newName;
                        rowHdDesc[x][c] = newName;
                        /*for(q=1;q < document.getElementById("rowheadtable").rows[f].cells.length;q++){
                            rowHdDesc[x][c+q] = rowHdDesc[x][c+q-1] + $(document.getElementById("rowheadtable").rows[f].cells[c+q]).text();
                        }*/
                        x++;
                    }
                }else{
                    if(rowDescription[f]!=null){
                        rowDescription[f] = rowDescription[f] + $(document.getElementById("rowheadtable").rows[f].cells[c]).text();
                        x = f+1;
                        if(rowHdDesc[f][c]==null){
                            rowHdDesc[f][c] = rowDescription[f];
                        }
                        else{
                            for(w=0;w < colLength; w++){
                                if(rowHdDesc[f][w]==null)
                                    rowHdDesc[f][w] = rowDescription[f];
                            }
                        }
                    }
                    else{
                        x = f+1;
                        rowDescription[f] = $(document.getElementById("rowheadtable").rows[f].cells[c]).text();
                        if(c==0){
                            rowHdDesc[f][c] = rowDescription[f];
                        }
                    }
                }
            }
            
        }
    
    }
}

function setColumnDescriptions(){
   var w = 0;
   for(j=0; j < document.getElementById("colDimTable").rows.length; j++){
         for(k=0;k < document.getElementById("colDimTable").rows[j].cells.length ; k++){
                if(document.getElementById("colDimTable").rows[j].cells[k].colSpan > 1){
                    var colSp = document.getElementById("colDimTable").rows[j].cells[k].colSpan;
                    var newName = $(document.getElementById("colDimTable").rows[j].cells[k]).text();
                    var h;
                    for(h =0; h < colSp ; h++){
                        columnDescription[w] = newName;
                        colHdDesc[j][w]=newName;
                        w++;
                    }
                }else{
                    if(columnDescription[k]!=null){
                        columnDescription[k] = columnDescription[k] + $(document.getElementById("colDimTable").rows[j].cells[k]).text();
                        colHdDesc[j][k] = columnDescription[k];
                    }
                    else{
                        columnDescription[k] = $(document.getElementById("colDimTable").rows[j].cells[k]).text();
                        colHdDesc[j][k] = columnDescription[k];
                    }
                }
         }
    }
}

function getRowDescriptionWithIndex(index){
  return rowDescription[index];
}

function getColumnDescriptionWithIndex(index){
  return columnDescription[index];
}

function getCellInfo(rowIndex, colIndex){
    var cellInfo = "";
    if (typeof grid == "undefined" && Model.planningGrid != undefined) {
        grid = Model.planningGrid;
    }
    var Hspcell = grid.getData()[rowIndex][colIndex]
    if(Hspcell.isDirty){
        cellInfo =  " " + sgIsDirtyDesc;
    }
    if(Hspcell.status & READ_ONLY){
        if(!Hspcell.isValid) {
            cellInfo =  cellInfo + " " + sgReadOnlyInvalidDesc;
        } else {
            cellInfo =  cellInfo + " " + sgReadOnlyDesc;
        }
    }
    if(Hspcell.status & HAS_ATTACH){
        cellInfo =  cellInfo + " " + sgHasAttachyDesc;
    }
    if(Hspcell.status & HAS_COMMENT){
        cellInfo =  cellInfo + " " + sgHasNoteDesc;
    }
    if(Hspcell.status & HAS_SUPP_DETAIL){
        cellInfo =  cellInfo + " " + sgHasSpDetailsDesc;
    }
    if(Hspcell.status & IS_LOCKED){
        cellInfo =  cellInfo + " " + sgIsLockedDesc;
    }
    /*if(Hspcell.bgColor!= "" && !grid.isReportMode()){ //To Do this should be applicable only for planning forms
        cellInfo =  cellInfo + " " + sgDataValidMsg;
    }*/
    if(Hspcell.types == DATA_TYPE_ENUMERATION){
        cellInfo =  cellInfo + " " + sgSmartlist;
    }
    if(Hspcell.types == DATA_TYPE_TEXT){
        cellInfo =  cellInfo + " " + sgLongTextDesc;
    }
    if(Hspcell.types == DATA_TYPE_DATE){
        cellInfo =  cellInfo + " " + sgDateFormat;
    }
    if(Hspcell.status & FROM_SANDBOX){
        cellInfo =  cellInfo + " " + sgSandboxCell;
    }
    if(Hspcell.tooltip){
        cellInfo =  cellInfo + " " + Hspcell.tooltip;
    }
    return toHtmlForSlickCell(cellInfo);
}

function getIntersectionDescription(rowIndex,colIndex,activeGridNode){
    var intersectionDescription = "";
    var cellInfo = getCellInfo(rowIndex,colIndex);
    var Hspcell = grid.getData()[rowIndex][colIndex];
    if(activeGridNode==null)activeGridNode="";
    if(Hspcell && Hspcell.cFormula && Hspcell.cFormula.length > 0 ){
        if(Hspcell.cellValue == sgFormulaError){
            intersectionDescription = getCurrentCellDescription(rowIndex,colIndex) + " " + activeGridNode + " " + cellInfo  + " " + sgFormulaErrorTooltip;
        } else {
            intersectionDescription = getCurrentCellDescription(rowIndex,colIndex) + " " + activeGridNode + " " + cellInfo  + " " + sgFormula + ":" + Hspcell.cFormula;
        }
    } else {
        intersectionDescription = getCurrentCellDescription(rowIndex,colIndex) + " " + activeGridNode + " " + cellInfo;
    }
    return intersectionDescription;
    /*if($.browser.mozilla && !$.browser.version.match("11")){
        return grid.getData()[rowIndex][getDataCellIndex(colIndex)].tooltip + cellInfo;
    }else{
        return grid.getData()[grid.getActiveCell().row][getDataCellIndex(grid.getActiveCell().cell)].tooltip + cellInfo;
    }*/
}

function speakNodeDescription(rowIndex,colIndex,activeGridNode,msg){
    if(msg!=null){
        $(document.getElementById("desc")).text(msg + getIntersectionDescription(rowIndex,colIndex,activeGridNode));
    }else{
        $(document.getElementById("desc")).text(getIntersectionDescription(rowIndex,colIndex,activeGridNode));
    }   
}

function goToSlickGridcell(){
    for(i=0;i < colHdDesc.length;i++){
        for(j=0;j < colHdDesc[i].length;j++){
            $(document.getElementById("colsel")).append(new Option(colHdDesc[i][j],i+","+j));
        }
    }
    for(w=0;w < rowHdDesc.length;w++){
        for(p=0;p < rowHdDesc[w].length;p++){
            $(document.getElementById("rowsel")).append(new Option(rowHdDesc[w][p],w+","+p));
        }
    }
    document.getElementById("gotocell").style.display="";
    document.getElementById("gotocell").focus();
}

function goToSlickGridcellOnAction(){
    var r = $(document.getElementById("rowsel"))[0].value.split(",")[0];
    var c = $(document.getElementById("colsel"))[0].value.split(",")[1];
    goToSlickGridcellHide();
    grid.focus("Currently focused cell= ",null);
    if(grid.getCell(parseInt(r),parseInt(c)).readOnly)
        grid.gotoCell(parseInt(r),parseInt(c),true);
      else
        grid.gotoCell(parseInt(r),parseInt(c),false);
}

function goToSlickGridcellHide(){
    document.getElementById("gotocell").style.display="none";
}
    
function onColumnHeaderDivFocus(event){
    var title = "";
    var tgEle = null;
    if($.browser.msie) 
        tgEle = event.srcElement;
    else
        tgEle = event.target;
    title = tgEle.title;
    if(title!=null)
        $(document.getElementById("colHeaderDesc")).text(title);
    else
        $(document.getElementById("colHeaderDesc")).text(emptyCellDesc);
    if(accessibilityMode){        
        $(tgEle).bind("keydown",goToCurrentColHome);
    }
}

function goToCurrentRowHome(evt){
    if(evt.which == 36)
        grid.gotoCell($(evt.target).closest('td').cellPos().top,0,true);
}

function goToCurrentColHome(evt){
    if(evt.which == 36)
        grid.gotoCell(0,$(evt.target).closest('td').cellPos().left,true);
}
    
function onRowHeaderDivFocus(event){
    var title = "";
    var tgEle = null;
    if($.browser.msie) 
        tgEle = event.srcElement;
    else
        tgEle = event.target;
    title = tgEle.title;
    if(title!=null)
        $(document.getElementById("rowHeaderDesc")).text(title);
    else
        $(document.getElementById("rowHeaderDesc")).text(emptyCellDesc);
    if(accessibilityMode){        
        $(tgEle).bind("keydown",goToCurrentRowHome);
    }
}

function OnloadDescription(){
    if(grid!=null){
          setTimeout(function () {
            grid.focus(onloaddesc,null);
            var HspSlickCell = grid.getCell(0,0);
            if(HspSlickCell.readOnly || HspSlickCell.isLocked || HspSlickCell.isSupporting){
                try{
                    grid.setActiveCell(0,0);
                    grid.resetActiveCell();
                }catch(ex){}
            }else{
                grid.gotoCell(0,0,true);
            }
          }, 500);
    }
}

/*
 * Format options start
 */
function cellWrapping(){
    var wrapAll = false;
    var toWrap = false;

    var selRangeObj = grid.getSelectionModel().getSelectedRanges();
    var selRange = (selRangeObj!=null)?selRangeObj[0]:null;
    var actCell = grid.getActiveCell();
    if(selRange==null)
        return;
     if(getSelectedSlickRow()=="" || getSelectedSlickColumn()==""){
        wrapAll = true;
        toWrap = (grid.getData()[selRange.fromRow][getDataCellIndex(selRange.fromCell)].wrap)?false:true;
    }
    for (var i = selRange.fromRow; i <= selRange.toRow; i++) {
        if(!selRange.riverseColumnDrag){
             for (var j = selRange.fromCell; j <= selRange.toCell; j++) {
                grid.getEditorLock().commitCurrentEdit();
                if(grid.getData()[i][getDataCellIndex(j)].wrap){
                    grid.getData()[i][getDataCellIndex(j)].wrap = (wrapAll)?toWrap:false;
                    grid.getData()[i][j].wrapHeight="";
                        var maxHeight = options.rowHeight;
                        for(k=0;k < columns.length;k++){
                            if(grid.getData()[i][k].wrapHeight!=""){
                                 if((maxHeight < grid.getData()[i][k].wrapHeight) && grid.getData()[i][k].wrap){
                                    maxHeight = grid.getData()[i][k].wrapHeight;
                                 }
                            }
                        }
                        rowHeight[i] = {};
                        rowHeight[i].height = maxHeight;
                }
                else{
                    grid.getData()[i][getDataCellIndex(j)].wrap = (wrapAll)?toWrap:true;
                    var node = grid.getCellNode(i, j);
                    var len = node.scrollWidth/options.defaultColumnWidth;
                    if(options.isSizeToFitColumns){
                        len = node.scrollWidth/node.offsetWidth; 
                    }
                    var newHeight = len * options.rowHeight;
                    if(newHeight>options.rowHeight){
                       newHeight +=10;
                       newHeight = Math.round(newHeight);
                       if(rowHeight!=null && rowHeight[i]!=null){
                            if(newHeight > rowHeight[i].height){
                                rowHeight[i].height = newHeight;
                                if(grid.getData()[i][getDataCellIndex(j)].wrapHeight!=""){
                                    if(newHeight > parseInt(grid.getData()[i][getDataCellIndex(j)].wrapHeight)){
                                        grid.getData()[i][getDataCellIndex(j)].wrapHeight = newHeight;
                                    }
                                }else{
                                    grid.getData()[i][getDataCellIndex(j)].wrapHeight = newHeight;
                                }
                            }else{
                                grid.getData()[i][getDataCellIndex(j)].wrapHeight = newHeight;
                            }
                        }else{
                            rowHeight[i] = {};
                            rowHeight[i].height = newHeight;
                            if(grid.getData()[i][getDataCellIndex(j)].wrapHeight!=""){
                                if(newHeight > parseInt(grid.getData()[i][getDataCellIndex(j)].wrapHeight)){
                                    grid.getData()[i][getDataCellIndex(j)].wrapHeight = newHeight;
                                }
                            }else{
                                grid.getData()[i][getDataCellIndex(j)].wrapHeight = newHeight;
                            }
                        }
                  }
                }
             }
        }
    }
    grid.updateColumnCaches();
    grid.invalidateAllRows();
    grid.updateCanvasWidth(true);
    grid.setData(grid.getData());
    grid.render();
    if((selRange.fromCell== selRange.toCell) && (selRange.toRow==selRange.fromRow)){
            grid.resetActiveCell();
            grid.setActiveCell(actCell.row,actCell.cell);
    }else{
        grid.resetActiveCell();
        grid.setActiveCell(actCell.row,actCell.cell);
        var bRange = {'fromCell': selRange.fromCell,'fromRow': selRange.fromRow,'toCell': selRange.toCell,'toRow': selRange.toRow};
        grid.getSelectionModel().setSelectedRanges([bRange]);
        overlayPlugin.setSelectAllHandler(new Slick.Range(selRange.fromRow,selRange.fromCell,selRange.toRow,selRange.toCell),false,false);
    }
}

function setFormatStyle (sourceId, reg, style, newColor, fontSize,rowIndx,colIndx,count,set,isRowhd){
    var i = rowIndx;
    if(isRowhd==null)isRowhd=false;
    var j = (!isRowhd)?getDataCellIndex(colIndx):getDataCellIndex(colIndx-slickGrid.DataOrigin_c);
    if(sourceId.match("chBgColor")){
        if(grid.getData()[i][j].cellStyle.match(/background-color:/ig)){
          var newCss1 = grid.getData()[i][j].cellStyle.split("background-color:");
          var newCss2 = newCss1[1].substring(newCss1[1].indexOf(";")+1, newCss1[1].length);
          var newCssStyle = newCss1[0] + newCss2;
          grid.getData()[i][j].cellStyle =newCssStyle;
        }
        var cssStyle = "background-color:"+ newColor + ";";
        grid.getData()[i][j].cellStyle = grid.getData()[i][j].cellStyle + cssStyle;
        //grid.getData()[i][j].bgColor = newColor;
        (!isRowhd)?grid.setDirtyFormatCell(i,colIndx):grid.setDirtyFormatCell(i,colIndx-slickGrid.DataOrigin_c);
    }
    else if(sourceId.match("chFontColor")){
        grid.getData()[i][j].cellStyle = grid.getData()[i][j].cellStyle.replace(/-color:/gi,"-****:");
        var matchColor = grid.getData()[i][j].cellStyle.match(/color:/ig);
        if(matchColor!=null){
              var newCss1 = grid.getData()[i][j].cellStyle.split("color:");
              var newCss2 = newCss1[1].substring(newCss1[1].indexOf(";")+1, newCss1[1].length);
              var newCssStyle = newCss1[0] + newCss2;
              grid.getData()[i][j].cellStyle =newCssStyle;
        }
        grid.getData()[i][j].cellStyle = grid.getData()[i][j].cellStyle.replace(/-\*\*\*\*:/gi,"-color:");
        var cssStyle = "color:"+ newColor + ";";
        grid.getData()[i][j].cellStyle = grid.getData()[i][j].cellStyle + cssStyle;
        grid.getData()[i][j].fontColor = newColor;
        (!isRowhd)?grid.setDirtyFormatCell(i,colIndx):grid.setDirtyFormatCell(i,colIndx-slickGrid.DataOrigin_c);
    }
    else if(sourceId.match("incrFont")|| sourceId.match("decrFont")){
        if(grid.getData()[i][j].cellStyle.match(/font-size:/ig)){
          var newCss1 = grid.getData()[i][j].cellStyle.split("font-size:");
          var newCss2 = newCss1[1].substring(newCss1[1].indexOf(";")+1, newCss1[1].length);
          var newCssStyle = newCss1[0] + newCss2;
          grid.getData()[i][j].cellStyle =newCssStyle;
        }
        grid.getData()[i][j].cellStyle = grid.getData()[i][j].cellStyle + style;
        grid.getData()[i][j].fontSize = fontSize;
        (!isRowhd)?grid.setDirtyFormatCell(i,colIndx):grid.setDirtyFormatCell(i,colIndx-slickGrid.DataOrigin_c);
    }else{
        if(count){
            if(grid.getData()[i][j].cellStyle.match(reg)){
                grid.getData()[i][j].cellStyle = grid.getData()[i][j].cellStyle.replace(reg,"");
                set = false;
            }
            else{
                grid.getData()[i][j].cellStyle = grid.getData()[i][j].cellStyle + style; 
                set = true;
            }
        }else{
            if(grid.getData()[i][j].cellStyle.match(reg))
                grid.getData()[i][j].cellStyle = grid.getData()[i][j].cellStyle.replace(reg,"");
            if(set)
                grid.getData()[i][j].cellStyle = grid.getData()[i][j].cellStyle + style; 
        }
        (!isRowhd)?grid.setDirtyFormatCell(i,colIndx):grid.setDirtyFormatCell(i,colIndx-slickGrid.DataOrigin_c);
    }
    grid.invalidateRow(i);
    
    return set;
}

function handleHeaderRowFormatting (sourceId, reg, style, newColor, fontSize){
            if($('.rowactive')==null)return;
      if(sourceId.match("chBgColor")){
            $('.rowactive').each(function() {
                $el = $(this);
                if($el[0]){
                    setFormatStyle(sourceId, reg, style, newColor, fontSize,parseInt($el[0].id.split("r")[0]),parseInt($el[0].id.split("r")[1]),true,true,true);
                }
            });
        }
        else if(sourceId.match("chFontColor")){
             $('.rowactive').each(function() {
                $el = $(this);
                if($el[0]){
                    setFormatStyle(sourceId, reg, style, newColor, fontSize,parseInt($el[0].id.split("r")[0]),parseInt($el[0].id.split("r")[1]),true,true,true);
                }
            });
        }
        else if(sourceId.match("incrFont")|| sourceId.match("decrFont")){
            $('.rowactive').each(function() {
                $el = $(this);
                setFormatStyle(sourceId, reg, style, newColor, fontSize,parseInt($el[0].id.split("r")[0]),parseInt($el[0].id.split("r")[1]),true,true,true);
            });
        }else{
            $('.rowactive').each(function() {
                $el = $(this);
                setFormatStyle(sourceId, reg, style, newColor, fontSize,parseInt($el[0].id.split("r")[0]),parseInt($el[0].id.split("r")[1]),true,true,true);
            });
        }
    return false;
}

function handleHeaderColumnsFormatting (sourceId, reg, style, newColor, fontSize){
        if($('.columnactive')==null)return;
        if(sourceId.match("chBgColor")){
            $('.columnactive').each(function() {
                $el = $(this);
                if($el[0]){
                    $el[0].style.backgroundColor=newColor;
                    grid.setDirtyRowFormatCell(parseInt($el.attr('class').split("slick-header-column")[1].split(' ')[1])+1,$el.data('column').classicColIndex,$el.attr('style'));
                }
            });
        }
        else if(sourceId.match("chFontColor")){
             $('.columnactive').each(function() {
                $el = $(this);
                if($el[0]){
                    $el[0].style.color=newColor;
                    grid.setDirtyRowFormatCell(parseInt($el.attr('class').split("slick-header-column")[1].split(' ')[1])+1,$el.data('column').classicColIndex,$el.attr('style'));
                }
            });
        }
        else if(sourceId.match("incrFont")|| sourceId.match("decrFont")){
            $('.columnactive').each(function() {
                $el = $(this);
                if($el.find(".slick-column-name") && $el.find(".slick-column-name")[0]){
                    $el.find(".slick-column-name")[0].style.fontSize= fontSize + "pt";
                    grid.setDirtyRowFormatCell(parseInt($el.attr('class').split("slick-header-column")[1].split(' ')[1])+1,$el.data('column').classicColIndex,$el.attr('style'));
                }
            });
        }else{
            $('.columnactive').each(function() {
                $el = $(this);
                if($el[0]){
                    $el.css(style.split(":")[0],style.split(":")[1].replace(";",''));
                    grid.setDirtyRowFormatCell(parseInt($el.attr('class').split("slick-header-column")[1].split(' ')[1])+1,$el.data('column').classicColIndex,$el.attr('style'));
                }
            });
        }
    return false;
}

function applyStyleFormat (sourceId, reg, style, newColor, fontSize){
    grid.getEditorLock().commitCurrentEdit();
    var selRangeObj = grid.getSelectionModel().getSelectedRanges();
    var selRange = (selRangeObj!=null)?selRangeObj[0]:null;
    var count=true;
    var set = true;
    if(selRange==null)
        return;
    for (var i = selRange.fromRow; i <= selRange.toRow; i++) {
        if(!selRange.riverseColumnDrag){
             for (var j = selRange.fromCell; j <= selRange.toCell; j++) {
                    if(grid.getData()[i][getDataCellIndex(j)].readOnly || grid.getData()[i][getDataCellIndex(j)].isLocked || grid.getData()[i][getDataCellIndex(j)].hasSupportingDetail || grid.getData()[i][getDataCellIndex(j)].bgColor){
                        if(!sourceId.match("chBgColor")){
                            var enableSt = setFormatStyle (sourceId, reg, style, newColor, fontSize,i,j,count,set);
                            if(count){
                                set = enableSt;
                            }
                            count=false;
                        }
                    }else{
                        var enableSt = setFormatStyle (sourceId, reg, style, newColor, fontSize,i,j,count,set);
                        if(count){
                            set = enableSt;
                        }
                        count=false;
                    }
             }
        }else{
            for (var j = selRange.fromCell; j >= selRange.fromCell; j--) {
                    if(grid.getData()[i][getDataCellIndex(j)].readOnly || grid.getData()[i][getDataCellIndex(j)].isLocked || grid.getData()[i][getDataCellIndex(j)].hasSupportingDetail || grid.getData()[i][getDataCellIndex(j)].bgColor){
                        if(!sourceId.match("chBgColor")){
                            var enableSt = setFormatStyle (sourceId, reg, style, newColor, fontSize,i,j,count,set);
                            if(count){
                                set = enableSt;
                            }
                            count=false;
                        }
                    }else{
                        var enableSt = setFormatStyle (sourceId, reg, style, newColor, fontSize,i,j,count,set);
                        if(count){
                            set = enableSt;
                        }
                        count=false;
                    }
             }
        }
    }    
}

function markSlickGridSelection(){
    var goTorow = getTotalRows();
    var selRange = grid.getSelectionModel().getSelectedRanges()[0];
    var returnStatus = false;
    if(selRange.toRow == goTorow && selRange.fromRow == 0){
        returnStatus = true;
    }
    var goToColumn = getTotalColumns()
    if(selRange.toCell == goToColumn && selRange.fromCell == 0){
        returnStatus = true;
    }
    if(returnStatus) copyExtCpyMgr.markRowColSelection(grid.getSelectionModel().getSelectedRanges());
    return returnStatus;
}

function formatSlickGridCell(sourceId, newColor, fontSize) {
    if(sourceId.match("wrapText")){
        cellWrapping();
        return;
    }
    if(!grid.getUserDefinedFormat()){
        return;
    }
    
    var cssStyle = null;
    if(sourceId.match(/chBold/)){
        cssStyle = "font-weight:bold;"
    }else if(sourceId.match(/chItalic/)){
        cssStyle = "font-style:italic;";
    }else if(sourceId.match(/chUnderLine/)){
        cssStyle = "text-decoration:underline;";
    }else if(sourceId.match(/chStrikeThru/ig)){
        cssStyle = "text-decoration:line-through;";
    }else if(sourceId.match("chBgColor")){
        cssStyle = "background-color:";
    }else if(sourceId.match("chFontColor")){
        cssStyle = "color:";
    }else if(sourceId.match("incrFont")|| sourceId.match("decrFont")){
        cssStyle = "font-size:"+ fontSize + "pt;";
        handleHeaderRowFormatting (sourceId, (new RegExp(cssStyle,"gi")), cssStyle, newColor, fontSize);
        handleHeaderColumnsFormatting (sourceId, (new RegExp(cssStyle,"gi")), cssStyle, newColor, fontSize);
        if(grid.getActiveCell())
        applyStyleFormat(sourceId,(new RegExp(cssStyle,"gi")),cssStyle,newColor, fontSize);
        grid.render();
        markSlickGridSelection();
        return;
    }else{
        //do nothing
    }
    if(cssStyle!=null){
        handleHeaderRowFormatting (sourceId, (new RegExp(cssStyle,"gi")), cssStyle, newColor, fontSize);
        handleHeaderColumnsFormatting (sourceId, (new RegExp(cssStyle,"gi")), cssStyle, newColor, fontSize);
        if(grid.getActiveCell()!=null)
            applyStyleFormat(sourceId, (new RegExp(cssStyle,"gi")), cssStyle, newColor, fontSize);
    }
    grid.render();
    markSlickGridSelection();
    
}

function getStyleIdAndValue(cssStyle) {
    cssStyle = cssStyle.replace(/\s/g,"");
    var BD = 1;
    var IT = 2;
    var UL = 4;
    var ST = 8;
    var BR = 16;
    var BG = 32;
    var FS = 64;
    var FC = 128;
    
    var styleBit = 0;
    var txtFormatedString = "";
    var txtFr = false;
    
    var formatedValues = "";
   
    if(cssStyle.match(/font-weight:bold;/ig)){
        styleBit = styleBit|BD;
    }
    if(cssStyle.match(/font-style:italic;/ig)){
        styleBit = styleBit|IT;
    }
    if(cssStyle.match(/text-decoration:underline;/ig)){
        styleBit = styleBit|UL;
    }
    if(cssStyle.match(/text-decoration:line-through;/ig)){
        styleBit = styleBit|ST;
    }
    
    if(cssStyle.match(/background-color:/ig)){
        styleBit = styleBit|BG;
        var newCss1 = cssStyle.split("background-color:");
        var newCss2 = newCss1[1].substring(0,newCss1[1].indexOf(";"));
        var value = hexToRgb(newCss2.replace("#",''));
        txtFr = true;
        txtFormatedString = txtFormatedString + value + ",";
    }else{
        txtFormatedString = txtFormatedString + '' + ",";
    }
    if(cssStyle.match(/color:/ig)){
        styleBit = styleBit|FC;
        cssStyle = cssStyle.replace(/-color:/gi,"-****:");
        var matchColor = cssStyle.match(/color:/ig);
        var value = "";
        if(matchColor!=null){
              var newCss1 = cssStyle.split("color:");
              var newCss2 = newCss1[1].substring(0,newCss1[1].indexOf(";"));
              value = hexToRgb(newCss2.replace("#",''));
        }
        cssStyle = cssStyle.replace(/-\*\*\*\*:/gi,"-color:");
        txtFr = true;
        txtFormatedString = txtFormatedString + value + ",";
    }else{
        txtFormatedString = txtFormatedString + '' + ",";
    }
    if(cssStyle.match(/font-size:/ig)){
        styleBit = styleBit|FS;
        var newCss1 = cssStyle.split("font-size:");
        var newCss2 = newCss1[1].substring(0,newCss1[1].indexOf(";"));
        var value = newCss2.replace(/pt/gi,'');
        txtFr = true; 
        txtFormatedString = txtFormatedString + value.replace(/pt/gi,'') + ",";
    }else{
        txtFormatedString = txtFormatedString + '' + ",";
    }
    if(!txtFr)
        return styleBit;
    formatedValues = formatedValues + txtFormatedString;
    return styleBit + "," + formatedValues;
}

function hexToRgb(hex) {
    if(isNaN(parseInt(hex, 16))){
        return parseInt(colorToHex(hex), 16);
    }else{
        return parseInt(hex, 16);
    }
}

function colorToHex(color) {
    if (color.substr(0, 1) === '#') {
        return color;
    }
    var digits = /(.*?)rgb\((\d+),(\d+),(\d+)\)/.exec(color);

    var red = parseInt(digits[2]);
    var green = parseInt(digits[3]);
    var blue = parseInt(digits[4]);

    var rgb = blue | (green << 8) | (red << 16);
    return digits[1] + '' + rgb.toString(16);
};

/*
 * Format options end
 */
 
 function triggerSlickPostAction(operation, hasCellAttachOrNote) {
    var selRangeObj = grid.getSelectionModel().getSelectedRanges();
    var selRange = (selRangeObj!=null)?selRangeObj[0]:null;
    if(selRange==null)
        return;
    for (var i = selRange.fromRow; i <= selRange.toRow; i++) {
         for (var j = selRange.fromCell; j <= selRange.toCell; j++) {
            if(operation == 'invCellAttach') {
                grid.getData()[i][j].hasCellAttach = hasCellAttachOrNote;
            } else if(operation == 'invCellNote'){
                grid.getData()[i][j].hasCellNote = hasCellAttachOrNote;
            }
         }
         grid.invalidateRow(i);
    } 
    grid.render();
 }
 
 
 function isCopyPaste(srcDataType,dsnDataType) {
    if(srcDataType==6 || srcDataType==1025)// remove hard code
        return true;
    if(srcDataType==dsnDataType){
        return true;
    }else if((srcDataType == grid.getConstants("DATA_TYPE_CURRENCY")) && (dsnDataType==grid.getConstants("DATA_TYPE_NONCURRENCY"))){
        return true;
    }else if((srcDataType == grid.getConstants("DATA_TYPE_NONCURRENCY")) && (dsnDataType==grid.getConstants("DATA_TYPE_CURRENCY"))){
        return true;
    }else if((srcDataType == grid.getConstants("DATA_TYPE_CURRENCY")) && (dsnDataType==grid.getConstants("DATA_TYPE_PERCENTAGE"))){
        return true;
    }else if((srcDataType == grid.getConstants("DATA_TYPE_PERCENTAGE")) && (dsnDataType==grid.getConstants("DATA_TYPE_CURRENCY"))){
        return true;
    }else if((srcDataType == grid.getConstants("DATA_TYPE_NONCURRENCY")) && (dsnDataType==grid.getConstants("DATA_TYPE_PERCENTAGE"))){
        return true;
    }else if((srcDataType == grid.getConstants("DATA_TYPE_PERCENTAGE")) && (dsnDataType==grid.getConstants("DATA_TYPE_NONCURRENCY"))){
        return true;
    }else if((dsnDataType == grid.getConstants("DATA_TYPE_UNSPECIFIED")) || (dsnDataType == grid.getConstants("DATA_TYPE_TEXT"))){
        return true;
    }else{
        return false;
    }
}


/**
 * Get a random floating point number between `min` and `max`.
 * 
 * @param {number} min - min number
 * @param {number} max - max number
 * @return {float} a random floating point number
 */
function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Get a random integer between `min` and `max`.
 * 
 * @param {number} min - min number
 * @param {number} max - max number
 * @return {int} a random integer
 */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}