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
  "vw": "weighted"
}

class ApiManager {

  _baseParams = {
    apiKey: process.env.POLYGON_KEY,
    limit: 5000
  }

  _interval = {
    multiplier: 1,
    timespan: "hour"
  }

  constructor(parameters = this._baseParams) {
    this._baseParams = { ...parameters };
  }

  /**
   * Make a request to Alpha Vantage
   * @param {array} params 
   */
  _request(endpoint, params) {
    return new Promise(async (resolve, reject) => {
      try {
        let url = new URL(base_link + endpoint);
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
   * 
   * @param {string} symbol 
   * @param {*} parameters 
   */
  async getStockData(symbol, startdate, enddate, parameters = {}) { //Get intraday stock data
    try {
      let params = { 
        ...this._baseParams, 
        ...parameters,
        sort: 'desc' 
      };
      let result = await this._request(`/v2/aggs/ticker/${symbol.toUpperCase()}/range/${this._interval.multiplier}/${this._interval.timespan}/${startdate}/${enddate}`, params);
      
      let data = [];
      let format = [];
      for (let i = 0; i < result.results.length; i++) {
        data[i] = [];
        Object.entries(result.results[i]).forEach(([key, value]) => {
          data[i].push(value);
          if (i == 0) format.push(aggregateValue[key]);
        });
      }

      return { data, format };
    } catch (e) { console.log(e); }
  }

  //! Update parameters here
  async getIndicator(symbol, startdate, indicator, parameters = { timespan: this._interval.timespan, window: 20, series_type: "close"}) { 
    try {
      let params = { 
        ...this._baseParams, 
        ...parameters,
        order: 'desc',
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
            this.getIndicator(symbol, startdate, "RSI"),
            this.getIndicator(symbol, startdate, "SMA")
          ]).then((values) => {
            let tempData = values[0].data;
            let tempFormat = values[0].format;
      
            for (let i = 0; i < tempData.length; i++) {
              for (let j = 0; j < values.length; j++) {
                tempData[i].push(values[j].data[i][1]);
                if (i == 0) {
                  tempFormat.push(values[j].format[1]);
                }
              }
            }
            
            //! Fix these later
            symbolData.data.push(...tempData);
            symbolData.format.push(...tempFormat);
      
            fs.writeFile(filePath, JSON.stringify(symbolData, null, 2), (err) => { if (err) console.log(err); }); //Update the file with new data
            
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