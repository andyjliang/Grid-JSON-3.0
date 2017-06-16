/***
 * Contains basic SlickGrid editors.
 * @module Editors
 * @namespace Slick
 */

var R_EXP_ARRAY = [new RegExp("ADD","i"), new RegExp("SUB","i"),new RegExp("Subtract","i"),new RegExp("PER","i"),new RegExp("Percent","i"),new RegExp("INC","i"),new RegExp("Increase","i"),new RegExp("DEC","i"),new RegExp("Decrease","i"),
new RegExp("POW","i"),new RegExp("Power","i"),new RegExp("GR","i")];
var OPERATIONS = ["ADD","SUB","Subtract","PER","Percent","INC","Increase","DEC","Decrease","POW","Power","GR"];
        
(function ($) {
  // register namespace
  $.extend(true, window, {
    "Slick": {
      "Editors": {
        "Text": TextEditor,
        "Integer": IntegerEditor,
        "Float": FloatEditor,
        "Date": DateEditor,
        "LongText": LongTextEditor,
        "SelectEditor": SelectCellEditor
      }
    }
  });
  
  function getValueFromDataType(type,value){
      if(type=="float")
        value=value.toString();
      if(jQuery.type(value) === "string" && type=="float"){
        if (NEGATIVE_STYLE == PREF_NEGATIVE_REVERSE && value.slice(-1) === "-") {
            value = "-" + value;
        } else if (NEGATIVE_STYLE == PREF_NEGATIVE_PARENS && (value[0] === "(" && value.slice(-1) === ")")) {
            value = "-" + value.slice(1,value.length-1);
        }
        if((THOUSANDS_SEPARATOR == PREF_THOUSANDS_COMMA) && (value.indexOf(',')>0)){
            value = value.replace(/,/g,'');
        }else if((THOUSANDS_SEPARATOR == PREF_THOUSANDS_POINT) && (value.indexOf('.')>0)){
            value = value.replace(/\./g,'');
        }else if(THOUSANDS_SEPARATOR == PREF_THOUSANDS_SPACE){
            value = value.replace(/\s/g,'');
        }
        if((DECIMAL_SEPARATOR == PREF_DECIMAL_COMMA) && value.match(/,/g) && (value.match(/,/g).length >= 1)){
            value = value.replace(/,/g,'.');
        }
      }
      if(type=="float"){
          return parseFloat(value);
      }else if(type=="integer"){
          return parseInt(value);
      }else{
          return value;
      }
  }

  function handleQuickDataEntryKeyDown (e,inputObj,inputDataType) { 
        var newVal = null;
        var currVal = inputObj.val();
        var negVal = false;
        if(currVal.trim().charAt(0)=="(" && currVal.match(/\)/)!=null){
            negVal = true;
            currVal = currVal.replace("(","");
            currVal = currVal.replace(")","");
            currVal = "-"+currVal;
        }
        if(currVal.match(/[a-z]/i)!=null){
            for(var i=0; i<R_EXP_ARRAY.length; i++){
                if(currVal.match(R_EXP_ARRAY[i])!=null && currVal.match(R_EXP_ARRAY[i]).length==1){
                    if(!/[a-z]/i.test(currVal.trim().replace(R_EXP_ARRAY[i],""))){
                        var res = currVal.split(R_EXP_ARRAY[i]);
                        if(res!=null && res.length==2){
                           if(OPERATIONS[i]=="ADD")
                            newVal = getValueFromDataType(inputDataType,res[0].trim()) + getValueFromDataType(inputDataType,res[1].trim());
                           else if (OPERATIONS[i]=="SUB" || OPERATIONS[i]=="SUB")
                            newVal = getValueFromDataType(inputDataType,res[0].trim()) - getValueFromDataType(inputDataType,res[1].trim());
                           else if (OPERATIONS[i]=="PER" || OPERATIONS[i]=="Percent"){
                            newVal = getValueFromDataType(inputDataType,res[0].trim()) * getValueFromDataType(inputDataType,res[1].trim())/100;
                           }
                           else if (OPERATIONS[i]=="INC" || OPERATIONS[i]=="Increase"){
                            var perAmt = (getValueFromDataType(inputDataType,res[0].trim()) * getValueFromDataType(inputDataType,res[1].trim()))/100;
                            newVal = getValueFromDataType(inputDataType,res[0].trim()) + perAmt;
                           }
                           else if (OPERATIONS[i]=="DEC" || OPERATIONS[i]=="Decrease"){
                            var perAmt = (getValueFromDataType(inputDataType,res[0].trim()) * getValueFromDataType(inputDataType,res[1].trim()))/100;
                            newVal = getValueFromDataType(inputDataType,res[0].trim()) -  perAmt;
                           }
                           else if (OPERATIONS[i]=="POW" || OPERATIONS[i]=="Power")
                            newVal = Math.pow(getValueFromDataType(inputDataType,res[0].trim()), getValueFromDataType(inputDataType,res[1].trim())); 
                           else if (OPERATIONS[i]=="GR"){
                               var perAmt = (getValueFromDataType(inputDataType,res[0].trim()) * getValueFromDataType(inputDataType,res[1].trim()))/100;
                               newVal = getValueFromDataType(inputDataType,res[0].trim()) + perAmt;
                           }
                        }
                    }
                }
                if(newVal!=null){
                    try{
                        inputObj.val(getFormatedValueFordataEntry(inputDataType,newVal));
                        return ;
                    }catch(ex){return;}
                }
            }
            if(currVal.match(/[km]/i)!=null && currVal.match(/[KM]/i).length==1){
                if(currVal.trim().match(/[KM]/i).index == currVal.trim().length-1){
                    if(currVal.match(/[k]/i)!=null && currVal.match(/[k]/i).length==1){
                        if(!/[a-z]/i.test(currVal.trim().replace(/k/i,""))){
                            if(currVal.match(/./)!=null){
                                newVal = getValueFromDataType(inputDataType,currVal.replace(/k/i,"").trim())*1000;
                            }else{
                                newVal = currVal.replace(/k/i,"000").trim();
                            }
                        }
                    }else if(currVal.match(/[m]/i)!=null && currVal.match(/[m]/i).length==1){
                        if(!/[a-z]/i.test(currVal.trim().replace(/m/i,""))){
                            if(currVal.match(/./)!=null){
                                newVal = getValueFromDataType(inputDataType,currVal.replace(/m/i,"").trim())*1000000;
                            }else{
                                newVal = currVal.replace(/m/i,"000000").trim();
                            }
                        }
                    }
                }
            }
        }else if(currVal.match(/[+]/i)!=null && currVal.match(/[+]/i).length==1){
            if(!/[a-z]/i.test(currVal.trim())){
                var res = currVal.split("+");
                if(res!=null && res.length==2){
                      newVal = getValueFromDataType(inputDataType,res[0].trim()) + getValueFromDataType(inputDataType,res[1].trim());
                }
            }
        }else if(currVal.match(/[~]/i)!=null && currVal.match(/[~]/i).length==1){
            if(!/[a-z]/i.test(currVal.trim())){
                var res = currVal.split("~");
                if(res!=null && res.length==2){
                      newVal = getValueFromDataType(inputDataType,res[0].trim()) - getValueFromDataType(inputDataType,res[1].trim());
                }
            }
        }else if(currVal.match(/[*]/i)!=null && currVal.match(/[*]/i).length==1){
            if(!/[a-z]/i.test(currVal.trim())){
                var res = currVal.split("*");
                if(res!=null && res.length==2){
                      newVal = getValueFromDataType(inputDataType,res[0].trim()) * getValueFromDataType(inputDataType,res[1].trim());
                }
            }
        }else if(currVal.match(/[\/]/i)!=null && currVal.match(/[\/]/i).length==1){
            if(!/[a-z]/i.test(currVal.trim())){
                var res = currVal.split("/");
                if(res!=null && res.length==2){
                      newVal = getValueFromDataType(inputDataType,res[0].trim()) / getValueFromDataType(inputDataType,res[1].trim());
                }
            }
        }
        if(newVal!=null){
            inputObj.val(getFormatedValueFordataEntry(inputDataType,newVal));
        }
  };
  
  
  function getFormatedValueFordataEntry(dataType,val) {
        if(dataType=="integer"){
          return parseInt(val);
        }
        val = val.toString();
        val = val.replace(/ /g,'');
        var hasPercent; 
        if (dataType === DataType_Percentage && val.slice(-1) === "%"){ 
            val = val.slice(0,val.length-1);
            hasPercent = true; 
        } else {
            hasPercent = false; 
        }
            
        if (NEGATIVE_STYLE == PREF_NEGATIVE_REVERSE && val.slice(-1) === "-") {
            val = "-" + val;
        } else if (NEGATIVE_STYLE == PREF_NEGATIVE_PARENS && (val[0] === "(" && val.slice(-1) === ")")) {
            val = "-" + val.slice(1,val.length-1);
        }
        /*if((THOUSANDS_SEPARATOR == PREF_THOUSANDS_COMMA) && (val.indexOf(',')>0)){
            val = val.replace(/,/g,'');
        } else if((THOUSANDS_SEPARATOR == PREF_THOUSANDS_POINT) && (val.indexOf('.')>0)){
            val = val.replace(/\./g,'');
        }*/
        if((DECIMAL_SEPARATOR == PREF_DECIMAL_COMMA) && val.match(/\./g) && (val.match(/\./g).length >= 1)){
            val = val.replace(/\./g,',');
        }
        if (hasPercent) val = "" + parseFloat(val)/Math.pow(10, 2);
        
        return val;
  }
    
    
  function TextEditor(args) {
    var $input;
    var defaultValue;
    var scope = this;
    var keyValueHSF = ""
    var IS_HSF_GRID = 3;
    
    this.init = function () {
      
      $input = $("<INPUT type=text class='editor-text' />");
      if(accessibilityMode){
        $input.attr('aria-labelledby', 'desc');
        $input.attr('aria-describedby', 'desc');
      }

      if ($(args.container).attr("cellsindex")) {
        var indexArr = $(args.container).attr("cellsindex").split('x');
        var status = grid.getCells()[+indexArr[0]][+indexArr[1]].status;

        if(status & grid.getConstants("READ_ONLY")) {
           $input.prop('readonly',true);
        }
      }

      $input.appendTo(args.container)
      .bind("keydown.nav", function (e) {
        if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {
          if(e.ctrlKey)
            handleGridKeyDown(e);
          if(!(e.ctrlKey && e.shiftKey))
              e.stopImmediatePropagation();
        } else if (e.keyCode === $.ui.keyCode.DELETE) {
            if(IS_HSF_GRID == grid.getOptions().gridType && grid.getActiveCell() && grid.getActiveCell().cell==0){
                if(grid.getActiveCellNode()  && $(grid.getActiveCellNode()).hasClass('editable-row-header')){
                    $(this).val(keyValueHSF);
                }
            }else{
                var indexArr = args.container.attributes.cellsindex.value.split('x');
                grid.getData()[+indexArr[0]][+indexArr[1]].value = keyValueHSF;
            }
        }
      }).bind("keydown", function (e) {
            if(IS_HSF_GRID == grid.getOptions().gridType && grid.getActiveCell() && grid.getActiveCell().cell==0){
                if(grid.getActiveCellNode()  && $(grid.getActiveCellNode()).hasClass('editable-row-header')){
                    if(keyValueHSF.length<1)
                        return;
                    var oldvalue=$(this).val();
                    var field=this;
                    setTimeout(function () {
                        if(field.value.indexOf(keyValueHSF) !== 0) {
                            $(field).val(oldvalue);
                        } 
                    }, 1);
                }
            }
      })
      .focus()
      .select();
    };

    this.destroy = function () {
      $input.remove();
    };

    this.focus = function () {
      $input.focus();
    };

    this.getValue = function () {
      return $input.val();
    };

    this.setValue = function (val) {
      $input.val(val);
    };

    this.loadValue = function (item) {
      var index = (typeof args.column == "object") ? args.column.field : args.column;
      if(grid.getOptions().isReport){
          $input.val(defaultValue = item[index].unformattedVal);
          $input.attr('readonly', 'readonly');
      }else{
        $input.val(defaultValue = item[index].value); 
      }
      $input[0].defaultValue = defaultValue;
      try{ //IE throws unspecified error
        if(!grid.getOptions().isReport)
            $input.select();
      }catch(ex){}
      if(grid.getOptions().gridType == IS_HSF_GRID){
          var indxColn = $input.val().lastIndexOf(":");
          var indxDot = $input.val().lastIndexOf(".");
          var preFixIndex = Math.max(indxColn, indxDot);
          if(preFixIndex>0){
             keyValueHSF = $input.val().substring(0, preFixIndex+1);
          }
      }
    };

    this.serializeValue = function () {
      return $input.val();
    };

    this.applyValue = function (item, state) {
        
        var index = (typeof args.column == "object") ? args.column.field : args.column;
        if ('mbr' in item[index]) {
          let key = item[index].mbrInst.join(',');
          let value = item[index].mbr.mbrInstances[key];
          item[index].mbr.mbrInstances[item[index].mbrInst[0] + "," + state] = value;
          delete item[index].mbr.mbrInstances[key];
        }
        item[index].value = state;
    };

    this.applyValueFromSpread = function (item, state, column) {
        //Used in case of Spread or ClientCalc
        
        item[column.field].value = state;
    };

    this.isValueChanged = function () {
      return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
    };

    this.validate = function () {
      if (args.column && args.column.validator) {
        var validationResults = args.column.validator($input.val());
        if (!validationResults.valid) {
          return validationResults;
        }
      }

      return {
        valid: true,
        msg: null
      };
    };
    
    this.setReadOnly = function (readOnly) {
        $input.attr('readonly', readOnly);
        $input.addClass('input-disabled');
    }
    
    this.init();
  }

  function IntegerEditor(args) {
    var $input;
    var defaultValue;
    var scope = this;

    this.init = function () {
      $input = $("<INPUT type=text class='editor-text' />");
      if(accessibilityMode){
        $input.attr('aria-labelledby', 'desc');
        $input.attr('aria-describedby', 'desc');
      }
      $input.bind("keydown.nav", function (e) {
        if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {
          if(e.ctrlKey)
            handleGridKeyDown(e);
          e.stopImmediatePropagation();
        }else if((e.which == $.ui.keyCode.ENTER || e.which == 9) && ($input.val().match(/[a-z+~*\/]/i)!=null)) {
           handleQuickDataEntryKeyDown(e,$input,"integer");
        }
      });

      $input.appendTo(args.container);
      $input.focus().select();
    };
    
    this.handleQuickDataEntry = function(e){
        if($input.val().match(/[a-z+~*\/]/i)!=null)
            handleQuickDataEntryKeyDown(e,$input,"integer");
    }
    
    this.destroy = function () {
      $input.remove();
    };

    this.focus = function () {
      $input.focus();
    };

    this.loadValue = function (item) {
      defaultValue = item[args.column.field].value;
      $input.val(defaultValue);
      $input[0].defaultValue = defaultValue;
      try{ //IE throws unspecified error
        $input.select();
      }catch(ex){}
    };

    this.serializeValue = function () {
      return parseInt($input.val(), 10) || 0;
    };

    this.applyValue = function (item, state) {
        
        item[args.column.field].value = state;
    };

    this.applyValueFromSpread = function (item, state, column) {
        //Used in case of Spread or ClientCalc
        
        item[column.field].value = state;
    };

    this.isValueChanged = function () {
      return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
    };

    this.validate = function () {
      if (isNaN($input.val())) {
        return {
          valid: false,
          msg: "Please enter a valid integer"
        };
      }

      return {
        valid: true,
        msg: null
      };
    };
    
    this.setReadOnly = function (readOnly) {
        $input.attr('readonly', readOnly);
        $input.addClass('input-disabled');
    }
    
    this.init();
  }
   
  function FloatEditor(args) {
    var $input;
    var defaultValue;
    var scope = this;

    this.init = function () {
        $input = $("<INPUT type=text class='editor-text' />");
        if(accessibilityMode){
           $input.attr('aria-labelledby', 'desc');
           $input.attr('aria-describedby', 'desc');
        }
        $input.bind("keydown.nav", function (e) {
            if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {
                if(e.ctrlKey)
                    handleGridKeyDown(e);
                e.stopImmediatePropagation();
            }else if ((e.which == $.ui.keyCode.ENTER || e.which == 9 )&& ($input.val().match(/[a-z+~*\/]/i)!=null)) {
                handleQuickDataEntryKeyDown(e,$input,"float");
            }
        });
        $input.bind("focus", function (e) {
            setTimeout(function(){
                try{
                    
                    $input[0].setSelectionRange(0, 9999, "backward");
                }catch(ex){}
            },1);
        });      
        $input.appendTo(args.container);
        /*$input.focus().select();*/
        
    };

    this.handleQuickDataEntry = function(e){
        if($input.val().match(/[a-z+~*\/]/i)!=null)
            handleQuickDataEntryKeyDown(e,$input,"float");
    };
    
    this.destroy = function () {
      $input.remove();
    };

    this.focus = function () {
      $input.focus();
    };

    this.loadValue = function (item, editCss) {
      defaultValue = item[args.column.field].value;
      $input.val(defaultValue);
      $input[0].defaultValue = defaultValue;
      if(editCss) $input[0].style.color = "red";
      if(accessibilityMode){ 
        $input.focus();
      }
      try{ //IE throws unspecified error
        $input.select();
      }catch(ex){}
    };

    this.serializeValue = function (dataType,slickCell) {
        var val = $input.val();
        val = val.replace(/ /g,'');
        var hasPercent; 
        if (dataType === DataType_Percentage && val.slice(-1) === "%"){ 
            val = val.slice(0,val.length-1);
            hasPercent = true; 
        } else {
            hasPercent = false; 
        }
            
        if (NEGATIVE_STYLE == PREF_NEGATIVE_REVERSE && val.slice(-1) === "-") {
            val = "-" + val;
        } else if (NEGATIVE_STYLE == PREF_NEGATIVE_PARENS && (val[0] === "(" && val.slice(-1) === ")")) {
            val = "-" + val.slice(1,val.length-1);
        }
        if((THOUSANDS_SEPARATOR == PREF_THOUSANDS_COMMA) && (val.indexOf(',')>0)){
            val = val.replace(/,/g,'');
        } else if((THOUSANDS_SEPARATOR == PREF_THOUSANDS_POINT) && (val.indexOf('.')>0)){
            val = val.replace(/\./g,'');
        }
        if((DECIMAL_SEPARATOR == PREF_DECIMAL_COMMA) && val.match(/,/g) && (val.match(/,/g).length >= 1)){
            val = val.replace(/,/g,'.');
        }
//        if(slickCell) val = Slick.Formatters.applyPrecision(val,slickCell.minPrec, slickCell.maxPrec);
        if (hasPercent) val = "" + parseFloat(val)/Math.pow(10, 2);

            
//        if (dataType === DATA_TYPE_PERCENTAGE) {
//            if(/^\d+$/.test(val) || (/^[0-9.]+$/.test(val))){
//                val = (parseInt(val)/100)+"";
//            }
//        }
//        if(/^[0-9,]+$/.test($input.val()))
//            return val;
        if (!isNaN(val)){
            $input.val(val); 
            return $input.val();
        } else{
            return parseFloat(val, 10) || 0;
        }
    };

    this.applyValue = function (item, state) {
        
        item[args.column.field].value = state;
    };
    
    this.applyValueFromSpread = function (item, state, column) {
        //Used in case of Spread or ClientCalc
        
        item[column.field].value = state;
    };

    this.isValueChanged = function () {
      var dFVal;
      var inTVal = "";
      if(defaultValue==null)
        dFVal = null;
      else{
        dFVal = (jQuery.type(defaultValue) === "string")?defaultValue.replace(/,/g,""):defaultValue; //Bug 20341062  
      }
      if(!($input.val()=="")){
          inTVal = (jQuery.type($input.val()) === "string")?$input.val().replace(/,/g,""):$input.val();
      }
      return (!($input.val() == "" && defaultValue == null)) && (inTVal != dFVal);
    };

    this.validate = function (dataType) {
      var val = $input.val();
      // if has "%", remove 
      var hasDigits = /\d/.test(val);
      val = val.replace(/ /g,'');
      if (dataType == DATA_TYPE_PERCENTAGE && val.slice(-1) === "%") {val = val.slice(0,val.length-1)};

      if (NEGATIVE_STYLE == PREF_NEGATIVE_REVERSE && val.slice(-1) === "-") {
        val = "-" + val;
      } else if (NEGATIVE_STYLE == PREF_NEGATIVE_PARENS && (val[0] === "(" && val.slice(-1) === ")")) {
        val = "-" + val.slice(1,val.length-1);
      }
      //Conditions
      var isOnlyDigitsCommaNeg = (/^[0-9,-.]+$/.test(val));
      if(!isOnlyDigitsCommaNeg)
            isOnlyDigitsCommaNeg = (val.length==0)?true:false;  //Bug# 20347323 
      //Has one or no negative sign
      var isOneNegAndFirst = true;
        if (val.indexOf("-") > 0) isOneNegAndFirst = ((val.match(new RegExp("-", "g")).length <= 1) && (val[0] === "-"));
      
      //Has one or no decimal character
      var isOnlyOneDec = true;
      if(DECIMAL_SEPARATOR == PREF_DECIMAL_COMMA && val.match(/,/g))
        isOnlyOneDec = (val.match(/,/g).length <= 1) ;
      else if(DECIMAL_SEPARATOR == PREF_DECIMAL_POINT && val.match(/\./g)) 
        isOnlyOneDec = (val.match(/\./g).length <= 1);

      if(hasDigits && isOnlyDigitsCommaNeg && isOnlyOneDec && isOneNegAndFirst){
          return {
            valid: true,
            msg: null
          };
      }
      if(val==''){//Bug 20741021
          return {
            valid: true,
            msg: null
          };
      }
      return {
        valid: false,
        msg: "Please enter a valid decimal number"
      };
    };
    
    this.setReadOnly = function (readOnly) {
        $input.attr('readonly', readOnly);
        $input.addClass('input-disabled');
    }
    
    this.init();
  }

  function DateEditor(args) {
    var $input;
    var defaultValue;
    var scope = this;
    var calendarOpen = false;

    this.init = function () {
      $input = $("<INPUT type=text class='editor-text'/>");
      if(accessibilityMode){
         $input.attr('aria-labelledby', 'desc');
         $input.attr('aria-describedby', 'desc');
         $input.bind("keydown", this.handleKeyDown);
      }
      //DATE_PICKER_FORMAT needs to be initialized with user pref dateformat settings outside this file.
      if(typeof DATE_PICKER_FORMAT === 'undefined'){
          DATE_PICKER_FORMAT = "m/d/y";
      }
      $input.appendTo(args.container);
      $input.focus().select();
      $input.datepicker({
        dateFormat: DATE_PICKER_FORMAT,
        showOn: "button",
        buttonImageOnly: true,
        buttonImage: "/HyperionPlanning/slickgrid/images/calendar.gif",
        beforeShow: function () {
          calendarOpen = true
        },
        onClose: function () {
          calendarOpen = false
        }
      });
      $input.width($input.width() - 18);        
    };
    
    this.handleKeyDown = function (e) {
      if (e.which == 113) {
        $input.datepicker("show");
        e.preventDefault();
      }
    };
    
    this.destroy = function () {
      $.datepicker.dpDiv.stop(true, true);
      $input.datepicker("hide");
      $input.datepicker("destroy");
      $input.remove();
    };

    this.show = function () {
      if (calendarOpen) {
        $.datepicker.dpDiv.stop(true, true).show();
      }
    };

    this.hide = function () {
      if (calendarOpen) {
        $.datepicker.dpDiv.stop(true, true).hide();
      }
    };

    this.position = function (position) {
      if (!calendarOpen) {
        return;
      }
      $.datepicker.dpDiv
          .css("top", position.top + 30)
          .css("left", position.left);
    };

    this.focus = function () {
      $input.focus();
    };

    this.loadValue = function (item) {
      defaultValue = item[args.column.field].value;
      $input.val(defaultValue);
      $input[0].defaultValue = defaultValue;
      try{ //IE throws unspecified error
        $input.select();
      }catch(ex){}
    };

    this.serializeValue = function () {
      return $input.val();
    };

    this.applyValue = function (item, state) {
        
        item[args.column.field].value = state;
    };

    this.applyValueFromSpread = function (item, state, column) {
        //Used in case of Spread or ClientCalc
        
        item[column.field].value = state;
    };
    
    this.isValueChanged = function () {
      return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
    };

    this.validate = function () {
      try {
            $.datepicker.parseDate(DATE_PICKER_FORMAT, $input.val());
      }
        catch (err) {
          return {
            valid: false,
            msg: null
          };
      }
      return {
        valid: true,
        msg: null
      };
    };
    
    this.setReadOnly = function (readOnly) {
        $input.attr('readonly', readOnly);
        $input.addClass('input-disabled');
    }
    
    this.init();
  }

  function YesNoSelectEditor(args) {
    var $select;
    var defaultValue;
    var scope = this;

    this.init = function () {
      $select = $("<SELECT tabIndex='0' class='editor-yesno'><OPTION value='yes'>Yes</OPTION><OPTION value='no'>No</OPTION></SELECT>");
      if(accessibilityMode){
          $select.attr('aria-labelledby', 'desc');
          $select.attr('aria-describedby', 'desc');
      }
      $select.appendTo(args.container);
      $select.focus();
    };

    this.destroy = function () {
      $select.remove();
    };

    this.focus = function () {
      $select.focus();
    };

    this.loadValue = function (item) {
      $select.val((defaultValue = item[args.column.field].value) ? "yes" : "no");
      $select.select();
    };

    this.serializeValue = function () {
      return ($select.val() == "yes");
    };

    this.applyValue = function (item, state) {
      item[args.column.field].value = state;
    };
    
    this.applyValueFromSpread = function (item, state, column) {   //Used in case of Spread or ClientCalc
      item[column.field].value = state;
    };

    this.isValueChanged = function () {
      return ($select.val() != defaultValue);
    };

    this.validate = function () {
      return {
        valid: true,
        msg: null
      };
    };

    this.init();
  }

  function CheckboxEditor(args) {
    var $select;
    var defaultValue;
    var scope = this;

    this.init = function () {
      $select = $("<INPUT type=checkbox value='true' class='editor-checkbox' hideFocus>");
      if(accessibilityMode){
        $select.attr('aria-labelledby', 'desc');
        $select.attr('aria-describedby', 'desc');
      }
      $select.appendTo(args.container);
      $select.focus();
    };

    this.destroy = function () {
      $select.remove();
    };

    this.focus = function () {
      $select.focus();
    };

    this.loadValue = function (item) {
      defaultValue = !!item[args.column.field].value;
      if (defaultValue) {
        $select.prop('checked', true);
      } else {
        $select.prop('checked', false);
      }
    };

    this.serializeValue = function () {
      return $select.prop('checked');
    };

    this.applyValue = function (item, state) {
      item[args.column.field].value = state;
    };

    this.isValueChanged = function () {
      return (this.serializeValue() !== defaultValue);
    };

    this.validate = function () {
      return {
        valid: true,
        msg: null
      };
    };

    this.init();
  }

  function PercentCompleteEditor(args) {
    var $input, $picker;
    var defaultValue;
    var scope = this;

    this.init = function () {
      $input = $("<INPUT type=text class='editor-percentcomplete' />");
      if(accessibilityMode){
          $input.attr('aria-labelledby', 'desc');
          $input.attr('aria-describedby', 'desc');
      }
      $input.width($(args.container).innerWidth() - 25);
      $input.appendTo(args.container);

      $picker = $("<div class='editor-percentcomplete-picker' />").appendTo(args.container);
      $picker.append("<div class='editor-percentcomplete-helper'><div class='editor-percentcomplete-wrapper'><div class='editor-percentcomplete-slider' /><div class='editor-percentcomplete-buttons' /></div></div>");

      $picker.find(".editor-percentcomplete-buttons").append("<button val=0>Not started</button><br/><button val=50>In Progress</button><br/><button val=100>Complete</button>");

      $input.focus().select();
      $picker.find(".editor-percentcomplete-slider").slider({
        orientation: "vertical",
        range: "min",
        value: defaultValue,
        slide: function (event, ui) {
          $input.val(ui.value)
        }
      });

      $picker.find(".editor-percentcomplete-buttons button").bind("click", function (e) {
        $input.val($(this).attr("val"));
        $picker.find(".editor-percentcomplete-slider").slider("value", $(this).attr("val"));
      })
    };

    this.destroy = function () {
      $input.remove();
      $picker.remove();
    };

    this.focus = function () {
      $input.focus();
    };

    this.loadValue = function (item) {
      $input.val(defaultValue = item[args.column.field].value);
      try{ //IE throws unspecified error
        $input.select();
      }catch(ex){}
    };

    this.serializeValue = function () {
      return parseInt($input.val(), 10) || 0;
    };

    this.applyValue = function (item, state) {
      item[args.column.field].value = state;
    };

    this.isValueChanged = function () {
      return (!($input.val() == "" && defaultValue == null)) && ((parseInt($input.val(), 10) || 0) != defaultValue);
    };

    this.validate = function () {
      if (isNaN(parseInt($input.val(), 10))) {
        return {
          valid: false,
          msg: "Please enter a valid positive number"
        };
      }

      return {
        valid: true,
        msg: null
      };
    };

    this.init();
  }

  /*
   * An example of a "detached" editor.
   * The UI is added onto document BODY and .position(), .show() and .hide() are implemented.
   * KeyDown events are also handled to provide handling for Tab, Shift-Tab, Esc and Ctrl-Enter.
   */
  function LongTextEditor(args) {
    var $input, $wrapper;
    var defaultValue;
    var scope = this;

    this.init = function () {
      var $container = $("body");

      $wrapper = $("<DIV style='z-index:2147483647;position:absolute;background:white;padding:5px;border:3px solid gray; -moz-border-radius:10px; border-radius:10px;'/>")
          .appendTo($container);

      $input = $("<TEXTAREA hidefocus rows=5 style='backround:white;width:250px;height:80px;border:0;outline:0' maxlength='255'>")
          .appendTo($wrapper);
      if(accessibilityMode){
          $input.attr('aria-labelledby', 'desc');
          $input.attr('aria-describedby', 'desc');
      }

      $("<DIV style='text-align:right'><BUTTON>Save</BUTTON><BUTTON>Cancel</BUTTON></DIV>")
          .appendTo($wrapper);

      $wrapper.find("button:first").bind("click", this.save);
      $wrapper.find("button:last").bind("click", this.cancel);
      $input.bind("keydown", this.handleKeyDown);
      $wrapper.find("button:first").bind("keydown", this.handleSaveBtnKeyDown);
      $wrapper.find("button:last").bind("keydown", this.handleCancelBtnKeyDown);

      scope.position(args.position);
      $input.focus().select();
      if(accessibilityMode){
          $input.selectRange = function(from, to) {
                if(!to) to = from; 
                return this.each(function() {
                    if (this.setSelectionRange) {
                        this.focus();
                        this.setSelectionRange(from, to);
                    } else if (this.createTextRange) {
                        var range = this.createTextRange();
                        range.collapse(true);
                        range.moveEnd('character', to);
                        range.moveStart('character', from);
                        range.select();
                    }
                });
            };
            $input.selectRange(0);
       }
    };

    this.handleKeyDown = function (e) {
      if (e.which == $.ui.keyCode.ENTER && e.ctrlKey) {
        scope.save();
      } else if (e.which == $.ui.keyCode.ESCAPE) {
        e.preventDefault();
        scope.cancel();
      } else if (e.which == $.ui.keyCode.TAB && e.shiftKey) {
        e.preventDefault();
        args.grid.navigatePrev();
      } 
    };
    
    this.handleCancelBtnKeyDown = function (e) {
      if (e.which == $.ui.keyCode.TAB && !e.shiftKey) {
        e.preventDefault();
        args.grid.navigateNext();
      } else if (e.which == $.ui.keyCode.ESCAPE) {
        e.preventDefault();
        scope.cancel();
      }
    };
    
    this.handleSaveBtnKeyDown = function (e) {
      if (e.which == $.ui.keyCode.ESCAPE) {
        e.preventDefault();
        scope.cancel();
      }
    };
    
    this.save = function () {
      args.commitChanges();
    };

    this.cancel = function () {
      $input.val(defaultValue);
      args.cancelChanges();
    };

    this.hide = function () {
      $wrapper.hide();
    };

    this.show = function () {
      $wrapper.show();
      if(accessibilityMode){
        try{
            $input.select();
            $input.selectRange(0);
        }catch(ex){}
      }
    };

    this.position = function (position) {
      $wrapper
          .css("top", position.top - 5)
          .css("left", position.left - 5)
    };

    this.destroy = function () {
      $wrapper.remove();
    };

    this.focus = function () {
      $input.focus();
    };

    this.loadValue = function (item) {
      if (typeof item == "string") {
        $input.val(defaultValue = item); 
      } else {
        $input.val(defaultValue = item[args.column.field].value); 
      }
      try{ //IE throws unspecified error
        $input.select();
        if(accessibilityMode)
            $input.selectRange(0);
      }catch(ex){}
    };
    
    this.serializeValue = function () {
      return $input.val();
    };

    this.applyValue = function (item, state) {
        
        if (args.column)
          item[args.column.field].value = state;
    };

    this.applyValueFromSpread = function (item, state, column) {
        //Used in case of Spread or ClientCalc
        
        item[column.field].value = state;
    };

    this.isValueChanged = function () {
      return (!($input.val() == "" && defaultValue == null)) && ($input.val().replace(/\r\n/g,"\n") != defaultValue.replace(/\r\n/g,"\n"));
    };

    this.validate = function () {
      if($input.val().length < 256){  //Bug 20176124    
        return {      
            valid: true,
            msg: null
        };
      } else{
        $wrapper.css("border","3px solid red");
        return {
            valid: false,
            msg: "The cell input you entered is too long. Please limit the contents to 255 characters."
        };          
      }
    };

    this.init();
  }
  
    
    function SelectCellEditor(args) {
        var $select;
        var defaultValue;
        var scope = this;

        this.init = function() {
            if(args.smartLists) {
                opt_values = args.smartLists;
            }
            
            option_str = ""
            for( i in opt_values ){
              v = opt_values[i];
              lbl = v;
              //encoding < / > chars in label
              if (v.indexOf('<') == 0 && v.indexOf('>') == v.length-1)
                lbl = '&lt;'+ v.substr(1, v.length-2) + '&gt;';
              option_str += "<OPTION value='"+v+"'>"+lbl+"</OPTION>";
            }
            $select = $("<SELECT tabIndex='0' class='editor-select'  style='padding-left: 0px; width: "+ args.cellWidth +"'>"+ option_str +"</SELECT>");
            $select.appendTo(args.container);
            $select.focus();
        };

        this.destroy = function() {
            $select.remove();
        };

        this.focus = function() {
            $select.focus();
        };

        this.getValue = function () {
          return $select.val();
        };
    
        this.setValue = function (val) {
          $select.val(val);
        };

        this.loadValue = function(item) {
            defaultValue = item[args.column.field].value;
            $select.val(defaultValue);
        };

        this.serializeValue = function() {
            return $select.val();
        };

        this.applyValue = function(item,state) {
            item[args.column.field].value = state;
        };

        this.isValueChanged = function() {
            return ($select.val() != defaultValue);
        };

        this.validate = function() {
            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

})(jQuery);
  