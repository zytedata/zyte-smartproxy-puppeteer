declare const _exports: ZyteSmartProxyPuppeteer;
export = _exports;
declare class ZyteSmartProxyPuppeteer {
    launch(options: any): Promise<puppeteer.Browser>;
    connect(options: any): Promise<puppeteer.Browser>;
    _init(options: any): Promise<void>;
    apikey: any;
    spmHost: any;
    staticBypass: boolean;
    staticBypassRegex: any;
    blockAds: boolean;
    blockList: any;
    adBlocker: ZyteAdBlocker;
    headers: any;
    _patchPageCreation(browser: any): void;
    _isResponse(event: any): any;
    _verifyResponseSessionId(responseHeaders: any): void;
    spmSessionId: string;
    _continueResponse(cdpSession: any, event: any): Promise<void>;
    _blockRequest(cdpSession: any, event: any): Promise<void>;
    _isStaticContent(event: any): any;
    _bypassRequest(cdpSession: any, event: any): Promise<void>;
    _continueRequest(cdpSession: any, event: any): Promise<void>;
    _respondToAuthChallenge(cdpSession: any, event: any): Promise<void>;
    _isSPMAuthChallenge(event: any): boolean;
    _createSPMSession(): Promise<string>;
}
import puppeteer = require("puppeteer");
declare class ZyteAdBlocker extends adBlockerPuppeteer.PuppeteerBlocker {
    isAd(event: any, page: any): boolean;
}
import adBlockerPuppeteer = require("@cliqz/adblocker-puppeteer");
