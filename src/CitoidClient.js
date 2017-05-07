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
