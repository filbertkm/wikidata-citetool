( function( mw, $ ) {

mw.loader.using(['jquery.wikibase.referenceview']).done( function() {

	function ReferenceDialog( config ) {
		ReferenceDialog.super.call( this, config );
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
		this.content = new OO.ui.FieldsetLayout( { $: this.$ } );

		this.urlInput = new OO.ui.TextInputWidget( { $: this.$ } );
		this.field = new OO.ui.FieldLayout( this.urlInput, {
			$: this.$,
			label: 'Enter url',
			align: 'top'
		});

		this.content.addItems( [ this.field ] );
		this.panel.$element.append( this.content.$element );

		this.$body.append( this.panel.$element );
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

		if ( action === 'save' ) {
			return new OO.ui.Process( function() {
				// dialog.close( { action: action } );
				console.log( this.urlInput.getValue() );
			}, this );
		}

		return ReferenceDialog.super.prototype.getActionProcess.call( this, action );
	};

	function init() {
	    $( '#mw-content-text' ).on( 'click', '.wikibase-statementview-references .wikibase-toolbar-button-add a', function() {
	    	$( '.wikibase-referenceview-new' ).css( {'display': 'none'});

	    	var windowManager = new OO.ui.WindowManager();
	    	$( 'body' ).append( windowManager.$element );

	    	var referenceDialog = new ReferenceDialog({
	    		size: 'medium'
	    	});

	    	windowManager.addWindows( [ referenceDialog ] );
	    	windowManager.openWindow( referenceDialog );
	    });
	}

    $( init );
});

}( mediaWiki, jQuery ) );
