/***
 * Contains basic SlickGrid formatters.
 *  
 * NOTE:  These are merely examples.  You will most likely need to implement something more
 *        robust/extensible/localizable/etc. for your use!
 * 
 * @module Formatters
 * @namespace Slick
 */

(function ($) {
  // register namespace
  $.extend(true, window, {
    "Slick": {
      "Formatters": {
        "Default": Default,
        "Number": NumberFormatter,
        "Percent": PercentFormatter,
        "Collapsable": Collapsable,
        "PoundOverride": PoundOverrideFormatter,
        "isNegative": isNegative,
        "applyPrecision": applyPrecision
      }
    }
  });

  function Default(value) {
    if (value == null || value === "") {
      return "";
    } else {
        return value;
    }
  }
  
  function Collapsable(value) {
    if (dataContext.bHasChildren && (cell === dataContext.DataOrigin_c)){
        if (dataContext._collapsed) {
          return " <img  id = '" + dataContext.id + "' alt='Collapsed Rows' src='../bi/images/gridView/disclosure_collapsed.png'/>&nbsp&nbsp" + value;
        } else {
          return " <img  id = '" + dataContext.id + "' alt='Expanded Rows' src='../bi/images/gridView/disclosure_expanded.png'/>&nbsp&nbsp" + value;
        }
    } else {
        return value; 
    }
  };

  function NumberFormatter(value) {
    if (value == null || value === "") {
        return "";
    } else if(!isNumber(value)) {
        if(slickCell && slickCell.isSupporting){
            var srVal = serializeValue(value,slickCell.dataType,slickCell);
            if (isNaN(srVal))
                return value;
            else
                return formatNumberValue(srVal, slickCell, applyNoPrec);
        }else{
            return value;
        }
    } else {
        // Detect whether or not the number is negative,
        // and then remove the negative sign from the string
        return formatNumberValue(value, slickCell, applyNoPrec);

    }
  }

  function PoundOverrideFormatter(value){
    if ($.isNumeric(value)) {
        value = '#' + value;
    }
    return value;
  }

  
  function PercentFormatter(value) {
  
    if (value == null || value === "") {
      return "";
    } else if(!isNumber(value)) {
        return value;
    } else {
    
//        value = applyPrecision(value);
            
        value = value + "";
        var dotIdx = value.indexOf(".");
        if (dotIdx >= 0) {
            while (value.length - dotIdx <= 2) {
                value = value + "0";
            }
            if (dotIdx+3 < value.length) {
                value = value.substring(0,dotIdx) + value.substring(dotIdx+1,dotIdx+3) + "." + value.substring(dotIdx+3);
            } else {
                value = value.substring(0,dotIdx) + value.substring(dotIdx+1);
            }
        } else {
            value = value + "00";
        }
        value = parseFloat(value)+"";
        value = formatNumberValue(value, slickCell, applyNoPrec);
        return value + "%";
    }
  }
  
    function setCellFormat(slickCell){
        var thisCurrMap;
        if(slickCell) {
            if(slickCell.currencyCode != "") {
                thisCurrMap = currMap[slickCell.currencyCode];
            } else if(slickCell.defCurrencyCode != "") {
                thisCurrMap = currMap[slickCell.defCurrencyCode];
            }
            if(thisCurrMap){
                THOUSANDS_SEPARATOR = thisCurrMap[0];
                DECIMAL_SEPARATOR = thisCurrMap[1];
                NEGATIVE_STYLE = thisCurrMap[2];
                NEGATIVE_COLOR = thisCurrMap[3];
            }
        }
        //override with userprefs if set by user
        if(bUserThousandsSeparator) {
            THOUSANDS_SEPARATOR = USER_THOUSANDS_SEPARATOR;
        }
        if(bUserDecimalSeparator) {
            DECIMAL_SEPARATOR = USER_DECIMAL_SEPARATOR;
        }
        if(bUserNegativeStyle) {
            NEGATIVE_STYLE = USER_NEGATIVE_STYLE;
        }
        if(bUserNegativeColor) {
            NEGATIVE_COLOR = USER_NEGATIVE_COLOR;
        }
    }
    
  function formatNumberValue(value, slickCell,applyNoPrec){
        setCellFormat(slickCell); //Formats(Thousand/Decimal/NegativeStyle/Color) applicable for cell applied here
        var negative = false;
        if (isNegative(value, PREF_NEGATIVE_NORMAL)) {
            value = stripNegative(value, PREF_NEGATIVE_NORMAL);
            negative = true;
        }
        if (slickCell && !applyNoPrec){
            if (slickCell.maxPrec >= 0) value = applyPrecision(value, slickCell.minPrec, slickCell.maxPrec);
        }
        
        // Split the value string into two parts- left and right of the decimal point
        value = value + "";
        var left;
        var right;
        var decIndex = value.indexOf(".");
        if (decIndex >= 0) {
            left = value.substring(0, decIndex);
            right = value.substring(decIndex+1, value.length);
        } else {
            left = value;
            right = "";
        }
        
        // Insert thousands separators here
        var newLeft = left;
        if (!isExponential(value)) {
            var thousandsCharacter = "";
            if (THOUSANDS_SEPARATOR == PREF_THOUSANDS_NONE) {
                thousandsCharacter = "";
            } else if (THOUSANDS_SEPARATOR == PREF_THOUSANDS_COMMA) {
                thousandsCharacter = ",";
            } else if (THOUSANDS_SEPARATOR == PREF_THOUSANDS_POINT) {
                thousandsCharacter = ".";
            } else if (THOUSANDS_SEPARATOR == PREF_THOUSANDS_SPACE) {
                thousandsCharacter = " ";
            }
            if (left.length >= 4) {
                newLeft = left.substring(left.length-3, left.length);
                var loop1 = 0;
                for (loop1 = left.length - 3;loop1 > 3;loop1 -= 3) {
                    newLeft = left.substring(loop1 - 3, loop1) + thousandsCharacter + newLeft;
                }
                newLeft = left.substring(0, loop1) + thousandsCharacter + newLeft;
            }
        }
        
        // Add the decimal portion back onto the string
        var decimalCharacter = ".";
        if (DECIMAL_SEPARATOR == PREF_DECIMAL_POINT) {
            decimalCharacter = ".";
        } else if (DECIMAL_SEPARATOR == PREF_DECIMAL_COMMA) {
            decimalCharacter = ",";
        }
        if (right.length > 0) {
            newLeft = newLeft + decimalCharacter + right;
        }
        
        // Add the negative sign
        if (negative) {
            if (NEGATIVE_STYLE == PREF_NEGATIVE_NORMAL) {
                newLeft = "-" + newLeft;
            } else if (NEGATIVE_STYLE == PREF_NEGATIVE_REVERSE) {
                newLeft = newLeft + "-";
            } else if (NEGATIVE_STYLE == PREF_NEGATIVE_PARENS) {
                newLeft = "(" + newLeft + ")";
            } else {
                newLeft = "-" + newLeft;
            }
        }
        
        value = newLeft;
        
        // Set the color of the Cell
        if (NEGATIVE_COLOR == PREF_NEGATIVE_RED) {
            if(negative) {
                return value;
            }
        }
        
        return value;
  }
  
    function isNegative(input, negativeStyle,sFormatter) {
            var sInput = input + "";
            if( sFormatter && (sFormatter ==  Slick.Formatters.Percent))
                sInput = sInput.replace("%",'');
            if (sInput.length > 0) {
                    if (negativeStyle == PREF_NEGATIVE_REVERSE) {
                            if (sInput.charAt(sInput.length-1) == '-') {
                                    return true;
                            }
                    } else if (negativeStyle == PREF_NEGATIVE_PARENS) {
                            if ((sInput.charAt(0) == '(') && (sInput.charAt(sInput.length-1) == ')')) {
                                    return true;
                            }
                    }
    
                    // Test to see if the string contains the standard negative indicator
                    // Used when negativeStyle == PREF_NEGATIVE_NORMAL OR when
                    // negative not found in style of the cell. This allows parsing of cell
                    // values entered in either the standard format OR the specified format of the cell
                    if (sInput.charAt(0) == '-') {
                            return true;
                    }
            }
    
            return false;
    }  
    
    function stripNegative(input, negativeStyle) {
            var sInput = input + "";
            if (sInput.length > 0) {
                    if (negativeStyle == PREF_NEGATIVE_REVERSE) {
                            if (sInput.charAt(sInput.length-1) == '-') {
                                    return(sInput.substring(0, sInput.length-1));
                            }
                    } else if (negativeStyle == PREF_NEGATIVE_PARENS) {
                            if ((sInput.charAt(0) == '(') && (sInput.charAt(sInput.length-1) == ')')) {
                                    return(sInput.substring(1,sInput.length-1));
                            }
                    }
    
                    if (sInput.charAt(0) == '-') {
                            return(sInput.substring(1, sInput.length));
                    }
            }
            return(sInput);
    }
    
    function isExponential(value) {
  var eIdx1 = value.indexOf('e');
  var eIdx2 = value.indexOf('E');
  return((eIdx1 >= 0) || (eIdx2 >= 0));
    }
    
    function applyPrecision(dataVal, slickMinPrec, slickMaxPrec) {
        var minPrec;
        var maxPrec;
        var newVal;
        var nZeros;
        var z;
        var nEidx;
        var bZero;
        var i;
        if (dataVal) {
            minPrec = slickMinPrec; //cell.minPrecision; //copiedSlickCells[i][j].minPrec
            maxPrec = slickMaxPrec; //cell.maxPrecision;
            if (dataVal == "") {
                return(dataVal);
            } else {
                if ((isFinite(Number(dataVal))) && (isFinite(Number(minPrec))) && (isFinite(Number(maxPrec)))) {
                    nEidx = dataVal.toString().indexOf("E");
                    neidx = dataVal.toString().indexOf("e");
                    if ((nEidx == -1) && (neidx == -1)) {
                        newVal = CalculatePrecision(dataVal, minPrec, maxPrec).toString();
                        nlastIdx = newVal.lastIndexOf(".");
                        nZeros = 0;
                        if (minPrec > 0) {
                            if (nlastIdx == -1) {
                                newVal = newVal + ".";
                                nZeros = minPrec;
                            } else {
                                nZeros = minPrec - (newVal.length - 1 - nlastIdx);
                            }
                            for (z=0; z<nZeros; z++) {
                                newVal = newVal + "0";
                            }
                        }
    
                        if (newVal.charAt(0) == '-') {
                            bZero = true;
                            for (i=1; i<newVal.length; i++) {
                                if ((newVal.charAt(i) != '0') && (newVal.charAt(i) != '.')) {
                                    bZero = false;
                                    break;
                                }
                            }
                            if (bZero) {
                                newVal = newVal.substr(1);
                            }
                        }
                    } else {
                        newVal = dataVal;
                    }
                    return(newVal);
                } else {
                    return(dataVal);
                }
            }
        }
        return(dataVal);
    }
    
    function CalculatePrecision(data, minPrec, maxPrec) {
        var cP = "";
        var bNegative = false;
            var nRound;
            data = data.toString();
        if ((data != null) && (data.length > 0) && (data.charAt(0) != "#")) {
            if (data.charAt(0) == '-') {
                bNegative = true;
                data = data.substring(1);
            }
            var nDotIdx = data.indexOf(".");
            var sX = null;
            var sY = null;
            if ((nDotIdx >= 0) && (nDotIdx < data.length)) {
                sX = data.substring(0, nDotIdx);
                sY = data.substring(nDotIdx+1);
            } else {
                sX = data;
                sY = "";
            }
            if (maxPrec == 0) {
                if (sY.length < 1) {
                    sY = "0";
                }
                if (sX.length < 1) {
                    sX = "0";
                }
                nRound = Number(sY.charAt(0));
                if (nRound >= 5) {
                    cP = StringBasedIncrement(sX);
                } else {
                    cP = sX;
                }
            } else if ((maxPrec != -1) && (maxPrec < sY.length)) {
                nRound = Number(sY.charAt(maxPrec));
                if (nRound >= 5) {
                    cP = StringBasedIncrement(sX + "." + sY.substring(0, maxPrec));
                } else {
                    cP = sX + "." + sY.substring(0,maxPrec);
                }
            } else {
                cP = sX + "." + sY;
            }
            if (minPrec > sY.length) {
                for (i=0; i<minPrec-sY.length; i++) {
                    cP = cP + "0";
                }
            }
            if (bNegative) {
                bNegative = false;
                var i;
                for (i=0; i<cP.length; i++) {
                    if ((cP.charAt(i) != '0') && (cP.charAt(i) != '.')) {
                        bNegative = true;
                        break;
                    }
                }
                if (bNegative) {
                    cP = "-" + cP;
                }
            }
        } else {
            return(data);
        }
        return(cP);
    }

    function StringBasedIncrement(sVal) {
        var sBuf = "";
        var nInsertHere = 0;
        if (sVal.charAt(0) == "-") {
            nInsertHere = 1;
        }
        var nVal;
        var bOverflow = true;
        var i;
        for (i=(sVal.length - 1); i>=0; i--) {
            if (sVal.charAt(i) == '9') {
                sBuf = "0" + sBuf;
            } else if (isNumber(sVal.charAt(i))) {
                try {
                    nVal = Number(sVal.charAt(i));
                    nVal++;
                    sBuf = nVal + sBuf;
                    sBuf = sVal.substring(0,i) + sBuf;
                    bOverflow = false;
                    break;
                } catch(ex) {
                    sBuf = sVal.charAt(i) + sBuf;
                }
            } else {
                sBuf = sVal.charAt(i) + sBuf;
            }
        }
        if (bOverflow) {
            if (nInsertHere > 0) {
                sBuf = sBuf.substring(0, nInsertHere) + "1" + sBuf.substring(nInsertHere);
            } else {
                sBuf = "1" + sBuf;
            }
        }
        return(sBuf);
    }
    
    function isNumber(input) {
  if (input == null)
    return false;
  if (input.length == 0)
    return false;
  return isFinite(input);
    }
    
    function serializeValue(val,dataType,slickCell) {
        try{
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
            if (hasPercent) val = "" + parseFloat(val)/Math.pow(10, 2);
            return val;
        }catch(e){
            return val;
        }
    }
  
})(jQuery);



