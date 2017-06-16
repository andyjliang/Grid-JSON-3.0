//tests.js


QUnit.module('XML Parser Base', () => {

	QUnit.module('XML Parsing Staging', () => {

		QUnit.test('Exported XMLParser to window', (assert) => {

			debugger;

			assert.ok(window.XMLParser, "XML Parser constructor in window")
			
			assert.ok(typeof window.XMLParser === "function", "XML Parser constructor callable")
			
			assert.ok(window.XMLParser.prototype.validateIsNotException, "XML Parser validateIsNotException is callable")
			
			assert.ok(window.XMLParser.prototype.getXMLElementByName, "XML Parser getXMLElementByName is callable")
			
			assert.ok(window.XMLParser.prototype.getJSON, "XML Parser getJSON is callable")
			
			assert.ok(window.XMLParser.prototype.getXMLDocument, "XML Parser getXMLDocument is callable")
		
		})

	});

});

QUnit.module('XML Parse to JSON', (hooks) => {

	// SET UP 
	// Need XML Document file for parsers
	hooks.before(() => {
		// Do stuff here if need for more global
	});

	QUnit.module('Parsing Options HashMap', (hooks) => {
		
		hooks.before(() => {

			var json;
			// Create Parser
			var parser = new window.XMLParser();

			// Get JSON 
			ajax = $.ajax({
				url: "xmls/form.xml", 
				success: function(xmlDocument) {
					json = parser.parse(xmlDocument);
				}
			});

		})

		QUnit.test('Parsed cellsURLs(?), gridSpreader, and massAllocate', (assert) => {
			//TODO
		})

		QUnit.skip('Parsed Form Name & ID', () => {
			//TODO
		})

		QUnit.skip('Parsed Cube', () => {
			//TODO
		})

		QUnit.skip('Parsed Grid Type', () => {
			//TODO
		})

		QUnit.skip('Parsed Preferences', () => {
			//TODO
		})

		QUnit.skip('Parsed Number of Columns', () => {
			//TODO
		})

		QUnit.skip('Parsed Number of Rows', () => {
			//TODO
		})

		QUnit.skip('Parsed Grid Type', () => {
			//TODO
		})

		QUnit.skip('Parsed Spreading hashmap', () => {
			//TODO
		})

	});

	QUnit.module('Parsing All Dimensions into Object Arrays', () => {
		
		QUnit.skip('Base Dimensions parameter has the POV, Row, Column, sub-object structure', () => {
			//TODO
		})

		QUnit.skip('Parsed attributes: display, expand, formula, hidden, id, name, and type - into perspective dimension', () => {
			//TODO
		})
	});

	QUnit.module('Parsing Grid Matrix', () => {
		
		QUnit.skip('Base Data paramter has matrix datastructure', () => {
			//TODO
		})

		QUnit.skip('Compile cells with cell metadata ', () => {
			//TODO
		})

	});

})

