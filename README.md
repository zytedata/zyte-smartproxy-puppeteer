# Zyte Proxy Puppeteer
[![made-with-javascript](https://img.shields.io/badge/Made%20with-JavaScript-1f425f.svg)](https://www.javascript.com)
[![npm](https://img.shields.io/npm/v/zyte-proxy-puppeteer)](https://www.npmjs.com/package/zyte-proxy-puppeteer)

Use [Puppeteer](https://github.com/puppeteer/puppeteer/) with
[Smart Proxy Manager](https://www.zyte.com/smart-proxy-manager/) easily!

A wrapper over Puppeteer to provide Zyte Smart Proxy Manager specific functionalities.


## QuickStart

1. **Install Zyte Proxy Puppeteer**

```
npm install zyte-proxy-puppeteer
```

2. **Create a file `sample.js` with following content and replace `<SPM_APIKEY>` with your SPM Apikey**

``` javascript
const puppeteer = require('zyte-proxy-puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        spm_apikey: '<SPM_APIKEY>'
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
| `spm_apikey` (required) | `undefined` | Zyte Smart Proxy Manager API key that can be found on your zyte.com account. |
| `spm_host` | `http://proxy.zyte.com:8011` | Zyte Smart Proxy Manager proxy host. |
| `static_bypass` | `true` | When `true` ZyteProxyPuppeteer will skip proxy use for static assets defined by `static_bypass_regex` or pass `false` to use proxy. |
| `static_bypass_regex` | `/.*?\.(?:txt\|css\|eot\|gif\|ico\|jpe?g\|js\|less\|mkv\|mp4\|mpe?g\|png\|ttf\|webm\|webp\|woff2?)$/` | Regex to use filtering URLs for `static_bypass`. |
| `block_ads` | `true` | When `true` ZyteProxyPuppeteer will block ads defined by `block_list` using `@cliqz/adblocker-puppeteer` package. |
| `block_list` | `['https://easylist.to/easylist/easylist.txt', 'https://easylist.to/easylist/easyprivacy.txt']` | Block list to be used by ZyteProxyPuppeteer in order to initiate blocker enginer using `@cliqz/adblocker-puppeteer` and block ads |
