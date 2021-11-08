const puppeteer = require('puppeteer');
const http = require('http');

class ZytePuppeteer {
    SPMHost = 'brandview.crawlera.com:8010';

    _getSPMSession() {
        const SPMHost = this.SPMHost
        const options = {
            method: 'POST',
            auth: `${this.apikey}:`,
        };
        return new Promise(function(resolve, reject) {
            http.get(`http://${SPMHost}/sessions`, options, (res) => {
                const { statusCode } = res;
                let error;
                if (statusCode !== 200 && !res.headers['x-crawlera-session']) {
                    error = new Error('Request Failed.\n' +
                                    `Status Code: ${statusCode}`);
                }
                if (error) {
                    console.error(error.message);
                    // Consume response data to free up memory
                    res.resume();
                    return;
                }
                resolve(res.headers['x-crawlera-session'])
            }).on('error', (e) => {
                console.error(`Got error: ${e.message}, cannot initiate session.`);
            });
        });
    };

    _bypassProxyRequest(url) {
        return new Promise(function(resolve, reject) {
            http.get(url, {}, (res) => {
                const { statusCode } = res;
                let error;
                if (statusCode !== 200) {
                    error = new Error('Request Failed.\n' +
                                    `Status Code: ${statusCode}`);
                }
                if (error) {
                    console.error(error.message);
                    // Consume response data to free up memory
                    res.resume();
                    return;
                }
                let rawData = '';
                res.on('data', (chunk) => { rawData += chunk; });
                res.on('end', () => {
                    try {
                    res.body = rawData;
                    } catch (e) {
                        console.error(e.message);
                    }
                });
                resolve(res);
            }).on('error', (e) => {
                console.error(`Got error: ${e.message}`);
            });
        });
    }

    _patchPageCreation(browser) {
        browser._createPageInContext = (function(originalMethod, context, apikey, SPMSessionId, page_without_proxy) {
            return async function() {
                const page = await originalMethod.apply(context, arguments);
                await page.setRequestInterception(true);
                page.on('request', async (interceptedRequest) => {
                    const headers = interceptedRequest.headers();
                    headers['X-Crawlera-Session'] = SPMSessionId;
                    interceptedRequest.continue({ headers });
                });
                await page.authenticate({
                    username: apikey,
                    password: '',
                });
                await page.goto('about:blank');
                return page;
            }
        })(browser._createPageInContext, browser, this.apikey, this.SPMSessionId, this.page_without_proxy)
    }

    async launch(options) {
        this.apikey = options.spm_apikey
        this.SPMSessionId = await this._getSPMSession();
        const necessary_options = {
            ignoreHTTPSErrors: true,
            headless: false,
            args: [ `--proxy-server=http://${this.SPMHost}` ]
        }
        options = {...options, ...necessary_options}
        const browser = await puppeteer.launch(options);
        this.browser_without_proxy = await puppeteer.launch();
        this.page_without_proxy = this.browser_without_proxy.newPage();
        this._patchPageCreation(browser);
        return browser;
    }
}

module.exports = new ZytePuppeteer();
