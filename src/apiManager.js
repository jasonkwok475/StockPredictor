//process.env.key
const request = require("request");
const { URL } = require("url");
require("dotenv").config();

const base_link = "https://www.alphavantage.co/query";

class ApiManager {

  _baseParams = {
    apikey: process.env.ALPHA_VANTAGE_KEY,
    interval: "60min",
    outputsize: "full"
  }

  constructor(parameters = this._baseParams) {
    this._baseParams = { ...parameters };
  }

  /**
   * Make a request to Alpha Vantage
   * @param {array} params 
   */
  _request(params) {
    return new Promise(async (resolve, reject) => {
      try {
        let url = new URL(base_link);
        for (let [key, value] of Object.entries(params)) {
          url.searchParams.append(key, value); //!double check
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
  async getStockData(symbol, parameters = {}) { //Get intraday stock data
    try {
      let params = { 
        ...this._baseParams, 
        ...parameters,
        function: "TIME_SERIES_INTRADAY" ,
        symbol
      };
      let result = await this._request(params);
      console.log(result);
      let data = this._processData(result[`Time Series (${params.interval})`]);
      return data;
    } catch (e) { console.log(e); }
  }

  //! Update parameters here
  async getIndicator(symbol, indicator, parameters = { time_period: 20, series_type: "close"}) { 
    try {
      let params = { 
        ...this._baseParams, 
        ...parameters,
        function: indicator,
        symbol 
      };
      let result = await this._request(params);
      let data = this._processData(result[`Technical Analysis: ${indicator}`]);
      return data;
    } catch (e) { console.log(e); }
  }

  async getTrainingData(symbol) {
    Promise.all([
      this.getStockData(symbol),
      this.getIndicator(symbol, "RSI"),
      this.getIndicator(symbol, "SMA")
    ]).then((values) => {
      let data = [];
      values.forEach((x) => { data = [...data, ...x]; });
      console.log(data);

    }).catch((err) => { return console.log(err); })
    //save into txt file for dataManager.js
    //append into existing file for stock if it exists?

    //sort by date before updating, if duplicate don't add
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
}

module.exports = ApiManager;