var express = require('express');
var router = express.Router();

const _ = require('lodash');
const log = require('debug')('info');
const moment = require('moment');
const pup = require('puppeteer');
const axios = require('axios');

const { PWD, NODE_ENV } = process.env;
const useragent = require(`${PWD}/data/user-agent.json`);

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

function _expedia_info(account) {
    return new Promise(async (resolve, reject) => {
        if( _.isNil(account) || _.isNil(account.url) || _.isEmpty(account.url) || _.isNil(account.webhookUrl) || _.isEmpty(account.webhookUrl) || _.isNil(account.rangeOfDays) ) {
            return reject({
                status : false,
                message: "Check your parameters data"
            })
        }

        let rangeOfDays = _.toInteger(account.rangeOfDays)-1 || 1;
        if( _.isNil(account.startDate) || _.isEmpty(account.startDate) || (!_.isNil(account.startDate) && !moment(account.startDate).isValid()) ) account.startDate = moment().subtract(1, 'day').format('YYYY-MM-DD');
        else account.startDate = moment(account.startDate).subtract(1, 'day').format('YYYY-MM-DD');
        account.endDate = moment(account.startDate).add(1, 'day').format('YYYY-MM-DD');

        const browser = await pup.launch({ 
            headless: _.includes(["production", "staging"], NODE_ENV) ? true : false, 
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1024,768',
                '--incognito',
            ],
            ...(process.env.CHROME_BIN && { executablePath: process.env.CHROME_BIN }),
        });
        const ua = useragent[ _.random(0, _.size(useragent)-1) ];
        if( !_.includes(["production", "staging"], NODE_ENV) ) log("ua: %s", ua);
        
        let   hotelName = null;
        const [page]    = await browser.pages();
        try {
            let [url] = _.split(account.url, '?');
                url   = `${url}?chkin=${account.startDate}&chkout=${account.endDate}`;

            await page.setViewport({ width: 1024, height: 768 });
            await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36");
            await page.goto(url, { waitUntil: ['load', 'domcontentloaded'], timeout: 0 });

            // Get hotel's name
            [hotelName] = await page.$x('//div[@data-stid="content-hotel-title"]/h1');
            if( hotelName ) {
                hotelName = await hotelName.getProperty('textContent');
                hotelName = await hotelName.jsonValue();
            }

            await page.waitFor( _.random(4000, 5000) );
            await page.waitForXPath('//button[@data-stid="date-stepper-button-check-in-next" and @disabled]', { hidden: true, timeout: 20000 });
            // The first day
            const [firstday] = await page.$x('//button[@data-stid="date-stepper-button-check-in-next"]');
            await firstday.click();
            rangeOfDays -= 1;
        } catch (err) {
            log(err);
            const ssImg = await page.screenshot({ fullPage: true, encoding: 'base64' });
            if( _.includes(["production", "staging"], NODE_ENV) ) await browser.close();
            return reject({
                status    : false,
                message   : _.toString(err),
                screenshot: ssImg
            })
        }

        // Check response continuously till browser close
        page.on('response', async (res) => {
            try {
                if( 
                    res.url().includes('/graphql') && 
                    res.request().method() == 'POST' && 
                    res.request().postData().includes('PropertyInfoOffersBexFeatures') 
                ) {
                    await page.waitFor( _.random(2000, 3000) );
                    const body = await res.json();
                    
                    result = {
                        name  : hotelName,
                        search: body.data.propertyInfo.offers.searchCriteria,
                        rooms : body.data.propertyInfo.offers.listings
                    };

                    await axios({
                        url             : account.webhookUrl,
                        method          : "post",
                        data            : result,
                        timeout         : 0,
                        maxContentLength: Infinity,
                        maxBodyLength   : Infinity
                    });

                    if( _.gte(rangeOfDays, 0) ) {
                        await page.waitFor( _.random(3000, 4000) );
                        await page.waitForXPath('//button[@data-stid="date-stepper-button-check-in-next" and @disabled]', { hidden: true, timeout: 20000 });
                        const [nextday] = await page.$x('//button[@data-stid="date-stepper-button-check-in-next"]');
                        await nextday.click();
                        rangeOfDays -= 1;
                        return;
                    };
                    if( _.includes(["production", "staging"], NODE_ENV) ) await browser.close();
                }
            } catch (err) {
                log(err);
                if( _.includes(["production", "staging"], NODE_ENV) ) await browser.close();
            }
        });

        return resolve({
            status : true,
            message: "Check the usage of your webhook URL continuously, the server is scraping..."
        })
    })
}