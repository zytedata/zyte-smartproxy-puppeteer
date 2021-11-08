# Zyte-Puppeteer

A wrapper over Puppeteer to provide Zyte specific functionalities.

## How to use

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

6. Create a file `test.js` with following content and replace <SPM_APIKEY>.

``` javascript
const ZytePuppeteer = require('zyte-puppeteer');

(async () => {
    const browser = await ZytePuppeteer.launch({
        spm_apikey: '<SPM_APIKEY>'
    });
    console.log('Before new page')
    const page = await browser.newPage({ignoreHTTPSErrors: true});

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

