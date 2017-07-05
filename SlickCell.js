(function($) {

    $.extend(true, window, {
        SlickCell: SlickCell, 
        SlickRowHeaderCell: SlickRowHeaderCell,
        SlickColumnHeaderCell: SlickColumnHeaderCell,
        SlickDataCell: SlickDataCell,
        SlickDimension: SlickDimension,
        SlickOptions: SlickOptions,
        SlickStatistics: SlickStatistics
    });
	
	function SlickCell(params) {

		this.rowIndex = params.rowIndex;
		this.columnIndex = params.columnIndex;
		this.value = params.val;
		this.status = params.status; // cell's metadata e.g. is read orly or is sandbox
		this.dataType = params.type;  // cell's datatype e.g. currency vs text
		this.displayText = params.txt; // using Alias or so
		this.enumerationId = params.enumerationId; // used to map to enumerations
		this.rowIndex = params.rowIndex;
		this.columnIndex = params.columnIndex;
		this.color = params.color;
		this.toolTip = params.toolTip;
		this.dropDownId = params.dropDownId;
		this.cellsFormat = params.cellsFormat;
	}

	SlickCell.prototype.calculateOrdinal = function() {
		// get ordinal from row and column index
	}

	SlickCell.prototype.isReadOnly = function() {
		// return (this.status & READ_ONLY) != 0;
	}

	SlickCell.prototype.setReadOnly = function() {
		// get ordinal from row and column index
	}


	function SlickRowHeaderCell(params) {
		SlickCell.call(this, params)
		this.parent = params.parent; 
		this.children = params.children;
		this.generation = params.generation;
		this.spreading = params.spreading;
		this.isExpanded = params.isExpanded;
	}
	SlickRowHeaderCell.prototype = Object.create(SlickCell.prototype);
	SlickRowHeaderCell.prototype.constructor = SlickRowHeaderCell;

	SlickRowHeaderCell.prototype.calculateRowSpan = function() {
		// calc row span
		this.rowSpan = 1;
	}

	function SlickColumnHeaderCell(params) {
		SlickCell.call(this, params)
		this.parent = params.parent; 
		this.children = params.children;
		this.generation = params.generation;
		this.spreading = params.spreading;
		this.isExpanded = params.isExpanded;
	}
	SlickColumnHeaderCell.prototype = Object.create(SlickCell.prototype);
	SlickColumnHeaderCell.prototype.constructor = SlickColumnHeaderCell;

	SlickColumnHeaderCell.prototype.calculateColumnSpan = function() {
		// calc column span
		this.columnSpan = 1;
	}

	function SlickDataCell(params) {
		SlickCell.call(this, params)
	}
	SlickDataCell.prototype = Object.create(SlickCell.prototype);
	SlickDataCell.prototype.constructor = SlickDataCell;


	SlickDataCell.prototype.populateCellMetaData = function() {
		// flesh out slick cell's metadata from the status bit descriptor used originally in boris's xml 

	};

	function SlickDimension(params) {
		this.displayName = params.displayName;
		this.dimensionId = params.dimensionId;
		this.isHierarchyStartExpanded = params.isHierarchyStartExpanded;
		this.isFormulaPresent = params.isFormulaPresent;
		this.isDimensionHidden = params.isDimensionHidden;
		this.dimensionName = params.dimensionName;
		this.axis = params.axis;
		this.type = params.type;
	}

	function SlickOptions(params) {

		// immutable 
		this.formId = params.formId;
		this.cube = params.cube;
		this.formatSetting = params.formatSetting // not sure if should be mutable
		this.errorLabelText = params.errorLabelText;
		this.isPageMemberIndent = params.isPageMemberIndent;
		this.isRepeatMemberLabelsInForms = params.isRepeatMemberLabelsInForms;
		this.isMassAllocate = params.isMassAllocate;

		// mutable by setters
		this.formName = params.formName;
		this.numberOfColumns = params.numberOfColumns; 
		this.numberOfRows = params.numberOfRows;
		this.gridType = params.gridType; // done e.g. through ad hoc analysis or save as smart form
		this.maxPrecision = params.maxPrecision;
		this.minPrecision = params.minPrecision;
		this.aliasTableName = params.aliasTableName;
		
	}

	function SlickStatistics(params) {

	}




}(jQuery)); 