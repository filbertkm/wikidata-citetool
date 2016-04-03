( function( mw, $ ) {

function ReferenceDialog( template, config ) {
	ReferenceDialog.super.call( this, config );

	this.template = template;
}

OO.inheritClass( ReferenceDialog, OO.ui.ProcessDialog );

ReferenceDialog.static.title = 'Add a reference';
ReferenceDialog.static.actions = [
	{
		action: 'generate',
		label: 'Generate',
		flags: [ 'primary', 'constructive' ],
		modes: [ 'form' ]
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
		modes: [ 'form', 'result' ]
	}
];

ReferenceDialog.prototype.getBodyHeight = function() {
	return this.panel.$element.outerHeight( true );
};

ReferenceDialog.prototype.initialize = function() {
	ReferenceDialog.super.prototype.initialize.apply( this, arguments );

	this._buildFormPanel();

	this.stack = new OO.ui.StackLayout( {
		items: [ this.panel ],
		classes: [ 'container' ]
	} );

	this.$body.append( this.stack.$element );
};

ReferenceDialog.prototype._buildFormPanel = function() {
	this.panel = new OO.ui.PanelLayout( {
		$: this.$,
		padded: true,
		expanded: false,
		classes: [ 'refdialog-panel-form' ]
	} );

	this.fieldSetLayout = new OO.ui.FieldsetLayout( { $: this.$ } );

	this.lookupInput = new OO.ui.TextInputWidget( {
		placeholder: 'Enter url'
	} );

	this.generateButton = new OO.ui.ButtonWidget( {
		label: 'Generate'
	} );

	this.generateButton.connect( this, { click: 'onGenerateButtonClick' } );

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

ReferenceDialog.prototype.onGenerateButtonClick = function( e ) {
	this.executeAction( 'generate' );
};

ReferenceDialog.prototype.getSetupProcess = function( data ) {
	data = data || {};

	return ReferenceDialog.super.prototype.getSetupProcess.call( this, data )
		.next( function() {
			this.setModePanel( 'form' );
			this.actions.setMode( 'form' );
		}, this );
};

ReferenceDialog.prototype.getActionProcess = function( action ) {
	var self = this;

	if ( action === 'generate' ) {
		return new OO.ui.Process( function () {
			return self.doLookup( self.lookupInput.getValue() );
		} );
	}

	return ReferenceDialog.super.prototype.getActionProcess.call( this, action );
};

ReferenceDialog.prototype.setModePanel = function ( panelName, processPanelName, fromSelect ) {
	this.stack.setItem( this.panel );
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
		$.each( citoidData[0], function( key, value ) {
			console.log( citoidData );
			if ( !self.template[key] ) {
				return;
			}

			var entityId = self.template[key];

			self.lookupLabel( entityId ).done( function( labelData ) {
				self.fieldSetLayout.addItems( [
					new OO.ui.FieldLayout(
						new OO.ui.TextInputWidget( {
							value: citoidData[0].title
						} ), {
							label: labelData.entities[entityId].labels.en.value
						}
					)
				] );

				self.actions.setMode( 'result' );
				self.updateSize();
			} );
		} );
	} );
}

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

			$.getJSON( 'http://wikidatawiki/scripts/template.json', function( template ) {
				var windowManager = new OO.ui.WindowManager();

				$( 'body' ).append( windowManager.$element );

				var referenceDialog = new ReferenceDialog( template, {
					size: 'large'
				} );

				windowManager.addWindows( [ referenceDialog ] );
				windowManager.openWindow( referenceDialog );
			} );
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

}( mediaWiki, jQuery ) );
