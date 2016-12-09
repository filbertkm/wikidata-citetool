( function( mw, $ ) {

'use strict';

function CitoidClient() {

}

CitoidClient.prototype.search = function( value ) {
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

mw.CitoidClient = CitoidClient;

}( mediaWiki, jQuery ) );
