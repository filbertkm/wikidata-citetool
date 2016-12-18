( function( wb, dv, mw, $ ) {

'use strict';

function CiteToolReferenceEditor( config ) {
	this.config = config;

	this.citoidClient = new mw.CitoidClient();
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

wb.CiteToolReferenceEditor = CiteToolReferenceEditor;

}( wikibase, dataValues, mediaWiki, jQuery ) );
