/**
 * @license
 * (c) 2009-2013 Michael Leibman
 * Modified by Andy Liang
 *
 * NOTES:
 *     Cell/row DOM manipulations are done directly bypassing jQuery's DOM manipulation methods.
 *     This increases the speed dramatically, but can only be done safely because there are no event handlers
 *     or data associated with any cell/row DOM nodes.  Cell editors must make sure they implement .destroy()
 *     and do proper cleanup.
 */
// make sure required JavaScript modules are loaded
if (typeof jQuery === "undefined") {
    throw "SlickGrid requires jquery module to be loaded";
}
if (!jQuery.fn.drag) {
    throw "SlickGrid requires jquery.event.drag module to be loaded";
}
if (typeof Slick === "undefined") {
    throw "slick.core.js not loaded";
}

var accessibilityMode = false;

var commandQueue = [];
var recentPoppedCommand = null;

// Currently focused region of grid
var REGION_OF_INTEREST_SELECTED = {
    DEFAULT: 0, // Default 
    DATA_CELL: 1, //Focused on Data Cell
    ROW_HEADER: 2, //Focused in Row Header
    COLUMN_HEADER: 3, //Focused in Column Header 
    POV: 4 // Focused in POV
};



// Data Types 
const DATA_TYPE_UNSPECIFIED = 0;
const DATA_TYPE_CURRENCY = 1;
const DATA_TYPE_NONCURRENCY = 2;
const DATA_TYPE_PERCENTAGE = 3;
const DATA_TYPE_ENUMERATION = 4;
const DATA_TYPE_DATE = 5;
const DATA_TYPE_TEXT = 6;
const DATA_TYPE_COLLAPSABLE = 7;
const DATA_TYPE_SELECT = 8;
const DATA_TYPE_POUND_OVERRIDE = 9;

// Grid Types
const IS_PLANNING_GRID = 0;
const IS_ADHOC_GRID = 1;
const IS_OPEN_XML_GRID = 2;
const IS_HSF_GRID = 3;
const IS_DIM_EDITOR_GRID = 4;

// Header Special Metadata Types
const IS_WRITABLE = 1;
const IS_COLLAPSED = 2;
const IS_FORECAST_METHOD = 8;
const IS_BOLD_HEADER = 16;

// Cell Metadata Types
const READ_ONLY = 1;
const WRITABLE = 2;
const IS_DIRTY = 4;
const IS_LOCKED = 8;
const HAS_COMMENT = 16;
const FROM_SANDBOX = 32;
const IS_ACTUAL = 64; // shows green
const IS_IMPACTED = 128;
const IS_CALCULATED = 256; // is bolded
// const POUND_OVERRIDE = 512;
const IS_BOLD_DATA = 1024;
// const POUND_ACTUAL_OVERRIDE = 2048;
const HAS_SUPP_DETAIL = 4096;
const IS_MISSING = 8192;
const HAS_ATTACH = 16384;
const HAS_FORMULA = 262144;
const IS_DRILLABLE = 524288;
const IS_SCALAR = 1048576; // 

// Grid Defaults

const DEFAULT_NUM_ROWS = 25;
const DEFAULT_NUM_COLUMNS = 15;
const COLUMN_MIN_WIDTH = 10;
const STANDARD_ROW_HEIGHT = 25;


var ROW_HEIGHT_MEDIUM = 0;
var ROW_HEIGHT_CUSTOM = 1;

const COLUMN_WIDTH_SMALL = 0;
const COLUMN_WIDTH_MEDIUM = 1;
const COLUMN_WIDTH_LARGE = 2;
const COLUMN_WIDTH_CUSTOM = 3;

const COLUMN_WIDTH_SMALL_SIZE = 50;
const COLUMN_WIDTH_MEDIUM_SIZE = 100;
const COLUMN_WIDTH_LARGE_SIZE = 300;

// Key Codes
const KEY_CODE_TAB = 9;
const KEY_CODE_SPACEBAR = 32;
const KEY_CODE_PAGE_UP = 33;
const KEY_CODE_PAGE_DOWN = 34;
const KEY_CODE_ESC = 27;
const KEY_CODE_LEFT_ARROW = 37;
const KEY_CODE_UP_ARROW = 38;
const KEY_CODE_RIGHT_ARROW = 39;
const KEY_CODE_DOWN_ARROW = 40;
const KEY_CODE_HOME = 36;
const KEY_CODE_ENTER = 13;
const KEY_CODE_A = 65;
const KEY_CODE_Y = 89;
const KEY_CODE_Z = 90;

// String constants
const STR_ENUM_ICON = "<TextNode textContent=''></TextNode><img id='arrow_down' src='/HyperionPlanning/Images/arrow_down.png' style='position:absolute;right:5px;padding:5px;display:none;' align='right'>";
const STR_PARENT_MEMBER_HEADER_INDENT = "&nbsp&nbsp&nbsp";
const IMGURL_EXPANDED = "../skins/images/dim-editor/discloseexpanded_16x_ena.png"
const IMGURL_COLLAPSED = "../skins/images/dim-editor/disclosecollapsed_16x_ena.png";

