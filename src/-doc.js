/**
 Enable the script with the following code in your common.js

 mw.loader.using(['wikibase'], function() {
	$.getScript( 'https://www.wikidata.org/w/index.php?title=User:Aude/CiteTool.js&action=raw&ctype=text/javascript', function() {
		var citeTool = new wb.CiteTool( 'https://www.wikidata.org/w/index.php?title=User:Aude/CiteProperties.json&action=raw&ctype=text/javascript' );
		citeTool.init();
	});
});
 */
