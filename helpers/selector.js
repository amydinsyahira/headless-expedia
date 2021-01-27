const _ = require('lodash');
const log = require('debug')('selector');

const { NODE_ENV } = process.env;

exports._expedia_selector_1 = async function(page) {
    let rooms = [], index = 1, room_found = true;
    
    while ( room_found ) {
        try {
            let room = await page.evaluate(num => document.querySelector(`[data-stid='section-roomtype']:nth-child(${num})`).innerText, index);

            if( !_.includes(["production", "staging"], NODE_ENV) ) log('room: %s', room);
            room = _.split(room, "\n");
    
            for (let index2 = 0; index2 < _.size(room); index2++) {
                room[index2] = _.trim(room[index2]);
            }
    
            rooms.push(room);
            index += 1;
        } catch (err) {
            room_found = false;
        }
    }

    if( !_.includes(["production", "staging"], NODE_ENV) ) log('rooms: %s', rooms);
    return rooms;
}

exports._expedia_selector_2 = async function(page) {
    let rooms = [], index = 1, room_found = true;
    
    while ( room_found ) {
        try {
            let room = await page.evaluate(num => document.querySelector(`[data-stid='property-offer-${num}']`).innerText, index);

            if( !_.includes(["production", "staging"], NODE_ENV) ) log('room: %s', room);
            if( _.isNil(room) ) return room_found = false;
            room = _.split(room, "\n");
    
            for (let index2 = 0; index2 < _.size(room); index2++) {
                room[index2] = _.trim(room[index2]);
            }
    
            rooms.push(room);
            index += 1;
        } catch (err) {
            room_found = false;
        }
    }

    if( !_.includes(["production", "staging"], NODE_ENV) ) log('rooms: %s', rooms);
    return rooms;
}