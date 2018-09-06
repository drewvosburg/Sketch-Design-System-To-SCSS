
var doc;
var sharedStyles;
var sharedTextStyles;
function initVars (context) {
  doc = context.document
  sharedStyles = doc.documentData().layerStyles()
  sharedTextStyles = doc.documentData().layerTextStyles()
}

function compare(a,b) {
  if (a.name() < b.name())
    return -1;
  if (a.name() > b.name())
    return 1;
  return 0;
}
function parseLayerStyles (context, styles) {    
  initVars(context);
  var colors = []
  var shadows = []
  var sortedStyles = styles.objects().sort(compare);
  sortedStyles.forEach(function(style) {
    if(String(style.name()).charAt(0) == "[") {
      addColor(context, colors, style)
    } else {
      addShadow(context, shadows, style)
    }
  })
  
  return {colors: colors, shadows: shadows}
}
  
function writeLayerStyles (context, layerStyleMap) {
  initVars(context);
  var styleSheet = "";
  if (layerStyleMap.colors.length) {
  	styleSheet = styleSheet + "// COLORS\n" + writeColors(context, layerStyleMap.colors)
  }
  if (layerStyleMap.shadows.length) {
  	styleSheet = styleSheet + "\n// SHADOWS\n" + writeShadows(context, layerStyleMap.shadows)
  }
  return styleSheet
}

function addColor(context, colorsArray, style) {
  initVars(context);
  var thisName = String(style.name())
  thisName = thisName.slice(thisName.indexOf("]")+ 2)

  var tmp = {
    name: toCamelCase(thisName).trim() + "-color",
    value: "#" + style.value().firstEnabledFill().color().immutableModelObject().hexValue()
  }
  colorsArray.push(tmp)
}

function addShadow(context, shadowsArray, style) {
  initVars(context);
  tmp = {
    name: toCamelCase(String(style.name())),
    value: constructShadowValue(style.value())
  }
  shadowsArray.push(tmp)
}

function constructShadowValue(style) {
  var offsetX = style.firstEnabledShadow().offsetX();
  var offsetY = style.firstEnabledShadow().offsetY();
  var blurRadius = style.firstEnabledShadow().blurRadius();
  var rgba = style.firstEnabledShadow().color().toString().replace(/[a-z]|:/g, "")
  var temprgba = rgba.slice(rgba.indexOf("(") + 1, rgba.indexOf(")") - 1).split(" ");
  rgba = "("
  temprgba.forEach(function(value){
    rgba = rgba + removeZeros(value) + ", "
  })
  rgba = rgba.slice(0, -2) + ")"
  
  return `${offsetX}px ${offsetY}px ${blurRadius}px rgba${rgba}`
}
function removeZeros(str){
 
    var regEx1 = /[0]+$/;
    var regEx2 = /[.]$/;
    if (str.indexOf('.')>-1){
        str = str.replace(regEx1,'');  // Remove trailing 0's
    }
    str = str.replace(regEx2,'');  // Remove trailing decimal
 
    return str;
  
}
function toCamelCase(str) {
  return str.replace(/\s+/g, '-').replace(/\.+/g, '-').replace(/\,+/g, '-').toLowerCase();
}

function writeColors(context, colors) {
  initVars(context);
  var styles = ""
  colors.forEach(function(color) {
    styles = styles.concat(`$${color.name}: ${color.value};\n`)
  })
  return styles
}

function writeShadows(context, shadows) {
  initVars(context);
  var styles = ""
  shadows.forEach(function(shadow) {
    styles = styles.concat(`$${shadow.name}: ${shadow.value};\n`)
  })
  return styles
}





