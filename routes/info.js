var express = require('express');
var router = express.Router();

const _ = require('lodash');
const log = require('debug')('info');
const pup = require('puppeteer');

const { PWD, NODE_ENV } = process.env;
const useragent = require(`${PWD}/data/user-agent.json`);
const selector = require(`${PWD}/helpers/selector.js`);

function _expedia_info(account) {
	return (async () => {
        if( _.isNil(account) || _.isNil(account.url) ) {
            return {
                status : false,
                message: "Check your parameters data"
            }
        }

        const browser = await pup.launch({ headless: _.includes(["production", "staging"], NODE_ENV) ? true : false, 
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
        ]});
        const ua = useragent[ _.random(0, _.size(useragent)-1) ];
        if( !_.includes(["production", "staging"], NODE_ENV) ) log("ua: %s", ua);
        
        const pages = await browser.pages();
        const page  = pages[0];

        try {
            await page.setViewport({ width: 1366, height: 768 });
            await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36");
            await page.goto(account.url, { waitUntil: "load", timeout: 0 });

            let title = await page.evaluate(() => document.querySelector("div[data-stid='content-hotel-title']").innerText);
            title = _.split(title, "\n");

            let rooms = [];
            try {
                await page.waitForSelector("[data-stid='section-roomtype']", { visible: true, timeout: 10000 });
            } catch (err) {
                try {
                    await page.waitForSelector("[data-stid='property-offer-1']", { visible: true, timeout: 10000 });
                } catch (err) {
                    if( !_.includes(["production", "staging"], NODE_ENV) ) log('wait room list: %s', err);
                    if( _.includes(["production", "staging"], NODE_ENV) ) await browser.close();
                    return {
                        status : false,
                        message: "Section room list not existed"
                    }
                }

                rooms = await selector._expedia_selector_2(page);
                if( _.includes(["production", "staging"], NODE_ENV) ) await browser.close();
                return {
                    status: true,
                    data  : {
                        title,
                        rooms
                    }
                }
            }

            rooms = await selector._expedia_selector_1(page);
            if( _.includes(["production", "staging"], NODE_ENV) ) await browser.close();
            return {
                status: true,
                data  : {
                    title,
                    rooms
                }
            }
        } catch (err) {
            if( !_.includes(["production", "staging"], NODE_ENV) ) log('err: %s', err);
            if( _.includes(["production", "staging"], NODE_ENV) ) await browser.close();
            return {
                status : false,
                message: err
            };
        }
	})()
}

router.post('/', async function(req, res) {
    try {
        const result = await _expedia_info(req.body);
        if(result.status) {
            res.send(result);
        }
        else res.send(result);
    } catch (err) {
        res.send(err);
    }
});

module.exports = router;
