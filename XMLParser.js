// XMLParser.js

(function($) {

    $.extend(true, window, {
        XMLParser: XMLParser
    });


	function XMLParser() {
		this.xmlDocument = null;
		this.JSON = null;
	}



	XMLParser.prototype.parse = function(xmlDocument) {
		// Verify that XML Document is not a SmartView exception before preceeding
		if (this.isXMLException(xmlDocument)) {
			throw "XML Parser: XML Document is an exception";
		}

		// Set XML Document to object and reset JSON
		this.xmlDocument = xmlDocument;
		this.resetJSON();

		// Build into fresh JSON
		this.buildJSONDimensions();
		this.buildJSONOptions();	
		this.buildJSONCells();

		// Finished JSON to return
		return this.JSON;
	}

	XMLParser.prototype.resetJSON = function() {
		// set with new fresh JSON
		this.JSON = {
			"Dimensions": {
				"ColumnDimensions":[],
				"RowDimensions":[],
				"POVDimensions":[]
			},
			"Cells": null,
			"Options": {}
		}
	}

	// Build Dimensions within the new JSON
	XMLParser.prototype.buildJSONDimensions = function() {
		let dimensions = this.JSON.Dimensions;

		let xmlDims = this.xmlDocument.getElementsByTagName("dims")[0].children;

		for (let i=0, xmlDimAttributes, tmpDimension, dimensionality; i < xmlDims.length; i++) {

			xmlDimAttributes = xmlDims[i].attributes;

			this.loopAttributesOrChildren(xmlDimAttributes, null, tmpDimension = {}, "attributes");
			

			if (xmlDimAttributes.pov) {

				dimensionality = "POVDimensions";

			} else if (xmlDimAttributes.row) {

				dimensionality = "RowDimensions";

			} else if (xmlDimAttributes.col) {

				dimensionality = "ColumnDimensions";

			}

			dimensions[dimensionality].push(tmpDimension);
		}
	}

	// Build Cells within the new JSON
	XMLParser.prototype.buildJSONCells = function() {

		// Retrieve all the necessary SmartView array fields
		let vals = this.digestSmartViewArray("vals");
		let types = this.digestSmartViewArray("types");
		let statuses = this.digestSmartViewArray("status");
		let txts = this.digestSmartViewArray("txts");
		let cellsFormat = this.digestSmartViewArray("dataFormat");
		let cellsColor = this.digestSmartViewArray("cellsColor");
		let cellsToolTip = this.digestSmartViewArray("cellsToolTip");
		let enumId = this.digestSmartViewArray("enumId");
		let dropDownId = this.digestSmartViewArray("dropDownId");

		let generations = this.digestSmartViewArray("generations");
		let parents = this.digestSmartViewArray("parents")
;

		// Get the width and height of the cells matrix
		let numberOfColumns = this.JSON.Options.numberOfColumns;
		let numberOfRows = this.JSON.Options.numberOfRows;

		// Get number of row and column headers 
		let numberOfColumnHeaders = this.JSON.Dimensions.ColumnDimensions.length;
		let numberOfRowHeaders = this.JSON.Dimensions.RowDimensions.length;

		// Create the matrix of objects
		this.JSON.Cells = Array.apply(null, Array(numberOfRows)).map(function() {
            return Array.apply(null, Array(numberOfColumns)).map(function() {
                return null
            })
        });

		let cells = this.JSON.Cells; // [][]

		// Process Generation and Parent Hash Maps
		// let generationsHashMap = this.generateHashMapFromDigestedArray(generations);
		// let parentsHashMap = this.generateHashMapFromDigestedArray(parents, true, numberOfColumns, numberOfRowHeaders)
		// debugger;
		// Set the variables for iterations
		let ordinal, isInRowHeader, isInColumnHeader, isInNonHeaderRegion, isInHeaderRegion, cell;

		// Iterate through whole matrix to populate each object with the SmartView array fields 
		for (let rowIndex = 0; rowIndex < numberOfRows; rowIndex++) {
			for (let columnIndex = 0; columnIndex < numberOfColumns; columnIndex++) {

				// Is in non header region, before column headers, and row header cells - which are dummy
				isInRowHeader = this.isInRowHeader(columnIndex, numberOfRowHeaders);
				isInColumnHeader = this.isInColumnHeader(rowIndex, numberOfColumnHeaders);

				isInNonHeaderRegion = isInRowHeader && isInColumnHeader;
				isInHeaderRegion = isInRowHeader || isInColumnHeader;

				if (isInNonHeaderRegion) {
					continue; 
				}

				ordinal = this.calculateOrdinal(rowIndex, columnIndex, numberOfColumns, numberOfRowHeaders, numberOfColumnHeaders);

				// check if is in header region
				
				cell = {
						val: vals[ordinal],
						type: +types[ordinal],
						status: statuses[ordinal],
						txt: txts[ordinal],
						cellsFormat: cellsFormat[ordinal],
						cellsColor: cellsColor[ordinal],
						cellsToolTip: cellsToolTip[ordinal],
						enumId: enumId[ordinal],
						dropDownId: dropDownId[dropDownId],
						ordinal: ordinal,
						rowIndex: rowIndex,
						columnIndex: columnIndex
					}


				if (isInColumnHeader) {
					cells[rowIndex][columnIndex] = new SlickColumnHeaderCell(cell);
				} else if (isInRowHeader) {
					cells[rowIndex][columnIndex] = new SlickRowHeaderCell(cell);
				} else {
					cells[rowIndex][columnIndex] = new SlickDataCell(cell);
				}

				


					// // Set generation in 
					// this.setHashMapMetacells(cells[rowIndex][columnIndex], generationsHashMap, ordinal, "generation");

					// this.setHashMapMetacells(cells[rowIndex][columnIndex], parentsHashMap, ordinal, "parent");

				

			}

		} 

		// post process generations and parents
		
		for (let i = 0, gen, indexes; i < generations.length; i++) {
			gen = generations[i].split('=');
			indexes = this.calculateMatrixIndex(gen[0], numberOfColumns);

			console.log(indexes)

			cells[indexes[0]][indexes[1]].generation = +gen[1];
		}

		for (let i = 0, par, parentIndexes, childIndexes; i < parents.length; i++) {
			par = parents[i].split('=');
			
			childIndexes = this.calculateMatrixIndex(par[0], numberOfColumns);
			parentIndexes = this.calculateMatrixIndex(par[1], numberOfColumns);

			cells[parentIndexes[0]][parentIndexes[1]].parent = cells[childIndexes[0]][childIndexes[1]];
			cells[childIndexes[0]][parentIndexes[1]].parent = cells[childIndexes[0]][childIndexes[1]];
		}
		
	}

	XMLParser.prototype.setHashMap = function(cells, hashmap) {
		
	}

	// Set metacells from hashmap
	// XMLParser.prototype.setHashMapMetacells = function(cell, hashmap, ordinal, metacellsName) {
	// 	ordinal += 1;
	// 	if (ordinal in hashmap) {
	// 		cell[metacellsName] = hashmap[ordinal];
	// 	}
	// }

	// Check if is in Column Header
	XMLParser.prototype.isInColumnHeader = function(rowIndex, numberOfColumnHeaders) {
		return rowIndex < numberOfColumnHeaders;
	}

	// Check if is in Row Header
	XMLParser.prototype.isInRowHeader = function(columnIndex, numberOfRowHeaders) {
		return columnIndex < numberOfRowHeaders;
	}

	// Generate HashMaps for Smartview Arrays that represents HashMaps
	XMLParser.prototype.generateHashMapFromDigestedArray = function(hashMapArray, isParentsArrayForExtraMapping, numberOfColumns, numberOfRowHeaders) {

		let hashmap = {}

		for (let i = 0, keyValue, key, value; i < hashMapArray.length; i++) {

			keyValue = hashMapArray[i].split("=");

			key = keyValue[0];

			value = keyValue[1];

			// Handling for if parents array to convert the parent value to matrix index
			if (isParentsArrayForExtraMapping) {
				value = this.ordinalToIndex(+value, numberOfColumns, numberOfRowHeaders);
			}

			hashmap[key] = value;
			
		}

		return hashmap;
	}

	// Retrieve SmartView field text content and split in array [String] => [Array]
	XMLParser.prototype.digestSmartViewArray = function(fieldName) {
		return this.getXMLElementByName(fieldName).split(/\|/);
	}

	// Convert Ordinals to Matrix Index
	XMLParser.prototype.ordinalToIndex = function(ordinal, numberOfColumns, numberOfRowHeaders) {
		ordinal += (numberOfRowHeaders - 1);
		let rowIndex = Math.round(ordinal/numberOfColumns);
		let columnIndex = ordinal%numberOfColumns;
		return [rowIndex, columnIndex];
	}

	// Calculate the ordinal to index the arrays within SmartView Arrays
	XMLParser.prototype.calculateOrdinal = function(rowIndex, columnIndex, numberOfColumns, numberOfRowHeaders, numberOfColumnHeaders) {
		return numberOfColumns * rowIndex + columnIndex - numberOfRowHeaders;
	}

	XMLParser.prototype.calculateMatrixIndex = function(ordinal, numberOfColumns) {
		return [Math.floor(ordinal/numberOfColumns), ordinal%numberOfColumns];
	}

	// Build Options within the new JSON
	XMLParser.prototype.buildJSONOptions = function() {
		let options = this.JSON.Options;

		// Filling for the properties and name section
		this.buildMapFromXMLElement("properties", options, "attributes");
		this.buildMapFromXMLElement("name", options, "attributes");

		// Filling for the grid section
		options["cube"] = this.getXMLElementByName("cube");
		options["gridType"] = this.getXMLElementByName("gridType");
		options["columns"] = +this.getXMLElementByName("slice", "cols");
		options["rows"] = +this.getXMLElementByName("slice", "rows");

		// TODO handling for spreading
		// options["spreading"] = this.getXMLElementByName("spreading");

		// Filling for the preferences section
		this.buildMapFromXMLElement("preferences", options, "children");

		this.JSON.Options = new SlickOptions({
			formId: options.name.formId,
			cube: options.cube,
			formatSetting: options.preferences.FormatSetting.val,
			errorLabelText: options.preferences.errorLabelText.val,
			isPageMemberIndent: (options.preferences.pageMemberIndent.val == "0"),
			isRepeatMemberLabelsInForms: (options.preferences.repeatMemberLabelsInForms.val == "0"),
			isMassAllocate: (options.properties.massAllocate == "0"),
			formName: options.name.displayName,
			numberOfColumns: options.columns,
			numberOfRows: options.rows,
			gridType: +options.gridType,
			maxPrecision: 0,
			minPrecision: 0,
			aliasTableName: options.preferences.val
		})
	}

	// Check if XML response is an exception
	XMLParser.prototype.isXMLException = function(xmlDocument) {
		return xmlDocument.getElementsByTagName('exception').length > 0;
	}

	// Has Field from XML Document
	XMLParser.prototype.hasXMLElementByName = function(fieldName) {
		return this.xmlDocument.getElementsByTagName(fieldName).length > 0;
	}

	// Get Field from XML Document
	XMLParser.prototype.getXMLElementByName = function(fieldName, attributeName) {
		if (this.xmlDocument == null) {
			throw "XML Parser: No XML Document set";
		}

		// Return null if no field name exists for the XML document 
		if (!this.hasXMLElementByName(fieldName)) {
			throw "XML Parser: No XML tag found for " + fieldName;
			return null;
		}

		// If there is attribute name passed, look for the attribute text content within that field
		if (attributeName) {
			return this.xmlDocument.getElementsByTagName(fieldName)[0].attributes[attributeName].textContent;
		}

		return this.xmlDocument.getElementsByTagName(fieldName)[0].textContent;
	}

	// Build Object Map from XML Document
	XMLParser.prototype.buildMapFromXMLElement = function(fieldName, container, subField) {

		if (this.hasXMLElementByName(fieldName)) {

			container[fieldName] = {};

			let elements = this.xmlDocument.getElementsByTagName(fieldName)[0][subField];

			this.loopAttributesOrChildren(elements, fieldName, container[fieldName] , subField);

				
		}
	};

	// Reusable looper for XML attributes and children to map to container object
	XMLParser.prototype.loopAttributesOrChildren = function(elements, fieldName, container, subField) {
		
		for (let i=0, el; i < elements.length; i++) {

			el = elements[i];

			if (subField == "attributes")
				container[el.name] = el.value;
			else {
				this.buildMapFromXMLElement(el.nodeName, container, "attributes");
			}
		}

	}

	// Getter for building JSON 
	XMLParser.prototype.getJSON = function() {
		return this.JSON;
	}

	// Getter for XML document
	XMLParser.prototype.getxmlDocument = function() {
		return this.xmlDocument;
	}

}(jQuery));