// Text Styles
function parseTextStyles (context, textStyles) {

  initVars(context);
  var desktop = []
  var mobile = []
  

  var styles = textStyles.objects().sort(compare)
  var typeStyles = getUniqueStyles(context, styles)
  typeStyles.forEach(function(thisStyle){
    if(String(thisStyle.name()).slice(0,2).toLowerCase() == "[m") {
      mobile.push(getTextStyleAsJson(context, thisStyle))
    } else {
      desktop.push(getTextStyleAsJson(context, thisStyle))
    }
  })
  return {"desktop": popPToTop(context, desktop), "mobile": popPToTop(context, mobile)};
}
function popPToTop (context, styles) {
  styles.forEach(function(style, indx){
    if (String(style.name).charAt(2).toLowerCase() == "p") {
      array_move(styles, indx, 0);
    }
  });
  return styles
}
function array_move(arr, old_index, new_index) {
    if (new_index >= arr.length) {
        var k = new_index - arr.length + 1;
        while (k--) {
            arr.push(undefined);
        }
    }
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
    return arr; 
};
function getTextStyleAsJson (context, style) {
  initVars(context);
  var attributes = style.style().textStyle().attributes();
  var color = attributes.MSAttributedStringColorAttribute;
  if (color != null) {
      var red = color.red();
      var green = color.green();
      var blue = color.blue();
      var alpha = color.alpha();
  }
  var name = String(style.name());
  var family = String(attributes.NSFont.fontDescriptor().objectForKey(NSFontNameAttribute))
  var size = String(attributes.NSFont.fontDescriptor().objectForKey(NSFontSizeAttribute)) * 1
  var par = attributes.NSParagraphStyle;
  if (par != null) {
      var align = par.alignment();
      var lineHeight = par.maximumLineHeight();
      var paragraphSpacing = par.paragraphSpacing();
  }
  var spacing = String(attributes.NSKern) * 1;
  var text = attributes.MSAttributedStringTextTransformAttribute;
  if (text != null) {
      var textTransform = String(attributes.MSAttributedStringTextTransformAttribute) * 1;
  } else {
      var textTransform = 0;
  }
  var strike = String(attributes.NSStrikethrough) * 1
  var underline = String(attributes.NSUnderline) * 1
  var style = {
    name: name,
    font: family,
    size: size,
    color: {
        red: red,
        green: green,
        blue: blue,
        alpha: alpha
    },
    alignment: align,
    spacing: spacing,
    lineHeight: lineHeight,
    paragraphSpacing: paragraphSpacing,
    textTransform: textTransform,
    strikethrough: strike,
    underline: underline
  };
  return style;
}
function getUniqueStyles(context, styles) {
  initVars(context);
  var uniqueStyles = [];
  styles.forEach(function(style){
    if (uniqueStyles.length === 0) {
      uniqueStyles.push(style)
    } else {
      var found = false;
      uniqueStyles.forEach(function(sortedStyle){

        // GET THE [TAG]
        var tag = getTag(String(sortedStyle.name()))
        log(String(style.name()).slice(1,tag.length + 1) + " == " + tag)
        if (String(style.name()).slice(1,tag.length + 1) == tag) {
          found = true;
        }
      })
      if (!found) {
        uniqueStyles.push(style)
      }
    }
  })
  return uniqueStyles;
}

function getTag (name) {
  var tag = name.substring(0, name.indexOf("]") + 1);
  if (tag.slice(0,1) == "[" && tag.slice(tag.length -1) == "]") {
    tag = tag.substring(1, tag.length - 1)
    if (tag.slice(-1).toLowerCase() == "l") {
      tag = tag.slice(0, -1)
    }
  } else {
    tag = name
  }
  return tag
}
function stripTag (name) {
  var tag = String(name.slice(0, String(name.indexOf("]") + 1)));
  if (tag.slice(0,1) == "[" && tag.slice(tag.length -1) == "]") {
    tag = tag.slice(1, tag.length - 1)
  } else {
    tag = name
  }
  return tag
}
function writeTypeStyles(context, styles) {
  initVars(context);
  var output = String("");
  styles.forEach(function(thisStyle) {
  	var styleName = String(thisStyle.name);
  	if (styleName.slice(3,4) == "L") {
  	  styleName = styleName.slice(0,3) + styleName.slice(4);
  	}
    var tag = stripTag(styleName)
    output = output.concat("// " + styleName + "\n");
    output = output.concat("@mixin " + toCamelCase(tag) + "-text-style {\n");
    output = output.concat("  font-family: " + thisStyle.font + ";\n");
    output = output.concat("  font-size: " + thisStyle.size + "px;\n")
    output = output.concat("  line-height: " + thisStyle.lineHeight + "px;\n")
    output = output.concat("  margin: 0 0 " + thisStyle.paragraphSpacing + "px 0;\n")
    output = output.concat("}\n")
  })
  return output
}


function saveScssToFile(context, fileData) {
  initVars(context);
  var app = NSApp.delegate();
  var save = NSSavePanel.savePanel();
  save.setNameFieldStringValue("styles.scss");
  save.setAllowedFileTypes([@"scss"]);
  save.setAllowsOtherFileTypes(false);
  save.setExtensionHidden(false);
  if (save.runModal()) {
	var path = save.URL().path();
	var file = NSString.stringWithString(fileData);
  	[file writeToFile:path atomically:true encoding:NSUTF8StringEncoding error:null];
  }
}

function exportScss (context) {
  initVars(context);
  var layerStyleMap = parseLayerStyles(context, sharedStyles)
  var layerStyleSheet = writeLayerStyles(context, layerStyleMap)
  var textStyles = parseTextStyles(context, sharedTextStyles)
  var textStyleSheet = ""
  if (textStyles.mobile.length > 0) {
    textStyleSheet = textStyleSheet + "\n// MOBILE TYPE STYLES\n" + writeTypeStyles(context, textStyles.mobile)
  }
  if (textStyles.desktop.length > 0) {
    textStyleSheet = textStyleSheet + "\n// DESKTOP TYPE STYLES\n" + writeTypeStyles(context, textStyles.desktop)
  }
  if (textStyleSheet.length > 0) {
    textStyleSheet = "\n// TYPE STYLES\n" + textStyleSheet
  }
  saveScssToFile(context, "" + layerStyleSheet + textStyleSheet)
}

function onRun (context) {
  exportScss(context)
}