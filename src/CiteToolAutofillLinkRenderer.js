( function( wb, dv, mw, $ ) {

'use strict';

function CiteToolAutofillLinkRenderer( config, citoidClient, citeToolReferenceEditor ) {
	this.config = config;
	this.citoidClient = citoidClient;
	this.citeToolReferenceEditor = citeToolReferenceEditor;
}

CiteToolAutofillLinkRenderer.prototype.renderLink = function( referenceView ) {
    var self = this;

    var $span = $( '<span/>' )
        .attr({ 'class': 'wikibase-toolbar-button wikibase-citetool-autofill' })
        .css({ 'margin': '0 .5em' })
        .append(
            $( '<a/>' ).text( 'autofill' )
                .attr({ 'class': 'wikibase-referenceview-autofill' })
                .on( 'click', function( e ) {
                    e.preventDefault();
                    self.onAutofillClick( e.target );
                } )
            );

    this.getReferenceToolbarContainer( referenceView ).append( $span );
};

CiteToolAutofillLinkRenderer.prototype.getReferenceFromView = function( referenceView ) {
	// not a reference view change
	if ( referenceView === undefined ) {
		return null;
	}

	var refView = $( referenceView ).data( 'referenceview' );

	return refView.value();
};

CiteToolAutofillLinkRenderer.prototype.getLookupSnakProperty = function( reference ) {
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

CiteToolAutofillLinkRenderer.prototype.getLookupProperties = function() {
	var properties = [];

	if ( this.config.properties ) {
		properties = Object.keys( this.config.properties );
	}

	return properties;
};

CiteToolAutofillLinkRenderer.prototype.getReferenceToolbarContainer = function( referenceView ) {
	var $heading = $( referenceView ).find( '.wikibase-referenceview-heading' ),
		$toolbar = $heading.find( '.wikibase-toolbar-container' );

	return $toolbar;
};

CiteToolAutofillLinkRenderer.prototype.onAutofillClick = function( target ) {
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

CiteToolAutofillLinkRenderer.prototype.getLookupSnakValue = function( reference ) {
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

wb.CiteToolAutofillLinkRenderer = CiteToolAutofillLinkRenderer;

}( wikibase, dataValues, mediaWiki, jQuery ) );
