( function( wb, dv, mw, $ ) {

'use strict';

function CiteTool(configUrl) {
	this.configUrl = configUrl;
	this.config = null;

	this.citoidClient = new mw.CitoidClient();
}

CiteTool.prototype.init = function() {
	var self = this;

	if ( !mw.config.exists( 'wbEntityId' ) ) {
		return;
	}

	$( '.wikibase-statementview' )
		.on( 'referenceviewafterstartediting', function( e ) {
			self.initAutofillLink( e.target );
		} );

	$( '.wikibase-statementview' )
		.on( 'snakviewchange.wikibase.referenceview', function( e ) {
			self.initAutofillLink( e.target );
		} );

};

CiteTool.prototype.getConfig = function() {
	var self = this,
		dfd = $.Deferred();

	$.ajax({
		url: self.configUrl,
		dataType: 'json',
		success: function( config ) {
			self.config = config;

			dfd.resolve( config );
		},
		error: function( result ) {
			console.log( result );
		}
	});

	return dfd.promise();
};

CiteTool.prototype.initAutofillLink = function( target ) {
	var self = this;

	if ( this.config === null ) {
		this.getConfig()
			.done( function() {
				self.checkReferenceAndAddAutofillLink( target );
			} );
	} else {
		var refViews = $( target ).closest( '.wikibase-referenceview' );
		self.checkReferenceAndAddAutofillLink( refViews[0] );
	}
};

CiteTool.prototype.checkReferenceAndAddAutofillLink = function( target ) {
	var reference = this.getReferenceFromView( target );

	if ( reference && this.getLookupSnakProperty( reference ) !== null ) {
		this.addAutofillLink( target );
	}
};

CiteTool.prototype.getReferenceFromView = function( referenceView ) {
	var refView = $( referenceView ).data( 'referenceview' );

	return refView.value();
};

CiteTool.prototype.getLookupSnakProperty = function( reference ) {
	var snaks = reference.getSnaks(),
		lookupProperties = this.getLookupProperties(),
		lookupProperty = null;

	snaks.each( function( k, snak ) {
		var propertyId = snak.getPropertyId();

		if ( lookupProperties.indexOf( propertyId ) !== -1 ) {
			if ( lookupProperty === null ) {
				lookupProperty = propertyId;
			}
		}
	} );

	return lookupProperty;
};

CiteTool.prototype.getLookupProperties = function() {
	var properties = [];

	if ( this.config.properties ) {
		properties = Object.keys( this.config.properties );
	}

	return properties;
};

CiteTool.prototype.addAutofillLink = function( referenceView ) {
	var self = this,
		$heading = $( referenceView ).find( '.wikibase-referenceview-heading' ),
		$toolbar = $heading.find( '.wikibase-toolbar-container' );

	var $span = $( '<span/>' )
		.attr({ 'class': 'wikibase-toolbar-button' })
		.css({ 'margin': '0 .5em' })
		.append(
			$( '<a/>' ).text( 'autofill' )
				.attr({ 'class': 'wikibase-referenceview-autofill' })
				.on( 'click', function( e ) {
					e.preventDefault();
					self.onAutofillClick( e.target );
				} )
			);

	$toolbar.append( $span );
};

CiteTool.prototype.onAutofillClick = function( target ) {
	var referenceView = $( target ).closest( '.wikibase-referenceview' ),
		reference = this.getReferenceFromView( referenceView ),
		self = this;

	if ( reference === null ) {
		return;
	}

	var value = this.getLookupSnakValue( reference );

	this.citoidClient.search( value )
		.done( function( data ) {
			console.log( data );

			var refView = $( referenceView ).data( 'referenceview' ),
				refListView = refView.$listview.data( 'listview' ),
				snakListView = refListView.items(),
				slv = snakListView.data( 'snaklistview' ),
				lv = slv.$listview.data( 'listview' );

			if ( data[0] ) {
				$.each( data[0], function( key, val ) {
					if ( key === 'title' ) {
						lv.addItem( self.getTitleSnak( val, data[0] ) );
					} else if ( key === 'date' ) {
						lv.addItem( self.getDateSnak(
							self.config.zoteroProperties.date,
							val
						) );
					} else if ( key === 'accessDate' ) {
						lv.addItem( self.getDateSnak(
							self.config.zoteroProperties.accessDate,
							val
						) );
					}
				} );

				lv.startEditing();

				refView._trigger( 'change' );
			}
		} );
};

CiteTool.prototype.getTitleSnak = function( title, data ) {
	var languageCode = mw.config.get( 'wgUserLanguage' );

	if ( data.language ) {
		if ( data.language === 'en-US' ) {
			languageCode = 'en';
		}
	}

	return new wb.datamodel.PropertyValueSnak(
		this.config.zoteroProperties.title,
		new dv.MonolingualTextValue( languageCode, title )
	);
};

CiteTool.prototype.getDateSnak = function( propertyId, dateString ) {
	var timestamp = dateString + 'T00:00:00Z';

	return new wb.datamodel.PropertyValueSnak(
		propertyId,
		new dv.TimeValue( timestamp )
	);
};

CiteTool.prototype.getLookupSnakValue = function( reference ) {
	var value = null,
		lookupProperties = this.getLookupProperties();

	reference.getSnaks().each( function( k, snak ) {
		var propertyId = snak.getPropertyId();

		if ( lookupProperties.indexOf( propertyId ) !== -1 ) {
			value = snak.getValue().getValue();
		}
	} );

	return value;
};

wb.CiteTool = CiteTool;

}( wikibase, dataValues, mediaWiki, jQuery ) );

( function( mw, $ ) {

'use strict';

function CitoidClient() {

}

CitoidClient.prototype.search = function( value ) {
    var dfd = $.Deferred();

    $.ajax( {
        method: 'GET',
        url: 'https://citoid.wikimedia.org/api',
        data: {
            action: 'query',
            format: 'mediawiki',
            search: value,
            basefields: true,
            jsonp: true
        }
    } )
    .done( function( citoidData ) {
        dfd.resolve( citoidData );
    } );

    return dfd.promise();
};

mw.CitoidClient = CitoidClient;

}( mediaWiki, jQuery ) );
