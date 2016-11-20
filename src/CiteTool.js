( function( wb, mw, $ ) {

var CiteTool = {

	init: function( options ) {
		this.options = $.extend( {},
			this.options,
			options
		);
	},

	makeLink: function() {
		var self = this;

		var iconWidget = new OO.ui.IconWidget( {
			icon: 'search',
			iconTitle: 'Lookup'
		} );

		iconWidget.$element
			.on( 'click', function( e ) {
				e.preventDefault();

				$( '.wikibase-referenceview-new' ).css( { 'display': 'none' } );

				var $statement = e.target.closest( '.wikibase-statementview' ),
					classes = $statement.getAttribute( 'class' ).split( ' ' ),
					guid = null;

				$.each( classes, function( key, value ) {
					if ( value.match( /wikibase-statement-Q/i ) ) {
						guid = value.substring( 19 );
					}
				} );

				if ( guid !== null ) {
					$.ajax({
						url: self.options.templateUrl,
						dataType: 'json',
						success: function( template ) {
							var windowManager = new OO.ui.WindowManager();

							$( 'body' ).append( windowManager.$element );

							var referenceDialog = new ReferenceDialog(
								template,
								guid,
								mw.config.get( 'wgRevisionId' ),
								{
									size: 'large'
								}
							);

							windowManager.addWindows( [ referenceDialog ] );
							windowManager.openWindow( referenceDialog );
						}
					});
				}
			} );

		return iconWidget.$element;
	}

};

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

function FormPanelView() {

	var lookupInput;

	var render = function() {
		var panel = new OO.ui.PanelLayout( {
			padded: true,
			expanded: false,
			classes: [ 'refdialog-panel-lookup' ]
		} );

		var fieldSetLayout = new OO.ui.FieldsetLayout();

		lookupInput = new OO.ui.TextInputWidget( {
			placeholder: 'Enter url'
		} );

		fieldSetLayout.addItems( [
			new OO.ui.FieldLayout(
				lookupInput,
				{
					label: 'URL'
				}
			)
		] );

		panel.$element.append( fieldSetLayout.$element );
		panel.$element.addClass( 'wikidata-refs-ReferencesWidget' );

		return panel;
	};

	var getLookupInputValue = function() {
		return lookupInput.getValue();
	};

	return {
		render: render,
		getLookupInputValue: getLookupInputValue
	};

}

function ResultsPanelView() {

	var resultsPanel;

	var render = function() {
		resultsPanel = new OO.ui.PanelLayout( {
			$content: $( '<h3>Result</h3>' ),
			classes: [ 'refdialog-panel-result' ],
			padded: true,
			scrollable: true,
			expanded: false
		} );

		return resultsPanel;
	};

	var appendResult = function( $result ) {
		resultsPanel.$element.append( $result );
	};

	return {
		appendResult: appendResult,
		render: render
	};

}

ReferenceDialogLoader = {};

function ReferenceDialog( template, guid, baseRevId, config ) {
	ReferenceDialog.super.call( this, config );

	this.template = template;
	this.guid = guid;
	this.baseRevId = baseRevId;

	this.formPanelView = new FormPanelView();
	this.resultsPanelView = new ResultsPanelView();
}

OO.inheritClass( ReferenceDialog, OO.ui.ProcessDialog );

ReferenceDialog.static.title = 'Add a reference';
ReferenceDialog.static.actions = [
	{
		action: 'lookup',
		label: 'Lookup',
		flags: [ 'primary', 'constructive' ],
		modes: [ 'lookup' ]
	},
	{
		action: 'save',
		label: 'Save',
		flags: [ 'primary', 'constructive' ],
		modes: [ 'result' ]
	},
	{
		label: 'Cancel',
		flags: 'safe',
		modes: [ 'lookup', 'result' ]
	}
];

ReferenceDialog.prototype.initialize = function() {
	ReferenceDialog.super.prototype.initialize.apply( this, arguments );

	this.citoidData = null;
	this.snakData = {};

	var panel = this.formPanelView.render(),
		resultsPanel = this.resultsPanelView.render();

	this.panels = {
		lookup: panel,
		result: resultsPanel
	};

	this.stack = new OO.ui.StackLayout( {
		items: [ panel, resultsPanel ],
		classes: [ 'container' ],
		expanded: false
	} );

	this.$body.append( this.stack.$element );
};

ReferenceDialog.prototype.getSetupProcess = function( data ) {
	data = data || {};

	return ReferenceDialog.super.prototype.getSetupProcess.call( this, data )
		.next( function() {
			this.setModePanel( 'lookup' );
			this.actions.setMode( 'lookup' );
		}, this );
};

ReferenceDialog.prototype.getActionProcess = function( action ) {
	var self = this;

	if ( action === 'lookup' ) {
		return new OO.ui.Process( function () {
			return self.doLookup( self.formPanelView.getLookupInputValue() );
		} );
	} else if ( action === 'save' ) {
		return new OO.ui.Process( function() {
			return self.saveReference();
		} );
	}

	return ReferenceDialog.super.prototype.getActionProcess.call( this, action );
};

ReferenceDialog.prototype.setModePanel = function( panelName ) {
	this.stack.setItem( this.panels[panelName] );
};

ReferenceDialog.prototype.doLookup = function( urlValue ) {
	var self = this;

	return $.ajax( {
		method: 'GET',
		url: 'https://citoid.wikimedia.org/api',
		data: {
			action: 'query',
			format: 'mediawiki',
			search: urlValue,
			basefields: true,
			jsonp: true
		}
	} )
	.then( function( citoidData ) {
		self.data = citoidData,

		self.snakBuilder = Object.create( CiteToolSnakBuilder ),
		self.snakBuilder.init( {
			userLanguage: mw.config.get( 'wgUserLanguage' )
		} ); ;

		$.each( citoidData[0], function( key, value ) {
			if ( !self.template[key] ) {
				return;
			}

			var entityId = self.template[key].id;

			self.$resultTable = $( '<table>' )
				.attr( { 'id': 'wikidata-citetool-results' } );

			self.lookupLabel( entityId ).done( function( labelData ) {
				self.snakBuilder.setSnakValue( self.template[key], value );

				var $row = $( '<tr>' ),
					$propertyCell = $( '<td>' ).text( labelData.entities[entityId].labels.en.value ),
					$valueCell = $( '<td>' ).text( value );

				$row.append( $propertyCell );
				$row.append( $valueCell );

				self.$resultTable.append( $row );

				self.resultsPanelView.appendResult( self.$resultTable );

				self.actions.setMode( 'result' );
				self.setModePanel( 'result' );
				self.updateSize();
			} );
		} );
	} );
};

ReferenceDialog.prototype.saveReference = function() {
	var api = new wb.api.RepoApi( new mw.Api() );

	return api.setReference( this.guid, this.snakBuilder.getSnakData(), this.baseRevId )
		.then( function( res ) {
			console.log( res );
		} );
};

ReferenceDialog.prototype.lookupLabel = function( entityIds ) {
	var baseURI = '/w/api.php',
		params = {
			action: 'wbgetentities',
			ids: entityIds,
			props: 'labels',
			format: 'json'
		};

	return $.ajax( {
		url: baseURI,
		data: params,
		dataType: 'jsonp',
		jsonp: 'callback'
	} );
};


function CiteToolController() {
	var self = this;
};

CiteToolController.prototype.hasLookupSnakProperty = function( referenceView ) {
    var refView = $( referenceView ).data( 'referenceview' ),
        reference = refView.value(),
        snaks = reference.getSnaks(),
		hasLookupSnak = false;

    snaks.each( function( k, snak ) {
        if ( snak.getPropertyId() === 'P15' ) {
            hasLookupSnak = true;
        }
    } );

	return hasLookupSnak;
};

CiteToolController.prototype.getLookupSnakValue = function( referenceView ) {
	var refView = $( referenceView ).data( 'referenceview' ),
		reference = refView.value(),
		snaks = reference.getSnaks()
		value = null;

	snaks.each( function( k, snak ) {
		if ( snak.getPropertyId() === 'P15' ) {
			value = snak.getValue().getValue();
		}
	} );

	return value;
};

CiteToolController.prototype.onAutofillClick = function( target ) {
	var refview = $( target ).closest( '.wikibase-referenceview' ),
		value = this.getLookupSnakValue( refview );

		this.doLookup( value );
};

CiteToolController.prototype.addAutofillLink = function( referenceView ) {
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

CiteToolController.prototype.doLookup = function( value ) {
	return $.ajax( {
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
    .then( function( citoidData ) {
        console.log( citoidData );
	} );
};

ReferenceDialogLoader = {

	init: function( templateUrl ) {
		console.log( 'init' );
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

					var citeToolController = new CiteToolController();

					if ( citeToolController.hasLookupSnakProperty( e.target ) ) {
						citeToolController.addAutofillLink( e.target );
					}
				} );
		}, 300 );
	}

};

}( wikibase, mediaWiki, jQuery ) );
