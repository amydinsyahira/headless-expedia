var express = require('express');
var router = express.Router();

const _ = require('lodash');
const log = require('debug')('info');
const pup = require('puppeteer');
const superagent = require('superagent');

const { PWD, NODE_ENV } = process.env;
const useragent = require(`${PWD}/data/user-agent.json`);

function _expedia_info(account) {
    return new Promise(async (resolve, reject) => {
        if( _.isNil(account) || _.isNil(account.url) || _.isEmpty(account.url) || _.isNil(account.webhookUrl) || _.isEmpty(account.webhookUrl) ) {
            return reject({
                status : false,
                message: "Check your parameters data"
            })
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

        // Check response continuously till browser close
        page.on('response', async (res) => {
            try {
                if( 
                    res.url().includes('/graphql') && 
                    res.request().method() == 'POST' && 
                    res.request().postData().includes('PropertyInfoOffersBexFeatures') 
                ) {
                    const body = await res.json();
                    console.log('body:', body);
                    await superagent.post(account.webhookUrl).send(body).set('accept', 'json');
                }
            } catch (err) {
                console.error(res, err);
                console.log(res, err);
            }
        });

        try {
            await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36");
            await page.goto(account.url);

            if( _.includes(["production", "staging"], NODE_ENV) ) await browser.close();
            return resolve({
                status : true,
                message: "Check the usage of your webhook URL continuously, the server is scraping..."
            })
        } catch (err) {
            if( !_.includes(["production", "staging"], NODE_ENV) ) log('err: %s', err);
            if( _.includes(["production", "staging"], NODE_ENV) ) await browser.close();
            return reject({
                status : false,
                message: err
            })
        }
    })
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
