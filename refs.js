( function( mw, $ ) {

function ReferenceDialog( template, config ) {
	ReferenceDialog.super.call( this, config );

	this.template = template;
}

OO.inheritClass( ReferenceDialog, OO.ui.ProcessDialog );

ReferenceDialog.static.title = 'Add a reference';
ReferenceDialog.static.actions = [
	{ action: 'save', label: 'Save', flags: 'primary' },
	{ label: 'Cancel', flags: 'safe'}
];

ReferenceDialog.prototype.initialize = function() {
	ReferenceDialog.super.prototype.initialize.apply( this, arguments );

	this.panel = new OO.ui.PanelLayout( { $: this.$, padded: true, expanded: false });

	this.fieldSetLayout = new OO.ui.FieldsetLayout( { $: this.$ } );

	this.lookupInput = new OO.ui.TextInputWidget( {
		placeholder: 'Enter url'
	} );

	this.generateButton = new OO.ui.ButtonWidget( {
		'label': 'Generate'
	} );

	this.generateButton.connect( this, { click: 'onGenerateButtonClick' } );

	this.fieldSetLayout.addItems( [
		new OO.ui.ActionFieldLayout(
			this.lookupInput,
			this.generateButton,
			{
				label: 'Url',
			}
		)
	] );

	this.panel.$element.append( this.fieldSetLayout.$element );
	this.panel.$element.addClass( 'wikidata-refs-ReferencesWidget' );

	this.$body.append( this.panel.$element );
};

ReferenceDialog.prototype.onGenerateButtonClick = function( e ) {
	this.executeAction( 'lookup' );
};

ReferenceDialog.prototype.getSetupProcess = function( data ) {
	data = data || {};

	return ReferenceDialog.super.prototype.getSetupProcess.call( this, data )
		.next( function() {
			// @todo
		}, this );
};

ReferenceDialog.prototype.getActionProcess = function( action ) {
	var dialog = this;

	if ( action === 'lookup' ) {
		this.doLookup( this.lookupInput.getValue() );
	} else if ( action === 'save' ) {
		return new OO.ui.Process( function() {
			console.log( this.lookupInput.getValue() );
		}, this );
	}

	return ReferenceDialog.super.prototype.getActionProcess.call( this, action );
};

ReferenceDialog.prototype.doLookup = function( urlValue ) {
	var self = this;

	$.ajax( {
		method: 'GET',
		url: 'http://localhost:1970/api',
		data: {
			action: 'query',
			format: 'mediawiki',
			search: urlValue,
			basefields: true
		}
	} )
	.done( function( res ) {
		self.fieldSetLayout.addItems( [
			new OO.ui.FieldLayout(
				new OO.ui.TextInputWidget( {
					value: res[0].title
				} ), {
					label: 'Title'
				}
			)
		] );
	} );
}

function init() {
	$( '#mw-content-text' ).on( 'click', '.wikibase-statementview-references .wikibase-toolbar-button-add a', function() {
		$( '.wikibase-referenceview-new' ).css( {'display': 'none'});

		$.getJSON( 'http://wikidatawiki/scripts/template.json', function( template ) {
			var windowManager = new OO.ui.WindowManager();

			$( 'body' ).append( windowManager.$element );

			var referenceDialog = new ReferenceDialog( template, {
				size: 'medium'
			});

			windowManager.addWindows( [ referenceDialog ] );
			windowManager.openWindow( referenceDialog );
		});
	});
}

$( init );

}( mediaWiki, jQuery ) );
