define([], function () {

    var pymChild,
        urlInformation;

    function subscribeToHostEvent(event, callback) {
        pymChild.sendMessage('request', event);
        pymChild.onMessage(event, callback);
    }

    return {

        wrapper: 'iframe', // developer shouldn't ever need this - but just in case.

        url: function () {
            return urlInformation;
        },

        onOptimizedScroll: function (callback) {
            subscribeToHostEvent('window:scroll:optimized', callback);
        },

        onRawScroll: function (callback) {
            subscribeToHostEvent('window:scroll:raw', callback);
        },

        scrollTo: function (options) {
            if ( isNaN(options.position) ) {
                throw new Error ('Called wrapper.scrollTo without specifying a position to scroll to!');
            }

            pymChild.sendMessage('window:scrollTo', JSON.stringify(options));
        },

        markPageAsLoaded: function () {
            pymChild.sendMessage('pageLoaded', true); // have to send a parameter :(
            pymChild.sendHeight();
        },

        // developer can specifically tell Pym to update its height
        repaint: function () {
            pymChild.sendHeight();
        },

        callIstats: function (details) {
            pymChild.sendMessage('istats', JSON.stringify(details));
        },

        __iframe_init: function (pymFromIndexHtml, hostInformation, applicationHtml) {
            pymChild = pymFromIndexHtml;
            urlInformation = hostInformation;
            var wrapperElement = document.querySelector('.bbc-news-vj-wrapper');
            if ( !urlInformation.onbbcdomain && wrapperElement ) {
                wrapperElement.className = wrapperElement.className.replace('bbc-news-vj-onbbcdomain', '');
            }

            document.getElementById('bbc-news-vj-iframe-content-placeholder').innerHTML = applicationHtml;
        }

    };

});
