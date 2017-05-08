/**
 Enable the script with the following code in your common.js

 mw.loader.using(['wikibase'], function() {
	$.getScript( 'https://www.wikidata.org/w/index.php?title=User:Aude/CiteTool.js&action=raw&ctype=text/javascript', function() {
		var citeTool = new wb.CiteTool( 'https://www.wikidata.org/w/index.php?title=User:Aude/CiteProperties.json&action=raw&ctype=text/javascript' );
		citeTool.init();
	});
});
 */

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

	$( '.wikibase-entityview' )
		.on( 'referenceviewafterstartediting', function( e ) {
			self.initAutofillLink( e.target );
		} );

	// @fixme the event also fires for other changes, like editing qualifiers
	$( '.wikibase-entityview' )
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
	if ( $( target ).find( '.wikibase-citetool-autofill' ).length > 0 ) {
		return;
	}

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

( function( wb, dv, mw, $ ) {

'use strict';

function CiteToolReferenceEditor( config ) {
	this.config = config;

	this.citoidClient = new mw.CitoidClient();
	this.sparql = new wb.queryService.api.Sparql();
}

CiteToolReferenceEditor.prototype.addReferenceSnaksFromCitoidData = function( data, referenceView ) {
	console.log( data );

	var refView = $( referenceView ).data( 'referenceview' ),
		lv = this.getReferenceSnakListView( refView ),
		usedProperties = refView.value().getSnaks().getPropertyOrder(),
		self = this;

	var addedSnakItem = false;

	$.each( data, function( key, val ) {
		var propertyId = self.getPropertyForCitoidData( key );

		if ( propertyId !== null && usedProperties.indexOf( propertyId ) !== -1 ) {
			return;
		}

		switch ( key ) {
			case 'title':
				lv.addItem( self.getMonolingualValueSnak(
					propertyId,
					val,
					self.getTitleLanguage( val, data )
				) );

				addedSnakItem = true;

				break;
			case 'date':
			case 'accessDate':
				lv.addItem(
					self.getDateSnak( propertyId, val )
				);

				addedSnakItem = true;

				break;
			case 'ISSN':
				var queryProperty = self.getQueryPropertyForCitoidData( key );

				self.lookupItemByIdentifier( queryProperty, val )
					.done( function( itemId ) {
						console.log( itemId );
						console.log( propertyId );
						lv.addItem(
							self.getWikibaseItemSnak( propertyId, itemId )
						);

						addedSnakItem = true;
					} );

				break;
			default:
				break;
		}
	} );

	if ( addedSnakItem === true ) {
		lv.startEditing();

		refView._trigger( 'change' );
	}
};

CiteToolReferenceEditor.prototype.getReferenceSnakListView = function( refView ) {
	var refListView = refView.$listview.data( 'listview' ),
        snakListView = refListView.items(),
        snakListViewData = snakListView.data( 'snaklistview' ),
        listView = snakListViewData.$listview.data( 'listview' );

	return listView;
};

CiteToolReferenceEditor.prototype.getPropertyForCitoidData = function( key ) {
	if ( this.config.zoteroProperties[key] ) {
		return this.config.zoteroProperties[key];
	}

	return null;
};

CiteToolReferenceEditor.prototype.getQueryPropertyForCitoidData = function( key ) {
	if ( this.config.queryProperties[key] ) {
		return this.config.queryProperties[key];
	}

	return null;
};

CiteToolReferenceEditor.prototype.getTitleLanguage = function( title, data ) {
    var languageCode = mw.config.get( 'wgUserLanguage' );

    if ( data.language ) {
        if ( data.language === 'en-US' ) {
            languageCode = 'en';
        }
    }

	return languageCode;
};

CiteToolReferenceEditor.prototype.getMonolingualValueSnak = function( propertyId, title, languageCode ) {
	return new wb.datamodel.PropertyValueSnak(
		propertyId,
		new dv.MonolingualTextValue( languageCode, title )
	);
};

CiteToolReferenceEditor.prototype.getDateSnak = function( propertyId, dateString ) {
	var timestamp = dateString + 'T00:00:00Z';

	return new wb.datamodel.PropertyValueSnak(
		propertyId,
		new dv.TimeValue( timestamp )
	);
};

CiteToolReferenceEditor.prototype.getWikibaseItemSnak = function( propertyId, itemId ) {
	return new wb.datamodel.PropertyValueSnak(
		propertyId,
		new wb.datamodel.EntityId( itemId )
	);
};

CiteToolReferenceEditor.prototype.lookupItemByIdentifier = function( propertyId, value ) {
	var query = "SELECT ?identifier ?entity "
		+ "WHERE {  ?entity wdt:" + propertyId + " ?identifier . "
		+ "FILTER ( ?identifier in ('" + value + "') ) "
		+ "}";

    var dfd = $.Deferred(),
        baseUrl = 'https://query.wikidata.org/bigdata/namespace/wdq/sparql';

	$.ajax( {
        method: 'GET',
        url: baseUrl,
        data: {
			query: query,
			format: 'json'
		}
    } )
    .done( function( data ) {
		var uriPattern = /^http:\/\/www.wikidata.org\/entity\/([PQ]\d+)$/;

		console.log( data.results );

		if ( data.results.bindings.length > 0 ) {
			var result = data.results.bindings[0],
				uri = result.entity.value,
				matches = uri.match(uriPattern);

			dfd.resolve( matches[1] );
		} else {
			dfd.resolve( false );
		}
    } );

    return dfd.promise();
};

wb.CiteToolReferenceEditor = CiteToolReferenceEditor;

}( wikibase, dataValues, mediaWiki, jQuery ) );

