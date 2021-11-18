# Zyte-Proxy-Puppeteer

A wrapper over Puppeteer to provide Zyte specific functionalities.

## Quick Tutorial

1. Clone this repo.

`git clone git@github.com:zytedata/zyte-puppeteer.git`

2. Move to the directory and install dependencies.

`cd zyte-puppeteer && npm install`

3. Link the library to NPM.

`npm link`

4. Create a separate repository outside of `zyte-puppeteer`.

`cd .. && mkdir testing-zyte-puppeteer`

5. Link `zyte-puppeteer`.

`npm init -y && npm link zyte-puppeteer`

6. Create a file `test.js` with following content and replace `<SPM_APIKEY>`.

``` javascript
const ZyteProxyPuppeteer = require('zyte-puppeteer');

(async () => {
    const browser = await ZyteProxyPuppeteer.launch({
        spm_apikey: '<SPM_APIKEY>'
    });
    console.log('Before new page')
    const page = await browser.newPage();

    console.log('Opening page ...');
    try {
        await page.goto('http://toscrape.com/', {timeout: 180000});
    } catch(err) {
        console.log(err);
    }

    console.log('Taking a screenshot ...');
    await page.screenshot({path: 'screenshot.png'});
    await browser.close();
})();
```

7. Run the file using node.

`node test.js`

## API

`ZyteProxyPuppeteer.launch` accepts all the arguments accepted by `Puppeteer.launch` and some
additional arguments defined below:

| Argument | Default Value | Description |
|----------|---------------|-------------|
| `spm_apikey` (required) | `undefined` | Zyte Smart Proxy Manager API key that can be found on your zyte.com account. |
| `spm_host` | `http://proxy.zyte.com:8011` | Zyte Smart Proxy Manager proxy host. |
| `static_bypass` | `true` | When `true` ZyteProxyPuppeteer will skip proxy use for static assets defined by `static_bypass_regex` or pass `false` to use proxy. |
| `static_bypass_regex` | `/.*?\.(?:txt|css|eot|gif|ico|jpe?g|js|less|mkv|mp4|mpe?g|png|ttf|webm|webp|woff2?)$/` | Regex to use filtering URLs for `static_bypass`. |
| `block_ads` | `true` | When `true` ZyteProxyPuppeteer will block ads defined by `block_list` using `@cliqz/adblocker-puppeteer` package. |
| `block_list` | `['https://easylist.to/easylist/easylist.txt', 'https://easylist.to/easylist/easyprivacy.txt']` | Block list to be used by ZyteProxyPuppeteer in order to initiate blocker enginer using `@cliqz/adblocker-puppeteer` and block ads |
