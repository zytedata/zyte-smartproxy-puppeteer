# Zyte SmartProxy Puppeteer
[![made-with-javascript](https://img.shields.io/badge/Made%20with-JavaScript-1f425f.svg)](https://www.javascript.com)
[![npm](https://img.shields.io/npm/v/zyte-smartproxy-puppeteer)](https://www.npmjs.com/package/zyte-smartproxy-puppeteer)

Use [Puppeteer](https://github.com/puppeteer/puppeteer/) with
[Smart Proxy Manager](https://www.zyte.com/smart-proxy-manager/) easily!

A wrapper over Puppeteer to provide Zyte Smart Proxy Manager specific functionalities.

## QuickStart

1. **Install Zyte SmartProxy Puppeteer**

```
npm install zyte-smartproxy-puppeteer
```

2. **Create a file `sample.js` with following content and replace `<SPM_APIKEY>` with your SPM Apikey**

``` javascript
const puppeteer = require('zyte-smartproxy-puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        spm_apikey: '<SPM_APIKEY>',
        ignoreHTTPSErrors: true,
        headless: false,
        static_bypass: false, //  enable to save bandwidth (but may break some websites)
        block_ads: false, //  enable to save bandwidth (but may break some websites)
    });
    console.log('Before new page');
    const page = await browser.newPage();

    console.log('Opening page ...');
    try {
        await page.goto('https://toscrape.com/', {timeout: 180000});
    } catch(err) {
        console.log(err);
    }

    console.log('Taking a screenshot ...');
    await page.screenshot({path: 'screenshot.png'});
    await browser.close();
})();
```

Make sure that you're able to make `https` requests using Smart Proxy Manager by following this guide [Fetching HTTPS pages with Zyte Smart Proxy Manager](https://docs.zyte.com/smart-proxy-manager/next-steps/fetching-https-pages-with-smart-proxy.html)

3. **Run `sample.js` using Node**

``` bash
node sample.js
```

## API

`ZyteProxyPuppeteer.launch` accepts all the arguments accepted by `Puppeteer.launch` and some
additional arguments defined below:

| Argument | Default Value | Description |
|----------|---------------|-------------|
| `spm_apikey` | `undefined` | Zyte Smart Proxy Manager API key that can be found on your zyte.com account. |
| `spm_host` | `http://proxy.zyte.com:8011` | Zyte Smart Proxy Manager proxy host. |
| `static_bypass` | `true` | When `true` ZyteProxyPuppeteer will skip proxy use for static assets defined by `static_bypass_regex` or pass `false` to use proxy. |
| `static_bypass_regex` | `/.*?\.(?:txt\|json\|css\|less\|gif\|ico\|jpe?g\|svg\|png\|webp\|mkv\|mp4\|mpe?g\|webm\|eot\|ttf\|woff2?)$/` | Regex to use filtering URLs for `static_bypass`. |
| `block_ads` | `true` | When `true` ZyteProxyPuppeteer will block ads defined by `block_list` using `@cliqz/adblocker-puppeteer` package. |
| `block_list` | `['https://secure.fanboy.co.nz/easylist.txt', 'https://secure.fanboy.co.nz/easyprivacy.txt']` | Block list to be used by ZyteProxyPuppeteer in order to initiate blocker enginer using `@cliqz/adblocker-puppeteer` and block ads |
| `headers` | `{'X-Crawlera-No-Bancheck': '1', 'X-Crawlera-Profile': 'pass', 'X-Crawlera-Cookies': 'disable'}` | List of headers to be appended to requests |

## Notes
- Some websites may not work with `block_ads` and `static_bypass` enabled (default). Try to disable them if you encounter any issues.

- When using `headless: true` mode, values generated for some browser-specific headers are a bit different, which may be detected by websites. Try using ['X-Crawlera-Profile': 'desktop'](https://docs.zyte.com/smart-proxy-manager.html#x-crawlera-profile) in that case:
``` javascript
    const browser = await puppeteer.launch({
        spm_apikey: '<SPM_APIKEY>',
        ignoreHTTPSErrors: true,
        headless: true,
        headers: {'X-Crawlera-No-Bancheck': '1', 'X-Crawlera-Profile': 'desktop', 'X-Crawlera-Cookies': 'disable'}
    });
```

- When connecting to a remote Chrome browser instance, it should be launched with these arguments:
```
--proxy-server=http://proxy.zyte.com:8011 --disable-site-isolation-trials
```

- Consider our new [zyte-smartproxy-plugin](https://github.com/zytedata/zyte-smartproxy-plugin) for [playwright-extra](https://github.com/berstend/puppeteer-extra/tree/master/packages/playwright-extra) 
and [puppeteer-extra](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra) frameworks.
