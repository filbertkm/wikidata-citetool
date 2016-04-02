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
		flags: 'primary'
	},
	{
		label: 'Cancel',
		flags: 'safe'
	}
];

ReferenceDialog.prototype.getBodyHeight = function() {
	return this.panel.$element.outerHeight( true );
};

ReferenceDialog.prototype.initialize = function() {
	ReferenceDialog.super.prototype.initialize.apply( this, arguments );

	var self = this;

	this.panel = new OO.ui.PanelLayout( {
		$: this.$,
		padded: true,
		expanded: false
	} );

	this.fieldSetLayout = new OO.ui.FieldsetLayout( { $: this.$ } );

	this.lookupInput = new OO.ui.TextInputWidget( {
		placeholder: 'Enter url'
	} );

	this.generateButton = new OO.ui.ButtonWidget( {
		label: 'Generate'
	} );

	this.generateButton.connect( this, { click: 'onGenerateButtonClick' } );

	this.lookupLabel( 'P46' ).done( function( labelData ) {
		self.fieldSetLayout.addItems( [
			new OO.ui.FieldLayout(
				self.lookupInput,
				{
					label: labelData.entities['P46'].labels.en.value
				}
			)
		] );

		self.updateSize();
	} );

	this.panel.$element.append( this.fieldSetLayout.$element );
	this.panel.$element.addClass( 'wikidata-refs-ReferencesWidget' );

	this.$body.append( this.panel.$element );
};

ReferenceDialog.prototype.onGenerateButtonClick = function( e ) {
	this.executeAction( 'generate' );
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

	if ( action === 'generate' ) {
		this.doLookup( this.lookupInput.getValue() );
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
	.done( function( citoidData ) {
		self.lookupLabel( 'P78' ).done( function( labelData ) {
			self.fieldSetLayout.addItems( [
				new OO.ui.FieldLayout(
					new OO.ui.TextInputWidget( {
						value: citoidData[0].title
					} ), {
						label: labelData.entities['P78'].labels.en.value
					}
				)
			] );

			self.updateSize();
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
