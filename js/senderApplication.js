(function(root) {
    var session;

    function spread() {
        return Object.assign.apply([{}].concat(arguments));
    }


    function CastDeck(options) {
        var castDeck = this;
        this.options = options || {};
        this.state = {
            zoom: 1,
            rotation: 0,
            url: '',
            overscan: [0,0,0,0],
            aspect: 'native'
        };

        const log = function() {
            if (castDeck.options.log) {
                console.log.apply(console, arguments);
            }
        };

        const checkApi = function() {
            if (!(chrome && chrome.cast)) {
                console.error('google cast api not found, please include www.gstatic.com/cv/js/sender/v1/cast_sender.js');
            }
        }

        const update = (fn) => (value) => {
            fn(value);
            return this.sendMessage(this.state);
        }

        this.cast = function(url, cb) {
            checkApi();
            log('cast');
            return new Promise((resolve, reject) => {
                chrome.cast.requestSession((_session) => {
                    log('has session', _session);

                    session = _session;

                    session.addMessageListener(
                        'urn:x-cast:org.firstlegoleague.castDeck',
                        function() {
                            log('received message', arguments);
                            cb && cb.apply(cb, arguments);
                        }
                    );

                    resolve(this.updateUrl(url));
                }, reject);
            })
        }

        this.stop = function() {
            log('stop');
            session.stop();
        }

        this.sendMessage = function(obj) {
            return new Promise((resolve, reject) => {
                log('sending', obj);
                session.sendMessage(
                    'urn:x-cast:org.firstlegoleague.castDeck',
                    JSON.stringify(obj),
                    () => resolve(obj),
                    reject
                );
            });
        }

        this.setZoom = update((value) => this.state.zoom = value);
        this.zoomIn = () => this.setZoom(this.state.zoom + 0.1);
        this.zoomOut = () => this.setZoom(this.state.zoom - 0.1);
        this.zoomReset = () => this.setZoom(1);

        const rotateDelta = update((delta) => this.state.rotation = (this.state.rotation + delta + 360) % 360);
        this.rotateCCW = () => rotateDelta(-90);
        this.rotateCW = () => rotateDelta(90);

        this.updateUrl = update((value) => this.state.url = value);

        const adjustOverscan = (index) => update((value) => this.state.overscan[index] = value);
        this.adjustTop = adjustOverscan(0);
        this.adjustRight = adjustOverscan(1);
        this.adjustBottom = adjustOverscan(2);
        this.adjustLeft = adjustOverscan(3);

        this.updateAspect = update((value) => this.state.aspect = value);

        this.initCast = function() {
            log('initinig cast api');
            var sessionRequest = new chrome.cast.SessionRequest('4EC978AD');
            var apiConfig = new chrome.cast.ApiConfig(
                sessionRequest,
                (_session) => {
                    session = _session;
                    log('has config', session)
                },
                (receiver) => log('has receiver', receiver)
            );
            chrome.cast.initialize(
                apiConfig,
                () => log('cast init success'),
                (err) => log('cast init error', err)
            );
        }
    }

    root.castDeck = new CastDeck();

    window['__onGCastApiAvailable'] = function(loaded, errorInfo) {
        if (loaded) {
            root.castDeck.initCast();
        } else {
            console.log(errorInfo);
        }
    };


}(window));