(function($) {
    // Slick.Grid
    $.extend(true, window, {
        Slick: {
            Grid: SlickGrid
        }
    });

    // shared across all grids on the page
    var scrollbarDimensions;
    var maxSupportedCssHeight; 

    function SlickGrid(container, dimensions, cells, options) {

        validateParameters(container, dimensions, cells, options);

        /// Global Slick Grid Variables
        var numberOfRowHeaders = dimensions.RowDimensions.length;
        var numberOfColumnHeaders = dimensions.ColumnDimensions.length;
        var numberOfRows = options.numberOfRows;
        var numberOfColumns = options.numberOfColumns;

        // Copy of original cells
        var originalCells = [];
        for (let i = 0; i < cells.length; i++) {
            originalCells[i] = cells[i].slice(0);
        }


        $(container).data("grid", this);

        var editedCellsToCommit = {};
        var editedHeaderCellsToCommit = {};
        var Editors = [
            Slick.Editors.Text,
            Slick.Editors.Text,
            Slick.Editors.Text,
            Slick.Editors.Text,
            Slick.Editors.Text,
            Slick.Editors.Date,
            Slick.Editors.LongText,
            Slick.Editors.Text,
            Slick.Editors.SelectEditor,
            Slick.Editors.Text
        ];
        const PADDING_WIDTH = (options.isReport) ? 0 : 5;

        // global defaults
        var defaults = {
            editable: (isReport) ? false : true,
            paddingWidth: PADDING_WIDTH, 
            collapsedRowHeaderCache: {}
        };

        var columnDefaults = {
            width: COLUMN_WIDTH_MEDIUM_SIZE
        };

        var rowDefaults = {
            height: STANDARD_ROW_HEIGHT
        };


        if (options.row_height == ROW_HEIGHT_CUSTOM) {
            try {
                defaults.rowHeight = options.row_custom_height;
            } catch (e) {
                console.log(e);
            }
        }

        if (options.column_width == COLUMN_WIDTH_SMALL) {
            columnDefaults.width = COLUMN_WIDTH_SMALL_SIZE;
        } else if (options.column_width == COLUMN_WIDTH_LARGE) {
            columnDefaults.width = COLUMN_WIDTH_LARGE_SIZE;
        } else if (options.column_width == COLUMN_WIDTH_CUSTOM) {
            try {
                columnDefaults.width = options.column_custom_width;
            } catch (e) {
                console.log(e);
            }
        }

        // Process matrix:
        // 1) create columns object
        // 2) apply dummy padding cells
        // 3) set column and row spans
        preprocess();


        var isReport = options.isReport || false;
        var isDisplayGridlines = (options.isDisplayGridlines != null) ? options.isDisplayGridlines : true;
        var runtimeStyleSheet = null;
        var dragNDrop = {
            selectionProxy: null,
            guide: null,
            insertBefore: null
        };
        var dragNDrop2 = {
            selectionProxy: null,
            guide: null,
            insertBefore: null
        };

        function queueAndExecuteCommand(item, column, editCommand) {
            commandQueue.push(editCommand);
            editCommand.execute();
        }

        function undo() {
            var command = commandQueue.pop();
            if (command && Slick.GlobalEditorLock.cancelCurrentEdit()) {
                command.undo();
                gotoCell(command.row, command.cell, false);
                $(container + " .l" + command.cell + ".row" + command.row).removeClass("dirty");
            }
            recentPoppedCommand = command;
        }

        function redo() {
            if (recentPoppedCommand != null) {
                recentPoppedCommand.execute();
                $(container + " .l" + recentPoppedCommand.cell + ".row" + recentPoppedCommand.row).addClass("dirty");
            }
        }

        function setMinrowsMincols() {
            try {
                if (options.isReport && options.sheetCharts && options.sheetCharts.charts && options.sheetCharts.charts.length > 0) {
                    var chartEndRow = 0;
                    var chartEndCol = 0;
                    for (var i = 0; i < options.sheetCharts.charts.length; i++) {
                        var chart = options.sheetCharts.charts[i];
                        if (chartEndRow < chart.location.to[1])
                            chartEndRow = chart.location.to[1];
                        if (chartEndCol < chart.location.to[0])
                            chartEndCol = chart.location.to[0];
                    }
                    if (minNumRows < chartEndRow)
                        minNumRows = chartEndRow + 2;
                    if (minNumCols < chartEndCol)
                        minNumCols = chartEndCol + 2;
                }
            } catch (ex) {}
        }

        setRuntimeStyleSheet(); //Fix for : HSF Reports inherit styles from account view 

        function appendData(moreCells) {
            moreCells = parseJSONCells(moreCells, true);
            cells.push.apply(cells, moreCells);
            numRows = cells.length;
        }

        function appendRowHeaders(moreHeaders) {
            //TODO: write for subdimensions
            for (var i = 0; i < moreHeaders.length; i++) {
                headers.HspSlickRowHeaders[i].members = headers.HspSlickRowHeaders[i].members.concat(moreHeaders[i].members);
            }
        }


        function finishChunking() {
            
            updateRowCount();
            render();
        }

        var viewport2Width = 0;

        // scroller
        var th; // virtual height
        var h; // real scrollable height
        var ph; // page height
        var n; // number of pages
        var cj; // "jumpiness" coefficient

        var page = 0; // current page
        var offset = 0; // current page offset
        var vScrollDir = 1;

        // private
        var initialized = false;
        var $container;
        var uid = "slickgrid_" + Math.round(1000000 * Math.random());
        var self = this;
        var $focusSink, $focusSink2;
        var $headerScroller;
        var $headers;
        var $headerRow, $headerRowScroller, $headerRowSpacer;
        //        var $topPanelScroller;
        //        var $topPanel;
        var $viewport;
        var $viewport2; //Creating the Second viewport for freezing
        var $canvas;
        var $canvas2; //Creating the Second canvas for freezing
        var $style;
        var $smartList;
        var $contextMenu;
        var $boundAncestors;
        var allHeaders = [];
        var $allHeaderScrollers;
        var $allHeaderContainer;
        var stylesheet, columnCssRulesL, columnCssRulesR;
        var viewportH, viewportW;
        var viewportHasHScroll, viewportHasVScroll;
        var headerColumnWidthDiff = 0,
            headerColumnHeightDiff = 0, // border+padding
            cellWidthDiff = 0,
            cellHeightDiff = 0;
        var absoluteColumnMinWidth;

        var tabbingDirection = 1;
        var activePosX;
        var activeRow, activeCell;
        var activeCellNode = null;
        var currentEditor = null;
        var serializedEditorValue;
        var editController;

        var rowsCache = {};
        var rowsCache2 = {};
        var RHnames = {};
        var rowPositionCache = {};
        var alreadyAddedLabelRows = new Set();
        var renderedRows = 0;
        var numVisibleRows;
        var prevScrollTop = 0;
        var scrollTop = 0;
        var lastRenderedScrollTop = 0;
        var lastRenderedScrollLeft = 0;
        var prevScrollLeft = 0;
        var scrollLeft = 0;

        var selectionModel;
        var selectedRows = [];

        var plugins = [];
        var cellCssClasses = {};

        var columnsById = {};
        var columnPosLeft = [];
        var columnPosRight = [];


        // async call handles
        var h_editorLoader = null;
        //        var h_render = null;
        var h_postrender = null;
        var postProcessedRows = {};
        var postProcessToRow = null;
        var postProcessFromRow = null;

        // perf counters
        var counter_rows_rendered = 0;
        var counter_rows_removed = 0;
        var currentScrollCoordinates = {
            x: 0,
            y: 0
        }

        // These two variables work around a bug with inertial scrolling in Webkit/Blink on Mac.
        // See http://crbug.com/312427.
        var rowNodeFromLastMouseWheelEvent; // this node must not be deleted while inertial scrolling
        var zombieRowNodeFromLastMouseWheelEvent; // node that was hidden instead of getting deleted
        var currentFocus = REGION_OF_INTEREST_SELECTED.DEFAULT;
        var newRowlist = "";

        var performSlideDown = false;
        //////////////////////////////////////////////////////////////////////////////////////////////
        // Initialization

        function init() {
            $container = $(container);
            // calculate these only once and share between grid instances
            maxSupportedCssHeight = maxSupportedCssHeight || getMaxSupportedCssHeight();
            scrollbarDimensions = scrollbarDimensions || measureScrollbar();


            if (options.isReport)
                applyWidthFromCache(options, columns)

            // setColumns(columns);

            editController = {
                "commitCurrentEdit": commitCurrentEdit,
                "cancelCurrentEdit": cancelCurrentEdit
            };

            $container
                .empty()
                .css("overflow", "hidden")
                .css("outline", 0)
                .addClass(uid)
                .addClass("ui-widget");

            // set up a positioning container if needed
            if (!/relative|absolute|fixed/.test($container.css("position"))) {
                $container.css("position", "relative");
            }

            $focusSink = $("<div tabIndex='0' hideFocus style='position:fixed;width:0;height:0;top:0;left:0;outline:0;'></div>").appendTo($container);
            if (options.gridType == IS_HSF_GRID) {
                $("<div id='rowHeaderScroller' class='ui-state-default' style='overflow:hidden;position:absolute;'>" +
                    "<div id='frozen-column' class='slick-header-columns' style='left: -1000px; -moz-user-select: none; width: 2997px;' unselectable='on'>" +
                    "<div class='ui-state-default slick-header-column hsf-custom' style='border-left: 1px solid #c0c0c0;width: 180px;z-index: 1;' col='-2' mbrinst='HSF_Expand_All'>" +
                    "<span class='slick-column-name'><input id='expand_all_checkbox' type='checkbox'/>&nbsp" + ((options.extraHeaders && options.extraHeaders[0]) ? options.extraHeaders[0] : "Expand All") + "</span>" +
                    "<div class='slick-resizable-handle'></div>" +
                    "</div>" +
                    "<div class='ui-state-default slick-header-column hsf-custom' style='border-left: 1px solid #c0c0c0;width: 191px;z-index: 1;' col='-1' mbrinst='HSF_Account_Names'>" +
                    "<span class='slick-column-name'>" + ((options.extraHeaders && options.extraHeaders[1]) ? options.extraHeaders[1] : "Account Names") + "</span>" +
                    "<div class='slick-resizable-handle'></div>" +
                    "</div>" +
                    "</div>" +
                    "</div>"
                ).appendTo($container);
            } else if (options.gridType == IS_DIM_EDITOR_GRID) {
                $("<div id='rowHeaderScroller' class='ui-state-default' style='overflow:hidden;position:absolute;'>" +
                    "<div id='frozen-column' class='slick-header-columns' style='left: -1000px; -moz-user-select: none; width: 2997px;' unselectable='on'>" +
                    "<div class='ui-state-default slick-header-column' style='width: 191px;z-index: 1;' col='-1' mbrinst='Dim_editor_member_names'>" +
                    "<span class='slick-column-name'>Member Name</span>" +
                    "<div class='slick-resizable-handle'></div>" +
                    "</div>" +
                    "</div>" +
                    "</div>"
                ).appendTo($container);
            }

            $('#rowHeaderScroller')
                // .bind("contextmenu", handleHeaderContextMenu)
                .bind("click", handleColumnHeaderClick)
                .bind("dblclick", handleDblClick)
                .bind("contextmenu", handleContextMenu)

            viewport2Width = numberOfRowHeaders * COLUMN_WIDTH_MEDIUM_SIZE;

            if (isReport)
                viewport2Width = 35;
            

            viewportWidth = $container.width() - viewport2Width - 1;

            $scrollerContainer = $("<div id='scrollerContainer'/>").appendTo($container);
            for (var i = 0; i < numberOfColumnHeaders; i++) {
                $headerScroller = $("<div id='scroller" + i + "' class='slick-header ui-state-default' />")
                    // .bind("contextmenu", handleHeaderContextMenu)
                    .bind("click", handleColumnHeaderClick)
                    .bind("dblclick", handleDblClick)
                    .bind("contextmenu", handleContextMenu)
                    .width(viewportWidth)
                    .css('left', (viewport2Width-1) + "px")
                    .appendTo($scrollerContainer);
                $headers = $("<div id='headers" + i + "' class='slick-header-columns' />").appendTo($headerScroller);
                $headers.width(getHeadersWidth());
                allHeaders.push($headers);
            }
            
            $allHeaderScrollers = $(container + " .slick-header");
            $headerRowScroller = $("<div class='slick-headerrow ui-state-default' style='overflow:hidden;position:relative;' />").appendTo($container);
            $headerRow = $("<div class='slick-headerrow-columns' />").appendTo($headerRowScroller);
            $headerRowSpacer = $("<div style='display:block;height:1px;position:absolute;top:0;left:0;'></div>")
                .css("width", getCanvasWidth() + scrollbarDimensions.width + "px")
                .appendTo($headerRowScroller);
            $allHeaderContainer = $(container + " .slick-header-columns:not(#frozen-column)")

            $headerRowScroller.hide();

            $viewport2 = $("<div id='row-header-viewport' class='slick-viewport' style='width:" + viewport2Width + "px;overflow:auto;outline:0;position:relative;float:left;'>").appendTo($container);
            $viewport2.css("overflow-y", "hidden");
            $viewport = $("<div id='main-viewport' class='slick-viewport' style='width:" + Math.floor(viewportWidth) + "px;overflow:auto;outline:0;position:relative;;'>").appendTo($container);
            $viewport.css("overflow-y", "auto");

            $canvas = $("<div class='grid-canvas' />").appendTo($viewport);
            $canvas2 = $("<div class='grid-canvas2' />").appendTo($viewport2);
            $focusSink2 = $focusSink.clone().appendTo($container);

            finishInitialization();
            $canvas.width(getCanvasWidth() - viewport2Width);
        }

        function finishInitialization() {
            if (!initialized) {
                initialized = true;

                viewportW = parseFloat($.css($container[0], "width", true));

                // header columns and cells may have different padding/border skewing width calculations (box-sizing, hello?)
                // calculate the diff so we can set consistent sizes
                measureCellPaddingAndBorder();

                // for usability reasons, all text selection in SlickGrid is disabled
                // with the exception of input and textarea elements (selection must
                // be enabled there so that editors work as expected); note that
                // selection in grid cells (grid body) is already unavailable in
                // all browsers except IE
                disableSelection($headers); // disable all text selection in header (including input and textarea)

                $viewport.bind("selectstart.ui", function(event) {
                    return $(event.target).is("input,textarea");
                });
            

                updateColumnCaches();
                createColumnHeaders();
                createCssRules();
                resizeCanvas();
                bindAncestorScrollEvents();

                $container
                    .bind("resize.slickgrid", resizeCanvas)
                    .bind("wheel", function(e) {
                        $viewport[0].scrollTo($viewport[0].scrollLeft, $viewport[0].scrollTop + 10 * e.originalEvent.deltaY);
                        handleScroll(e);
                        e.preventDefault();
                    });
                $viewport
                    .bind("click", handleClick)
                    .bind("contextmenu", handleContextMenu)
                    .bind("scroll", handleScroll);
                $viewport2
                    .bind("click", handleClick)
                    .bind("dblclick", handleDblClick)
                    .bind("contextmenu", handleContextMenu)
                $headerScroller
                    .delegate(".slick-header-column", "mouseenter", handleHeaderMouseEnter)
                    .delegate(".slick-header-column", "mouseleave", handleHeaderMouseLeave);
                $headerRowScroller
                    .bind("scroll", handleHeaderRowScroll);
                $focusSink.add($focusSink2)
                    .bind("keydown", handleKeyDown);
                $canvas
                    .bind("keydown", handleKeyDown)
                    .bind("dblclick", handleDblClick)
                $canvas2.bind("keydown", handleKeyDown);


                $('#expand_all_checkbox').click(function(e) {
                    let checked = $(e.target).is(":checked");
                    for (let mem in options.collapsedRowHeaderCache) {
                        options.collapsedRowHeaderCache[mem].status = options.collapsedRowHeaderCache[mem].status ^ IS_COLLAPSED;
                    }
                    
                    setColumns(columns);
                    invalidate();
                })

                // Handling the collapse expand icon click
                // TODO Handling the member formula icon click
                // TODO Handling the smarlist icon click

                // Work around http://crbug.com/312427.
                if (navigator.userAgent.toLowerCase().match(/webkit/) &&
                    navigator.userAgent.toLowerCase().match(/macintosh/)) {
                    $canvas.bind("mousewheel", handleMouseWheel);
                }
            }
        }

        function column_dragStart(e, dd) {
            pageX = e.pageX;
            $('.ui-state-default.slick-header-column').removeClass("slick-header-column-active");
            $cells.removeClass('active selected slick-header-column-active');
            $(this).parent().addClass("slick-header-column-active");
            $headers.children().each(function(i, e) {
                if (options.gridType == IS_HSF_GRID && i < numberOfColumnHeaders) {
                    e = $('#frozen-column').children()[i];
                }
                $(e).data('column', [columns[i]]);
                columns[i].previousWidth = $(e).outerWidth();
            });
        }

        function column_drag(e, dd) {
            let ic = +$(this).parent().attr('col');
            let i = +$(this).parent().attr('col') + numberOfColumnHeaders;
            let c, selColumnEl, sel;
            let col_offset = 0;
            let isHeaderRule;
            // Determining if resizable handler is coming from column headers or row headers
            let isFromColumnHeaders = $('.slick-header-columns').toArray().some(function(_container) {
                return $.contains(_container, e.currentTarget)
            });

            if (isFromColumnHeaders) {

                // resizing on column header
                selColumnEl = e.currentTarget.parentNode;
                let columnEls = $(selColumnEl.parentNode).children();
                var colData = $(columnEls[i]).data("column");
                c = colData[colData.length - 1];
                isHeaderRule = ic < 0;

            } else {

                // resizing on data cells
                isHeaderRule = $canvas2.is(e.currentTarget.parentNode.parentNode.parentNode);
                let colOffset = (isHeaderRule) ? 0 : numberOfColumnHeaders;
                i = ic = $(e.currentTarget.parentNode).index();
                c = columns[i + colOffset];
                selColumnEl = $('*[col=' + ((isHeaderRule) ? i - numberOfColumnHeaders : i) + ']')[0];
            }

            // if(isHeaderRule && i == 0) col_offset = 14;
            c.width = c.previousWidth + e.pageX - pageX;
            applyColumnHeaderWidths(selColumnEl);
            $(isHeaderRule ?
                    '.' + uid + ' .hr' + i :
                    '.' + uid + ' .r' + ic)
                .width(c.width - (2 * PADDING_WIDTH) - col_offset);

        }

        function column_dragEnd(e, dd) {
            if (isReport) {
                if ($(e.target).offsetParent() && $(e.target).offsetParent().attr("col") != null) {
                    trigger(self.onColumnsResized, {

                        "options": options,
                        "column": columns[parseInt($(e.target).offsetParent().attr("col")) + 1]
                    });
                    onColumnResizeReports(options, columns[parseInt($(e.target).offsetParent().attr("col")) + 1]);
                }
            } else {
                trigger(self.onColumnsResized, {
                    "options": options,
                    "column": columns[parseInt($(e.target).offsetParent().attr("col"))]
                });
            }
            options.columnWidthStates[numberOfColumnHeaders + +$(dd.drag.offsetParent).attr("col")] = $(dd.drag.offsetParent).width() + headerColumnWidthDiff;
        }

        function registerPlugin(plugin) {
            plugins.unshift(plugin);
            plugin.init(self);
        }

        function unregisterPlugin(plugin) {
            for (var i = plugins.length; i >= 0; i--) {
                if (plugins[i] === plugin) {
                    if (plugins[i].destroy) {
                        plugins[i].destroy();
                    }
                    plugins.splice(i, 1);
                    break;
                }
            }
        }

        function setSelectionModel(model) {
            if (selectionModel) {
                selectionModel.onSelectedRangesChanged.unsubscribe(handleSelectedRangesChanged);
                if (selectionModel.destroy) {
                    selectionModel.destroy();
                }
            }

            selectionModel = model;
            if (selectionModel) {
                selectionModel.init(self);
                selectionModel.onSelectedRangesChanged.subscribe(handleSelectedRangesChanged);
            }
        }

        function getSelectionModel() {
            return selectionModel;
        }

        function getCanvasNode() {
            return $canvas[0];
        }

        function getCanvas2Node() {
            return $canvas2[0];
        }

        function measureScrollbar() {
            var $c = $("<div style='position:absolute; top:-10000px; left:-10000px; width:100px; height:100px; overflow:scroll;'></div>").appendTo("body");
            var dim = {
                width: $c.width() - $c[0].clientWidth,
                height: $c.height() - $c[0].clientHeight
            };
            $c.remove();
            return dim;
        }

        function getHeadersWidth() {
            // var headersWidth = numberOfColumnHeaders * 100;
            
            // for (var i = 0, ii = columns.length; i < ii; i++) {
            //     var width = columns[i].width;
            //     headersWidth += width;
            // }

            // headersWidth += scrollbarDimensions.width;
            // return Math.max(headersWidth, viewportW) + 1000;
            return cells[0].length * COLUMN_WIDTH_MEDIUM_SIZE;
        }

        function getCanvasWidth() {
            
            // var availableWidth = viewportHasVScroll ? viewportW - scrollbarDimensions.width : viewportW;
            // var rowWidth = 0;
            // var i = columns.length;
            // while (i--) {
            //     rowWidth += columns[0][i].width;
            // }
            return (numberOfColumns - numberOfRowHeaders) * COLUMN_WIDTH_MEDIUM_SIZE;
        }

        function updateCanvasWidth(forceColumnWidthsUpdate) {
            var canvasWidth = getCanvasWidth();

            $canvas.width(canvasWidth - viewport2Width);
            $headerRow.width(canvasWidth);
            $headers.width(getHeadersWidth());
            viewportHasHScroll = (canvasWidth > viewportW - scrollbarDimensions.width);
        

            $headerRowSpacer.width(canvasWidth + (viewportHasVScroll ? scrollbarDimensions.width : 0));

        }

        function disableSelection($target) {
            if ($target && $target.jquery) {
                $target
                    .attr("unselectable", "on")
                    .css("MozUserSelect", "none")
                    .bind("selectstart.ui", function() {
                        return false;
                    }); // from jquery:ui.core.js 1.7.2
            }
        }

        function getMaxSupportedCssHeight() {
            var supportedHeight = 1000000;
            // FF reports the height back but still renders blank after ~6M px
            var testUpTo = navigator.userAgent.toLowerCase().match(/firefox/) ? 6000000 : 1000000000;
            var div = $("<div style='display:none' />").appendTo(document.body);

            while (true) {
                var test = supportedHeight * 2;
                div.css("height", test);
                if (test > testUpTo || div.height() !== test) {
                    break;
                } else {
                    supportedHeight = test;
                }
            }

            div.remove();
            return supportedHeight;
        }

        // TODO:  this is static.  need to handle page mutation.
        function bindAncestorScrollEvents() {
            var elem = $canvas[0];
            while ((elem = elem.parentNode) != document.body && elem != null) {
                // bind to scroll containers only
                if (elem == $viewport[0] || elem.scrollWidth != elem.clientWidth || elem.scrollHeight != elem.clientHeight) {
                    var $elem = $(elem);
                    if (!$boundAncestors) {
                        $boundAncestors = $elem;
                    } else {
                        $boundAncestors = $boundAncestors.add($elem);
                    }
                    $elem.bind("scroll." + uid, handleActiveCellPositionChange);
                }
            }
        }

        function unbindAncestorScrollEvents() {
            if (!$boundAncestors) {
                return;
            }
            $boundAncestors.unbind("scroll." + uid);
            $boundAncestors = null;
        }

        function updateColumnHeader(columnId, title, toolTip) {
            if (!initialized) {
                return;
            }
            var idx = getColumnIndex(columnId);
            if (idx == null) {
                return;
            }

            var columnDef = columns[idx];
            var $header = $headers.children().eq(idx);
            if ($header) {
                if (title !== undefined) {
                    columns[idx].name = title;
                }
                if (toolTip !== undefined) {
                    columns[idx].toolTip = toolTip;
                }

                trigger(self.onBeforeHeaderCellDestroy, {
                    "node": $header[0],
                    "column": columnDef
                });

                $header
                    .attr("title", toolTip || "")
                    .children().eq(0).html(title);

                trigger(self.onHeaderCellRendered, {
                    "node": $header[0],
                    "column": columnDef
                });
            }
        }

        function getHeaderRow() {
            return $headerRow[0];
        }

        function getHeaderRowColumn(columnId) {
            var idx = getColumnIndex(columnId);
            var $header = $headerRow.children().eq(idx);
            return $header && $header[0];
        }

        function createColumns() {
            let columns = []; 

            for (let i = 0, columnRow; i < numberOfColumnHeaders; i++){

                columnRow = cells[i].slice(numberOfRowHeaders);

                for (let j = 0; j < columnRow.length; j++) {

                    columnRow[j] = Object.assign(columnRow[j], columnDefaults);

                }
              
                columns.push(columnRow);

            }

            return columns;
        }

        function createColumnHeader(columnCell, $headers) {

            return $("<div class='ui-state-default slick-header-column' />")
              .html("<span class='slick-column-name'>" + columnCell.displayText + "</span>")
              .width(columnCell.width - headerColumnWidthDiff)
              .attr("title", columnCell.toolTip || "")
              .data("column", columnCell)
              .appendTo($headers);

        }


        function createColumnHeaders() {

            var columnCreated;

            // create data columns
            for (let i = 0, columnRow; i < columns.length; i++) {

                columnRow = columns[i];
                
                for (let j = 0, columnCell; j < columnRow.length; j++) {

                  columnCell = columnRow[j];
                  
                  // Handle column spans
                  if (j > 0 && columnRow[j-1].value == columnCell.value) {
                    columnCreated.width( columnCreated.width() + COLUMN_WIDTH_MEDIUM_SIZE)
                  } else {
                    columnCreated = createColumnHeader(columnCell, $allHeaderScrollers[i].children[0]);
                  }


                }

            }
        } 

        function setupColumnResize() {
            var $col, j, c, pageX, columnElements, minPageX, maxPageX, firstResizable, lastResizable;
            columnElements = $headers.children();
            columnElements.find(".slick-resizable-handle").remove();
            columnElements.each(function(i, e) {
                if (firstResizable === undefined) firstResizable = i;
                lastResizable = i;
            });
            if (firstResizable === undefined) return;
            columnElements.each(function(i, e) {
                $col = $(e);
                if (i < firstResizable || +$col.attr('col') < 0) return;

                $("<div class='slick-resizable-handle' />").appendTo(e)
            });

        }

        function getVBoxDelta($el) {
            var p = ["borderTopWidth", "borderBottomWidth", "paddingTop", "paddingBottom"];
            var delta = 0;
            $.each(p, function(n, val) {
                delta += parseFloat($el.css(val)) || 0;
            });
            return delta;
        }

        function measureCellPaddingAndBorder() {
            var el;
            var h = ["borderLeftWidth", "borderRightWidth", "paddingLeft", "paddingRight"];
            var v = ["borderTopWidth", "borderBottomWidth", "paddingTop", "paddingBottom"];

            el = $("<div class='ui-state-default slick-header-column' style='visibility:hidden'>-</div>").appendTo($headers);
            headerColumnWidthDiff = headerColumnHeightDiff = 0;
            if (el.css("box-sizing") != "border-box" && el.css("-moz-box-sizing") != "border-box" && el.css("-webkit-box-sizing") != "border-box") {
                $.each(h, function(n, val) {
                    headerColumnWidthDiff += parseFloat(el.css(val)) || 0;
                });
                $.each(v, function(n, val) {
                    headerColumnHeightDiff += parseFloat(el.css(val)) || 0;
                });
            }
            el.remove();
            if ((options.gridType == IS_HSF_GRID || isReport) && (headerColumnWidthDiff < 4)) {
                headerColumnWidthDiff = 9;
            }
            var r = $("<div class='slick-row' />").appendTo($canvas);
            el = $("<div class='slick-cell' id='' style='visibility:hidden'>-</div>").appendTo(r);
            cellWidthDiff = cellHeightDiff = 0;
            if (el.css("box-sizing") != "border-box" && el.css("-moz-box-sizing") != "border-box" && el.css("-webkit-box-sizing") != "border-box") {
                $.each(h, function(n, val) {
                    cellWidthDiff += parseFloat(el.css(val)) || 0;
                });
                $.each(v, function(n, val) {
                    cellHeightDiff += parseFloat(el.css(val)) || 0;
                });
            }
            r.remove();

            absoluteColumnMinWidth = Math.max(headerColumnWidthDiff, cellWidthDiff);
        }

        function createCssRules() {
            $style = $("<style type='text/css' rel='stylesheet' />").appendTo($("head"));
            var rowHeight = (rowDefaults.height - cellHeightDiff);
            var leftPos = (options.gridType == IS_HSF_GRID) ? "999px;" : "1000px;";
            var rules = [
                // "." + uid + " .slick-header-column { left:" + leftPos + " }",
                //                "." + uid + " .slick-top-panel { height:" + options.topPanelHeight + "px; }",
                "." + uid + " .slick-headerrow-columns { height:" + options.headerRowHeight + "px; }",
                "." + uid + " .slick-cell { height:" + rowHeight + "px; }",
                "." + uid + " .slick-row { height:" + rowDefaults.height + "px; }"
            ];

            if ($style[0].styleSheet) { // IE
                $style[0].styleSheet.cssText = rules.join(" ");
            } else {
                $style[0].appendChild(document.createTextNode(rules.join(" ")));
            }
        }

        function getColumnCssRules(idx) {
            if (!stylesheet) {
                var sheets = document.styleSheets;
                for (var i = 0; i < sheets.length; i++) {
                    if ((sheets[i].ownerNode || sheets[i].owningElement) == $style[0]) {
                        stylesheet = sheets[i];
                        break;
                    }
                }

                if (!stylesheet) {
                    throw new Error("Cannot find stylesheet.");
                }

                // find and cache column CSS rules
                columnCssRulesL = [];
                columnCssRulesR = [];
                var cssRules = (stylesheet.cssRules || stylesheet.rules);
                var matches, columnIdx;
                for (var i = 0; i < cssRules.length; i++) {
                    var selector = cssRules[i].selectorText;
                    if (selector.indexOf('h') > -1) {
                        if (matches = /\.hl\d+/.exec(selector)) {
                            columnIdx = parseInt(matches[0].substr(3, matches[0].length - 3), 10);
                            columnCssRulesL[columnIdx] = cssRules[i];
                        } else if (matches = /\.hr\d+/.exec(selector)) {
                            columnIdx = parseInt(matches[0].substr(3, matches[0].length - 3), 10);
                            columnCssRulesR[columnIdx] = cssRules[i];
                        }
                    } else {
                        if (matches = /\.l\d+/.exec(selector)) {
                            columnIdx = parseInt(matches[0].substr(2, matches[0].length - 2), 10);
                            columnCssRulesL[columnIdx + numberOfColumnHeaders] = cssRules[i];
                        } else if (matches = /\.r\d+/.exec(selector)) {
                            columnIdx = parseInt(matches[0].substr(2, matches[0].length - 2), 10);
                            columnCssRulesR[columnIdx + numberOfColumnHeaders] = cssRules[i];
                        }
                    }
                }
            }

            return {
                "left": columnCssRulesL[idx],
                "right": columnCssRulesR[idx]
            };
        }

        function removeCssRules() {
            $style.remove();
            stylesheet = null;
        }

        function destroy() {
            getEditorLock().cancelCurrentEdit();

            trigger(self.onBeforeDestroy, {});

            var i = plugins.length;
            while (i--) {
                unregisterPlugin(plugins[i]);
            }


            unbindAncestorScrollEvents();
            $container.unbind(".slickgrid");
            removeCssRules();

            $canvas.unbind("draginit dragstart dragend drag");
            $container.empty().removeClass(uid);
        }


        //////////////////////////////////////////////////////////////////////////////////////////////
        // General

        function trigger(evt, args, e) {
            e = e || new Slick.EventData();
            args = args || {};
            args.grid = self;
            return evt.notify(args, e, self);
        }

        function getEditorLock() {
            return Slick.GlobalEditorLock;
        }

        function getEditController() {
            return editController;
        }

        function getColumnIndex(id) {
            return columnsById[id];
        }

        function applyColumnHeaderWidths(header) {
            if (!initialized) {
                return;
            }

            var col = $(header).data("column");
            var end = col.length - 1;
            var headerW = 0;
            for (var i = 0; i < col.length; i++) {
                headerW += col[i].width;
            }
            var w = headerW - $(header).width();
            var hashCodes = col[end].hashCodes;
            var mbrInst_str = "";
            var selection = [];
            for (var i = 0; i < hashCodes.length; i++) {
                mbrInst_str += hashCodes[i];
                selection = $.merge(selection, $(container + " [mbrInst='" + mbrInst_str + "']"));
                mbrInst_str += ",";
            }
            $.each(selection, function(i, h) {
                let diff = w - headerColumnWidthDiff;
                $(h).width($(h).width() + diff);
                if ($(h).hasClass('hsf-custom')) {
                    $viewport2.width($viewport2.width() + diff);
                    $viewport.width($viewport.width() - diff);
                    //                    $headers.css({left:'+='+diff})
                    $headerScroller.css({
                        left: '+=' + diff
                    })
                }
            })
        }


        function handleSelectedRangesChanged(e, ranges) {
            selectedRows = [];
            var hash = {};
            for (var i = 0; i < ranges.length; i++) {
                for (var j = ranges[i].fromRow; j <= ranges[i].toRow; j++) {
                    if (!hash[j]) { // prevent duplicates
                        selectedRows.push(j);
                        hash[j] = {};
                    }
                    for (var k = ranges[i].fromCell; k <= ranges[i].toCell; k++) {
                        if (canCellBeSelected(j, k + numberOfColumnHeaders)) {
                            hash[j][columns[k + numberOfColumnHeaders].id] = "selected";
                        }
                    }
                }
            }

            setCellCssStyles("selected", hash);

            trigger(self.onSelectedRowsChanged, {
                rows: getSelectedRows()
            }, e);
        }

        function getColHeaders() {
            return headers.HspSlickColumnHeaders;
        }

        function getRowHeaders() {
            return headers.HspSlickRowHeaders;
        }

        function getColumns() {
            return columns;
        }

        function updateColumnCaches() {
            // Pre-calculate cell boundaries.
            columnPosLeft = [];
            columnPosRight = [];
            var x = 0;
            for (var i = 0, ii = columns.length; i < ii; i++) {

                columnPosLeft[i] = x;
                columnPosRight[i] = x + columns[i].width;
                x += columns[i].width;
            }
        }

        function setColumns(columnDefinitions) {
            columns = columnDefinitions;

            columnsById = {};
            for (var i = 0; i < columns.length; i++) {
                var m = columns[i] = $.extend({}, columnDefaults, columns[i]);
                if (options.columnWidthStates.length) {
                    m.width = options.columnWidthStates[i];
                }
                columnsById[m.id] = i - numberOfColumnHeaders;
                if (m.width == undefined) {
                    m.width = 100;
                }
            }

            updateColumnCaches();
        }

        function getOptions() {
            return options;
        }

        function setOptions(newOptions) {
            if (!getEditorLock().commitCurrentEdit()) {
                return;
            }

            makeActiveCellNormal();

            if (false !== newfalse) {
                invalidateRow(getDataLength());
            }

            options = $.extend(options, newOptions);

            setColumns(columns);
            render();
        }

        function setHeaders(newHeaders) {
            headers = newHeaders;
        }

        function setCells(newCells) {
            cells = newCells;
        }

        function setData(newData, scrollToTop) {
            data = newData;
            invalidateAllRows();
            updateRowCount();
            if (scrollToTop) {
                scrollTo(0);
            }
        }

        function getData() {
            return data;
        }

        function getEditedCellsToCommit() {
            return editedCellsToCommit;
        }

        function getEditedHeaderCellsToCommit() {
            return editedHeaderCellsToCommit;
        }

        function setEditedCellsToCommit(newEditedCellsToCommitt) {
            editedCellsToCommit = newEditedCellsToCommit;
        }

        function clearEditedCellsToCommit() {
            editedCellsToCommit = {};
        }

        function isGridDirty() {
            var size = 0,
                key;
            for (key in editedCellsToCommit) {
                if (editedCellsToCommit.hasOwnProperty(key)) size++;
            }
            return (size > 0);
        }

        function getGridId() {
            if (options.gridId == undefined) {
                alert('Grid Id was not provided');
            }
            return options.gridId;
        }

        function getHeaders() {
            return headers;
        }

        function getCells() {
            return cells;
        }

        function getDataLength() {
            return cells.length - numberOfColumnHeaders;
        }

        function getDataItem(i) {
            if (cells.getItem) {
                return cells.getItem(i);
            } else {
                return cells[i];
            }
        }

        function getContainerNode() {
            return $container.get(0);
        }

        //////////////////////////////////////////////////////////////////////////////////////////////
        // Rendering / Scrolling

        function getRowTop(row) {
            return rowDefaults.height * row - offset;
        }

        function getRowFromPosition(maxPosition) {
            var row = 0;
            var rowsInPosCache = getDataLength();

            if (!rowsInPosCache) {
                return row;
            }

            // Loop through the row position cache and break when
            // the row is found
            for (var i = 0; i < rowsInPosCache; i++) {
                if (rowPositionCache[i].top <= maxPosition &&
                    rowPositionCache[i].bottom >= maxPosition
                ) {
                    row = i;
                    continue;
                }
            }

            // Return the last row in the grid
            if (maxPosition > rowPositionCache[rowsInPosCache - 1].bottom) {
                row = rowsInPosCache - 1;
            }

            return row;
        }

        function scrollTo(y) {
            y = Math.max(y, 0);
            y = Math.min(y, th - viewportH + (viewportHasHScroll ? scrollbarDimensions.height : 0));

            var oldOffset = offset;

            page = Math.min(n - 1, Math.floor(y / ph));
            offset = Math.round(page * cj);
            var newScrollTop = y - offset;

            if (offset != oldOffset) {
                var range = getVisibleRange(newScrollTop);
                cleanupRows(range);
                updateRowPositions();
            }

            if (prevScrollTop != newScrollTop) {
                vScrollDir = (prevScrollTop + oldOffset < newScrollTop + offset) ? 1 : -1;
                $viewport[0].scrollTop = (lastRenderedScrollTop = scrollTop = prevScrollTop = newScrollTop);

                trigger(self.onViewportChanged, {});
            }
        }

        function defaultFormatter(value) {
            if (value == null) {
                return "";
            } else {
                return (value + "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            }
        }

        function currencyFormatter(value) {
            if (value == null || value == "") {
                return "";
            } else {
                return parseFloat(value).toFixed(2);
            }
        }

        function percentFormatter(value) {
            if (value == null || value == "") {
                return "";
            } else {
                return Math.round(value * 100) + "%";
            }
        }

        function smartListFormatter(value, cell) {
            if (value == null || value == "" || typeof Model == 'undefined') {
                return "";
            } else {
                /*if (options.gridType == IS_DIM_EDITOR_GRID) {
                    var smartLists = options.smartLists[cell].split(",");
                    return smartLists[+value] + STR_ENUM_ICON;
                }*/

                return Model.planningGridJSON.options.smartLists[+value] + STR_ENUM_ICON;
            }
        }

        function numberFormatter(value) {
            
            if (value == null || value == "") {

                return "";

            } else {

                /// Determine which precision to round to
                var toFixed = value.length - value.indexOf('.') - 1;
                if (toFixed < options.minPrecision) {
                    toFixed = options.minPrecision;
                } else if (toFixed > options.maxPrecision) {
                    toFixed = options.maxPrecision;
                }

                /// Round to precision
                if (isReport) { //Bug 25292881 
                    if (!(parseFloat(value).toFixed(toFixed) == "-0"))
                        value = parseFloat(value).toFixed(toFixed);
                    else
                        value = parseFloat(value).toFixed(2);
                } else {
                    value = parseFloat(value).toFixed(toFixed);
                }
                var isNegative = parseFloat(value) < 0;
                if (isNegative) {
                    value = Math.abs(parseFloat(value)) + "";
                }
                if (isReport && parseFloat(value) == -0) { //Bug 25292881
                    isNegative = true;
                    value = Math.abs(parseFloat(value)) + ".00";
                }
                /// Add commas
                var rx = /(\d+)(\d{3})/;
                value = value.replace(/^\d+/, function(w) {
                    while (rx.test(w)) {
                        w = w.replace(rx, '$1,$2');
                    }
                    return w;
                });

                if (isNegative) {
                    value = "(" + value + ")";
                }

                return value.toLocaleString();
            }
        }

        function getFormatter(dataType) {
            let formatter = Slick.Formatters.Default;
            switch (dataType) {
                case DATA_TYPE_POUND_OVERRIDE:
                    formatter = Slick.Formatters.PoundOverride;
                    break;
                case DATA_TYPE_PERCENTAGE:
                    formatter = percentFormatter;
                    break;
                case DATA_TYPE_ENUMERATION:
                    formatter = smartListFormatter;
                    break;
                case DATA_TYPE_COLLAPSABLE:
                    formatter = Slick.Formatters.Collapsable;
                    break;
                case DATA_TYPE_CURRENCY:
                case DATA_TYPE_NONCURRENCY:
                    formatter = numberFormatter;
                    break;
            }
            return formatter;
        }

        function getEditor(dataType) {
            return Editors[dataType];
        }

        function getDataItemValueForColumn(item, columnDef) {
            return item[columnDef.field].value;
        }

        function appendRowHtml(stringArray, row, range, dataLength, stringArray2) {
            var d = getDataItem(row);
            var dataLoading = row < dataLength && !d;
            var rowCss = "slick-row" +
                (dataLoading ? " loading" : "") +
                (row === activeRow ? " active" : "")

            if (!d) {
                rowCss += " " + "new-row";
            }

            var metadata = cells.getItemMetadata && cells.getItemMetadata(row);

            if (metadata && metadata.cssClasses) {
                rowCss += " " + metadata.cssClasses;
            }
            var slideOnCss = "";
            if (isSlideDown()){
                if(row>activeRow){ 
                    slideOnCss = "display: none;";
                }
            }

            stringArray.push("<div class='ui-widget-content ");
            stringArray.push(rowCss);
            stringArray.push("' style='" + slideOnCss + "top:");
            stringArray.push(rowPositionCache[row].top);
            stringArray.push("px;");
            stringArray.push(
                (rowPositionCache[row].height != rowDefaults.height) ?
                "height:" + rowPositionCache[row].height + "px;" :
                ""
            );
            stringArray.push("'>");
            stringArray2.push("<div class='ui-widget-content ");
            stringArray2.push(rowCss);
            stringArray2.push("' style='" + slideOnCss + " top:");
            stringArray2.push(rowPositionCache[row].top);
            stringArray2.push("px;");
            stringArray2.push(
                (rowPositionCache[row].height != rowDefaults.height) ?
                "height:" + rowPositionCache[row].height + "px;" :
                ""
            );
            stringArray2.push("'>");

            for (let i = 0, cell, stringArrayToUse; i < numberOfColumns; i++) {
              
                cell = cells[row + numberOfColumnHeaders][i];

                if (i < numberOfRowHeaders) {
                    stringArrayToUse = stringArray2;
                    rowsCacheToUse = rowsCache2;
                } else { 
                    stringArrayToUse = stringArray;
                    rowsCacheToUse = rowsCache;
                }
                
                appendCellHtml(stringArrayToUse, rowsCacheToUse, cell, row, i);

            }

            stringArray.push("</div>");
            stringArray2.push("</div>");
        }

        function appendCellHtml(stringArray, rowCache, cell, row, column) {

            let cellDataAttributes = "";
            let cellCssClasses = "";
            let value = "";

            if (cell != null) {

                let columnIndex = cell.columnIndex;
                let rowIndex = cell.rowIndex;
                
                if (column < numberOfRowHeaders) {
                    cellCssClasses += " header";
                }
                if (cell.dataType == DATA_TYPE_CURRENCY || cell.dataType == DATA_TYPE_NONCURRENCY || cell.dataType == DATA_TYPE_PERCENTAGE) {
                     cellCssClasses +=" numeric";
                }
                
                cellDataAttributes = "row='" + rowIndex + "' column='" + columnIndex + "'";

                value = getFormatter(cell.dataType)(cell.displayText || cell.value);
            
            }

            stringArray.push("<div class='slick-cell" + cellCssClasses + "' " + cellDataAttributes + ">" + value + "</div>");

            rowsCache[row].cellRenderQueue.push(column);
        }
        
        function isNumeric(cell) {
            if (cell.types == DATA_TYPE_CURRENCY ||
                cell.types == DATA_TYPE_NONCURRENCY ||
                cell.types == DATA_TYPE_PERCENTAGE ||
                cell.types == DATA_TYPE_POUND_OVERRIDE) {
                return true;
            } else {
                return false;
            }
        }

        function validateCurrency(value) {
            var regx = /^\$?[0-9][0-9,]*[0-9]\.?[0-9]{0,2}$/i;
            return regx.test(value);
        }

        function stringRepeat(str, count) {
            if (str.length == 0 || count == 0)
                return str;
            try {
                return str.repeat(count)
            } catch (ex) {
                var newString = "";
                for (var i = 0; i < count; i++)
                    newString += str;
                return newString;
            }
        }



        function cleanupRows(rangeToKeep) {
            for (var i in rowsCache) {
                if (((i = parseInt(i, 10)) !== activeRow) && (i < rangeToKeep.top || i > rangeToKeep.bottom)) {
                    removeRowFromCache(i);
                }
            }
        }

        function invalidate() {
            updateRowCount();
            invalidateAllRows();
            // FOR ADDING LABEL ROWS
            // if (typeof Model == "undefined" && options.gridType == IS_ADHOC_GRID && Object.keys(Model.sv.addLabelRowsDict).length > 0) {
            //     var labelRowsToAdd = []; 
            //     for (var labelRow in Model.sv.addLabelRowsDict) {
            //         if (labelRow in RHnames && !alreadyAddedLabelRows.has(labelRow)) {
            //             alreadyAddedLabelRows.add(labelRow);
            //             labelRowsToAdd.push([RHnames[labelRow], labelRow]);
            //         }
            //     };
            //     labelRowsToAdd.sort(function (a, b) {
            //        return a[0] - b[0];
            //     }).reverse();
            //     for (var i in labelRowsToAdd) {
            //         var row = labelRowsToAdd[i][0];
            //         var rowName = labelRowsToAdd[i][1];
            //         if (Model.sv.addLabelRowsDict[rowName] == null) {
            //             var labelRowCells = {};
            //             for (var i = 0; i < numCols; i++) {
            //                 labelRowCells[i] = {
            //                     value: "", 
            //                     status: 2,
            //                     types: 0
            //                 };
            //             }
            //             Model.sv.addLabelRowsDict[rowName] = {
            //                 data: labelRowCells,
            //                 RHdata : Array.apply(null, Array(numberOfColumnHeaders)).map(function() {
            //                     return {
            //                         hasChildren: false,
            //                         isExpanded: true,
            //                         mbrInst: null,
            //                         nL: 0,
            //                         size: 0,
            //                         status: 1,
            //                         value: ""
            //                     }
            //                 })
            //             }
            //         }
            //         cells.splice(row, 0, Model.sv.addLabelRowsDict[rowName].data);
            //         RHdata.splice(row, 0, Model.sv.addLabelRowsDict[rowName].RHdata);
            //     }
            // }
            render();
        }

        function invalidateAllRows() {
            if (currentEditor) {
                makeActiveCellNormal();
            }
            for (var row in rowsCache) {
                removeRowFromCache(row);
            }
        }

        function removeRowFromCache(row) {
            var cacheEntry = rowsCache[row];
            var cacheEntry2 = rowsCache2[row];
            if (!cacheEntry) {
                return;
            }

            if (rowNodeFromLastMouseWheelEvent == cacheEntry.rowNode) {
                cacheEntry.rowNode.style.display = 'none';
                cacheEntry2.rowNode.style.display = 'none';
                zombieRowNodeFromLastMouseWheelEvent = rowNodeFromLastMouseWheelEvent;
            } else {
                $canvas[0].removeChild(cacheEntry.rowNode);
                $canvas2[0].removeChild(cacheEntry2.rowNode);
            }

            delete rowsCache[row];
            delete rowsCache2[row];
            delete postProcessedRows[row];
            renderedRows--;
            counter_rows_removed++;
        }

        function invalidateRows(rows) {
            var i, rl;
            if (!rows || !rows.length) {
                return;
            }
            vScrollDir = 0;
            for (i = 0, rl = rows.length; i < rl; i++) {
                if (currentEditor && activeRow === rows[i]) {
                    makeActiveCellNormal();
                }
                if (rowsCache[rows[i]]) {
                    removeRowFromCache(rows[i]);
                }
            }
        }

        function invalidateRow(row) {
            invalidateRows([row]);
        }

        function updateCell(row, cell) {
            var cellNode = getCellNode(row, cell);
            if (!cellNode) {
                return;
            }

            if (currentEditor && activeRow === row && activeCell === cell) {
                currentEditor.loadValue(d);
            } else {
                cellNode.innerHTML = d ? getFormatter(cells[activeRow][activeCell].types) : "";
                invalidatePostProcessingResults(row);
            }
        }

        function updateRow(row) {
            var cacheEntry = rowsCache[row];
            if (!cacheEntry) {
                return;
            }

            ensureCellNodesInRowsCache(row);

            var d = getDataItem(row);

            for (var columnIdx in cacheEntry.cellNodesByColumnIdx) {
                if (!cacheEntry.cellNodesByColumnIdx.hasOwnProperty(columnIdx)) {
                    continue;
                }

                columnIdx = columnIdx | 0;
                var node = cacheEntry.cellNodesByColumnIdx[columnIdx];

                if (row === activeRow && columnIdx === activeCell && currentEditor) {
                    cells[activeRow][activeCell].value = d[columnIdx].value;
                    currentEditor.loadValue(d);
                } else if (d) {
                    node.innerHTML = getFormatter(d[columnIdx].types)(d[columnIdx].value, d[columnIdx]);
                } else {
                    node.innerHTML = "";
                }
            }

            invalidatePostProcessingResults(row);
        }

        function getViewportHeight() {
            var colHeadersH = 0;
            $(container + ' .slick-header').each(function() {
                colHeadersH += $(this).height()
            });
            return parseFloat($.css($container[0], "height", true)) -
                parseFloat($.css($container[0], "paddingTop", true)) -
                parseFloat($.css($container[0], "paddingBottom", true)) -
                colHeadersH - getVBoxDelta($headerScroller);
        }

        function resizeCanvas() {
            if (!initialized) {
                return;
            }

            var columnRowHeaderHeight = 0;
            if (!options.isReport) {
                $('.slick-header').each(function() {
                    columnRowHeaderHeight += $(this).height();
                });
            } else {
                columnRowHeaderHeight = 26;
            }
            viewportH = $container.height() - $scrollerContainer.height();


            numVisibleRows = Math.ceil(viewportH / rowDefaults.height);
            viewportW = parseFloat($.css($container[0], "width", true));

            $viewport.height(viewportH);
            $viewport2.height(viewportH);

            updateRowCount();
            handleScroll();
            // Since the width has changed, force the render() to reevaluate virtually rendered cells.
            lastRenderedScrollLeft = -1;
            render();
        }

        function updateRowCount() {
            if (!initialized) {
                return;
            }
            cacheRowPositions(); //support for row height
            var dataLengthIncludingAddNew = getDataLength();
            var numberOfRows = dataLengthIncludingAddNew;

            var oldViewportHasVScroll = viewportHasVScroll;
            // with autoHeight, we do not need to accommodate the vertical scroll bar
            // viewportHasVScroll = !options.autoHeight && (numberOfRows * rowDefaults.height > viewportH);
            viewportHasVScroll = rowPositionCache[numberOfRows - 1] && (rowPositionCache[numberOfRows - 1].bottom > viewportH);
            makeActiveCellNormal();

            // remove the rows that are now outside of the data range
            // this helps avoid redundant calls to .removeRow() when the size of the data decreased by thousands of rows
            var l = dataLengthIncludingAddNew - 1;
            for (var i in rowsCache) {
                if (i >= l) {
                    removeRowFromCache(i);
                }
            }

            if (activeCellNode && activeRow > l) {
                resetActiveCell();
            }

            var oldH = h;

            var rowMax = (false) ?
                rowPositionCache[getDataLength()].bottom :
                rowPositionCache[getDataLength()].top;
            th = Math.max(rowMax, viewportH - scrollbarDimensions.height);
            //th = Math.max(rowDefaults.height * numberOfRows, viewportH - scrollbarDimensions.height);
            if (th < maxSupportedCssHeight) {
                // just one page
                h = ph = th;
                n = 1;
                cj = 0;
            } else {
                // break into pages
                h = maxSupportedCssHeight;
                ph = h / 100;
                n = Math.floor(th / ph);
                cj = (th - h) / (n - 1);
            }

            if (h !== oldH) {
                $canvas.css("height", h);
                $canvas2.css("height", h + defaults.rowHeight); //to adjust for the added scrollers
                scrollTop = $viewport[0].scrollTop;
            }

            var oldScrollTopInRange = (scrollTop + offset <= th - viewportH);

            if (th == 0 || scrollTop == 0) {
                page = offset = 0;
            } else if (oldScrollTopInRange) {
                // maintain virtual position
                scrollTo(scrollTop + offset);
            } else {
                // scroll to bottom
                scrollTo(th - viewportH);
            }

            updateCanvasWidth(false);
        }

        function getVisibleRange(viewportTop, viewportLeft) {
            if (viewportTop == null) {
                viewportTop = scrollTop;
            }
            if (viewportLeft == null) {
                viewportLeft = scrollLeft;
            }

            return {
                top: getRowFromPosition(viewportTop),
                bottom: getRowFromPosition(viewportTop + viewportH),
                leftPx: viewportLeft,
                rightPx: viewportLeft + viewportW
            };
        }

        function getRenderedRange(viewportTop, viewportLeft) {
            var range = getVisibleRange(viewportTop, viewportLeft);
            var buffer = Math.round(viewportH / rowDefaults.height);
            var minBuffer = 3;

            if (vScrollDir == -1) {
                range.top -= buffer;
                range.bottom += minBuffer;
            } else if (vScrollDir == 1) {
                range.top -= minBuffer;
                range.bottom += buffer;
            } else {
                range.top -= minBuffer;
                range.bottom += minBuffer;
            }

            range.top = Math.max(0, range.top);
            range.bottom = Math.min(getDataLength(), range.bottom);

            range.leftPx = 0;
            range.rightPx = getCanvasWidth();

            return range;
        }

        function ensureCellNodesInRowsCache(row) {
            var cacheEntry = rowsCache[row];
            if (cacheEntry) {
                if (cacheEntry.cellRenderQueue.length) {
                    var lastChild = cacheEntry.rowNode.lastChild;
                    while (cacheEntry.cellRenderQueue.length) {
                        var columnIdx = cacheEntry.cellRenderQueue.pop();
                        cacheEntry.cellNodesByColumnIdx[columnIdx] = lastChild;
                        lastChild = lastChild.previousSibling;
                    }
                }
            }
        }

        function cleanUpCells(range, row) {
            var totalCellsRemoved = 0;
            var cacheEntry = rowsCache[row];
            var cacheEntry2 = rowsCache2[row];

            // Remove cells outside the range.
            var cellsToRemove = [];
            for (var i in cacheEntry.cellNodesByColumnIdx) {
                // I really hate it when people mess with Array.prototype.
                if (!cacheEntry.cellNodesByColumnIdx.hasOwnProperty(i)) {
                    continue;
                }

                // This is a string, so it needs to be cast back to a number.
                i = i | 0;

                var colspan = cacheEntry.cellColSpans[i];
                if (columnPosLeft[i] > range.rightPx ||
                    columnPosRight[Math.min(columns.length - 1, i + colspan - 1)] < range.leftPx) {
                    if (!(row == activeRow && i == activeCell)) {


                        cellsToRemove.push(i);
                    }
                }
            }

            var cellToRemove;
            while ((cellToRemove = cellsToRemove.pop()) != null) {
                cacheEntry.rowNode.removeChild(cacheEntry.cellNodesByColumnIdx[cellToRemove]);
                delete cacheEntry.cellColSpans[cellToRemove];
                delete cacheEntry.cellNodesByColumnIdx[cellToRemove];
                if (postProcessedRows[row]) {
                    delete postProcessedRows[row][cellToRemove];
                }
                totalCellsRemoved++;
            }
        }

        function cleanUpAndRenderCells(range) {
            var cacheEntry, cacheEntry2;
            var stringArray = [];
            var processedRows = [];
            var cellsAdded;
            var totalCellsAdded = 0;
            var colspan;

            for (var row = range.top, btm = range.bottom; row <= btm; row++) {
                cacheEntry = rowsCache[row];
                cacheEntry2 = rowsCache2[row];
                if (!cacheEntry) {
                    continue;
                }

                // cellRenderQueue populated in renderRows() needs to be cleared first
                ensureCellNodesInRowsCache(row);

                cleanUpCells(range, row);

                // Render missing cells.
                cellsAdded = 0;

                var metadata = cells.getItemMetadata && cells.getItemMetadata(row);
                metadata = metadata && metadata.columns;

                var d = getDataItem(row);

                // TODO:  shorten this loop (index? heuristics? binary search?)
                for (var i = 0, ii = columns.length; i < ii; i++) {
                    // Cells to the right are outside the range.
                    if (columnPosLeft[i] > range.rightPx) {
                        break;
                    }

                    // Already rendered.
                    if (i < numberOfColumnHeaders) {
                        if ((colspan = cacheEntry2.cellColSpans[i]) != null) {
                            i += (colspan > 1 ? colspan - 1 : 0);
                            continue;
                        }
                    } else {
                        if ((colspan = cacheEntry.cellColSpans[i - numberOfColumnHeaders]) != null) {
                            i += (colspan > 1 ? colspan - 1 : 0);
                            continue;
                        }
                    }

                    colspan = 1;
                    if (metadata) {
                        var columnData = metadata[columns[i].id] || metadata[i];
                        colspan = (columnData && columnData.colspan) || 1;
                        if (colspan === "*") {
                            colspan = ii - i;
                        }
                    }

                    if (columnPosRight[Math.min(ii - 1, i + colspan - 1)] > range.leftPx) {
                        appendCellHtml(stringArray, row, i, colspan, d);
                        cellsAdded++;
                    }

                    i += (colspan > 1 ? colspan - 1 : 0);
                }

                if (cellsAdded) {
                    totalCellsAdded += cellsAdded;
                    processedRows.push(row);
                }
            }

            if (!stringArray.length) {
                return;
            }

            var x = document.createElement("div");
            x.innerHTML = stringArray.join("");

            var processedRow;
            var node;
            while ((processedRow = processedRows.pop()) != null) {
                cacheEntry = rowsCache[processedRow];
                var columnIdx;
                while ((columnIdx = cacheEntry.cellRenderQueue.pop()) != null) {
                    node = x.lastChild;
                    cacheEntry.rowNode.appendChild(node);




                    cacheEntry.cellNodesByColumnIdx[columnIdx] = node;
                }
            }
        }

        function renderRows(range) {
            var parentNode = $canvas[0],
                parentNode2 = $canvas2[0],
                stringArray = [],
                stringArray2 = [],
                rows = [],
                needToReselectCell = false,
                dataLength = getDataLength();

            for (var i = range.top, ii = range.bottom - 1; i <= ii; i++) {
                if (rowsCache[i]) {
                    continue;
                }
                renderedRows++;
                rows.push(i);
                rowsCache[i] = {
                    "rowNode": null,
                    "cellColSpans": [],
                    "cellNodesByColumnIdx": [],
                    "cellRenderQueue": []
                };
                rowsCache2[i] = {
                    "rowNode": null,
                    "cellColSpans": [],
                    "cellNodesByColumnIdx": [],
                    "cellRenderQueue": []
                };

                appendRowHtml(stringArray, i, range, dataLength, stringArray2);
                if (activeCellNode && activeRow === i) {
                    needToReselectCell = true;
                }
                counter_rows_rendered++;
            }

            if (!rows.length) {
                return;
            }

            var x = document.createElement("div");
            x.innerHTML = stringArray.join("");
            var y = document.createElement("div");
            y.innerHTML = stringArray2.join("");

            for (var i = 0, ii = rows.length; i < ii; i++) {
                rowsCache[rows[i]].rowNode = parentNode.appendChild(x.firstChild);
                rowsCache2[rows[i]].rowNode = parentNode2.appendChild(y.firstChild);
            }
            if (needToReselectCell) {
                activeCellNode = getCellNode(activeRow, activeCell);
            }
            if(isSlideDown()){
                $( ".slick-row" ).slideDown(1000,"linear");
                setSlideDown(false);
            }

        }

        function invalidatePostProcessingResults(row) {
            delete postProcessedRows[row];
            postProcessFromRow = Math.min(postProcessFromRow, row);
            postProcessToRow = Math.max(postProcessToRow, row);
        }

        function updateRowPositions() {
            for (var row in rowsCache) {
                rowsCache[row].rowNode.style.top = getRowTop(row) + "px";
            }
        }

        function render() {
            if (!initialized) {
                return;
            }
            var visible = getVisibleRange();
            var rendered = getRenderedRange();

            // remove rows no longer in the viewport
            cleanupRows(rendered);

            // add new rows & missing cells in existing rows
            if (lastRenderedScrollLeft != scrollLeft) cleanUpAndRenderCells(rendered);

            // render missing rows

            renderRows(rendered);

            postProcessFromRow = visible.top;
            postProcessToRow = Math.min(getDataLength(), visible.bottom);
            




            lastRenderedScrollTop = scrollTop;
            lastRenderedScrollLeft = scrollLeft;

            $("img[func=collapseExpand]")
                .bind("click", handleCollapseExpand);
            $(".slick-resizable-handle")
                .bind("dragstart", column_dragStart)
                .bind("drag", column_drag)
                .bind("dragend", column_dragEnd);

            if (options.gridType == IS_HSF_GRID) viewport2Width = $viewport2.width();
            
            if (options.gridType == IS_DIM_EDITOR_GRID) {
                viewport2Width = 0;
                for (var iRowHeader = 0; iRowHeader <  numberOfColumnHeaders; iRowHeader++) {
                    viewport2Width += columns[iRowHeader].width;
                }
            }
            
            $viewport.width($container.width() - viewport2Width - 1);

            $viewport2.width(viewport2Width);

            $cells = $(container + " .slick-cell, .slick-header-column");

            $smartList = (options.gridType == IS_DIM_EDITOR_GRID) ?
                $('#dimSmartListSelect') : $('#smartListMenu');
            $contextMenu = (options.gridType == IS_DIM_EDITOR_GRID) ?
                $('#dimContextMenu') : $('#contextMenu');

            if (options.gridType == IS_ADHOC_GRID) {
                $(container + ' [mbrinst]').droppable({
                    drop: function(event, ui) {
                        
                        var layer, orientation, className;
                        
                        var name = (ko.dataFor(ui.draggable[0])) ? ko.dataFor(ui.draggable[0]).name : null;

                        if ($(this).hasClass("header")) {
                            orientation = "row";
                            layer = $(this).index();
                            className = 'dropover-pov-row-header';
                        } else {
                            orientation = "col";
                            layer = $(this.parentNode.parentNode).index() - 1;
                            className = 'dropover-pov-column-header';
                        }

                        var isRowOrientationSwitch = orientation == "row" && ui.draggable.hasClass("column-header-pivot-item");
                        var isColumnOrientationSwitch = orientation == "col" && ui.draggable.hasClass("row-header-pivot-item");

                        var orientation_switch = isRowOrientationSwitch || isColumnOrientationSwitch;

                        var mainVM = ko.dataFor(ui.draggable.parent()[0]);
                        var pivotItemVM = ko.dataFor(ui.draggable[0]);

                        if (ui.draggable.hasClass("pov-item")) {

                            mainVM.pivotPOVtoGrid(name, pivotItemVM.display, orientation, layer);


                        } else if (orientation_switch) {

                            if (orientation == "row" && ui.draggable.hasClass("column-header-pivot-item")) {

                                mainVM.pivotDimensionsBetweenHeaders("col2row", ui.draggable.index(), layer);

                            } else {

                                mainVM.pivotDimensionsBetweenHeaders("row2col", ui.draggable.index(), layer);
                            }

                        } else {

                            moveDimension(ko.dataFor(ui.draggable[0]).cell, orientation, layer - ko.dataFor(ui.draggable[0]).index);

                        }

                        $(this).removeClass(className);
                    },
                    over: function(event, ui) {
                        var className = ($(this).hasClass("header")) ? 'dropover-pov-row-header' : 'dropover-pov-column-header';
                        $(this).addClass(className);
                    },
                    // Remove .hoverClass whenever #draggable is no longer hovered over #droppable
                    out: function(event, ui) {
                        var className = ($(this).hasClass("header")) ? 'dropover-pov-row-header' : 'dropover-pov-column-header';
                        $(this).removeClass(className);
                    }
                });
            } else if (options.gridType == IS_DIM_EDITOR_GRID) {

                $(container + ' [mbrinst]').draggable({
                    revert: "invalid",
                    zIndex: 99999,
                    opacity: 0.5,
                    axis: "y",
                    containment: "#dimEditorGrid .grid-canvas2",
                    start: function(event, ui) {

                        dragNDrop.selectionProxy = $("<div class='slick-reorder-proxy'/>")
                            .css("position", "absolute")
                            .css("zIndex", "99999")
                            .css("width", $($canvas).innerWidth())
                            .css("height", rowDefaults.height)
                            .appendTo($canvas);

                        dragNDrop.guide = $("<div class='slick-reorder-guide'/>")
                            .css("position", "absolute")
                            .css("zIndex", "99998")
                            .css("width", $($canvas).innerWidth())
                            .css("top", -1000)
                            .appendTo($canvas);

                        dragNDrop.insertBefore = -1;

                        dragNDrop2.selectionProxy = $("<div class='slick-reorder-proxy'/>")
                            .css("position", "absolute")
                            .css("zIndex", "99999")
                            .css("width", $($canvas2).innerWidth())
                            .css("height", rowDefaults.height)
                            .appendTo($canvas2);

                        dragNDrop2.guide = $("<div class='slick-reorder-guide'/>")
                            .css("position", "absolute")
                            .css("zIndex", "99998")
                            .css("width", $($canvas2).innerWidth())
                            .css("top", -1000)
                            .appendTo($canvas2);

                        dragNDrop2.insertBefore = -1;
                    },
                    drag: function(event, ui) {
                        var top = event.pageY - $($canvas).offset().top;
                        var top2 = event.pageY - $($canvas2).offset().top;
                        dragNDrop.selectionProxy.css("top", top - 10);
                        dragNDrop2.selectionProxy.css("top", top2 - 10);

                        var insertBefore = Math.max(0, Math.min(Math.round(top / rowDefaults.height), 31));

                        if (insertBefore !== dragNDrop.insertBefore) {
                            var eventData = {
                                "insertBefore": insertBefore
                            };
                            dragNDrop.guide.css("top", insertBefore * rowDefaults.height);
                            dragNDrop2.guide.css("top", insertBefore * rowDefaults.height);
                            dragNDrop.insertBefore = insertBefore;
                            dragNDrop2.insertBefore = insertBefore;
                        }
                    },
                    stop: function(event, ui) {
                        dragNDrop.guide.remove();
                        dragNDrop.selectionProxy.remove();
                        dragNDrop.insertBefore = -1;
                        dragNDrop2.guide.remove();
                        dragNDrop2.selectionProxy.remove();
                        dragNDrop2.insertBefore = -1;
                    }
                });

                $(container + ' [mbrinst]').droppable({

                    drop: function(event, ui) {
                        var dorpRowNum = $(this).parent().attr('row');
                        var dropRowMbrInst = $(this).attr('mbrInst');
                        var dropMemberName = $(this)[0].innerText.trim();
                        trigger(self.onMemberNameDrop, {
                            "ui": ui,
                            "dropRowMbrInst": dropRowMbrInst,
                            "dorpRowNum": dorpRowNum,
                            "dropRowMbrInst": dropRowMbrInst,
                            "dropMemberName": dropMemberName
                        }, event);
                    },
                    over: function(event, ui) {

                    },
                    out: function(event, ui) {

                    }

                });
            }
        }

        function handleHeaderRowScroll() {
            var scrollLeft = $headerRowScroller[0].scrollLeft;
            if (scrollLeft != $viewport[0].scrollLeft) {
                $viewport[0].scrollLeft = scrollLeft;
            }
        }

        function handleScroll() {

            scrollTop = $viewport[0].scrollTop;
            $viewport2[0].scrollTop = scrollTop;
            scrollLeft = $viewport[0].scrollLeft;
            var vScrollDist = Math.abs(scrollTop - prevScrollTop);
            var hScrollDist = Math.abs(scrollLeft - prevScrollLeft);

            if (hScrollDist) {
                prevScrollLeft = scrollLeft;
                $allHeaderScrollers.each(function(a, b) {
                    b.scrollLeft = scrollLeft;
                })
                $headerRowScroller[0].scrollLeft = scrollLeft;
            }

            if (vScrollDist) {
                vScrollDir = prevScrollTop < scrollTop ? 1 : -1;
                prevScrollTop = scrollTop;

                // switch virtual pages if needed
                if (vScrollDist < viewportH) {
                    scrollTo(scrollTop + offset);
                } else {
                    var oldOffset = offset;
                    if (h == viewportH) {
                        page = 0;
                    } else {
                        page = Math.min(n - 1, Math.floor(scrollTop * ((th - viewportH) / (h - viewportH)) * (1 / ph)));
                    }
                    offset = Math.round(page * cj);
                    if (oldOffset != offset) {
                        invalidateAllRows();
                    }
                }
            }

            if (hScrollDist || vScrollDist) {

                if (Math.abs(lastRenderedScrollTop - scrollTop) > 20 || Math.abs(lastRenderedScrollLeft - scrollLeft) > 20) {
                    render();
                    trigger(self.onViewportChanged, {});
                }
                currentScrollCoordinates.x = $viewport[0].scrollLeft;
                currentScrollCoordinates.y = $viewport[0].scrollTop;
            }

            trigger(self.onScroll, {
                scrollLeft: scrollLeft,
                scrollTop: scrollTop
            });

        }

        function asyncPostProcessRows() {
            var dataLength = getDataLength();
            while (postProcessFromRow <= postProcessToRow) {
                var row = (vScrollDir >= 0) ? postProcessFromRow++ : postProcessToRow--;
                var cacheEntry = rowsCache[row];
                if (!cacheEntry || row >= dataLength) {
                    continue;
                }

                if (!postProcessedRows[row]) {
                    postProcessedRows[row] = {};
                }

                ensureCellNodesInRowsCache(row);
                for (var columnIdx in cacheEntry.cellNodesByColumnIdx) {
                    if (!cacheEntry.cellNodesByColumnIdx.hasOwnProperty(columnIdx)) {
                        continue;
                    }

                    columnIdx = columnIdx | 0;

                    var m = columns[columnIdx];
                    if (m.asyncPostRender && !postProcessedRows[row][columnIdx]) {
                        var node = cacheEntry.cellNodesByColumnIdx[columnIdx];
                        if (node) {
                            m.asyncPostRender(node, row, getDataItem(row), m);
                        }
                        postProcessedRows[row][columnIdx] = true;
                    }
                }

                h_postrender = setTimeout(asyncPostProcessRows, 50);
                return;
            }
        }

        function updateCellCssStylesOnRenderedRows(addedHash, removedHash) {
            var node, columnId, addedRowHash, removedRowHash;
            for (var row in rowsCache) {
                removedRowHash = removedHash && removedHash[row];
                addedRowHash = addedHash && addedHash[row];

                if (removedRowHash) {
                    for (columnId in removedRowHash) {
                        if (!addedRowHash || removedRowHash[columnId] != addedRowHash[columnId]) {
                            node = getCellNode(row, getColumnIndex(columnId));
                            if (node) {
                                $(node).removeClass(removedRowHash[columnId]);
                            }
                        }
                    }
                }

                if (addedRowHash) {
                    for (columnId in addedRowHash) {
                        if (!removedRowHash || removedRowHash[columnId] != addedRowHash[columnId]) {
                            node = getCellNode(row, getColumnIndex(columnId));
                            if (node) {
                                $(node).addClass(addedRowHash[columnId]);
                            }
                        }
                    }
                }
            }
        }

        function addCellCssStyles(key, hash) {
            if (cellCssClasses[key]) {
                throw "addCellCssStyles: cell CSS hash with key '" + key + "' already exists.";
            }

            cellCssClasses[key] = hash;
            updateCellCssStylesOnRenderedRows(hash, null);

            trigger(self.onCellCssStylesChanged, {
                "key": key,
                "hash": hash
            });
        }

        function removeCellCssStyles(key) {
            if (!cellCssClasses[key]) {
                return;
            }

            updateCellCssStylesOnRenderedRows(null, cellCssClasses[key]);
            delete cellCssClasses[key];

            trigger(self.onCellCssStylesChanged, {
                "key": key,
                "hash": null
            });
        }

        function setCellCssStyles(key, hash) {
            var prevHash = cellCssClasses[key];

            cellCssClasses[key] = hash;
            updateCellCssStylesOnRenderedRows(hash, prevHash);

            trigger(self.onCellCssStylesChanged, {
                "key": key,
                "hash": hash
            });
        }

        function getCellCssStyles(key) {
            return cellCssClasses[key];
        }

        function flashCell(row, cell, speed) {
            speed = speed || 100;
            if (rowsCache[row]) {
                var $cell = $(getCellNode(row, cell));

                function toggleCellClass(times) {
                    if (!times) {
                        return;
                    }
                    setTimeout(function() {
                            $cell.queue(function() {
                                $cell.toggleClass("flashing").dequeue();
                                toggleCellClass(times - 1);
                            });
                        },
                        speed);
                }

                toggleCellClass(4);
            }
        }

        //////////////////////////////////////////////////////////////////////////////////////////////
        // Interactivity

        function handleMouseWheel(e) {
            var rowNode = $(e.target).closest(".slick-row")[0];
            if (rowNode != rowNodeFromLastMouseWheelEvent) {
                if (zombieRowNodeFromLastMouseWheelEvent && zombieRowNodeFromLastMouseWheelEvent != rowNode) {
                    $canvas[0].removeChild(zombieRowNodeFromLastMouseWheelEvent);
                    zombieRowNodeFromLastMouseWheelEvent = null;
                }
                rowNodeFromLastMouseWheelEvent = rowNode;
            }
        }

        // function handleDragInit(e, dd) {
        //     var cell = getCellFromEvent(e);
        //     if (!cell || !cellExists(cell.row, cell.cell)) {
        //         return false;
        //     }

        //     var retval = trigger(self.onDragInit, dd, e);
        //     if (e.isImmediatePropagationStopped()) {
        //         return retval;
        //     }

        //     // if nobody claims to be handling drag'n'drop by stopping immediate propagation,
        //     // cancel out of it
        //     return false;
        // }

        // function handleDragStart(e, dd) {
        //     var cell = getCellFromEvent(e);
        //     if (!cell || !cellExists(cell.row, cell.cell)) {
        //         return false;
        //     }

        //     var retval = trigger(self.onDragStart, dd, e);
        //     if (e.isImmediatePropagationStopped()) {
        //         return retval;
        //     }

        //     return false;
        // }

        // function handleDrag(e, dd) {
        //     return trigger(self.onDrag, dd, e);
        // }

        // function handleDragEnd(e, dd) {
        //     trigger(self.onDragEnd, dd, e);
        // }

        function handleKeyDown(e) {
            if(activeCellNode && $(activeCellNode).hasClass('editable-row-header')){
                if (e.which == $.ui.keyCode.DELETE) { //Bug 25247802 - DELETE KEY DOESN'T WORK IN INPUT CELL 
                        return true
                }
            }
            trigger(self.onKeyDown, {
                row: activeRow,
                cell: activeCell
            }, e);
            var handled = e.isImmediatePropagationStopped();
            $smartList.hide();

            if (!handled) {
                if (e.ctrlKey) { //Handle Undo Ctrl+Z
                    if (e.which == KEY_CODE_Z) {
                        undo();
                    } else if (e.which == KEY_CODE_Y) {
                        redo();
                    } else if (e.which == KEY_CODE_A) {
                        $(container + " .slick-cell:not(.dummy):not(.header)").addClass('active');
                    }
                }
                // make into switch loop
                if (!e.shiftKey && !e.altKey) {
                    if (e.which == KEY_CODE_ESC) {
                        if (!getEditorLock().isActive()) {
                            return; // no editing mode to cancel, allow bubbling and default processing (exit without cancelling the event)
                        }
                        cancelEditAndSetFocus();
                    } else if (e.which == KEY_CODE_PAGE_DOWN) {
                        navigatePageDown();
                        handled = true;
                    } else if (e.which == KEY_CODE_PAGE_UP) {
                        navigatePageUp();
                        handled = true;
                    } else if (e.which == KEY_CODE_LEFT_ARROW) {
                        handled = navigateLeft(e.ctrlKey);
                    } else if (e.which == KEY_CODE_RIGHT_ARROW) {
                        handled = navigateRight(e.ctrlKey);
                    } else if (e.which == KEY_CODE_UP_ARROW) {
                        handled = navigateUp(e.ctrlKey);
                    } else if (e.which == KEY_CODE_DOWN_ARROW) {
                        handled = navigateDown(e.ctrlKey);
                    } else if (e.which == KEY_CODE_HOME) {
                        handled = navigateFirst(e.ctrlKey);
                    } else if (e.which == KEY_CODE_TAB) {
                        handled = navigateNext(e.ctrlKey);
                    } else if (e.which == KEY_CODE_SPACEBAR) {
                        $(activeCellNode).find('img').click();
                        if (!$(activeCellNode).hasClass('editable-row-header'))
                            handled = true;
                    } else if (e.which == KEY_CODE_ENTER) {
                        if (options.editable) {
                            if (currentEditor) {
                                // adding new row
                                if (activeRow === getDataLength()) {
                                    navigateDown();
                                } else {
                                    commitEditAndSetFocus();
                                }
                            } else {
                                if (getEditorLock().commitCurrentEdit()) {
                                    makeActiveCellEditable();
                                }
                            }
                        }
                        handled = true;
                    }
                } else if (e.which == KEY_CODE_TAB && e.shiftKey && !e.ctrlKey && !e.altKey) {
                    handled = navigatePrev();
                }
            }

            if (handled) {
                // the event has been handled so don't let parent element (bubbling/propagation) or browser (default) handle it
                e.stopPropagation();
                e.preventDefault();
                try {
                    e.originalEvent.keyCode = 0; // prevent default behaviour for special keys in IE browsers (F3, F5, etc.)
                }
                // ignore exceptions - setting the original event's keycode throws access denied exception for "Ctrl"
                // (hitting control key only, nothing else), "Shift" (maybe others)
                catch (error) {}
            }
        }

        function highlightSelectedCells(e, ctrlKey) {
            $smartList.hide();
            $contextMenu.hide();
            if (!ctrlKey) {
                $cells.removeClass('active selected slick-header-column-active');
                $('.ui-state-default.slick-header-column').removeClass("slick-header-column-active");
            }
            switch (getCurrentFocus()) {
                case REGION_OF_INTEREST_SELECTED.ROW_HEADER:
                    if (typeof $(e).attr("mbrinst") == "undefined") {
                        return
                    }
                    var mbrInst = $(e).attr("mbrinst").split(',');
                    var mbrInst_str = "";
                    var selection = [e];

                    for (var i = 0; i < mbrInst.length; i++) {
                        mbrInst_str += mbrInst[i];
                        //                        selection = $.merge(selection, $(container + " [mbrinst='" + mbrInst_str + "']"));
                        mbrInst_str += ",";
                    }
                    $.merge(selection, $(container + " [mbrinst*='" + mbrInst_str + "']"));
                    $.each(selection, function(a, b) {
                        $(b).addClass('selected');
                        $(container + " .row" + getRowFromNode(b.parentNode)).addClass('active'); // + ":not(.dummy)"
                    });
                    break;
                case REGION_OF_INTEREST_SELECTED.COLUMN_HEADER:
                    var $header = $(e).closest(".slick-header-column", ".slick-header-columns");
                    activeCellNode = $header[0];
                    // if (typeof $($header).attr("mbrinst") == "undefined") {
                    //     return
                    // }

                    // Making editable for adhoc grid
//                    if (options.gridType == IS_ADHOC_GRID && $header.attr('mbrinst')) {
//                        makeActiveCellEditable();
//                    }


                    var start = $header.closest(".slick-header").index() - 1;
                    var end = $(".slick-header").length - 1;
                    $header.addClass('selected');

                    $.each($header.data("column"), function(i, col) {
                        // $(container + " [col='" + col.id + "']").slice(start, end).addClass('selected');
                        // $(container + " [col='" + col.id + "']").addClass('selected');
                        $(container + " .slick-cell.l" + col.id).addClass('active'); // + ":not(.dummy)"
                        scrollCellIntoView(activeRow, col.id, false);
                        if (col.hashCodes) {
                            if (options.gridType == IS_DIM_EDITOR_GRID) {
                                $(container + " [mbrInst=" + col.hashCodes[0] + "]").addClass('selected');
                            } else {
                                $.each(col.hashCodes.slice(start, end), function(a, b) {
                                    $(container + " [mbrInst=" + b + "]").addClass('selected');
                                });
                            }
                        }
                    });
                    if ($('#rowHeaderScroller').length && $.contains($('#rowHeaderScroller')[0], $header[0])) {
                        let index = $header.index();
                        $('.slick-cell.hl' + index + '.header').addClass('active');
                    }
                    break;
                case REGION_OF_INTEREST_SELECTED.DATA_CELL:
                    $(e).addClass("active");
                    break
            }
        }

        function handleClick(e) {
            if (!currentEditor) {
                if (e.target != document.activeElement || $(e.target).hasClass("slick-cell")) {
                    setFocus();
                }
            }
            setCurrentFocus(e.target);
            highlightSelectedCells(e.target, e.ctrlKey);
            var cell = getCellFromEvent(e);
            if (cell == null || (currentEditor !== null && activeRow == cell.row && activeCell == cell.cell)) {
                return;
            }

            var isOnActiveCell = activeRow == cell.row && activeCell == cell.cell && activeCellNode == $(e.target)[0];

            if ($(e.target).is("img") && $(e.target.parentNode).hasClass("enum")) {
                var $input = $("<input placeholder='" + e.target.parentNode.textContent + "' list='adhoc_smartListArray' style='width: 95%;'/>").blur(function(e) {
                    $(e.target.parentNode).html(e.currentTarget.value + STR_ENUM_ICON);
                });
                $(e.target.parentNode).html($input[0]);
                return;
            } else if (typeof isOnActiveCell != 'undefined' && isOnActiveCell) {
                var c = getData()[activeRow][activeCell];
                if (c.types == DATA_TYPE_ENUMERATION && options.gridType == IS_DIM_EDITOR_GRID) {
                    column = columns[cell.cell];
                    var dimSmartLists = options.smartLists[cell.cell].split(",");
                    Model.DimensionEditorGrid.dimSmartListValArr.removeAll();
                    for (sl = 0; sl < dimSmartLists.length; sl++) {
                        Model.DimensionEditorGrid.dimSmartListValArr.push(dimSmartLists[sl]);
                    }
                    Model.DimensionEditorGrid.dimSmartListCell(cell);
                    Model.DimensionEditorGrid.dimSmartListVal(c.value);

                    columnName = headers.HspSlickColumnHeaders[0].members[cell.cell].displayName;
                    rule = getColumnCssRules(cell.cell);
                    widthpx = rule.right.style.width;
                    cellwidth = +widthpx.replace('px', '');
                    var cellNode = getCellNode(cell.row, cell.cell);
                    var bodyRect = document.body.getBoundingClientRect(),
                        cellRect = cellNode.getBoundingClientRect();
                    celly = cellRect.y - bodyRect.y;
                    cellx = cellRect.x;


                    if (ko.dataFor($smartList[0])) ko.dataFor($smartList[0]).selectedCellNode = e.target.parentNode;
                    $smartList.width(cellwidth);
                    $smartList
                        .show()
                        .offset({
                            top: celly,
                            left: cellx
                        });
                }
            }


            trigger(self.onClick, {
                row: cell.row,
                cell: cell.cell
            }, e);
            if (e.isImmediatePropagationStopped()) {
                return;
            }

            if (options.gridType == IS_HSF_GRID && $(e.target).hasClass('header')) {
                if (getRHData()[getActiveCell().row][0].acctTrack == null) {
                    if (getRHData()[getActiveCell().row][1] && getRHData()[getActiveCell().row][1].acctTrack != null) {
                        if (!((getRHData()[getActiveCell().row][1].status & IS_WRITABLE) != 0))
                            canHaveSubAcctDC(grid, getRHData()[getActiveCell().row][1].acctTrack, getActiveCell().cell, true);
                    }
                } else {
                    if (!((getRHData()[getActiveCell().row][0].status & IS_WRITABLE) != 0))
                        canHaveSubAcctDC(grid, getRHData()[getActiveCell().row][0].acctTrack, getActiveCell().cell, true);
                }
            }
        }

        function getValidationTooltip(e) {
            var $cell = $(e.target).closest(".slick-cell", $canvas);
            if ($cell.length === 0) {
                return ""
            }
            try {
                if ($cell.hasClass("active editable selected invalid")) {
                    if (currentEditor != null) {
                        if (!currentEditor.validate().valid) {
                            return " " + currentEditor.validate().msg;
                        }
                    }
                }
            } catch (ex) {}
            return "";
        }

        function getDimensionForCell(cell) {
            var index = cell.attr("mbrInst").split(",").length;
            var header;
            if (cell.hasClass("header")) {
                header = Model.planningGridJSON.headers.HspSlickRowHeaders[0];
            } else if (cell.hasClass("slick-header-column")) {
                header = Model.planningGridJSON.headers.HspSlickColumnHeaders[0];
            }
            while (index > 1) {
                header = header.subDimension
                index--;
            }
            return header.dimension;
        }

        function fireContextMenuEvent(pageY, pageX, evtObj) {
            trigger(self.onContextMenu, {
                top: pageY,
                left: pageX,
                row: activeRow,
                cell: activeCell,
                selectedCellNode: activeCellNode,
                selectedCell: cells[activeRow][activeCell]
            }, evtObj);
        }


        function handleContextMenu(e) {
            if (options.gridType != IS_ADHOC_GRID && options.gridType != IS_DIM_EDITOR_GRID && options.gridType != IS_HSF_GRID && options.gridType != IS_OPEN_XML_GRID) {
                return;
            }
            if (options.gridType == IS_HSF_GRID && $(e.target).is('div') && $(e.target).hasClass('slick-cell')) {
                makeActiveCellNormal(); //Bug 25495968 - GRID: ACCOUNT # FIELD REPLACED WITH DATA WHEN EDITING ACCOUNT NAME
                // $cells.removeClass("active selected");
                activeCellNode = e.target;
                //$(activeCellNode).addClass("active selected");
                activeRow = getRowFromNode(activeCellNode.parentNode);
                activeCell = activePosX = getCellFromNode(activeCellNode);
                //trigger(self.onActiveCellChanged, getActiveCell());
                if (options.gridType == IS_HSF_GRID && $(e.target).hasClass('header')) {
                    contextMenuTop = e.pageY;
                    contextMenuLeft = e.pageX
                    contextMenuEventObject = e;
                    if (options.gridType == IS_HSF_GRID)
                        if (getRHData()[getActiveCell().row][0].acctTrack == null) {
                            if (getRHData()[getActiveCell().row][1] && getRHData()[getActiveCell().row][1].acctTrack != null)
                                canHaveSubAcctDC(grid, getRHData()[getActiveCell().row][1].acctTrack, getActiveCell().cell);
                        } else {
                            canHaveSubAcctDC(grid, getRHData()[getActiveCell().row][0].acctTrack, getActiveCell().cell);
                        }
                    else
                        canHaveSubAcctDC(grid, activeRow, activeCell);
                } else {
                    //trigger(self.onContextMenu, {top:e.pageY,left:e.pageX,row:activeRow,cell:activeCell,selectedCellNode:activeCellNode,selectedCell:data[activeRow][activeCell]}, e);
                }
            }

            setCurrentFocus(e.target);
            activeCellNode = $(e.target).closest('.slick-cell')[0] || $(e.target).closest('.slick-header-column')[0];
            if (ko.dataFor($contextMenu[0])) ko.dataFor($contextMenu[0]).selectedCellNode = activeCellNode;
            $contextMenu.find("li").removeClass("oj-disabled");
            var contextItems;
            switch (getCurrentFocus()) {
                case REGION_OF_INTEREST_SELECTED.ROW_HEADER:
                    highlightSelectedCells(e.target, true);
                    if (options.gridType == IS_DIM_EDITOR_GRID) {
                        contextItems = $("#add-member-item, #insert-copy-member");
                    } else {
                        contextItems = $("#move-up-item, #move-down-item, #pivot-to-row");
                    }
                    trigger(self.onActiveCellChanged, getActiveCell());
                    break;
                case REGION_OF_INTEREST_SELECTED.COLUMN_HEADER:
                    if (options.gridType != IS_DIM_EDITOR_GRID) {
                        highlightSelectedCells(e.target.closest(".slick-header-column"), true);
                        contextItems = $("#move-left-item, #move-right-item, #pivot-to-column");
                    }
                    break;
                case REGION_OF_INTEREST_SELECTED.DATA_CELL:
                    if (options.gridType != IS_DIM_EDITOR_GRID) {
                        highlightSelectedCells(e.target.closest(".slick-header-column"), true);
                        activeRow = getRowFromNode(activeCellNode.parentNode);
                        activeCell = activePosX = getCellFromNode(activeCellNode);
                        trigger(self.onActiveCellChanged, getActiveCell());
                        if (ko.dataFor($contextMenu[0])) ko.dataFor($contextMenu[0]).selectedCell = cells[activeRow][activeCell];
                        contextItems = $("#edit-member-item, #adhoc-actions-item");
                    }
                    break;
                default:

                    break;
            }

            if (options.gridType != IS_DIM_EDITOR_GRID) {
                contextItems.addClass("oj-disabled");
            }

            var contextmenu_instance = $contextMenu.show().offset({
                top: e.pageY,
                left: e.pageX
            })
            if (contextmenu_instance.ojMenu) {
                contextmenu_instance.ojMenu("refresh");
            }

            e.preventDefault();
        }

        function handleDblClick(e) {
            var cell = getCellFromEvent(e);
            // var ord = null;
            // if ($(e.target).hasClass("header")) {
            //     var row = +$(e.target).closest(".slick-row").attr("row");
            //     ord = options.nCols * (numberOfRowHeaders + row) + $(e.target).index();
            // } else if ($(e.target).closest(".slick-header-column", ".slick-header-columns").length > 0) {
            //     ord = ($(e.target).closest(".slick-header.ui-state-default").index() - 1) * options.nCols + +$(e.target).closest(".slick-header-column", ".slick-header-columns").attr("col") + numberOfColumnHeaders;
            // }

            var $cell = $(e.target).closest(".slick-cell")[0] || $(e.target).closest(".slick-header-column")[0];
            if (options.gridType == IS_ADHOC_GRID && $($cell).attr("ord")) {
                let mainVM = options.form.view.main_vm;
                mainVM.doZoom("children", $($cell).attr("ord"));
            }

            if (!cell || (currentEditor !== null && activeRow == cell.row && activeCell == cell.cell)) {
                return;
            }

            trigger(self.onDblClick, {
                row: cell.row,
                cell: cell.cell
            }, e);
            if (e.isImmediatePropagationStopped()) {
                return;
            }

            if (options.editable) {
                if (options.gridType == IS_DIM_EDITOR_GRID && $(e.target).hasClass("header")) {
                    gotoHeaderCell(cell.row, cell.cell, true);
                } else {
                    gotoCell(cell.row, cell.cell, true);
                }
            }
        }

        function handleHeaderMouseEnter(e) {
            trigger(self.onHeaderMouseEnter, {
                "column": $(this).data("column")
            }, e);
        }

        function handleHeaderMouseLeave(e) {
            trigger(self.onHeaderMouseLeave, {
                "column": $(this).data("column")
            }, e);
        }

        function handleHeaderContextMenu(e) {
            var $header = $(e.target).closest(".slick-header-column", ".slick-header-columns");
            var column = $header && $header.data("column");
            trigger(self.onHeaderContextMenu, {
                column: column
            }, e);
        }


        function handleColumnHeaderClick(e) {
            setCurrentFocus(e.target);
            // DEPRECATED
            // koData = (typeof ko == 'undefined') ? null : ko.dataFor(e.target);
            // if (koData && koData.selectedCellNode) {
            //     koData.selectedCellNode = e.target;
            // }
            getEditorLock().commitCurrentEdit();
            highlightSelectedCells(e.target, e.ctrlKey);
        }

        // function handleMouseEnter(e) {
        //     trigger(self.onMouseEnter, {}, e);
        // }

        // function handleMouseLeave(e) {
        //     trigger(self.onMouseLeave, {}, e);
        // }

        function cellExists(row, cell) {
            return !(typeof row == "undefined" || typeof cell == "undefined" || row < 0 || row >= getDataLength() || cell < 0 || cell >= columns.length);
        }

        function getCellFromCellsIndex(cellsindex) {
            cellsindex = cellsindex.split('x');
            return getCells()[cellsindex[0]][cellsindex[1]];
        }

        function getCellFromPoint(x, y) {
            var row = getRowFromPosition(y);
            var cell = 0;

            var w = 0;
            for (var i = 0; i < columns.length && w < x; i++) {
                w += columns[i + numberOfColumnHeaders].width;
                cell++;
            }

            if (cell < 0) {
                cell = 0;
            }

            return {
                row: row,
                cell: cell - 1
            };
        }

        function getCellFromNode(cellNode) {
            // read column number from .l<columnNumber> CSS class
            var cls = /l\d+/.exec(cellNode.className);
            if (!cls) {
                throw "getCellFromNode: cannot get cell - " + cellNode.className;
            }
            return parseInt(cls[0].substr(1, cls[0].length - 1), 10);
        }

        function getRowFromNode(rowNode) {
            var isInDataGrid = $.contains($viewport[0], rowNode);
            var rowsCacheToUse = (isInDataGrid) ? rowsCache : rowsCache2
            for (var row in rowsCacheToUse) {
                if (rowsCacheToUse[row].rowNode === rowNode) {
                    return row | 0;
                }
            }

            return null;
        }

        function getCellFromEvent(e) {
            var $cell = $(e.target).closest(".slick-cell", $canvas);
            if (!$cell.length) {
                return null;
            }

            var row = getRowFromNode($cell[0].parentNode);
            var cell = getCellFromNode($cell[0]);

            if (row == null || cell == null) {
                return null;
            } else {
                return {
                    "row": row,
                    "cell": cell
                };
            }
        }

        function getCellNodeBox(row, cell) {
            /*if(rtl){
                return getCellNodeBoxRtl(row, cell);
            }*/
            if (!cellExists(row, cell)) {
                return null;
            }
            //changes done here for supporting row height
            var y1 = rowPositionCache[row].top - offset;
            var y2 = y1 + rowPositionCache[row].height - 1;

            var x1 = 0;
            for (var i = 0; i < cell; i++) {
                if (cellExists(row, i + numberOfColumnHeaders)) {
                    x1 += columns[i + numberOfColumnHeaders].width;
                }
            }
            var x2 = 0;
            if (cellExists(row, cell + numberOfColumnHeaders)) {
                x2 = x1 + columns[cell + numberOfColumnHeaders].width;
            }

            return {
                top: y1,
                left: x1,
                bottom: y2,
                right: x2
            };
        }

        //////////////////////////////////////////////////////////////////////////////////////////////
        // Cell switching

        function resetActiveCell() {
            setActiveCellInternal(null, false);
        }

        function setFocus() {
            if (tabbingDirection == -1) {
                $focusSink[0].focus();
            } else {
                $focusSink2[0].focus();
            }
        }

        function scrollCellIntoView(row, cell, doPaging, dir) {
            scrollRowIntoView(row, false);

            var colspan = getColspan(row, cell);
            var left = columnPosLeft[cell+2]-$viewport2.width(),
                right = columnPosRight[cell+2]-$viewport2.width(),
                scrollRight = $viewport.width();

            if (dir == "prev" && left < scrollLeft) {
                $viewport.scrollLeft(left);
                handleScroll();
                render();
            } else if (dir == "next" && right > scrollRight) {
                $viewport.scrollLeft(Math.min(left, right - $viewport[0].clientWidth));
                handleScroll();
                render();
            }


        }

        function setActiveCellInternal(newCell, opt_editMode, ctrlKey) {
            if (activeCellNode !== null) {
                if (!$(activeCellNode).hasClass("header")) {
                    makeActiveCellNormal();
                    if ($(activeCellNode).hasClass("enum")) {
                        $(activeCellNode).find('img').hide();
                    }
                    if (!ctrlKey) {
                        $cells.removeClass("active selected slick-header-column-active");
                    }
                    if (rowsCache[activeRow]) {
                        $(rowsCache[activeRow].rowNode).removeClass("active");
                    }
                }
            }


            var activeCellChanged = (activeCellNode !== newCell);
            activeCellNode = newCell;

            if (activeCellNode != null) {
                activeRow = getRowFromNode(activeCellNode.parentNode);
                activeCell = activePosX = getCellFromNode(activeCellNode);

                if (opt_editMode == null) {
                    opt_editMode = (activeRow == getDataLength());
                }

                $(activeCellNode).addClass("active");
                $(rowsCache[activeRow].rowNode).addClass("active");

                if (options.editable && opt_editMode &&  isCellPotentiallyEditable(activeRow, activeCell)  && cells[activeRow][activeCell].types !== DATA_TYPE_ENUMERATION) {
                    clearTimeout(h_editorLoader);

                    makeActiveCellEditable();
                    
                }
            } else {
                activeRow = activeCell = null;
            }

            if (activeCellChanged) {
                trigger(self.onActiveCellChanged, getActiveCell());
            }
        }

        function clearTextSelection() {
            if (document.selection && document.selection.empty) {
                try {
                    //IE fails here if selected element is not in dom
                    document.selection.empty();
                } catch (e) {}
            } else if (window.getSelection) {
                var sel = window.getSelection();
                if (sel && sel.removeAllRanges) {
                    sel.removeAllRanges();
                }
            }
        }

        function isCellPotentiallyEditable(row, cell) {
            var dataLength = getDataLength();
            // is the data for this row loaded?
            if (row < dataLength && !getDataItem(row)) {
                return false;
            }

            // are we in the Add New row?  can we create new from this cell?
            if (columns[cell].cannotTriggerInsert && row >= dataLength) {
                return false;
            }

            // does this cell have an editor?
            if (!getEditor(data[row][cell].types)) {
                return false;
            }

            if (((data[row][cell].status & IS_LOCKED) != 0)) {
                return false;
            }

            if (data[row][cell].types == DATA_TYPE_ENUMERATION && ((data[row][cell].status & WRITABLE) != 0)) {
                $(activeCellNode).find('img').show().css('display', 'inline-block');
                return false;
            }

            return true;
        }

        function makeActiveCellNormal() {

            if (!currentEditor) {
                return;
            }
            trigger(self.onBeforeCellEditorDestroy, {
                editor: currentEditor
            });
            currentEditor.destroy();
            currentEditor = null;

            if (activeCellNode) {
                // editable row header
                if ($(activeCellNode).hasClass('slick-header-column')) {
                    let cellValue = $(activeCellNode).data('column')[0].name[activeRow];
                    $(activeCellNode).find("span").text(cellValue);
                } else if ($(activeCellNode).hasClass('editable-row-header')) {
                    var c = RHdata[activeRow][activeCell];
                    var isHSFGrid_SecondRowHeader = (activeCell > 0 && options.gridType == IS_HSF_GRID);

                    // Don't add indenting and expand collapse to row headers if it's HSF grid's second row header column
                    var prevValStr = ''; //(isHSFGrid_SecondRowHeader) ? "" : stringRepeat(STR_PARENT_MEMBER_HEADER_INDENT, c.nL + 1);

                    if (c.hasChildren && !isHSFGrid_SecondRowHeader) {
                        prevValStr = (c.isExpanded) ?
                            prevValStr + "<img func='collapseExpand' src='" + IMGURL_EXPANDED + "'/>&nbsp" :
                            prevValStr + "<img func='collapseExpand' src='" + IMGURL_COLLAPSED + "'/>&nbsp";
                    }
                    activeCellNode.innerHTML = prevValStr + c.value;
                    $(activeCellNode).removeClass("editable invalid");
                    $(activeCellNode).find("img[func=collapseExpand]").bind("click", handleCollapseExpand);
                    // data cell
                } else if ($viewport.has($(activeCellNode)).length > 0) {
                    var d = getDataItem(activeRow);
                    $(activeCellNode).removeClass("editable invalid");
                    if (d) {
                        var currCell = cells[activeRow][activeCell];
                        var formatter = getFormatter(currCell.types);
                        activeCellNode.innerHTML = formatter(currCell.value, currCell);
                        invalidatePostProcessingResults(activeRow);
                    }
                }
            }

            // if there previously was text selected on a page (such as selected text in the edit cell just removed),
            // IE can't set focus to anything else correctly
            if (navigator.userAgent.toLowerCase().match(/msie/)) {
                clearTextSelection();
            }

            getEditorLock().deactivate(editController);
        }

        function makeActiveCellEditable(editor) {
            if (isReport && activeCell == 0) {
                return;
            }
            if (!activeCellNode) {
                return;
            }
            if (!options.editable) {
                throw "Grid : makeActiveCellEditable : should never get called when options.editable is false";
            }

            if ($(activeCellNode).hasClass('forecast-method')) {
                return;
            }

            // cancel pending async call if there is one
            clearTimeout(h_editorLoader);

            if ((data[activeRow][activeCell].status & READ_ONLY) || (!isCellPotentiallyEditable(activeRow, activeCell))) {
                return;
            }
            

            var columnDef, item, editorType, index;

            columnDef = columns[activeCell + numberOfColumnHeaders];
            item = getDataItem(activeRow);
            editorType = cells[activeRow][activeCell].types;
        

            if (isReport) { //for V1 reprots are readonly
                editorType = DATA_TYPE_UNSPECIFIED
            }

            if (trigger(self.onBeforeEditCell, {
                    row: activeRow,
                    cell: activeCell,
                    item: item,
                    column: columnDef
                }) === false) {
                setFocus();
                return;
            }

            getEditorLock().activate(editController);
            $(activeCellNode).addClass("editable");

            // don't clear the cell if a custom editor is passed through
            if (!editor) {
                activeCellNode.innerHTML = "";
            }

            // rule = getColumnCssRules(activeCell);
            // widthpx = rule.right.style.width;

            currentEditor = new(editor || getEditor(editorType))({
                grid: self,
                gridPosition: absBox($container[0]),
                position: absBox(activeCellNode),
                container: activeCellNode,
                column: columnDef,
                item: item || {},
                commitChanges: commitEditAndSetFocus,
                cancelChanges: cancelEditAndSetFocus,
                smartLists: (options.smartLists && options.smartLists.length > 0) ? options.smartLists : [],
                cellWidth: $(activeCellNode).width(),
                index: index,
                smartview: (options.form && options.form.app.smartViewXHRHandler.xmlElementsCache.grid.cells.vals) ? 
                    options.form.app.smartViewXHRHandler.xmlElementsCache.grid.cells.vals : null,
                scope: getCurrentFocus()
            });

            if (item) {
                currentEditor.loadValue(item);
            }

            serializedEditorValue = currentEditor.serializeValue();

            if (currentEditor.position) {
                handleActiveCellPositionChange();
            }

        }

        function commitEditAndSetFocus() {
            // if the commit fails, it would do so due to a validation error
            // if so, do not steal the focus from the editor
            if (getEditorLock().commitCurrentEdit()) {
                setFocus();
                if (!$(activeCellNode).hasClass("header")) {
                    navigateDown();
                }
            }
        }

        function cancelEditAndSetFocus() {
            if (getEditorLock().cancelCurrentEdit()) {
                setFocus();
            }
        }

        function absBox(elem) {
            var box = {
                top: elem.offsetTop,
                left: elem.offsetLeft,
                bottom: 0,
                right: 0,
                width: $(elem).outerWidth(),
                height: $(elem).outerHeight(),
                visible: true
            };
            box.bottom = box.top + box.height;
            box.right = box.left + box.width;

            // walk up the tree
            var offsetParent = elem.offsetParent;
            while ((elem = elem.parentNode) != document.body) {
                if (box.visible && elem.scrollHeight != elem.offsetHeight && $(elem).css("overflowY") != "visible") {
                    box.visible = box.bottom > elem.scrollTop && box.top < elem.scrollTop + elem.clientHeight;
                }

                if (box.visible && elem.scrollWidth != elem.offsetWidth && $(elem).css("overflowX") != "visible") {
                    box.visible = box.right > elem.scrollLeft && box.left < elem.scrollLeft + elem.clientWidth;
                }

                box.left -= elem.scrollLeft;
                box.top -= elem.scrollTop;

                if (elem === offsetParent) {
                    box.left += elem.offsetLeft;
                    box.top += elem.offsetTop;
                    offsetParent = elem.offsetParent;
                }

                box.bottom = box.top + box.height;
                box.right = box.left + box.width;
            }

            return box;
        }

        function getActiveCellPosition() {
            return absBox(activeCellNode);
        }

        function getGridPosition() {
            return absBox($container[0])
        }

        function handleActiveCellPositionChange() {
            if (!activeCellNode) {
                return;
            }

            trigger(self.onActiveCellPositionChanged, {});

            if (currentEditor) {
                var cellBox = getActiveCellPosition();
                if (currentEditor.show && currentEditor.hide) {
                    if (!cellBox.visible) {
                        currentEditor.hide();
                    } else {
                        currentEditor.show();
                    }
                }

                if (currentEditor.position) {
                    currentEditor.position(cellBox);
                }
            }
        }

        function getCellEditor() {
            return currentEditor;
        }

        function getActiveCell() {
            if (!activeCellNode) {
                return null;
            } else {
                return {
                    row: (typeof activeRow != "undefined") ? activeRow : null,
                    cell: (typeof activeCell != "undefined") ? activeCell : null
                };
            }
        }

        function getActiveCellViewIndexes() {
            return getActiveCell();
        }

        function getActiveCellDataIndexes() {
            if (!activeCellNode) {
                return null;
            } else {
                // in headers
                if ($.contains($viewport2, activeCellNode)) {
                    return {
                        row: (typeof activeCellNode != "undefined") ? +$(activeCellNode).attr('hrindex') : null,
                        cell: (typeof activeCellNode != "undefined") ? +$(activeCellNode).attr('hcindex') : null
                    }
                } else {
                    // in cells
                    var indexes = $(activeCellNode).attr('cellsindex').split('x').map(Number);
                    return {
                        row: indexes[0], 
                        cell: indexes[1]
                    }
                }
            }
        }

        function getActiveCellNode() {
            return activeCellNode;
        }

        //        function scrollRowIntoView(row, doPaging) {
        //            var rowAtTop = row * rowDefaults.height;
        //            var rowAtBottom = (row + 1) * rowDefaults.height - viewportH + (viewportHasHScroll ? scrollbarDimensions.height : 0);
        //
        //            // need to page down?
        //            if ((row + 1) * rowDefaults.height > scrollTop + viewportH + offset) {
        //                scrollTo(doPaging ? rowAtTop : rowAtBottom);
        //                render();
        //            }
        //            // or page up?
        //            else if (row * rowDefaults.height < scrollTop + offset) {
        //                scrollTo(doPaging ? rowAtBottom : rowAtTop);
        //                render();
        //            }
        //        }
        //
        //        function scrollRowToTop(row) {
        //            scrollTo(row * rowDefaults.height);
        //            render();
        //        }
        //changes done for scrollRowIntoView() & scrollRowToTop() for supporting row height
        function scrollRowIntoView(row, doPaging) {
            var rowAtTop = rowPositionCache[row].top;
            var rowAtBottom = rowPositionCache[row].bottom - viewportH + (viewportHasHScroll ? scrollbarDimensions.height : 0);

            // need to page down?
            if (rowPositionCache[row].bottom > scrollTop + viewportH + offset) {
                scrollTo(doPaging ? rowAtTop : rowAtBottom);
                render();
            }
            // or page up?
            else if (rowPositionCache[row].top < scrollTop + offset) {
                scrollTo(doPaging ? rowAtBottom : rowAtTop);
                render();
            }
        }

        function scrollRowToTop(row) {
            scrollTo(rowPositionCache[row].top);
            render();
            currentScrollCoordinates.y = $viewport[0].scrollTop;
        }

        function scrollPage(dir) {
            var deltaRows = dir * numVisibleRows;
            scrollTo((getRowFromPosition(scrollTop) + deltaRows) * rowDefaults.height);
            render();

            if (true && activeRow != null) {
                var row = activeRow + deltaRows;
                var dataLengthIncludingAddNew = getDataLength();
                if (row >= dataLengthIncludingAddNew) {
                    row = dataLengthIncludingAddNew - 1;
                }
                if (row < 0) {
                    row = 0;
                }

                var cell = 0,
                    prevCell = null;
                var prevActivePosX = activePosX;
                while (cell <= activePosX) {
                    if (canCellBeActive(row, cell)) {
                        prevCell = cell;
                    }
                    cell += getColspan(row, cell);
                }

                if (prevCell !== null) {
                    setActiveCellInternal(getCellNode(row, prevCell));
                    activePosX = prevActivePosX;
                } else {
                    resetActiveCell();
                }
            }
        }

        function navigatePageDown() {
            scrollPage(1);
        }

        function navigatePageUp() {
            scrollPage(-1);
        }

        function getColspan(row, cell) {
            var metadata = cells.getItemMetadata && cells.getItemMetadata(row);
            if (!metadata || !metadata.columns) {
                return 1;
            }

            var columnData = metadata.columns[columns[cell].id] || metadata.columns[cell];
            var colspan = (columnData && columnData.colspan);
            if (colspan === "*") {
                colspan = columns.length - cell;
            } else {
                colspan = colspan || 1;
            }

            return colspan;
        }

        function findFirstFocusableCell(row) {
            var cell = 0;
            while (cell < columns.length) {
                if (canCellBeActive(row, cell)) {
                    return cell;
                }
                cell += getColspan(row, cell);
            }
            return null;
        }

        function findLastFocusableCell(row) {
            var cell = 0;
            var lastFocusableCell = null;
            while (cell < columns.length - numberOfColumnHeaders) {
                if (canCellBeActive(row, cell)) {
                    lastFocusableCell = cell;
                }
                cell += getColspan(row, cell);
            }
            return lastFocusableCell;
        }

        function gotoRight(row, cell, posX) {
            if (cell >= columns.length) {
                return null;
            }

            do {
                cell += getColspan(row, cell);
            }
            while (cell < columns.length && !canCellBeActive(row, cell));

            if (cell < columns.length) {
                return {
                    "row": row,
                    "cell": cell,
                    "posX": cell
                };
            }
            return null;
        }

        function gotoLeft(row, cell, posX) {
            if (cell <= 0) {
                return null;
            }

            var firstFocusableCell = findFirstFocusableCell(row);
            if (firstFocusableCell === null || firstFocusableCell >= cell) {
                return null;
            }

            var prev = {
                "row": row,
                "cell": firstFocusableCell,
                "posX": firstFocusableCell
            };
            var pos;
            while (true) {
                pos = gotoRight(prev.row, prev.cell, prev.posX);
                if (!pos) {
                    return null;
                }
                if (pos.cell >= cell) {
                    return prev;
                }
                prev = pos;
            }
        }

        function gotoDown(row, cell, posX) {
            var prevCell;
            var dataLengthIncludingAddNew = getDataLength();
            while (true) {
                if (++row >= dataLengthIncludingAddNew) {
                    return null;
                }

                prevCell = cell = 0;
                while (cell <= posX) {
                    prevCell = cell;
                    cell += getColspan(row, cell);
                }

                if (canCellBeActive(row, prevCell)) {
                    return {
                        "row": row,
                        "cell": prevCell,
                        "posX": posX
                    };
                }
            }
        }

        function gotoUp(row, cell, posX) {
            var prevCell;
            while (true) {
                if (--row < 0) {
                    return null;
                }

                prevCell = cell = 0;
                while (cell <= posX) {
                    prevCell = cell;
                    cell += getColspan(row, cell);
                }

                if (canCellBeActive(row, prevCell)) {
                    return {
                        "row": row,
                        "cell": prevCell,
                        "posX": posX
                    };
                }
            }
        }

        function gotoFirst() {
            return {
                "row": activeRow,
                "cell": 0,
                "posX": 0
            }
        }

        function gotoNext(row, cell, posX) {
            if (row == null && cell == null) {
                row = cell = posX = 0;
                if (canCellBeActive(row, cell)) {
                    return {
                        "row": row,
                        "cell": cell,
                        "posX": cell
                    };
                }
            }

            var pos = gotoRight(row, cell, posX);
            if (pos) {
                return pos;
            }

            var firstFocusableCell = null;
            var dataLengthIncludingAddNew = getDataLength();
            while (++row < dataLengthIncludingAddNew) {
                firstFocusableCell = findFirstFocusableCell(row);
                if (firstFocusableCell !== null) {
                    return {
                        "row": row,
                        "cell": firstFocusableCell,
                        "posX": firstFocusableCell
                    };
                }
            }
            return null;
        }

        function gotoPrev(row, cell, posX) {
            if (row == null && cell == null) {
                row = getDataLength();
                cell = posX = columns.length - 1;
                if (canCellBeActive(row, cell)) {
                    return {
                        "row": row,
                        "cell": cell,
                        "posX": cell
                    };
                }
            }

            var pos;
            var lastSelectableCell;
            while (!pos) {
                pos = gotoLeft(row, cell, posX);
                if (pos) {
                    break;
                }
                if (--row < 0) {
                    return null;
                }

                cell = 0;
                lastSelectableCell = findLastFocusableCell(row);
                if (lastSelectableCell !== null) {
                    pos = {
                        "row": row,
                        "cell": lastSelectableCell,
                        "posX": lastSelectableCell
                    };
                }
            }
            return pos;
        }

        function navigateRight(ctrlKey) {
            return navigate("right", ctrlKey);
        }

        function navigateLeft(ctrlKey) {
            return navigate("left", ctrlKey);
        }

        function navigateDown(ctrlKey) {
            return navigate("down", ctrlKey);
        }

        function navigateUp(ctrlKey) {
            return navigate("up", ctrlKey);
        }

        function navigateNext(ctrlKey) {
            return navigate("next", ctrlKey);
        }

        function navigatePrev(ctrlKey) {
            return navigate("prev", ctrlKey);
        }

        function navigateFirst(ctrlKey) {
            return navigate("first", ctrlKey);
        }

        /**
         * @param {string} dir Navigation direction.
         * @return {boolean} Whether navigation resulted in a change of active cell.
         */
        function navigate(dir, ctrlKey) {

            if (!true) {
                return false;
            }

            if (!activeCellNode && dir != "prev" && dir != "next") {
                return false;
            }

            if (!getEditorLock().commitCurrentEdit()) {
                return true;
            }
            setFocus();

            var tabbingDirections = {
                "up": -1,
                "down": 1,
                "left": -1,
                "right": 1,
                "prev": -1,
                "next": 1,
                "first": 0
            };
            tabbingDirection = tabbingDirections[dir];

            var stepFunctions = {
                "up": gotoUp,
                "down": gotoDown,
                "left": gotoLeft,
                "right": gotoRight,
                "prev": gotoPrev,
                "next": gotoNext,
                "first": gotoFirst
            };

            let inDataColumnHeaders = $.contains($allHeaderScrollers[0], activeCellNode);
            let inRowHeaderColumnHeaders = (!isReport) ? $.contains($("#rowHeaderScroller")[0], activeCellNode) : false;
            let inRowHeaders = $.contains($viewport2[0], activeCellNode);

            if (inDataColumnHeaders || inRowHeaderColumnHeaders) {
                // Handle navigating on column headers
                if (dir == "next") {
                    if ($(activeCellNode).next().length) {
                        activeCellNode = $(activeCellNode).next()[0];
                        highlightSelectedCells(activeCellNode);
                        return true;
                    } else {
                        if (inRowHeaderColumnHeaders) {
                            activeCellNode = $(container + " [col='0']")[0];
                            highlightSelectedCells(activeCellNode);
                            return true;
                        } else {
                            activeCellNode = $('.slick-cell.header').first()[0];
                            setCurrentFocus(activeCellNode);
                            highlightSelectedCells(activeCellNode);
                            return true;
                        }
                    }
                } else if (dir == "prev") {
                    if (inDataColumnHeaders && +$(activeCellNode).prev().attr('col') < 0) {
                        activeCellNode = $("#rowHeaderScroller").children().children().last()[0];
                        highlightSelectedCells(activeCellNode);
                        return true;
                    } else {
                        activeCellNode = $(activeCellNode).prev()[0];
                        highlightSelectedCells(activeCellNode);
                        return true;
                    }
                }
            } else if (inRowHeaders) {
                // Handle navigating on row headers
                $cells.removeClass('active selected slick-header-column-active');
                if (dir == "prev") {
                    if ($(activeCellNode).prev().length) {
                        // goes to previous row header cell
                        activeCellNode = $(activeCellNode).prev()[0];
                        highlightSelectedCells(activeCellNode);
                        return true;
                    } else {
                        // jumps to previous row's last cell
                        if (activeCellNode == $('.slick-cell.header').first()[0]) {
                            activeCellNode = $allHeaderScrollers.children().children()[options.nCols];
                            setCurrentFocus(activeCellNode);
                            highlightSelectedCells(activeCellNode);
                            return true;
                        } else {
                            activeRow--;
                            dir = "next";
                            activeCell = options.nCols - numberOfColumnHeaders - 1;
                            activePosX = options.nCols - numberOfColumnHeaders - 1;
                        }
                    }
                } else if (dir == "next") {
                    if ($(activeCellNode).next().length) {
                        // goes to next row header cell
                        activeCellNode = $(activeCellNode).next()[0];
                        highlightSelectedCells(activeCellNode);
                        return true;
                    } else {
                        // goes to first data cell of row
                        dir = "prev";
                        activeCell = 1;
                        activePosX = 1;
                    }
                }
            } else {
                // Handle navigating in data cells
                if (dir == "prev" && activeCell == 0) {
                    let index = +$(activeCellNode).attr('cellsindex').split('x')[0];
                    activeCellNode = $('[hrindex="' + index + '"]').last()[0];
                    setCurrentFocus(activeCellNode);
                    highlightSelectedCells(activeCellNode);
                    return true;
                }
                if (dir == "next" && (activeCell == findLastFocusableCell(activeRow) || $(activeCellNode).hasClass("dummy") || $(activeCellNode).next().hasClass("dummy"))) {
                    activeRow++;
                    activeCellNode = $('[hrindex="' + activeRow + '"]').first()[0];
                    setCurrentFocus(activeCellNode);
                    highlightSelectedCells(activeCellNode);
                    return true;
                }
            }

            var stepFn = stepFunctions[dir];
            var pos = stepFn(activeRow, activeCell, activePosX);
            if (pos) {
                var isAddNewRow = (pos.row == getDataLength());
                scrollCellIntoView(pos.row, pos.cell, !isAddNewRow, dir);
                setActiveCellInternal(getCellNode(pos.row, pos.cell), null, ctrlKey);
                activePosX = pos.posX;
                return true;
            } else {
                setActiveCellInternal(getCellNode(activeRow, activeCell), null, ctrlKey);
                return false;
            }
        }

        function getCellNode(row, cell) {
            if (rowsCache[row]) {
                ensureCellNodesInRowsCache(row);
                return rowsCache[row].cellNodesByColumnIdx[cell];
            }
            return null;
        }

        function setActiveCell(row, cell) {
            if (!initialized) {
                return;
            }
            if (row > getDataLength() || row < 0 || cell >= columns.length || cell < 0) {
                return;
            }

            if (!true) {
                return;
            }

            scrollCellIntoView(row, cell, false);
            setActiveCellInternal(getCellNode(row, cell), false);
        }

        function canCellBeActive(row, cell) {
            if (!true || row >= getDataLength() ||
                row < 0 || cell >= columns.length || cell < 0) {
                return false;
            }

            var rowMetadata = cells.getItemMetadata && cells.getItemMetadata(row);
            if (rowMetadata && typeof rowMetadata.focusable === "boolean") {
                return rowMetadata.focusable;
            }

            var columnMetadata = rowMetadata && rowMetadata.columns;
            if (columnMetadata && columnMetadata[columns[cell].id] && typeof columnMetadata[columns[cell].id].focusable === "boolean") {
                return columnMetadata[columns[cell].id].focusable;
            }
            if (columnMetadata && columnMetadata[cell] && typeof columnMetadata[cell].focusable === "boolean") {
                return columnMetadata[cell].focusable;
            }

            return columns[cell].focusable;
        }

        function canCellBeSelected(row, cell) {
            if (row >= getDataLength() || row < 0 || cell >= columns.length || cell < 0) {
                return false;
            }

            var rowMetadata = cells.getItemMetadata && cells.getItemMetadata(row);
            if (rowMetadata && typeof rowMetadata.selectable === "boolean") {
                return rowMetadata.selectable;
            }

            var columnMetadata = rowMetadata && rowMetadata.columns && (rowMetadata.columns[columns[cell].id] || rowMetadata.columns[cell]);
            if (columnMetadata && typeof columnMetadata.selectable === "boolean") {
                return columnMetadata.selectable;
            }

            return columns[cell].selectable;
        }

        function gotoCell(row, cell, forceEdit) {
            if (!initialized) {
                return;
            }
            if (!canCellBeActive(row, cell)) {
                return;
            }

            if (!getEditorLock().commitCurrentEdit()) {
                return;
            }

            scrollCellIntoView(row, cell, false);

            var newCell = getCellNode(row, cell);

            // if selecting the 'add new' row, start editing right away
            setActiveCellInternal(newCell, forceEdit || (row === getDataLength()));

            // if no editor was created, set the focus back on the grid
            if (!currentEditor) {
                setFocus();
            }
        }

        function gotoHeaderCell(row, cell, forceEdit) {
            if (!initialized) {
                return;
            }
            if (!canCellBeActive(row, cell)) {
                return;
            }

            if (!getEditorLock().commitCurrentEdit()) {
                return;
            }

            scrollCellIntoView(row, cell, false);
            
            if (options.gridType == IS_DIM_EDITOR_GRID) {
                cellNode = $('#dimEditorGrid #row-header-viewport .slick-row .slick-cell[hrindex='+ row +']')[cell];
                var selection = [cellNode];
                mbrInst_str = $(cellNode)[0].attributes['mbrinst'].value;
                $.merge(selection, $(container + " [mbrinst*='" + mbrInst_str + "']"));
                $.each(selection, function(a, b) {
                    $(b).addClass('selected');
                    $(container + " .row" + getRowFromNode(b.parentNode) + ":not(.dummy)").addClass('active');
                });

                setActiveCellInternal(cellNode, forceEdit || (row === getDataLength()));
            }
        }

        //////////////////////////////////////////////////////////////////////////////////////////////
        // IEditor implementation for the editor lock

        function commitCurrentEdit() {
            var item = getDataItem(activeRow);
            var column = columns[activeCell];

            if (currentEditor) {
                if (currentEditor.isValueChanged()) {
                    var validationResults = currentEditor.validate();

                    if (validationResults.valid) {
                        if ($(activeCellNode).hasClass('slick-header-column')) {

                            currentEditor.applyValue($(activeCellNode).data("column"), currentEditor.serializeValue());
                            makeActiveCellNormal();

                        } else if (activeRow < getDataLength()) {
                            var editCommand = {
                                row: activeRow,
                                cell: activeCell,
                                editor: currentEditor,
                                serializedValue: currentEditor.serializeValue(),
                                prevSerializedValue: serializedEditorValue,
                                execute: function() {
                                    this.editor.applyValue(item, this.serializedValue);
                                    addToEditedCellsToCommit(activeCellNode, this.serializedValue);
                                    if (activeCellNode.attributes.cellsindex !== undefined) {
                                        makeCellDirty(activeCellNode);
                                        var index = activeCellNode.attributes.cellsindex.value.split('x');
                                        if (isNumeric(cells[index[0]][index[1]])) {
                                            doSpread(index[0], index[1], this.serializedValue, this.prevSerializedValue);
                                        }
                                    }
                                        
                                    updateRow(this.row);
                                    

                                    var cellDep, deps, cellValue;
                                    var cellTarget = item[activeCell].dep;
                                    var containerID = container;
                                    while (cellTarget) {
                                        cellTarget = cellTarget.split("#");
                                        cellDep = $("#" + cellTarget[1]).data("grid").getCellFromCellsIndex(cellTarget[0]);
                                        deps = $("#" + cellTarget[1]).data("grid").getOptions().formulaDependencies[cellTarget[0]];
                                        cellValue = processFormulaDependencies(cellDep, deps, containerID);
                                        cellDep.value = cellValue + "";
                                        $("#" + cellTarget[1] + " .slick-cell[cellsindex='" + cellTarget[0] + "']").text(cellValue);
                                        cellTarget = cellDep.dep;
                                        containerID = (cellTarget) ? "#" + cellTarget.split("#")[1] : "";
                                    }
                                },
                                undo: function() {
                                    this.editor.applyValue(item, this.prevSerializedValue);
                                    updateRow(this.row);
                                }
                            };
                            makeActiveCellNormal();
                            queueAndExecuteCommand(item, column, editCommand);

                            trigger(self.onCellChange, {
                                row: activeRow,
                                cell: activeCell,
                                item: item
                            });
                        } else {
                            var newItem = {};
                            currentEditor.applyValue(newItem, currentEditor.serializeValue());
                            makeActiveCellNormal();
                            trigger(self.onAddNewRow, {
                                item: newItem,
                                column: column
                            });
                        }

                        // check whether the lock has been re-acquired by event handlers
                        return !getEditorLock().isActive();
                    } else {
                        // Re-add the CSS class to trigger transitions, if any.
                        $(activeCellNode).removeClass("invalid");
                        $(activeCellNode).addClass("invalid");

                        trigger(self.onValidationError, {
                            editor: currentEditor,
                            cellNode: activeCellNode,
                            validationResults: validationResults,
                            row: activeRow,
                            cell: activeCell,
                            column: column
                        });

                        currentEditor.focus();
                        return false;
                    }
                }

                makeActiveCellNormal();
            }
            return true;
        }

        function cancelCurrentEdit() {
            makeActiveCellNormal();
            return true;
        }

        function rowsToRanges(rows) {
            var ranges = [];
            var lastCell = columns.length - 1;
            for (var i = 0; i < rows.length; i++) {
                ranges.push(new Slick.Range(rows[i], 0, rows[i], lastCell));
            }
            return ranges;
        }

        function getSelectedRows() {
            if (!selectionModel) {
                throw "Selection model is not set";
            }
            return selectedRows;
        }

        function setSelectedRows(rows) {
            if (!selectionModel) {
                throw "Selection model is not set";
            }
            selectionModel.setSelectedRanges(rowsToRanges(rows));
        }

        function addCSSRule(rule, sel, style) {
            $.each(rule,
                function(a, b) {
                    if (!isReport) {
                        if (runtimeStyleSheet)
                            runtimeStyleSheet.insertRule(sel + "{" + a + ":" + b + "!important;}", 0);
                        else
                            style.sheet.insertRule(sel + "{" + a + ":" + b + "!important;}", 0);
                    }
                }
            );
            return style;
        }

        function addToCellStyle(cellStyle, styleObj) {
            $.each(styleObj, function(a, b) {
                switch (a) {
                    case "rowspan":
                        cellStyle += "z-index:2;height:" + (b * defaults.rowHeight - PADDING_WIDTH) + "px;"
                        break;
                    case "cellStyle":
                        cellStyle += b;
                        break;
                    case "bgColor":
                        cellStyle += b;
                        break;
                    case "textRot":
                        cellStyle += b;
                        break;
                    case "fontId":
                        cellStyle += options.HspFontsMap[b];
                        break;
                    case "dataFormatString":
                        break;
                    default:
                        cellStyle += a + ":" + b + ";";
                }
            })
            return cellStyle;
        }

        // Accepts an array of cells in JSON format
        function updateGridFromDeltaResponse(deltaCells) {
            var cellIndex, r, c, cellValue;
            for (cellIndex in deltaCells) {
                r = cellIndex.split('x')[0];
                c = cellIndex.split('x')[1];
                if (r >= cells.length) {
                    continue;
                }
                cellValue = deltaCells[cellIndex] + "";
                cells[r][c].value = cellValue;
                cells[r][c].status |= IS_IMPACTED; // Bug 26102262 - CUSTOM DIM SUBS OF V1000 NOT CALCING PROPERLY, REQUIRES REFRESH. 
                makeCellAutoSaved(r, c);
            }
            invalidate(); 
            render();
        }

        function addToEditedCellsToCommit(cellNode, value) {
            if ($(cellNode).hasClass("editable-row-header"))
                setEditedHeaderCells(cellNode, value)
            else
                editedCellsToCommit[$(cellNode).attr("cellsindex")] = value;
        }

        function clearEditedCellsToCommit() {
            editedCellsToCommit = {};
            clearEditedHeaderCellsToCommit();
        }

        function clearEditedHeaderCellsToCommit() {
            editedHeaderCellsToCommit = {};
        }

        function makeCellDirty(cellNode) {
            var ind = cellNode.attributes.cellsindex.value.split('x');
            var row = ind[0];
            var col = ind[1];
            var cell = cells[row][col];
            if ((cell.status & IS_DIRTY) == 0 && !$(cellNode).hasClass('dirty')) {
                $(cellNode).css('background-color', '');
                $(cellNode).css('background', '');
                $(cellNode).addClass('dirty');
                cell.status += IS_DIRTY;
            }
        }

        function makeCellAutoSaved(rowIndex, colIndex) {
            if(data[rowIndex] && cells[rowIndex][colIndex]){
                var cell = cells[rowIndex][colIndex];
                var cellNode = $(container + " div[cellsindex='" + rowIndex + "x" + colIndex + "']")[0];
                if ((cell.status & IS_IMPACTED) == 0 && !$(cellNode).hasClass('impacted')) {
                    $(cellNode).css('background-color', '');
                    $(cellNode).css('background', '');
                    $(cellNode).addClass('impacted');
                    cell.status += IS_IMPACTED;
                }
            }
        }

        function undirtyDirtyCells() {
            $(container + ' .dirty').removeClass('dirty');
        }

        function getDataOriginCol() {
            return numberOfColumnHeaders;
        }

        function getDataOriginRow() {
            return numberOfRowHeaders;
        }

        function handleCollapseExpand(e) {
            activeCellNode = $(e.target).closest(".header")[0];
            activeRow = +$(activeCellNode).attr("hrindex");
            activeCell = +$(activeCellNode).attr("hcindex");
            if (options.gridType == IS_HSF_GRID) {
                $(e.target).closest('.header')[0].click();
            }
            var mbrInst = e.currentTarget.parentNode.attributes.mbrinst || e.currentTarget.parentNode.parentNode.attributes.mbrinst;
            if (mbrInst == undefined) {
                throw "couldn't find 'mbrInst' variable for member instances for the selected header";
            }
            mbrInst = mbrInst.value.split(',');
            var dim = findDimInDimensions(mbrInst.length, e.currentTarget.parentNode);
            findMemInMembers(mbrInst, dim.members);
            
            setColumns(columns);
            setSlideDown(true);
            invalidate();
            e.stopImmediatePropagation();
        }

        function findDimInDimensions(n, e) {
            var sDim = (e.className.indexOf("column") > 0) ?
                headers.HspSlickColumnHeaders[0] :
                headers.HspSlickRowHeaders[0];
            while (n > 1) {
                sDim = sDim.subDimension;
                n--;
            }
            return sDim;
        }

        function findMembersWithMbrInst(mbrInstances, members, dimId, parentMemberArr, isChild, parentMember) {
            for (var i = 0; i < members.length; i++) {

                for (var mbrI in members[i].mbrInstances) {

                    var currMbrInst = mbrInstances + "";
                    if (mbrI == currMbrInst) {
                        if (!parentMember)
                            parentMember = members[0];
                        var newMbrId = (members[i].mbrId + "_" + members.length);
                        pushToEnd = false;
                        if (currMbrInst == dimId) {
                            parentMember = members[0];
                            members = members[0].children;
                            pushToEnd = true;
                        }

                        if (isChild) {
                            parentMember = members[i];
                            members = members[i].children;
                            pushToEnd = true;
                        }
                        var mbrInstObj = {};
                        mbrInstObj[newMbrId] = 1;
                        var newMemberName = generateMemberName(parentMember.displayName);
                        var mbrObj = {
                            displayName: newMemberName,
                            mbrId: newMbrId,
                            children: [],
                            mbrInstances: mbrInstObj,
                            isNewMember: true
                        };

                        if (pushToEnd) {
                            members.push(mbrObj);
                        } else {
                            members.splice(i + 1, 0, mbrObj);
                        }
                        parentMemberArr.push(parentMember.displayName);
                        parentMemberArr.push(newMemberName);
                        return;
                    }
                }
                if (members[i].children.length > 0) {
                    findMembersWithMbrInst(mbrInstances, members[i].children, dimId, parentMemberArr, isChild, members[i]);
                }
            }
        }

        function removeNodeFromHeader(mbrInstances, members, parentMemberArr, parentMember, parentHierMbrInst) {
            for (var i = 0; i < members.length; i++) { // Sibling iteration
                for (var mbrI in members[i].mbrInstances) {
                    var currMbrInst = mbrInstances + "";
                    if (mbrI == currMbrInst) {
                        if (validateNodeFromHeader(parentHierMbrInst, [members[i]])) {
                            parentMemberArr.push(members[i]);
                            members.splice(i, 1);
                        }
                        return;
                    }

                }
                if (members[i].children.length > 0) {
                    removeNodeFromHeader(mbrInstances, members[i].children, parentMemberArr, members[i], parentHierMbrInst);
                }
            }
        }

        function validateNodeFromHeader(parentHierMbrInst, members) {
            var isValid = true;
            for (var i = 0; i < members.length; i++) { // Sibling iteration
                for (var mbrI in members[i].mbrInstances) {
                    var currMbrInst = parentHierMbrInst + "";
                    if (mbrI == currMbrInst) {
                        isValid = false;
                        return isValid;
                    }

                }
                if (members[i].children.length > 0) {
                    isValid = validateNodeFromHeader(parentHierMbrInst, members[i].children); //, parentHierMbrInst
                }
            }
            return isValid;
        }

        function addNodeToHeader(mbrInstances, members, parentMemberArr, parentMember) {
            for (var i = 0; i < members.length; i++) { // Sibling iteration
                for (var mbrI in members[i].mbrInstances) {
                    var currMbrInst = mbrInstances + "";
                    if (mbrI == currMbrInst) {
                        //parentMemberArr.push(members[i]);
                        //TODO handle if node is not expanded then should be added as children of node
                        //if (members[i].children.length > 0 && members[i].mbrInstances[mbrI] != 0){
                        //members.splice(i+1, 0, parentMemberArr);  //original code
                        for (var count = parentMemberArr.length - 1; count >= 0; count--) {
                            members[i].children.splice(0, 0, parentMemberArr[count]);
                        }
                        //}else{
                        //Add as child of this member
                        //}
                    }
                }
                if (members[i].children && members[i].children.length > 0) {
                    addNodeToHeader(mbrInstances, members[i].children, parentMemberArr, members[i]);
                }
            }
        }

        function generateMemberName(parentMemberName) {
            var members = getRowHeaders()[0].members;
            var newMemberName = "Untitled";
            while (isDuplicateObject(newMemberName, members)) {
                index = +newMemberName.substring(newMemberName.length - 1);
                if (!index)
                    index = 1;
                else
                    index++;
                newMemberName = "Untitled" + index;
            }
            return newMemberName;
        }

        function isDuplicateObject(memberName, members) {
            for (var i = 0; i < members.length; i++) {
                if (memberName == members[i].displayName) {
                    return true;
                }
                if (members[i].children.length > 0) {
                    retVal = isDuplicateObject(memberName, members[i].children);
                    if (retVal == true)
                        return true;
                }
            }
            return false;
        }


        function findMemInMembers(mbrInstances, members) {
            let status;
            for (var i = 0; i < members.length; i++) {

                if (members[i].children.length > 0) {

                    findMemInMembers(mbrInstances, members[i].children);
                    if (options.gridType == IS_HSF_GRID && members[i].mbrId == mbrInstances[0]) {
                        status = members[i].status ^ IS_COLLAPSED;
                        members[i].status = status;

                        // handle caching
                        (status == 0) ?
                        delete options.collapsedRowHeaderCache[mbrInstances]:
                            options.collapsedRowHeaderCache[mbrInstances] = members[i];
                        return;
                    }

                    for (var mbrI in members[i].mbrInstances) {
                        var currMbrInst = mbrInstances + "";
                        if (mbrI == currMbrInst) {
                            status = members[i].mbrInstances[mbrI] ^ IS_COLLAPSED;
                            members[i].mbrInstances[mbrI] = status;

                            // handle caching
                            (status == 0) ?
                            delete options.collapsedRowHeaderCache[mbrInstances]:
                                options.collapsedRowHeaderCache[mbrInstances] = members[i];
                            return;
                        }
                    }
                }
            }
        }

        function handleRowSelection(cell) {
            $cells.removeClass('active selected slick-header-column-active');

            var mbrInst = $(cell).attr("mbrInst").split(',');
            var mbrInst_str = "";
            var selection = [];

            for (var i = 0; i < mbrInst.length; i++) {
                mbrInst_str += mbrInst[i];
                selection = $.merge(selection, $(container + " [mbrInst='" + mbrInst_str + "']"));
                mbrInst_str += ",";
            }
            $.merge(selection, $(container + " [mbrInst*='" + mbrInst_str + "']"));
            $.each(selection, function(a, b) {
                $(b).addClass('selected');
                $(container + " .row" + getRowFromNode(b.parentNode) + ":not(.dummy)").addClass('active');
            });

        }

        function validateParameters(container, dimensions, cells, options) {
            if ($(container).length < 1) {
                throw new Error("SlickGrid requires a valid container, " + container + " does not exist in the DOM.");
            }

            if (Object.prototype.toString.call(cells) !== '[object Array]') {
                throw new Error("Invalid Cells JSON Structure");
            }

            var optionProps = ["PoundMissing", "accessibilityMode", "isSizeToFitColumns", "isSizeToFitRows", "minPrecision", "maxPrecision", "gridId",
                "HspStylesMap", "HspFontsMap", "HspBordersMap", "allowCustomFormatting", "minNumRows", "minNumCols", "row_height", "column_width", "columnWidthStates"
            ];
            for (var i in optionProps) {
                if (!options.hasOwnProperty(optionProps[i])) {
                    if (optionProps[i] == "allowCustomFormatting") {
                        options.allowCustomFormatting = true;
                    } else if (optionProps[i] == "gridType") {
                        options.gridType = IS_PLANNING_GRID; 
                    } else if (optionProps[i] == "PoundMissing") {
                        options.PoundMissing = "";
                    } else if (optionProps[i] == "minPrecision") {
                        options.minPrecision = 0;
                    } else if (optionProps[i] == "maxPrecision") {
                        options.maxPrecision = 0;
                    } else if (optionProps[i] == "HspStylesMap") {
                        options.HspStylesMap = {};
                    } else if (optionProps[i] == "HspFontsMap") {
                        options.HspFontsMap = {};
                    } else if (optionProps[i] == "HspBordersMap") {
                        options.HspBordersMap = {};
                    } else if (optionProps[i] == "smartLists") {
                        options.smartLists = [];
                    } else if (optionProps[i] == "poundOverride") {
                        options.poundOverride = false;
                    } else if (optionProps[i] == "accessibilityMode") {
                        options.accessibilityMode = false;
                    } else if (optionProps[i] == "isSizeToFitColumns") {
                        options.isSizeToFitColumns = false;
                    } else if (optionProps[i] == "isSizeToFitRows") {
                        options.isSizeToFitRows = false;
                    } else if (optionProps[i] == "row_height") {
                        options.row_height = ROW_HEIGHT_MEDIUM;
                    } else if (optionProps[i] == "column_width") {
                        options.column_width = COLUMN_WIDTH_MEDIUM;
                    } else if (optionProps[i] == "missingLabelText") {
                        options.missingLabelText = "";
                    } else if (optionProps[i] == "columnWidthStates") {
                        options.columnWidthStates = [];
                    }

                    console.log("Options field: '" + optionProps[i] + "' is missing");
                }
                if (optionProps[i] == "maxPrecision" && options.maxPrecision < 0) {
                    options.maxPrecision = 0;
                    console.log("max precision was set less than 0, set to 0 by default");
                }
            }
        }


        function updateClientCell(row, col, value, updateType, fromFloodFill, bgColor, tooltip) {
            var slickRow = row;
            var item = getDataItem(row);
            var column = columns[parseInt(col) + parseInt(numberOfColumnHeaders)];

            if (activeRow < getDataLength()) {
                var editCommand = {
                    row: activeRow,
                    cell: activeCell,
                    editor: currentEditor,
                    serializedValue: value,
                    prevSerializedValue: 0,
                    execute: function() {
                        if (this.editor == null) {
                            grid.editActiveCell();
                            this.editor = currentEditor;
                            if (this.editor == null) {
                                if (fromFloodFill) {
                                    grid.setActiveCell(row, col);
                                    if (currentEditor == null)
                                        makeActiveCellEditable();
                                    this.editor = currentEditor;
                                    if (this.editor == null)
                                        return;
                                } else {
                                    //return;
                                }
                            }
                        }
                        if (this.editor) {
                            this.editor.applyValueFromSpread(item, this.serializedValue, column);
                            if (updateType == "dirty" && options.gridType == IS_HSF_GRID) {
                                makeCellDirty(getCellNode(row, col));
                                addToEditedCellsToCommit(getCellNode(row, col), this.serializedValue);
                            }
                        } else {
                            item[column.field] = this.serializedValue;
                        }
                        updateRow(slickRow);
                    },
                    undo: function() {
                        this.editor.applyValue(item, this.prevSerializedValue);
                        updateRow(this.row);
                    }
                };
                editCommand.execute();

                trigger(self.onCellChange, {
                    row: activeRow,
                    cell: activeCell,
                    item: item
                });
            } else {
                var newItem = {};
                currentEditor.applyValue(newItem, currentEditor.serializeValue());
                //makeActiveCellNormal();
                trigger(self.onAddNewRow, {
                    item: newItem,
                    column: column
                });
            }

            return true;

        }

        function resizeRowHeaders(init) {
            var maxScrollWidth;
            var leftShift = -10;
            for (var i = 0; i < numberOfColumnHeaders; i++) {
                maxScrollWidth = (isReport) ? 25 : columns[i].width - 9;
                $(container + " .slick-cell.hl" + i + ".header").map(function(a, el) {
                    if (el.style.height || options.gridType == IS_HSF_GRID || isReport) return;
                    maxScrollWidth = Math.max(el.scrollHeight / defaults.rowHeight * 80, maxScrollWidth);
                });
                if (isReport) {
                    $(".slick-cell.hl" + i + ".header")
                }
                $(container + " .slick-header-column:eq(" + i + ")").width(maxScrollWidth);
                columns[i].width = maxScrollWidth;
                $(container + " .slick-cell.hl" + i + ".header")
                    .width(maxScrollWidth)
                    .css({
                        left: leftShift + 10
                    });
                leftShift += maxScrollWidth + 10;
            }
            viewport2Width = leftShift + 10;
        }

        function getCanvas() {
            return $canvas;
        }

        function getGridViewPort() {
            return $viewport;
        }

        function setRuntimeStyleSheet() {
            if (!runtimeStyleSheet) {
                for (var i in document.styleSheets) {
                    if (document.styleSheets[i].href && document.styleSheets[i].href.indexOf("slick-runtime-theme.css") != -1) {
                        runtimeStyleSheet = document.styleSheets[i];
                        break;
                    }
                }
            }
            if (isReport) {
                if (runtimeStyleSheet) {
                    runtimeStyleSheet.disabled = true;
                }
            } else {
                if (runtimeStyleSheet) {
                    runtimeStyleSheet.disabled = false;
                }
            }
        }

        function isReportMode() {
            return isReport;
        }


        function getArrayObjSize(arrObj) {
            var len = 0,
                key;
            for (key in arrObj) {
                if (arrObj.hasOwnProperty(key)) len++;
            }
            return len;
        }

        function processFormulaDependencies(cellDep, deps, containerID) {
            if (!deps.every(function(c) {
                    c = c.split('#');
                    return $("#" + c[1]).data("grid").getCellFromCellsIndex(c[0]).value !== "";
                })) {
                setTimeout(processFormulaDependencies.bind(null, cellDep, deps, containerID), 100);
            }
            try {
                var cellsRef = deps.map(function(c) {
                    c = c.split('#');
                    $("#" + c[1]).data("grid").getCellFromCellsIndex(c[0]).dep = cellDep.i + containerID;
                    return +$("#" + c[1]).data("grid").getCellFromCellsIndex(c[0]).value;
                });
                switch (cellDep.mbrFormula) {
                    case "SUM":
                        return cellsRef.reduce(function(a, b) {
                            return a + b;
                        });
                        break;
                }
            } catch (e) {
                console.log(e);
            }
        }

        function doSpread(row, col, value, prevValue) {
            if (options.hasOwnProperty('spreadMap') && !$.isEmptyObject(options.spreadMap)) {
                options.spreadMap.columns.find(function(map) {
                    var key = Object.keys(map)[0];
                    var spreadVal, i, spreadToIndex, cell, cellNode;
                    if (key == col) {
                        value = value / map[key].length + "";
                        for (i in map[key]) {
                            spreadToIndex = map[key][i];
                            cell = cells[row][spreadToIndex];
                            cell.value = value;
                            cellNode = $(container + " div[cellsindex='" + row + "x" + spreadToIndex + "']");
                            cellNode.text(cell.value);
                            makeCellDirty(cellNode[0]);
                        }
                    } else if (map[key].indexOf(+col) > 0) {
                        cell = cells[row][key];
                        value = value - prevValue;
                        cell.value = +cell.value + +value + "";
                        $(container + " div[cellsindex='" + row + "x" + key + "']").text(cells[row][key].value);
                    } else {
                        return;
                    }
                })
            }
        }

        function setCurrentFocus(e) {
            if ($container.has(e).length > 0) {
                if ($viewport.is(e) || $viewport.has(e).length > 0) {
                    currentFocus = REGION_OF_INTEREST_SELECTED.DATA_CELL;
                } else if ($viewport2.is(e) || $viewport2.has(e).length > 0) {
                    currentFocus = REGION_OF_INTEREST_SELECTED.ROW_HEADER;
                } else if ($(container + " .slick-header").is(e) || $(container + " .slick-header").has(e).length > 0 || $('#rowHeaderScroller').has(e)) {
                    currentFocus = REGION_OF_INTEREST_SELECTED.COLUMN_HEADER;
                } else {
                    currentFocus = REGION_OF_INTEREST_SELECTED.DEFAULT;
                }
            } else {
                currentFocus = REGION_OF_INTEREST_SELECTED.DEFAULT;
            }
        }

        function getCurrentFocus() {
            return currentFocus;
        }

        // below 2 functions are used for supporting row resize 
        function initializeRowPositions() {
            rowPositionCache = {
                0: {
                    top: 0,
                    height: rowDefaults.height,
                    bottom: rowDefaults.height
                }
            };
        }

        function setCollapsedRowHeaderCache(_collapsedRowHeaderCache) {
            options.collapsedRowHeaderCache = _collapsedRowHeaderCache;
        }

        function getCollapsedRowHeaderCache() {
            return options.collapsedRowHeaderCache;
        }

        function getCurrentViewCoordinates() {
            return currentScrollCoordinates;
        }

        function focusWithCoordinates(coordObj) {
            $viewport[0].scrollTop = coordObj.y;
            $viewport[0].scrollLeft = coordObj.x;
            handleScroll();
        }

        function getHeaderInfo() {
            return $headers;
        }

        function getRowHeaderCache() {
            return rowsCache2;
        }

        function getConstants(expression) {
            switch (expression) {
                case "DATA_TYPE_UNSPECIFIED":
                    return DATA_TYPE_UNSPECIFIED;
                case "DATA_TYPE_CURRENCY":
                    return DATA_TYPE_CURRENCY;
                case "DATA_TYPE_NONCURRENCY":
                    return DATA_TYPE_NONCURRENCY;
                case "DATA_TYPE_PERCENTAGE":
                    return DATA_TYPE_PERCENTAGE;
                case "DATA_TYPE_ENUMERATION":
                    return DATA_TYPE_ENUMERATION;
                case "DATA_TYPE_DATE":
                    return DATA_TYPE_DATE;
                case "DATA_TYPE_TEXT":
                    return DATA_TYPE_TEXT;
                case "DATA_TYPE_COLLAPSABLE":
                    return DATA_TYPE_COLLAPSABLE;
                case "DATA_TYPE_SELECT":
                    return DATA_TYPE_SELECT;
                case "DATA_TYPE_NONCURRENCY":
                    return DATA_TYPE_NONCURRENCY;
                case "DATA_TYPE_POUND_OVERRIDE":
                    return DATA_TYPE_POUND_OVERRIDE;
                case "IS_WRITABLE":
                    return IS_WRITABLE;
                case "IS_COLLAPSED":
                    return IS_COLLAPSED;
                case "IS_FORECAST_METHOD":
                    return IS_FORECAST_METHOD;
                case "IS_BOLD_HEADER":
                    return IS_BOLD_HEADER;
                case "READ_ONLY":
                    return READ_ONLY;
                case "WRITABLE":
                    return WRITABLE;
                case "IS_DIRTY":
                    return IS_DIRTY;
                case "IS_LOCKED":
                    return IS_LOCKED;
                case "HAS_COMMENT":
                    return HAS_COMMENT;
                case "FROM_SANDBOX":
                    return FROM_SANDBOX;
                case "IS_ACTUAL":
                    return IS_ACTUAL;
                case "IS_IMPACTED":
                    return IS_IMPACTED;
                case "IS_CALCULATED":
                    return IS_CALCULATED;
                case "IS_BOLD_DATA":
                    return IS_BOLD_DATA;
                case "HAS_SUPP_DETAIL":
                    return HAS_SUPP_DETAIL;
                case "IS_MISSING":
                    return IS_MISSING;
                case "HAS_ATTACH":
                    return HAS_ATTACH;
                case "HAS_FORMULA":
                    return HAS_FORMULA;
                case "IS_DRILLABLE":
                    return IS_DRILLABLE;
                case "IS_SCALAR":
                    return IS_SCALAR;
                default:
                    return null;
            }
        }

        function cacheRowPositions() {
            initializeRowPositions();
            for (var i = 0; i <= getDataLength(); i++) {
                var metadata = cells.getItemMetadata && cells.getItemMetadata(i);

                rowPositionCache[i] = {
                    top: (rowPositionCache[i - 1]) ?
                        (rowPositionCache[i - 1].bottom - offset) :
                        0,
                    height: (metadata && metadata.hasOwnProperty('rows') && metadata.rows[i]) ?
                        metadata.rows[i].height :
                        rowDefaults.height
                }

                rowPositionCache[i].bottom = rowPositionCache[i].top + rowPositionCache[i].height;
            }
        }
        
        function setSlideDown(slide){
            performSlideDown = slide;
        }

        function isSlideDown(){
            return performSlideDown;
        }
        

        function preprocess() {
            // attach defaults and 
            options = $.extend({}, defaults, options);

            // create columns object
            columns = createColumns();

            // create dummy cells to pad
            var difference = DEFAULT_NUM_ROWS - numberOfRows + numberOfColumnHeaders;

            if (difference > 0) {

                cells = cells.concat(new Array(difference).fill(new Array(numberOfColumns).fill(null)));

            }


            difference = DEFAULT_NUM_COLUMNS - numberOfColumns + numberOfRowHeaders;

            if (difference > 0) {
                
                for (let i = 0; i < cells.length; i++) {

                    cells[i] = cells[i].concat(new Array(difference).fill(null));
                    
                }

            }

        }

        //////////////////////////////////////////////////////////////////////////////////////////////
        // Public API

        $.extend(this, {
            "slickGridVersion": "2.1",

            // Events
            "onScroll": new Slick.Event(),
            "onSort": new Slick.Event(),
            "onHeaderMouseEnter": new Slick.Event(),
            "onHeaderMouseLeave": new Slick.Event(),
            "onHeaderContextMenu": new Slick.Event(),
            "onHeaderClick": new Slick.Event(),
            "onHeaderCellRendered": new Slick.Event(),
            "onBeforeHeaderCellDestroy": new Slick.Event(),
            "onHeaderRowCellRendered": new Slick.Event(),
            "onBeforeHeaderRowCellDestroy": new Slick.Event(),
            "onMouseEnter": new Slick.Event(),
            "onMouseLeave": new Slick.Event(),
            "onClick": new Slick.Event(),
            "onDblClick": new Slick.Event(),
            "onContextMenu": new Slick.Event(),
            "onKeyDown": new Slick.Event(),
            "onKeyUp": new Slick.Event(),
            "onAddNewRow": new Slick.Event(),
            "onValidationError": new Slick.Event(),
            "onViewportChanged": new Slick.Event(),
            "onColumnsResized": new Slick.Event(),
            "onCellChange": new Slick.Event(),
            "onBeforeEditCell": new Slick.Event(),
            "onBeforeCellEditorDestroy": new Slick.Event(),
            "onBeforeDestroy": new Slick.Event(),
            "onActiveCellChanged": new Slick.Event(),
            "onActiveCellPositionChanged": new Slick.Event(),
            "onDragInit": new Slick.Event(),
            "onDragStart": new Slick.Event(),
            "onDrag": new Slick.Event(),
            "onDragEnd": new Slick.Event(),
            "onSelectedRowsChanged": new Slick.Event(),
            "onCellCssStylesChanged": new Slick.Event(),
            "onMemberNameDrop": new Slick.Event(),

            // Methods
            "registerPlugin": registerPlugin,
            "unregisterPlugin": unregisterPlugin,
            "getColumns": getColumns,
            "setColumns": setColumns,
            "getColHeaders": getColHeaders,
            "getRowHeaders": getRowHeaders,
            "getColumnIndex": getColumnIndex,
            "updateColumnHeader": updateColumnHeader,
            "getOptions": getOptions,
            "setOptions": setOptions,
            "getData": getData,
            "getDataLength": getDataLength,
            "getDataItem": getDataItem,
            "setData": setData,
            "getSelectionModel": getSelectionModel,
            "setSelectionModel": setSelectionModel,
            "getSelectedRows": getSelectedRows,
            "setSelectedRows": setSelectedRows,
            "getContainerNode": getContainerNode,

            //custom methods
            "getDataOriginCol": getDataOriginCol,
            "getDataOriginRow": getDataOriginRow,

            "render": render,
            "invalidate": invalidate,
            "invalidateRow": invalidateRow,
            "invalidateRows": invalidateRows,
            "invalidateAllRows": invalidateAllRows,
            "updateCell": updateCell,
            "updateRow": updateRow,
            "getViewport": getVisibleRange,
            "getRenderedRange": getRenderedRange,
            "resizeCanvas": resizeCanvas,
            "updateRowCount": updateRowCount,
            "scrollRowIntoView": scrollRowIntoView,
            "scrollRowToTop": scrollRowToTop,
            "scrollCellIntoView": scrollCellIntoView,
            "getCanvasNode": getCanvasNode,
            "getCanvas2Node": getCanvas2Node,
            "focus": setFocus,

            "getCellFromPoint": getCellFromPoint,
            "getCellFromEvent": getCellFromEvent,
            "getCellFromCellsIndex": getCellFromCellsIndex,
            "getActiveCell": getActiveCell,
            "setActiveCell": setActiveCell,
            "getActiveCellNode": getActiveCellNode,
            "getActiveCellPosition": getActiveCellPosition,
            "resetActiveCell": resetActiveCell,
            "editActiveCell": makeActiveCellEditable,
            "getCellEditor": getCellEditor,
            "getCellNode": getCellNode,
            "getCellNodeBox": getCellNodeBox,
            "canCellBeSelected": canCellBeSelected,
            "canCellBeActive": canCellBeActive,
            "navigatePrev": navigatePrev,
            "navigateNext": navigateNext,
            "navigateUp": navigateUp,
            "navigateDown": navigateDown,
            "navigateLeft": navigateLeft,
            "navigateRight": navigateRight,
            "navigatePageUp": navigatePageUp,
            "navigatePageDown": navigatePageDown,
            "getValidationTooltip": getValidationTooltip,
            "gotoCell": gotoCell,
            "getHeaderRow": getHeaderRow,
            "getHeaderRowColumn": getHeaderRowColumn,
            "getGridPosition": getGridPosition,
            "flashCell": flashCell,
            "addCellCssStyles": addCellCssStyles,
            "setCellCssStyles": setCellCssStyles,
            "removeCellCssStyles": removeCellCssStyles,
            "getCellCssStyles": getCellCssStyles,
            "appendData": appendData,
            "appendRowHeaders": appendRowHeaders,
            "finishChunking": finishChunking,
            "getEditedCellsToCommit": getEditedCellsToCommit,
            "undirtyDirtyCells": undirtyDirtyCells,
            "getGridId": getGridId,
            "getHeaders": getHeaders,
            "getCells": getCells,
            "setHeaders": setHeaders,
            "setCells": setCells,
            // "getAllDimensions": getAllDimensions,
            "updateGridFromDeltaResponse": updateGridFromDeltaResponse,
            // "getMembersMap": getMembersMap,
            "findMembersWithMbrInst": findMembersWithMbrInst,
            "removeNodeFromHeader": removeNodeFromHeader,
            "addNodeToHeader": addNodeToHeader,
            "addToEditedCellsToCommit": addToEditedCellsToCommit,
            "setEditedCellsToCommit": setEditedCellsToCommit,
            "clearEditedCellsToCommit": clearEditedCellsToCommit,
            "getEditedHeaderCellsToCommit": getEditedHeaderCellsToCommit,
            "clearEditedHeaderCellsToCommit": clearEditedHeaderCellsToCommit,
            "getDimensionForCell": getDimensionForCell,
            "makeCellDirty": makeCellDirty,
            "init": finishInitialization,
            "destroy": destroy,
            "cacheRowPositions": cacheRowPositions, // for row height support
            "isGridDirty": isGridDirty,
            "updateClientCell": updateClientCell,
            "getConstants": getConstants,
            "isSlideDown":isSlideDown,
            "setSlideDown":setSlideDown,
            // IEditor implementation
            "getEditorLock": getEditorLock,
            "getEditController": getEditController,
            "getGridViewPort": getGridViewPort,
            "cellExists": cellExists,

            "getCanvas": getCanvas,
            "isReportMode": isReportMode,
            "handleRowSelection": handleRowSelection,
            "highlightSelectedCells": highlightSelectedCells,
            "getCurrentFocus": getCurrentFocus,
            "setCurrentFocus": setCurrentFocus,
            "findDimInDimensions": findDimInDimensions,
            "gotoHeaderCell": gotoHeaderCell,
            "onHeaderSelection": new Slick.Event(),
            "fireContextMenuEvent": fireContextMenuEvent,
            "getRowFromNode": getRowFromNode,
            "getCollapsedRowHeaderCache": getCollapsedRowHeaderCache,
            "setCollapsedRowHeaderCache": setCollapsedRowHeaderCache,
            "findMemInMembers": findMemInMembers,
            "getCurrentViewCoordinates": getCurrentViewCoordinates,
            "focusWithCoordinates": focusWithCoordinates,
            "getActiveCellViewIndexes": getActiveCellViewIndexes,
            "getActiveCellDataIndexes": getActiveCellDataIndexes,
            "getConstants": getConstants
        });
      
        init();
    }
}(jQuery));