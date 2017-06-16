TDD Development of Grid JSON 3.0 

Using QUnit to test XMLParser, new JSON structure, and thereafter slick grid usage. 

Need to test build.

	1) Test XML Parser

		- Test Parser Base Properties

			-- parser should get and set the XMLDocument, that should always be immutable

			-- parser should only get JSON but never directly set JSON. As JSON should only be built from the xmldocument

			-- resetJSON should reset the JSON 

			-- will throw error when the xml document encodes a "exception" tag

		- Test Parser building of the JSON

			-- buildJSONDimensions() should build up the arrays in Dimensions

				--- ...

			-- buildJSONOptions() should build up the hash maps in options

				--- ...

			-- buildJSONData() should build up the matrix in data

				--- ...

	2) Test Slick Grid Base

		- Test Constructor

			-- parameters defined and accessible

			-- parameters should never be mutated, only copied to be transformed

		- Test Preprocessing of JSON

			-- grid flags are set based on options 

				--- gridtype is used to map to what grid is what

				--- ...

			-- grid global variables set, some differentiated to determine which referenced to view and to model (below example being respectively, the model's original number of columns, and current view's number of columns)

				--- model_numberOfColumns 

				--- view_numberOfColumns 

				--- ...

			-- verify options set, and set defaults if needed e.g. grid type, precision

	3) Test Slick Grid Render
		
		- top Render call calls render column headers, render row headers, and render data

			-- render column headers

				--- do 1x1 no parents

				--- do 1x1 with parents top down

				--- do 1x1 with parents bottom up

				--- icon is used for parents

				--- do 2x2 no parents

				--- colspan-ness used for parent dimension segements

				--- ...

			-- render row headers

				--- do 1x1 no parents

				--- do 1x1 with parents top down

				--- do 1x1 with parents bottom up

				--- indents used for levels deepness

				--- icon is used for parents

				--- do 2x2 no parents

				--- rowspan-ness used for parent dimension segements


				--- ...

			--- render data cells

				--- do with text datatype

				--- do with numeric datatype

				--- do without any statuses

				--- do with non-trivial statuses

				--- ...


	4) Test Slick Grid Event Listeners

		- Cell Listeners are binded

			-- click

			-- scroll

			-- dblclick

			-- contextmenu

			-- key navigation

			-- listeners rebinded after grid rerender

		==================================

		**** these are tested manually ****
		===================================

		- On click on headers give highlighted section on cells

		- On double click on headers give highlighted section on cells

		- On contextmenu on headers give highlighted section on cells

		- On scroll header spans should be seen despite the respective header cell text gone

		- Column Listeners are binded

			-- column resize on any column 

			-- column resize rebind after rerender

			-- resize doesn't break viewport/scrolling

		- (!Not Implemented yet) Row Listeners are binded

			-- row resize on any column 

			-- row resize rebind after rerender

			-- resize doesn't break viewport/scrolling


	5) Test Slick Grid Cell Formatting

		- Editable Cells are editable

			-- for text cells, any input value is kept on click away or tab out

			-- for numeric cells, any input value is kept on click away or tab out, but also formatted

				--- percentage handled

				--- precision handled

				--- decimal separator handled

				--- thousand separator handled

				--- ... (smart lists, spreading)

		- Read only cells are non editable
			

	6) Test Plugins

		- Overlays

			 -- ....

		- Copy and Paste