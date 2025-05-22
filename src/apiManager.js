const request = require("request");
const { URL } = require("url");
const fs = require('fs');
require("dotenv").config();

const base_link = "https://api.polygon.io";
const DATA_FOLDER = './data/';

//! import all current data into an array first, constantly updating with new data
//! then update the data file everytime we get new data
// Store as a json object with an array for easy access
// Have th object have the ticker and other info like timespan 

const aggregateValue = {
  "v": "volume",
  "c": "close",
  "h": "high",
  "o": "open",
  "l": "low",
  "t": "time",
  "n": "number",
  "vw": "weighted",
  "rsi": "rsi",
  "ema": "ema"
}

class ApiManager {

  _baseParams = {
    apiKey: process.env.POLYGON_KEY,
    limit: 50000
  }

  _interval = {
    multiplier: 1,
    timespan: "hour"
  }

  _defaultFormat = [  "t", "o", "h", "l", "c", "v", "vw", "n" ];
  _defaultFormatLong = this._defaultFormat.map((x) => aggregateValue[x]);

  _rsiLength = 14;
  _emaLength = 20;
  _emaSmoothing = 2 / (this._emaLength + 1);

  constructor(parameters = this._baseParams) {
    this._baseParams = { ...parameters };
  }

  /**
   * Make a request to Alpha Vantage
   * @param {array} params 
   */
  _request(endpoint, link = false, params = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        let url = new URL((link ? "" : base_link) + endpoint);
        for (let [key, value] of Object.entries(params)) {
          url.searchParams.append(key, value); 
        }
        request.get({
          url,
          json: true,
          headers: { 'User-Agent': 'request' }
        }, (err, res, data) => {
          if (err) return reject(err);
          if (res.statusCode !== 200) return reject('Status: ' + res.statusCode);
          resolve(data);
        });
      } catch (e) { reject(e); }
    });  
  }

  /**
   * Get intraday stock data
   * @param {string} symbol 
   * @param {*} parameters 
   */
  async getStockData(symbol, startdate, enddate, parameters = {}) { 
    try {
      let params = { 
        ...this._baseParams, 
        ...parameters,
        sort: 'asc' 
      };
      let result = await this._request(`/v2/aggs/ticker/${symbol.toUpperCase()}/range/${this._interval.multiplier}/${this._interval.timespan}/${startdate}/${enddate}`, false, params);
      if (result.resultsCount == 0) return []; // No data found
      
      let data = await this._reformatData(result);
      let next_url = result.next_url;

      while (next_url !== undefined) {
        try {
          let next_result = await this._request(next_url, true, params);
          let next_data = await this._reformatData(next_result);
          data.push(...next_data);
          next_url = next_result.next_url;
        } catch (e) { //! Catches the 429 error here, fix later
          next_url = undefined;
        }
      }

      return data;
    } catch (e) { console.log(e); }
  }

  async _reformatData(data) {
    let result = [], format = this._defaultFormat;

    for (let i = 0; i < data.results.length; i++) {
      result[i] = [];
      for (let j = 0; j < format.length; j++) {
        result[i][j] = data.results[i][format[j]];
      }
    }

    return result;
  }

  async getTrainingData(symbol, startdate) {
    return new Promise((resolve, reject) => {
      const filePath = DATA_FOLDER + symbol.toLowerCase() + `.json`;
      fs.readFile(filePath, (err, data) => {
        let symbolData = !err ? JSON.parse(data) : {
          symbol,
          timespan: this._baseParams.timespan,
          last_updated: Date.now(),
          format: [],
          data: []
        }
        if (!err) return resolve(JSON.parse(data));
        
        Promise.all([
          this.getStockData(symbol, startdate, this.getCurrentDate()),
          //this.getIndicator(symbol, startdate, "RSI"),
          //this.getIndicator(symbol, startdate, "SMA")
        ]).then((values) => {
          let tempData = values[0];
          if (!tempData || tempData?.length == 0) return reject("No data found");
          fs.writeFile(filePath, JSON.stringify(symbolData, null, 2), (err) => { if (err) console.log(err); }); //Create the file if it doesn't exist

          let tempFormat = this._defaultFormatLong;
          tempFormat.push("rsi", "ema");

          let rsi = this._getRSI(tempData, tempFormat);
          let ema = this._getEMA(tempData, tempFormat);

          for (let i = 0; i < tempData.length; i++) {
            tempData[i].push(rsi[i], ema[i]);
          }

          symbolData.data.push(...tempData); //TODO Merge and account for timestamp duplicates
          symbolData.format.push(...tempFormat);
          fs.writeFile(filePath, JSON.stringify(symbolData), (err) => { if (err) console.log(err); }); //Update the file with new data
          
          return resolve(symbolData);
        }).catch((err) => { 
          reject(err);
          return console.log(err); 
        });    
      });
      //save into txt file for dataManager.js
      //append into existing file for stock if it exists?
  
      //sort by date before updating, if duplicate don't add
    });
  }

  /**
   * Calculate the RSI values given a list of data points
   * https://www.investopedia.com/terms/r/rsi.asp
   * @param {array[]} list List of data points
   * @returns {float[]} List of RSI values
   */
  _getRSI(data, format) {
    let rsi = [ "" ];
    let gain = [ 0 ], loss = [ 0 ], avgGain = [ "" ], avgLoss = [ "" ];

    for (let i = 1; i < data.length; i++) {
      let close = data[i][format.findIndex(x => x == "close")];
      let diff = close - data[i - 1][format.findIndex(x => x == "close")];

      gain.push(Math.max(0, diff));
      loss.push(Math.max(0, -diff));

      if (i > this._rsiLength - 1) {
        avgGain.push((avgGain[i - 1] * (this._rsiLength - 1) + gain[i]) / this._rsiLength);
        avgLoss.push((avgLoss[i - 1] * (this._rsiLength - 1) + loss[i]) / this._rsiLength);
      } else {
        if (i == this._rsiLength - 1) {
          avgGain.push(gain.slice(i - this._rsiLength + 1, i + 1).reduce((a,b) => a + b, 0) / this._rsiLength);
          avgLoss.push(loss.slice(i - this._rsiLength + 1, i + 1).reduce((a,b) => a + b, 0) / this._rsiLength);
        } else {
          avgGain.push("");
          avgLoss.push("");
        }
      }

      (avgGain[i] == "") ? rsi.push("") : rsi.push(100 - (100 / (1 + avgGain[i] / avgLoss[i])));
    }
    return rsi;
  }

  /**
   * Calculate the EMA value given a list of data points
   * https://www.investopedia.com/terms/e/ema.asp
   * @param {list} list List of data points
   * @returns EMA value
   */
  _getEMA(data, format) {
    let ema = [ "" ];

    for (let i = 1; i < data.length; i++) {
      if (i == this._emaLength - 1) {
        let sum = data.slice(i - this._emaLength + 1, i + 1).reduce((a,b) => a + b[format.findIndex(x => x == "close")], 0);
        ema.push(sum / this._emaLength); // Current SMA
      } else if (i >= this._emaLength) {
        let close = data[i][format.findIndex(x => x == "close")];
        let lastEma = ema[i - 1];
        ema.push((close - lastEma) * this._emaSmoothing + lastEma); // Current EMA
      } else ema.push("");
    }
    return ema;
  }

  /**
   * Get the current date in YYYY-MM-DD format
   * @returns {string} Current date 
   */
  getCurrentDate() {
    const d = new Date;
    let month = d.getMonth() + 1;
    let day = d.getDay();

    if (month < 10) month = "0" + month;
    if (day < 10) day = "0" + day;

    return `${d.getFullYear()}-${month}-${day}`;
  }
}

module.exports = ApiManager;