( function( mw, $ ) {

'use strict';

function CitoidClient() {

}

CitoidClient.prototype.search = function( value ) {
    var dfd = $.Deferred(),
        baseUrl = 'https://en.wikipedia.org/api/rest_v1/data/citation',
        format = 'mediawiki',
        url = baseUrl + '/' + format + '/' + encodeURIComponent(value);
    $.ajax( {
        method: 'GET',
        url: url,
        data: {}
    } )
    .done( function( citoidData ) {
        dfd.resolve( citoidData );
    } );

    return dfd.promise();
};

mw.CitoidClient = CitoidClient;

}( mediaWiki, jQuery ) );

var wikibase = wikibase || {};
wikibase.queryService = wikibase.queryService || {};
wikibase.queryService.api = wikibase.queryService.api || {};

wikibase.queryService.api.Sparql = ( function( $ ) {
	'use strict';

	var SPARQL_SERVICE_URI = 'https://query.wikidata.org/bigdata/namespace/wdq/sparql';

	var ERROR_CODES = {
			TIMEOUT: 10,
			MALFORMED: 20,
			SERVER: 30,
			UNKNOWN: 100
	};

	var ERROR_MAP = {
		'QueryTimeoutException: Query deadline is expired': ERROR_CODES.TIMEOUT,
		'MalformedQueryException: ': ERROR_CODES.MALFORMED
	};

	/**
	 * SPARQL API for the Wikibase query service
	 *
	 * @class wikibase.queryService.api.Sparql
	 * @license GNU GPL v2+
	 *
	 * @author Stanislav Malyshev
	 * @author Jonas Kress
	 * @constructor
	 *
	 * @param {string} [serviceUri] Optional URI to the SPARQL service endpoint
	 */
	function SELF( serviceUri ) {
		this._serviceUri = serviceUri || SPARQL_SERVICE_URI;
	}

	/**
	 * @property {Object}
	 */
	SELF.prototype.ERROR_CODES = ERROR_CODES;

	/**
	 * @property {Number}
	 * @private
	 */
	SELF.prototype._serviceUri = null;

	/**
	 * @property {Number}
	 * @private
	 */
	SELF.prototype._executionTime = null;

	/**
	 * @property {Object}
	 * @private
	 */
	SELF.prototype._error = null;

	/**
	 * @property {Number}
	 * @private
	 */
	SELF.prototype._resultLength = null;

	/**
	 * @property {Object}
	 * @private
	 */
	SELF.prototype._rawData = null;

	/**
	 * @property {string}
	 * @private
	 */
	SELF.prototype._queryUri = null;

	/**
	 * Submit a query to the API
	 *
	 * @return {jQuery.Promise}
	 */
	SELF.prototype.queryDataUpdatedTime = function() {
		// Cache the update time only for a minute
		var deferred = $.Deferred(), query = encodeURI( 'prefix schema: <http://schema.org/> ' +
				'SELECT * WHERE {<http://www.wikidata.org> schema:dateModified ?y}' ), url = this._serviceUri +
				'?query=' + query + '&nocache=' + Math.floor( Date.now() / 60000 ), settings = {
			headers: {
				Accept: 'application/sparql-results+json'
			}
		};

		$.ajax( url, settings )
			.done(
					function( data, textStatus, jqXHR ) {
						if ( !data.results.bindings[0] ) {
							deferred.reject();
							return;
						}
						var updateDate = new Date(
								data.results.bindings[0][data.head.vars[0]].value ), dateText = updateDate
								.toLocaleTimeString( navigator.language, {
									timeZoneName: 'short'
								} ) +
								', ' + updateDate.toLocaleDateString( navigator.language, {
									month: 'short',
									day: 'numeric',
									year: 'numeric'
								} );
							var differenceInSeconds = Math
									.round( ( new Date() - updateDate ) / 1000 );

						deferred.resolve( dateText, differenceInSeconds );
					} ).fail( function() {
				deferred.reject();
			} );

		return deferred;
	};

	/**
	 * Submit a query to the API
	 *
	 * @param {string[]} query
	 * @return {jQuery.Promise} query
	 */
	SELF.prototype.query = function( query ) {
		var self = this, deferred = $.Deferred(), settings = {
			headers: {
				Accept: 'application/sparql-results+json'
			}
		};

		this._queryUri = this._serviceUri + '?query=' + encodeURIComponent( query );

		this._executionTime = Date.now();
		$.ajax( this._queryUri, settings ).done( function( data, textStatus, request ) {
			self._executionTime = Date.now() - self._executionTime;

			if ( typeof data.boolean === 'boolean' ) {
				self._resultLength = 1;
			} else {
				self._resultLength = data.results.bindings.length || 0;
			}
			self._rawData = data;

			deferred.resolve();
		} ).fail( function( request, options, exception ) {
			self._executionTime = null;
			self._rawData = null;
			self._resultLength = null;
			self._generateErrorMessage( request, options, exception );

			deferred.reject();
		} );

		return deferred;
	};

	/**
	 * Get execution time in ms of the submitted query
	 */
	SELF.prototype._generateErrorMessage = function( request, options, exception ) {
		var error = {
			code: ERROR_CODES.UNKNOWN,
			message: null,
			debug: request.responseText
		};

		if ( request.status === 0 || exception ) {
			error.code = ERROR_CODES.SERVER;
			error.message = exception.message;
		}

		try {//extract error from server response
			var errorToMatch = error.debug.substring( error.debug
					.indexOf( 'java.util.concurrent.ExecutionException:' ) );

			for ( var errorKey in ERROR_MAP ) {
				if ( errorToMatch.indexOf( errorKey ) !== -1 ) {
					error.code = ERROR_MAP[ errorKey ];
					error.message = null;
				}
			}

			if ( error.code === ERROR_CODES.UNKNOWN || error.code === ERROR_CODES.MALFORMED ) {
				error.message = error.debug
						.match(
								/(java\.util\.concurrent\.ExecutionException\:)+(.*)(Exception\:)+(.*)/ )
						.pop().trim();
			}

		} catch ( e ) {
		}

		this._error = error;
	};

	/**
	 * Get execution time in seconds of the submitted query
	 *
	 * @return {Number}
	 */
	SELF.prototype.getExecutionTime = function() {
		return this._executionTime;
	};

	/**
	 * Get error of the submitted query if it has failed
	 *
	 * @return {object}
	 */
	SELF.prototype.getError = function() {
		return this._error;
	};

	/**
	 * Get result length of the submitted query if it has failed
	 *
	 * @return {Number}
	 */
	SELF.prototype.getResultLength = function() {
		return this._resultLength;
	};

	/**
	 * Get query URI
	 *
	 * @return {string}
	 */
	SELF.prototype.getQueryUri = function() {
		return this._queryUri;
	};

	/**
	 * Process SPARQL query result.
	 *
	 * @param {Object} data
	 * @param {Function} rowHandler
	 * @param {*} context
	 * @private
	 * @return {*} The provided context, modified by the rowHandler.
	 */
	SELF.prototype._processData = function( data, rowHandler, context ) {
		var results = data.results.bindings.length;
		for ( var i = 0; i < results; i++ ) {
			var rowBindings = {};
			for ( var j = 0; j < data.head.vars.length; j++ ) {
				if ( data.head.vars[j] in data.results.bindings[i] ) {
					rowBindings[data.head.vars[j]] = data.results.bindings[i][data.head.vars[j]];
				} else {
					rowBindings[data.head.vars[j]] = undefined;
				}
			}
			context = rowHandler( rowBindings, context );
		}
		return context;
	};

	/**
	 * Encode string as CSV.
	 *
	 * @param {string} string
	 * @return {string}
	 */
	SELF.prototype._encodeCsv = function( string ) {
		var result = string.replace( /"/g, '""' );
		if ( /[",\n]/.test( result ) ) {
			result = '"' + result + '"';
		}
		return result;
	};

	/**
	 * Get the raw result
	 *
	 * @return {Object} result
	 */
	SELF.prototype.getResultRawData = function() {
		return this._rawData;
	};

	/**
	 * Get the result of the submitted query as CSV
	 *
	 * @return {string} csv
	 */
	SELF.prototype.getResultAsCsv = function() {
		var self = this,
			data = self._rawData,
			output = data.head.vars.map( this._encodeCsv ).join( ',' ) + '\n';

		output = this._processData( data, function( row, out ) {
			var rowOut = '';
			var first = true;
			var rowCSV;
			for ( var rowVar in row ) {
				if ( row[rowVar] === undefined ) {
					rowCSV = '';
				} else {
					rowCSV = self._encodeCsv( row[rowVar].value );
				}
				if ( !first ) {
					rowOut += ',';
				} else {
					first = false;
				}
				rowOut += rowCSV;
			}
			rowOut += '\n';
			return out + rowOut;
		}, output );
		return output;
	};

	/**
	 * Get the result of the submitted query as JSON
	 *
	 * @return {string}
	 */
	SELF.prototype.getResultAsJson = function() {
		var output = [],
			data = this._rawData;

		output = this._processData( data, function( row, out ) {
			var extractRow = {};
			for ( var rowVar in row ) {
				extractRow[rowVar] = ( row[rowVar] || {} ).value;
			}
			out.push( extractRow );
			return out;
		}, output );
		return JSON.stringify( output );
	};

	/**
	 * Get the result of the submitted query as raw JSON
	 *
	 * @return {string}
	 */
	SELF.prototype.getResultAsAllJson = function() {
		return JSON.stringify( this._rawData );
	};

	/**
	 * Render value as per http://www.w3.org/TR/sparql11-results-csv-tsv/#tsv
	 *
	 * @param {Object} binding
	 * @return {string}
	 */
	SELF.prototype._renderValueTSV = function( binding ) {
		var value = binding.value.replace( /\t/g, '' );
		switch ( binding.type ) {
		case 'uri':
			return '<' + value + '>';
		case 'bnode':
			return '_:' + value;
		case 'literal':
			var lvalue = JSON.stringify( value );
			if ( binding['xml:lang'] ) {
				return lvalue + '@' + binding['xml:lang'];
			}
			if ( binding.datatype ) {
				if ( binding.datatype === 'http://www.w3.org/2001/XMLSchema#integer' ||
						binding.datatype === 'http://www.w3.org/2001/XMLSchema#decimal' ||
						binding.datatype === 'http://www.w3.org/2001/XMLSchema#double' ) {
					return value;
				}
				return lvalue + '^^<' + binding.datatype + '>';
			}
			return lvalue;
		}
		return value;
	};

	/**
	 * Get the result of the submitted query as SPARQL TSV
	 *
	 * @return {string}
	 */
	SELF.prototype.getSparqlTsv = function() {
		var self = this,
			data = this._rawData,
			output = data.head.vars.map( function( vname ) {
			return '?' + vname;
		} ).join( '\t' ) + '\n';

		output = this._processData( data, function( row, out ) {
			var rowOut = '';
			var first = true;
			var rowTSV;
			for ( var rowVar in row ) {
				if ( row[rowVar] === undefined ) {
					rowTSV = '';
				} else {
					rowTSV = self._renderValueTSV( row[rowVar] );
				}
				if ( !first ) {
					rowOut += '\t';
				} else {
					first = false;
				}
				rowOut += rowTSV;
			}
			rowOut += '\n';
			return out + rowOut;
		}, output );
		return output;
	};

	/**
	 * Get the result of the submitted query as simplified TSV
	 *
	 * @return {string}
	 */
	SELF.prototype.getSimpleTsv = function() {
		var data = this._rawData,
			output = data.head.vars.join( '\t' ) + '\n';

		output = this._processData( data, function( row, out ) {
			var rowOut = '';
			var first = true;
			var rowTSV;
			for ( var rowVar in row ) {
				if ( row[rowVar] === undefined ) {
					rowTSV = '';
				} else {
					rowTSV = row[rowVar].value.replace( /\t/g, '' );
				}
				if ( !first ) {
					rowOut += '\t';
				} else {
					first = false;
				}
				rowOut += rowTSV;
			}
			rowOut += '\n';
			return out + rowOut;
		}, output );
		return output;
	};

	return SELF;

}( jQuery ) );
