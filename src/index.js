const puppeteer = require('puppeteer');
const adBlockerPuppeteer = require('@cliqz/adblocker-puppeteer');
const fetch = require('cross-fetch');
const { version } = require('../package.json');

const defaultSPMHost = 'http://proxy.zyte.com:8011';
const defaultStaticBypassRegex = /.*?\.(?:txt|json|css|less|js|mjs|cjs|gif|ico|jpe?g|svg|png|webp|mkv|mp4|mpe?g|webm|eot|ttf|woff2?)$/;
const defaultBlockList = [
    'https://easylist.to/easylist/easylist.txt',
    'https://easylist.to/easylist/easyprivacy.txt',
];

class ZyteSmartProxyPuppeteer {
    async launch(options) {
        await this._init(options)

        if (this.apikey) {
            const spmArgs = [
                `--proxy-server=${this.spmHost}`,
                // without this argument requests from embedded iframes are not intercepted
                // https://bugs.chromium.org/p/chromium/issues/detail?id=924937#c10
                '--disable-site-isolation-trials', 
            ];

            if ('args' in options) {
                options.args = options.args.concat(spmArgs);
            } else {
                options.args = spmArgs;
            }
        }

        const browser = await puppeteer.launch(options);

        if (this.apikey) {
            this._patchPageCreation(browser);
        }

        return browser;
    }

    async _init(options) {
        if (options === undefined)
            return;

        this.apikey = options.spm_apikey;
        this.spmHost = options.spm_host || defaultSPMHost;

        this.staticBypass = options.static_bypass !== false;
        this.staticBypassRegex = options.static_bypass_regex || defaultStaticBypassRegex;

        this.blockAds = options.block_ads !== false;
        this.blockList = options.block_list || defaultBlockList;
        if (this.blockAds) {
            this.adBlocker = await ZyteAdBlocker.fromLists(fetch, this.blockList);
        }
    }

    _patchPageCreation(browser) {
        browser._createPageInContext = (
            function(originalMethod, zyteSPP) {
                return async function() {
                    const page = await originalMethod.apply(this, arguments);

                    const cdpSession = await page.target().createCDPSession();
                    await cdpSession.send('Fetch.enable', {
                        patterns: [{requestStage: 'Request'}, {requestStage: 'Response'}],
                        handleAuthRequests: true,
                    });

                    cdpSession.on('Fetch.requestPaused', async (event) => {
                        if (zyteSPP._isResponse(event)){
                            zyteSPP._verifyResponseSessionId(event.responseHeaders);
                            zyteSPP._continueResponse(cdpSession, event);
                        } else {
                            if (zyteSPP.blockAds && zyteSPP.adBlocker.isAd(event, page))
                                zyteSPP._blockRequest(cdpSession, event)
                            else if (zyteSPP.staticBypass && zyteSPP._isStaticContent(event))
                                zyteSPP._bypassRequest(cdpSession, event);
                            else 
                                zyteSPP._continueRequest(cdpSession, event);
                        }
                    });

                    cdpSession.on('Fetch.authRequired', async (event) => {
                        zyteSPP._respondToAuthChallenge(cdpSession, event)
                    });

                    return page;
                }
            }
        )(browser._createPageInContext, this);
    }

    _isResponse(event){
        return event.responseStatusCode || event.responseErrorReason;
    }


    _verifyResponseSessionId(responseHeaders) {
        if (responseHeaders) {
            for (const header of responseHeaders) {
                if (header.name === 'X-Crawlera-Error' &&
                    header.value === 'bad_session_id'
                )
                    this.spmSessionId = undefined;
            }
        }
    }

    async _continueResponse(cdpSession, event) {
        if (cdpSession.connection())
            await cdpSession.send('Fetch.continueRequest', {
                requestId: event.requestId,
            });
    }

    async _blockRequest(cdpSession, event) {
        if (cdpSession.connection())
            await cdpSession.send('Fetch.failRequest', {
                requestId: event.requestId,
                errorReason: 'BlockedByClient',
            });
    }

    _isStaticContent(event) {
        return event.request.method === 'GET' &&
            event.request.urlFragment === undefined &&
            this.staticBypassRegex.test(event.request.url)
    }

    async _bypassRequest(cdpSession, event) {
        const response = await fetch(event.request.url)
        const response_body = (await response.buffer()).toString('base64');

        const response_headers = []
        for (const pair of response.headers.entries()) {
            if (pair[1] !== undefined)
                response_headers.push({name: pair[0], value: pair[1] + ''});
        }
        
        if (cdpSession.connection())
            await cdpSession.send('Fetch.fulfillRequest', {
                requestId: event.requestId,
                responseCode: response.status,
                responseHeaders: response_headers,
                body: response_body,
            });
    }
    
    async _continueRequest(cdpSession, event) {
        const headers = event.request.headers;
        if (this.spmSessionId === undefined) {
            this.spmSessionId = await this._createSPMSession();
        }
        headers['X-Crawlera-Session'] = this.spmSessionId;
        headers['X-Crawlera-Client'] = 'zyte-smartproxy-puppeteer/' + version;
        headers['X-Crawlera-No-Bancheck'] = '1';
        headers['X-Crawlera-Profile'] = 'pass';
        headers['X-Crawlera-Cookies'] = 'disable';

        if (cdpSession.connection())
            await cdpSession.send('Fetch.continueRequest', {
                requestId: event.requestId,
                headers: headersArray(headers),
            });
    }

    async _respondToAuthChallenge(cdpSession, event){
        const parameters = {requestId: event.requestId}

        if (this._isSPMAuthChallenge(event)) 
            parameters.authChallengeResponse = {
                response: 'ProvideCredentials',
                username: this.apikey,
                password: '',
            };
        else 
            parameters.authChallengeResponse = {response: 'Default'};
        
        await cdpSession.send('Fetch.continueWithAuth', parameters);
    }

    _isSPMAuthChallenge(event) {
        return event.authChallenge.source === 'Proxy' && 
            event.authChallenge.origin === this.spmHost
    }
    
    async _createSPMSession() {
        let sessionId = '';

        const url = this.spmHost + '/sessions';
        const auth = 'Basic ' + Buffer.from(this.apikey + ":").toString('base64');
        const headers = {
            'Authorization': auth,
            'X-Crawlera-Client': 'zyte-smartproxy-puppeteer/' + version,
        };

        const response = await fetch(url, {method: 'POST', headers: headers});

        if (response.ok)
            sessionId = await response.text();
        else
            throw new Error(`Error creating SPM session. Response: ${response.status} ${response.statusText} ${await response.text()}`);

        return sessionId;
    }
}

class ZyteAdBlocker extends adBlockerPuppeteer.PuppeteerBlocker {
    isAd(event, page){
        const sourceUrl = page.mainFrame().url();
        const url = event.request.url;
        const type = event.resourceType.toLowerCase();

        const request = adBlockerPuppeteer.makeRequest({
            requestId: `${type}-${url}-${sourceUrl}`,
            sourceUrl,
            type,
            url,
        });

        const { match } = this.match(request);
        return match === true;
    }
}

function headersArray(headers) {
    const result = [];
    for (const name in headers) {
        if (headers[name] !== undefined)
            result.push({name, value: headers[name] + ''});
    }
    return result;
}

module.exports = new ZyteSmartProxyPuppeteer();
