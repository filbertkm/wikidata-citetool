( function( wb, dv, mw, $ ) {

'use strict';

function CiteTool( configUrl ) {
	this.configUrl = configUrl;
	this.config = null;

	this.citoidClient = new mw.CitoidClient();
	this.citeToolReferenceEditor = null;
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

	// @fixme the event also fires for other changes, like editing qualifiers
	$( '.wikibase-statementview' )
		.on( 'snakviewchange', function( e ) {
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
				self.citeToolReferenceEditor = new wb.CiteToolReferenceEditor( self.config );
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
	// not a reference view change
	if ( referenceView === undefined ) {
		return null;
	}

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
			if ( data[0] ) {
				self.citeToolReferenceEditor.addReferenceSnaksFromCitoidData(
					data[0],
					referenceView
				);
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

wb.CiteTool = CiteTool;

}( wikibase, dataValues, mediaWiki, jQuery ) );
