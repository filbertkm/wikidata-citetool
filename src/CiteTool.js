( function( wb, mw, $ ) {

CiteToolSnakBuilder = {

	snakData: {},

	init: function( options ) {
		this.options = $.extend( {},
			this.options,
			options
		);
	},

	setSnakValue: function( template, value ) {
		var propertyId = template.id,
			data =  {
				"snaktype": "value",
				"property": propertyId,
				"datavalue": this.getDataValue( template.valuetype, value )
			};

		this.snakData[propertyId] = [ data ];
	},

	getDataValue: function( valuetype, value ) {
		var data = {};

		if ( valuetype === "monolingualtext" ) {
			data = {
				"type":"monolingualtext",
				"value": {
					"text": value,
					"language": this.options.userLanguage
				}
			};

			return data;
		} else if ( valuetype === "string" ) {
			data = {
				"type": "string",
				"value": value
			};
		}


		return data;
	},

	getSnakData: function() {
		return this.snakData;
	}

};

function CiteTool() {
	var self = this;
};

CiteTool.prototype.getReferenceFromView = function( referenceView ) {
	var refView = $( referenceView ).data( 'referenceview' );

	return refView.value();
};

CiteTool.prototype.hasLookupSnakProperty = function( reference ) {
	var hasLookupSnak = false,
		snaks = reference.getSnaks();

    snaks.each( function( k, snak ) {
        if ( snak.getPropertyId() === 'P15' ) {
            hasLookupSnak = true;
        }
    } );

	return hasLookupSnak;
};

CiteTool.prototype.getLookupSnakValue = function( reference ) {
	var value = null;

	reference.getSnaks().each( function( k, snak ) {
		if ( snak.getPropertyId() === 'P15' ) {
			value = snak.getValue().getValue();
		}
	} );

	return value;
};

CiteTool.prototype.onAutofillClick = function( target ) {
	var self = this,
		referenceView = $( target ).closest( '.wikibase-referenceview' ),
		reference = this.getReferenceFromView( referenceView );

	if ( reference === null ) {
		return;
	}

	var value = this.getLookupSnakValue( reference ),
		statementView = $( referenceView ).closest( '.wikibase-statementview' );

	this.doLookup( value )
		.done( function( data ) {
			console.log( data );

			var refView = $( referenceView ).data( 'referenceview' ),
				refListView = refView.$listview.data( 'listview' ),
				snakListView = refListView.items(),
				slv = snakListView.data( 'snaklistview' ),
				lv = slv.$listview.data( 'listview' );

			if ( data[0] && data[0].title ) {
				var monoVal = new dataValues.MonolingualTextValue(
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

ReferenceDialogLoader = {

	init: function( templateUrl ) {
		if ( ( mw.config.get( 'wgNamespaceNumber' ) !== 0
			&& mw.config.get( 'wgNamespaceNumber' ) !== 120 ) || !mw.config.exists( 'wbEntityId' ) ) {
			return;
		}

		var timer = setInterval(function() {
			$( '.wikibase-statementview' )
				.on( 'referenceviewafterstartediting', function( e ) {
					var $autofill = $( e.target ).find( '.wikibase-referenceview-autofill' );

					if ( $autofill.length ) {
						return;
					}

					var citeTool = new CiteTool(),
						reference = citeTool.getReferenceFromView( e.target );

					if ( reference && citeTool.hasLookupSnakProperty( reference ) ) {
						citeTool.addAutofillLink( e.target );
					}
				} );
		}, 300 );
	}

};

}( wikibase, mediaWiki, jQuery ) );

