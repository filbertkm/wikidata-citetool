Wikidata Reference Tool
========================

Tool for making it easier to add references on Wikidata, with help of the Citoid service.

## Install

The tool works currently as a user script on-wiki.  To enable the script, add something like the following to your user's common.js page (e.g. "User:ExampleUser/common.js") on the wiki:

```
mw.loader.using(['wikibase'], function() {
	$.getScript( 'https://www.wikidata.org/w/index.php?title=User:Aude/CiteTool.js&action=raw&ctype=text/javascript', function() {
		var citeTool = new wb.CiteTool( 'https://www.wikidata.org/w/index.php?title=User:Aude/CiteProperties.json&action=raw&ctype=text/javascriptn' );
		citeTool.init();
	});
});

```

## Notes

* https://github.com/aurimasv/z2csl/blob/master/typeMap.xml
