( function( wb, dv, mw, $ ) {

'use strict';

function CiteTool(configUrl) {
	this.configUrl = configUrl;
	this.config = {};
}

CiteTool.prototype.init = function() {
	var ns = mw.config.get( 'wgNamespaceNumber' ),
		enabledNamespaces = [ 0, 120 ],
		self = this;

	if ( enabledNamespaces.indexOf( ns ) === -1 || !mw.config.exists( 'wbEntityId' ) ) {
		return;
	}

	$( '.wikibase-statementview' )
		.on( 'referenceviewafterstartediting', function( e ) {
			$.ajax({
				url: self.configUrl,
				dataType: 'json',
				success: function( config ) {
					self.config = config;

					var reference = self.getReferenceFromView( e.target );

					if ( reference && self.getLookupSnakProperty( reference ) !== null ) {
						self.addAutofillLink( e.target );
					}

				},
				error: function( result ) {
					console.log( result );
				}
			});
		} );

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
	var self = this;

	$( referenceView ).find( '.wikibase-referenceview-heading' ).append(
		$( '<a/>' ).text( 'autofill' )
			.attr({ 'class': 'wikibase-referenceview-autofill' })
			.on( 'click', function( e ) {
				e.preventDefault();
				self.onAutofillClick( e.target );
			} )
		);
};

CiteTool.prototype.onAutofillClick = function( target ) {
	var referenceView = $( target ).closest( '.wikibase-referenceview' ),
		reference = this.getReferenceFromView( referenceView );

	if ( reference === null ) {
		return;
	}

	var value = this.getLookupSnakValue( reference );

	this.doLookup( value )
		.done( function( data ) {
			console.log( data );

			var refView = $( referenceView ).data( 'referenceview' ),
				refListView = refView.$listview.data( 'listview' ),
				snakListView = refListView.items(),
				slv = snakListView.data( 'snaklistview' ),
				lv = slv.$listview.data( 'listview' );

			if ( data[0] && data[0].title ) {
				var monoVal = new dv.MonolingualTextValue(
						mw.config.get( 'wgUserLanguage' ),
						data[0].title
					),
					snak = new wb.datamodel.PropertyValueSnak( 'P163', monoVal );

				lv.addItem( snak );
				lv.startEditing();

				refView._trigger( 'change' );
			}
		} );
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

CiteTool.prototype.doLookup = function( value ) {
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

wb.CiteTool = CiteTool;

}( wikibase, dataValues, mediaWiki, jQuery ) );
