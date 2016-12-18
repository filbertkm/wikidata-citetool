( function( wb, dv, mw, $ ) {

'use strict';

function CiteTool( configUrl ) {
	this.configUrl = configUrl;
	this.config = null;

	this.citoidClient = new mw.CitoidClient();
	this.citeToolReferenceEditor = null;
	this.citeToolAutofillLinkRenderer = null;
}

CiteTool.prototype.init = function() {
	var self = this;

	if ( !mw.config.exists( 'wbEntityId' ) ) {
		return;
	}

	$( '.wikibase-statementview' )
		.css( { 'border': 'solid 1px blue' } );

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
	var dfd = $.Deferred();

	$.ajax({
		url: this.configUrl,
		dataType: 'json',
		success: function( config ) {
			dfd.resolve( config );
		},
		error: function( result ) {
			console.log( 'Error loading citoid config' );
		}
	});

	return dfd.promise();
};

CiteTool.prototype.initAutofillLink = function( target ) {
	var self = this;

	if ( this.config === null ) {
		this.getConfig()
			.done( function( config ) {
				self.config = config;
				self.citeToolReferenceEditor = new wb.CiteToolReferenceEditor( config );
				self.citeToolAutofillLinkRenderer = new wb.CiteToolAutofillLinkRenderer(
					config,
					self.citoidClient,
					self.citeToolReferenceEditor
				);

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
		this.citeToolAutofillLinkRenderer.renderLink( target );
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

wb.CiteTool = CiteTool;

}( wikibase, dataValues, mediaWiki, jQuery ) );
