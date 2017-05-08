( function( wb, dv, mw, $ ) {

'use strict';

function CiteToolReferenceEditor( config ) {
	this.config = config;

	this.citoidClient = new mw.CitoidClient();
	this.sparql = new wb.queryService.api.Sparql();
}

CiteToolReferenceEditor.prototype.addReferenceSnaksFromCitoidData = function( data, referenceView ) {
	console.log( data );

	var refView = $( referenceView ).data( 'referenceview' ),
		lv = this.getReferenceSnakListView( refView ),
		usedProperties = refView.value().getSnaks().getPropertyOrder(),
		self = this;

	var addedSnakItem = false;

	$.each( data, function( key, val ) {
		var propertyId = self.getPropertyForCitoidData( key );

		if ( propertyId !== null && usedProperties.indexOf( propertyId ) !== -1 ) {
			return;
		}

		switch ( key ) {
			case 'title':
				lv.addItem( self.getMonolingualValueSnak(
					propertyId,
					val,
					self.getTitleLanguage( val, data )
				) );

				addedSnakItem = true;

				break;
			case 'date':
			case 'accessDate':
				lv.addItem(
					self.getDateSnak( propertyId, val )
				);

				addedSnakItem = true;

				break;
			case 'ISSN':
				var queryProperty = self.getQueryPropertyForCitoidData( key );

				self.lookupItemByIdentifier( queryProperty, val )
					.done( function( itemId ) {
						console.log( itemId );
						console.log( propertyId );
						lv.addItem(
							self.getWikibaseItemSnak( propertyId, itemId )
						);

						addedSnakItem = true;
					} );

				break;
			default:
				break;
		}
	} );

	if ( addedSnakItem === true ) {
		lv.startEditing();

		refView._trigger( 'change' );
	}
};

CiteToolReferenceEditor.prototype.getReferenceSnakListView = function( refView ) {
	var refListView = refView.$listview.data( 'listview' ),
        snakListView = refListView.items(),
        snakListViewData = snakListView.data( 'snaklistview' ),
        listView = snakListViewData.$listview.data( 'listview' );

	return listView;
};

CiteToolReferenceEditor.prototype.getPropertyForCitoidData = function( key ) {
	if ( this.config.zoteroProperties[key] ) {
		return this.config.zoteroProperties[key];
	}

	return null;
};

CiteToolReferenceEditor.prototype.getQueryPropertyForCitoidData = function( key ) {
	if ( this.config.queryProperties[key] ) {
		return this.config.queryProperties[key];
	}

	return null;
};

CiteToolReferenceEditor.prototype.getTitleLanguage = function( title, data ) {
    var languageCode = mw.config.get( 'wgUserLanguage' );

    if ( data.language ) {
        if ( data.language === 'en-US' ) {
            languageCode = 'en';
        }
    }

	return languageCode;
};

CiteToolReferenceEditor.prototype.getMonolingualValueSnak = function( propertyId, title, languageCode ) {
	return new wb.datamodel.PropertyValueSnak(
		propertyId,
		new dv.MonolingualTextValue( languageCode, title )
	);
};

CiteToolReferenceEditor.prototype.getDateSnak = function( propertyId, dateString ) {
	var timestamp = dateString + 'T00:00:00Z';

	return new wb.datamodel.PropertyValueSnak(
		propertyId,
		new dv.TimeValue( timestamp )
	);
};

CiteToolReferenceEditor.prototype.getWikibaseItemSnak = function( propertyId, itemId ) {
	return new wb.datamodel.PropertyValueSnak(
		propertyId,
		new wb.datamodel.EntityId( itemId )
	);
};

CiteToolReferenceEditor.prototype.lookupItemByIdentifier = function( propertyId, value ) {
	var query = "SELECT ?identifier ?entity "
		+ "WHERE {  ?entity wdt:" + propertyId + " ?identifier . "
		+ "FILTER ( ?identifier in ('" + value + "') ) "
		+ "}";

    var dfd = $.Deferred(),
        baseUrl = 'https://query.wikidata.org/bigdata/namespace/wdq/sparql';

	$.ajax( {
        method: 'GET',
        url: baseUrl,
        data: {
			query: query,
			format: 'json'
		}
    } )
    .done( function( data ) {
		var uriPattern = /^http:\/\/www.wikidata.org\/entity\/([PQ]\d+)$/;

		console.log( data.results );

		if ( data.results.bindings.length > 0 ) {
			var result = data.results.bindings[0],
				uri = result.entity.value,
				matches = uri.match(uriPattern);

			dfd.resolve( matches[1] );
		} else {
			dfd.resolve( false );
		}
    } );

    return dfd.promise();
};

wb.CiteToolReferenceEditor = CiteToolReferenceEditor;

}( wikibase, dataValues, mediaWiki, jQuery ) );
