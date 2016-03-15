define(function () {

    var pymManager = {

        init: function (iframeUid, iframeUrl, pymPath) {

            this.iframeUid = iframeUid;

            this.initIstatsThen(function initIframe() {
                require([pymPath], function (pym) {
                    var iframeContainer = document.getElementById(iframeUid);

                    iframeContainer.innerHTML = '';
                    pymManager.addLoadingSpinner(iframeContainer, iframeUid);

                    var pymParent = new pym.Parent(iframeUid, iframeUrl);

                    pymParent.onMessage('getHostInformation', function () {
                        var hostInformation = pymManager.getHostInformation();
                        pymParent.sendMessage('sendHostInformation', JSON.stringify(hostInformation));
                    });

                    pymParent.onMessage('pageLoaded', function () {
                        pymManager.removeLoadingSpinner();
                    });

                    pymParent.onMessage('istats', function (istatCall) {
                        istatCall = JSON.parse(istatCall);
                        pymManager.istats.log(istatCall.actionType, istatCall.actionName, {'view': istatCall.viewLabel});
                    });

                    pymParent.onMessage('window:scrollTo', function (data) {
                        data = JSON.parse(data);
                        var scrollPosition = pymManager.normaliseScrollPosition(data.position);

                        if (data.duration) {
                            pymManager.animatedScroll(scrollPosition, data.duration);
                        }
                        else {
                            window.scrollTo(0, scrollPosition);
                        }
                    });

                    pymParent.onMessage('window:redirectTo', function (url) {
                        window.location = url;
                    });

                    pymParent.onMessage('request', function (request) {
                        if (request === 'window:scroll:raw') {
                            pymManager.forwardScrollEvent(pymParent, {type: 'raw'});
                        }
                        else if (request === 'window:scroll:optimized') {
                            pymManager.forwardScrollEvent(pymParent, {type: 'optimized'});
                        }
                    });

                    pymParent.onMessage('checkForElement', function (elm) {
                        var elmInformation = pymManager.getElmInformation(elm);
                        pymParent.sendMessage('checkForElement', JSON.stringify(elmInformation));
                    });
                });
            });

        },

        initIstatsThen: function (callback) {
            if (this.onBbcDomain() && ('require' in window)) {
                require(['istats-1'], function (istats) {
                    pymManager.istats = istats;
                    callback();
                });
            }
            else {
                pymManager.istats = {
                    log: function () {}
                };
                callback();
            }
        },

        animatedScroll: function (scrollPosition, scrollDuration) {
            var frameRate      = 15,
                scrollStep     = (scrollPosition - window.scrollY) / (scrollDuration / frameRate),
                // if the content below the position we're trying to get to is too short, the scrollInterval never gets cleared - so check if we get stuck:
                lastScrollDiff = 9999,
                scrollInterval = setInterval(function () {
                    var distanceLeftToCover = Math.abs(window.scrollY - scrollPosition);
                    if (distanceLeftToCover > scrollStep && lastScrollDiff !== distanceLeftToCover) {
                        window.scrollBy(0, scrollStep);
                        lastScrollDiff = distanceLeftToCover;
                    }
                    else {
                        // there may still be a few pixels to travel
                        window.scrollTo(0, scrollPosition);
                        clearInterval(scrollInterval);
                    }
                }, frameRate);
        },

        normaliseScrollPosition: function (scrollPosition) {
            var rect = document.getElementById(pymManager.iframeUid).getBoundingClientRect(),
                scrollTop = window.pageYOffset || document.documentElement.scrollTop,
                iframeOffset = (scrollTop + rect.top);
            scrollPosition = iframeOffset + parseInt(scrollPosition, 10);
            return scrollPosition;
        },

        getHostInformation: function () {

            var hostId        = this.getWindowLocationOrigin(),
                urlParams     = window.location.hash || '',
                hostUrl       = window.location.href.replace(urlParams, ''),
                onBBC         = this.onBbcDomain();

            return {
                hostid:      hostId.split('//')[1],
                hostUrl:     hostUrl,
                onbbcdomain: onBBC,
                parameters:  this.hashToUrlParams(urlParams)
            };
        },

        hashToUrlParams: function (hash) {
            var parameters = {},
                keyValuePairs = hash.substr(1).split('&');

            for (var i = 0; i < keyValuePairs.length; i++) {
                if (keyValuePairs[i].indexOf('=') !== -1) {
                    var b = keyValuePairs[i].split('=');
                    parameters[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
                }
            }
            return parameters;
        },

        getWindowLocationOrigin: function () {
            if (window.location.origin) {
                return window.location.origin;
            }
            else {
                return window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
            }
        },

        onBbcDomain: function () {
            return window.location.host.search('bbc.co') > -1;
        },

        hostIsNewsApp: function (token) {
            return (token.indexOf('bbc_news_app') > -1);
        },

        addLoadingSpinner: function (link, iframeUID) {
            var spinnerHolder = document.createElement('div');
            spinnerHolder.id  = iframeUID + '--bbc-news-visual-journalism-loading-spinner';
            spinnerHolder.className = 'bbc-news-visual-journalism-loading-spinner';
            link.appendChild(spinnerHolder);
        },

        removeLoadingSpinner: function () {
            var spinner = document.getElementById(this.iframeUid + '--bbc-news-visual-journalism-loading-spinner');
            spinner.parentNode.removeChild(spinner);
        },

        delay: (function () {
            // fire event a set time after the main window event
            // Credit: http://stackoverflow.com/a/2854467
            var timer = 0;
            return function (callback, ms) {
                clearTimeout(timer);
                timer = setTimeout(callback, ms);
            };
        })(),

        forwardScrollEvent: function (pymParent, options) {
            var rawScrollEvent = function () {
                    pymManager.scrollEvent(pymParent, 'raw');
                },
                optimizedScrollEvent = function () {
                    pymManager.delay(function () {
                        pymManager.scrollEvent(pymParent, 'optimized');
                    }, 100);
                };

            if (options.type === 'optimized') {
                window.addEventListener('scroll', optimizedScrollEvent);
            }
            else {
                window.addEventListener('scroll', rawScrollEvent);
            }
        },

        scrollEvent: function (pymParent, type) {
            var iframe = document.getElementById(pymManager.iframeUid),
                rect = iframe.getBoundingClientRect(),
                scrollTopAsFarAsIframeIsConcerned = -rect.top;

            pymParent.sendMessage('window:scroll:' + type, scrollTopAsFarAsIframeIsConcerned);
        },

        getElmInformation: function (elm) {
            var elm           = elm,
                existence     = document.querySelector(elm) ? true : false;

            return {
                elm:           elm,
                existence:     existence
            };
        },

    };

    return pymManager;

});

