import fs from 'fs/promises';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const urlQueue = [];
const seenAtDepth = {};
const imgs = { results: [] }
let maxDepth = 0;

/**
 * 
 * @param {String} baseUrl 
 * @param {String} url 
 * @returns an absolute path to the website or null
 */
const cleanUrl = (baseUrl, url) => {
    if (url === null || typeof url === 'undefined') return null;
    if (url.charAt(url.length - 1) === '/') url = url.slice(0, -1);
    if (url.includes('http')) return url;
    if (url.startsWith('//')) return url.slice(2);
    const urlObj = new URL(baseUrl);
    if (url.startsWith('/')) return urlObj.protocol + '//' + urlObj.hostname + url;
    else return null;
}

/**
 * 
 * @param {String} url 
 * @returns {Object} containing the links and images of the website
 */
const getData = async (url) => {
    const response = await fetch(url);
    const html = await response.text();
    let $ = cheerio.load(html);
    const links = seenAtDepth[url] + 1 <= maxDepth ? $('a').map((i, element) => element.attribs.href).get() : [];
    const images = $('img').map((i, element) => element.attribs.src).get();
    return { links, images };
}
/**
 * 
 * @param {String} url 
 * @param {Array} links 
 * @param {Array} images
 * 1. Loops through the current images on the website and adds it to the imgs object
 * 2. Loops through the current links array and adds them to the queue if unvisited
 */
const processUrl = (url = '', links = [], images = []) => {
    //add image to Image Object
    images.forEach((image) => {
        const imageUrl = cleanUrl(url, image);
        if (imageUrl !== null) imgs.results.push({ imageUrl, sourceUrl: url, depth: seenAtDepth[url] })
    })
    // Add children links to urlQueue if not visited
    links.forEach((link) => {
        const cleanLink = cleanUrl(url, link);
        if (!seenAtDepth.hasOwnProperty(cleanLink) && cleanLink !== null) {
            seenAtDepth[cleanLink] = seenAtDepth[url] + 1;
            urlQueue.push(cleanLink);
        }
    })
}
/**
 * 
 * @param {String} startUrl 
 * Crawls through the web and writes to responses.txt
 */
const crawl = async (startUrl, depth) => {
    maxDepth = depth;
    seenAtDepth[startUrl] = 0;
    urlQueue.push(startUrl);
    while (urlQueue.length > 0) {
        const currUrl = urlQueue.shift();
        try {
            console.log(currUrl);
            const { links, images } = await getData(currUrl);
            processUrl(currUrl, links, images);
        }
        catch (e) {
            console.log(e)
        }
    }
    try {
        await fs.writeFile('./response.txt', JSON.stringify(imgs))
    }
    catch (e) {
        throw new Error('file');
    }
}


/**
 * Parse the command and execute the correct function. Error checking as well
 */
const start = async () => {
    try {
        if (typeof process.argv[2] === 'string' && +process.argv[3] < 8) await crawl(process.argv[2], process.argv[3]);
        else throw new Error('string');
    }
    catch (e) {
        if (e.message === 'string') console.log('Please provide a valid argument');
        else if (e.message === 'file') console.log('Error writing to file')
        else console.log(e);
    }
}

start();