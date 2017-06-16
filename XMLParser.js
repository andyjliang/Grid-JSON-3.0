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
		this.buildJSONData();

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
			"Data": null,
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

	// Build Data within the new JSON
	XMLParser.prototype.buildJSONData = function() {

		// Retrieve all the necessary SmartView array fields
		let vals = this.digestSmartViewArray("vals");
		let types = this.digestSmartViewArray("types");
		let statuses = this.digestSmartViewArray("status");
		let txts = this.digestSmartViewArray("txts");
		let dataFormat = this.digestSmartViewArray("dataFormat");
		let cellsColor = this.digestSmartViewArray("cellsColor");
		let cellsToolTip = this.digestSmartViewArray("cellsToolTip");
		let enumId = this.digestSmartViewArray("enumId");
		let dropDownId = this.digestSmartViewArray("dropDownId");

		let generations = this.digestSmartViewArray("generations");
		let parents = this.digestSmartViewArray("parents");


		// Get the width and height of the data matrix
		let numberOfColumns = this.JSON.Options.columns;
		let numberOfRows = this.JSON.Options.rows;

		// Get number of row and column headers 
		let numberOfColumnHeaders = this.JSON.Dimensions.ColumnDimensions.length;
		let numberOfRowHeaders = this.JSON.Dimensions.RowDimensions.length;

		// Create the matrix of objects
		this.JSON.Data = Array.apply(null, Array(numberOfRows)).map(function() {
            return Array.apply(null, Array(numberOfColumns)).map(function() {
                return null
            })
        });

		let data = this.JSON.Data;

		// Process Generation and Parent Hash Maps
		let generationsHashMap = this.generateHashMapFromDigestedArray(generations);
		let parentsHashMap = this.generateHashMapFromDigestedArray(parents, true, numberOfColumns, numberOfRowHeaders)

		// Set the variables for iterations
		let ordinal, isInRowHeader, isInColumnHeader, isInNonHeaderRegion, isInHeaderRegion, dataCell;

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
				
				data[rowIndex][columnIndex] = (isInHeaderRegion) ? 
					{
						val: vals[ordinal],
						txt: txts[ordinal]
					} :
					{
						val: vals[ordinal],
						type: types[ordinal],
						status: statuses[ordinal],
						txt: txts[ordinal],
						dataFormat: dataFormat[ordinal],
						cellsColor: cellsColor[ordinal],
						cellsToolTip: cellsToolTip[ordinal],
						enumId: enumId[ordinal],
						dropDownId: dropDownId[dropDownId]
					}


				// checker for if header data cell has generation or parent associated with it
				if (isInHeaderRegion) {

					// Set generation in 
					this.setHashMapMetadata(data[rowIndex][columnIndex], generationsHashMap, ordinal, "generation");

					this.setHashMapMetadata(data[rowIndex][columnIndex], parentsHashMap, ordinal, "parent");

				}

			}

		}
		
	}

	// Set metadata from hashmap
	XMLParser.prototype.setHashMapMetadata = function(dataCell, hashmap, ordinal, metadataName) {
		ordinal += 1;
		if (ordinal in hashmap) {
			dataCell[metadataName] = hashmap[ordinal];
		}
	}

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
			return this.xmlDocument.getElementsByTagName(fieldName)[0].attributes.item(attributeName).textContent;
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