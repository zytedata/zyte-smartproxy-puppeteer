const puppeteer = require('puppeteer');
const adblocker = require('@cliqz/adblocker-puppeteer');
const cross_fetch = require('cross-fetch');


class BlockingContext extends adblocker.BlockingContext {
    constructor(page, blocker) {
        this.page = page;
        this.blocker = blocker;
        this.onFrameNavigated = (frame) => blocker.onFrameNavigated(frame);
        this.onDomContentLoaded = () => blocker.onFrameNavigated(this.page.mainFrame());
        this.onRequest = (request) => blocker.onRequest(request);
    }
    async enable() {
        if (this.blocker.config.loadCosmeticFilters) {
            this.page.on('frameattached', this.onFrameNavigated);
            this.page.on('domcontentloaded', this.onDomContentLoaded);
        }
    }
    async disable() {
        if (this.blocker.config.loadCosmeticFilters) {
            this.page.off('frameattached', this.onFrameNavigated);
            this.page.off('domcontentloaded', this.onDomContentLoaded);
        }
    }
}

class PuppeteerBlocker extends adblocker.PuppeteerBlocker {
    constructor() {
        super(...arguments);
    }
    async enableBlockingInPage(page) {
        let context = this.contexts.get(page);
        if (context !== undefined) {
            return context;
        }
        context = new BlockingContext(page, this);
        this.contexts.set(page, context);
        await context.enable();
        return context;
    }
    isRequestBlocked = (details) => {
        const request = adblocker.fromPuppeteerDetails(details);
        if (this.config.guessRequestTypeFromUrl === true && request.type === 'other') {
            request.guessTypeOfRequest();
        }
        const frame = details.frame();
        if (request.isMainFrame() ||
            (request.type === 'document' && frame !== null && frame.parentFrame() === null)) {
            return false;
        }
        const { redirect, match } = this.match(request);
        if (redirect !== undefined) {
            if (redirect.contentType.endsWith(';base64')) {
                details.respond({
                    status: 200,
                    headers: {},
                    body: Buffer.from(redirect.body, 'base64'),
                    contentType: redirect.contentType.slice(0, -7),
                }, this.priority);
            }
            else {
                details.respond({
                    status: 200,
                    headers: {},
                    body: redirect.body,
                    contentType: redirect.contentType,
                }, this.priority);
            }
            return true;
        }
        if (match === true) {
            details.abort('blockedbyclient', this.priority);
            return true;
        }
        return false;
    };
}

class ZyteProxyPuppeteer {

    async _configure_zyte_proxy_puppeteer(options) {
        options = options || {}
        this.apikey = options.spm_apikey;
        this.spm_host = options.spm_host || 'http://proxy.zyte.com:8011';
        this.static_bypass = options.static_bypass || true;
        this.static_bypass_regex = this.static_bypass_regex || /.*?\.(?:txt|css|eot|gif|ico|jpe?g|js|less|mkv|mp4|mpe?g|png|ttf|webm|webp|woff2?)$/;
        this.block_ads = options.block_ads === true ? true : false;
        this.block_list = options.block_list || [
            'https://easylist.to/easylist/easylist.txt',
            'https://easylist.to/easylist/easyprivacy.txt',
        ];
        this.blocker = await PuppeteerBlocker.fromLists(cross_fetch.fetch, this.block_list);
    }

    _patchPageCreation(browser) {
        browser._createPageInContext = (
            function(originalMethod, context, module_context) {
                return async function() {
                    const page = await originalMethod.apply(context, arguments);
                    await page.setRequestInterception(true);
                    page.on('request', async (interceptedRequest) => {
                        if (
                            module_context.block_ads &&
                            module_context.blocker.isRequestBlocked(interceptedRequest)
                        ) return;
                        try {
                            const headers = interceptedRequest.headers();
                            if (
                                module_context.static_bypass &&
                                module_context.static_bypass_regex.test(
                                    interceptedRequest.url()
                                )
                            ) {
                                const response = await cross_fetch.fetch(interceptedRequest.url())
                                const headers = {}
                                for (var pair of response.headers.entries()) {
                                    headers[pair[0]] = pair[1];
                                }
                                var response_body = await response.arrayBuffer();
                                response_body = new Buffer.from(response_body);
                                interceptedRequest.respond({
                                    status: response.status,
                                    contentType: response.headers.get('content-type'),
                                    headers: headers,
                                    body: response_body,
                                });
                            }
                            else {
                                if (module_context.SPMSessionId) {
                                    headers['X-Crawlera-Session'] = module_context.SPMSessionId;
                                }
                                else {
                                    headers['X-Crawlera-Session'] = 'create';
                                }
                                interceptedRequest.continue({ headers });
                            }
                        }
                        catch (e) {
                            // Uncomment to debug the issue with failed request.
                            console.log('Error while interception', e);
                            interceptedRequest.continue();
                        }
                    });
                    page.on('response', async (response) => {
                        const headers = response.headers();
                        if (response.ok() && headers['x-crawlera-session']) {
                            module_context.SPMSessionId = Number(headers['x-crawlera-session']);
                        }
                    });
                    await page.authenticate({
                        username: module_context.apikey,
                        password: '',
                    });
                    return page;
                }
            }
        )(browser._createPageInContext, browser, this);
    }

    async launch(options) {
        await this._configure_zyte_proxy_puppeteer(options)
        const necessary_options = {
            ignoreHTTPSErrors: true,
            headless: false,
            args: [
                '--no-sandbox',
                '--auto-open-devtools-for-tabs',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--disable-web-security',
                `--proxy-server=${this.spm_host}`,
                '--ignore-certificate-errors',
                '--ignore-certificate-errors-spki-list'
            ]
        }
        options = {...necessary_options, ...options}
        const browser = await puppeteer.launch(options);
        this._patchPageCreation(browser);
        return browser;
    }
}

module.exports = new ZyteProxyPuppeteer();
