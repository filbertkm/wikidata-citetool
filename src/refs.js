( function( wb, mw, $ ) {

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
		self.data = citoidData;

		$.each( citoidData[0], function( key, value ) {
			if ( !self.template[key] ) {
				return;
			}

			var entityId = self.template[key].id;

			self.lookupLabel( entityId ).done( function( labelData ) {
				console.log( entityId );
				console.log( labelData );

				self.setSnakValue( self.template[key], value );

				var $result = $( '<div>'
					+ labelData.entities[entityId].labels.en.value + ': ' + value
				 	+ '</div>'
				);

				self.resultsPanelView.appendResult( $result );

				self.actions.setMode( 'result' );
				self.setModePanel( 'result' );
				self.updateSize();
			} );
		} );
	} );
};

ReferenceDialog.prototype.setSnakValue = function( template, value ) {
	var propertyId = template.id,
		data = 	{
			"snaktype": "value",
			"property": propertyId,
			"datavalue": this.getDataValue( template.valuetype, value )
		};

	this.snakData[propertyId] = [ data ];
};

ReferenceDialog.prototype.getDataValue = function( valuetype, value ) {
	var data = {};

	if ( valuetype === "monolingualtext" ) {
		data = {
			"type":"monolingualtext",
			"value": {
				"text": value,
				"language": "en"
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
};

ReferenceDialog.prototype.saveReference = function() {
	var api = new wb.api.RepoApi( new mw.Api() );

	return api.setReference( this.guid, this.snakData, this.baseRevId )
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

ReferenceDialogLoader = {

	init: function( templateUrl ) {
		if ( ( mw.config.get( 'wgNamespaceNumber' ) !== 0
			&& mw.config.get( 'wgNamespaceNumber' ) !== 120 ) || !mw.config.exists( 'wbEntityId' ) ) {
			return;
		}

		var $lookupLink = $( '<a>' )
			.text( 'lookup reference' )
			.attr( {
				href: '#'
			} )
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
						url: templateUrl,
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

		var $lookupSpan = $( '<div>' )
			.attr( { 'class': 'wikibase-toolbar-button wikibase-ref-lookup' } )
			.css( { 'float': 'left' } )
			.append( $lookupLink );

		var timer = setInterval(function() {
			var $refs = $(  '.wikibase-statementview-references-container .wikibase-toolbar-button-add' );

			if ( $refs.length ) {
				$lookupSpan.insertBefore( $refs );
				window.clearInterval(timer);
			}
		}, 200 );
	}

};

}( wikibase, mediaWiki, jQuery ) );
