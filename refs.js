( function( wb, mw, $ ) {

function ReferenceDialog( template, guid, baseRevId, config ) {
	ReferenceDialog.super.call( this, config );

	this.template = template;
	this.guid = guid;
	this.baseRevId = baseRevId;
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

	this._buildFormPanel();
	this._buildResultPanel();

	this.panels = {
		lookup: this.panel,
		result: this.resultPanel
	}

	this.stack = new OO.ui.StackLayout( {
		items: [ this.panel, this.resultPanel ],
		classes: [ 'container' ],
		expanded: false
	} );

	this.$body.append( this.stack.$element );
};

ReferenceDialog.prototype._buildFormPanel = function() {
	this.panel = new OO.ui.PanelLayout( {
		$: this.$,
		padded: true,
		expanded: false,
		classes: [ 'refdialog-panel-lookup' ]
	} );

	this.fieldSetLayout = new OO.ui.FieldsetLayout( { $: this.$ } );

	this.lookupInput = new OO.ui.TextInputWidget( {
		placeholder: 'Enter url'
	} );

	this.fieldSetLayout.addItems( [
		new OO.ui.FieldLayout(
			this.lookupInput,
			{
				label: 'URL'
			}
		)
	] );

	this.panel.$element.append( this.fieldSetLayout.$element );
	this.panel.$element.addClass( 'wikidata-refs-ReferencesWidget' );
};

ReferenceDialog.prototype._buildResultPanel = function() {
	this.resultPanel = new OO.ui.PanelLayout( {
		$content: $( '<h3>Result</h3>' ),
		classes: [ 'refdialog-panel-result' ],
		padded: true,
		scrollable: true,
		expanded: false
	} );
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
			return self.doLookup( self.lookupInput.getValue() );
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

		console.log( citoidData );

		$.each( citoidData[0], function( key, value ) {
			if ( !self.template[key] ) {
				return;
			}

			var entityId = self.template[key]["id"];

			self.lookupLabel( entityId ).done( function( labelData ) {
				self.setSnakValue( self.template[key], value );

				var $result = $( '<div>'
					+ labelData.entities[entityId].labels.en.value + ': ' + value
				 	+ '</div>'
				);

				self.resultPanel.$element.append( $result );

				self.actions.setMode( 'result' );
				self.setModePanel( 'result' );
				self.updateSize();
			} );
		} );
	} );
};

ReferenceDialog.prototype.setSnakValue = function( template, value ) {
	var propertyId = template["id"],
		data = 	{
			"snaktype": "value",
			"property": propertyId,
			"datavalue": this.getDataValue( template.valuetype, value )
		};

	this.snakData[propertyId] = [ data ];
};

ReferenceDialog.prototype.getDataValue = function( valuetype, value ) {
	console.log( valuetype );
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
	var baseURI = 'http://wikidatawiki/w/api.php',
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

function init() {
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
				if ( value.indexOf( "wikibase-statement-Q" ) == 0 ) {
					guid = value.substring( 19 );
				}
			} );

			if ( guid !== null ) {
				$.getJSON( 'https://rawgit.com/filbertkm/wikidata-refs/master/template.json', function( template ) {
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
				} );
			}
		} );

	var $lookupSpan = $( '<span>' )
		.attr( { 'class': 'wikibase-toolbar-button' } )
		.css( { 'margin-left': '.4em' } )
		.append( $lookupLink );

	$( '.wikibase-statementview-references .wikibase-addtoolbar-container' ).append( $lookupSpan );
}

$( '.wikibase-statementview' ).last().on( 'statementviewcreate', function() {
	$( init );
} );

}( wikibase, mediaWiki, jQuery ) );
