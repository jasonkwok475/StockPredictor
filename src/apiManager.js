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

  //! Update parameters here
  async getIndicator(symbol, startdate, indicator, parameters = { timespan: this._interval.timespan, window: 20, series_type: "close"}) { 
    return; //TODO Remove this
    try {
      let params = { 
        ...this._baseParams, 
        ...parameters,
        order: 'asc',
        'timestamp.gte': startdate
      };
      let result = await this._request(`/v1/indicators/${indicator.toLowerCase()}/${symbol.toUpperCase()}`, params);
      let data = [];
      let format = [ "time", indicator.toLowerCase() ];
      let v = result.results.values;
      for (let i = 0; i < v.length; i++) {
        data[i] = [ v[i].timestamp, v[i].value ];
      }
      return { data, format };
    } catch (e) { console.log(e); }
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
        if (err) {
          fs.writeFile(filePath, JSON.stringify(symbolData, null, 2), (err) => { if (err) console.log(err); }); //Create the file if it doesn't exist
          
          Promise.all([
            this.getStockData(symbol, startdate, this.getCurrentDate()),
            //this.getIndicator(symbol, startdate, "RSI"),
            //this.getIndicator(symbol, startdate, "SMA")
          ]).then((values) => {
            let tempData = values[0];
            let tempFormat = this._defaultFormatLong;
            tempFormat.push("rsi", "ema");

            //TODO Both RSI and EMA are not working, fix this

            for (let i = 0; i < tempData.length; i++) {
              let close = tempData[i][this._defaultFormat.findIndex(x => x == "c")];
              let high = tempData[i][this._defaultFormat.findIndex(x => x == "h")];
              let rsi = "", ema = "";
              
              if (i > this._rsiLength - 1) {
                let list = tempData.slice(i - this._rsiLength + 1, i + 1);
                let gain = 0, loss = 0;

                for (let j = 0; j < list.length; j++) {
                  let open = list[j][this._defaultFormat.findIndex(x => x == "o")];
                  let diff = list[j][this._defaultFormat.findIndex(x => x == "c")] - open;
                  if (diff > 0) {
                    gain += diff / open;
                  } else {
                    loss += Math.abs(diff / open);
                  }
                }

                rsi = 100 - (100 / (1 + (gain / loss))); // RSI
              }

              //TODO Fix this here, first EMA point is 0?
              let sum = 0;
              if (i == this._emaLength - 1) {
                ema = sum / this._emaLength; // Current SMA
              } else if (i < this._emaLength) {
                sum += close;
              } else {
                let lastEma = tempData[i - 1][tempFormat.findIndex(x => x == "ema")];
                ema = (close - lastEma) * this._emaSmoothing + lastEma; // Current EMA
              }

              tempData[i].push(rsi, ema);
            }

            console.log(tempData[tempData.length - 1]);

            symbolData.data.push(...tempData); //TODO Merge and account for timestamp duplicates
            symbolData.format.push(...tempFormat);
            fs.writeFile(filePath, JSON.stringify(symbolData), (err) => { if (err) console.log(err); }); //Update the file with new data
            
            return resolve(symbolData);
          }).catch((err) => { 
            reject(err);
            return console.log(err); 
          });
        } else {
          return resolve(JSON.parse(data));
        }      
      });
      //save into txt file for dataManager.js
      //append into existing file for stock if it exists?
  
      //sort by date before updating, if duplicate don't add
    });
  }

  _processData(data) {
    let result = [];
    for (let [key, value] of Object.entries(data)) {
      let temp = { date: new Date(key) };
      Object.keys(value).forEach((k, i) => {
        temp[k.split(" ")[k.split(" ").length - 1]] = value[k];
      });
      result.push(temp);
    }
    return result;
  }

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