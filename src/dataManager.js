const fs = require("fs");
const tf = require("@tensorflow/tfjs");
const ApiManager = require("./apiManager");

const DATA_FOLDER = "./data/";
const MODEL_FOLDER = "./model/";

/**
 * @typedef {Object} ExtractedData Extrated data from data file
 * @prop {Date} date 
 * @prop {float} open
 * @prop {float} high
 * @prop {float} low
 * @prop {float} close
 * @prop {float} vol
 * @prop {float} rsi
 * @prop {float} sma
 */

class DataManager {

  considered_intervals = 3;

  constructor(interval = this.considered_intervals) {
    this.considered_intervals = interval;
    this.checkFolders();
  }

  checkFolders() {
    if (!fs.existsSync(DATA_FOLDER)) {
      fs.mkdirSync(DATA_FOLDER, { recursive: true });
    }
    if (!fs.existsSync(MODEL_FOLDER)) {
      fs.mkdirSync(MODEL_FOLDER, { recursive: true });
    }
  }

  /**
   * Extracts stock data from a file
   * @param path Path of the file to extract data from
   * @returns {ExtractedData[]}
   */
  extractData(path, indexed = true) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, (err, data) => {
        if (err) return reject(err); //! Change later
        let filedata = JSON.parse(data);
        let format = filedata.format;
  
        let result = indexed ? filedata.data.map((row) => {
          if (row.includes(undefined) || row.includes('') || row.includes(NaN)) return;
          return {
            date: new Date(row[format.findIndex(x => x == "time")]),
            open: parseFloat(row[format.findIndex(x => x == "open")]),
            high: parseFloat(row[format.findIndex(x => x == "high")]),
            low: parseFloat(row[format.findIndex(x => x == "low")]),
            close: parseFloat(row[format.findIndex(x => x == "close")]),
            vol: parseFloat(row[format.findIndex(x => x == "volume")]),
            rsi: parseFloat(row[format.findIndex(x => x == "rsi")]),
            ema: parseFloat(row[format.findIndex(x => x == "ema")])
          }
        }) : filedata.data;

        return resolve(result.filter(item => item)); // Removes undefined elements
      });
    });
  }


  /**
   * 
   * @param {string[]} path 
   */
  async compileTrainingData(path) {
    return new Promise(async (resolve, reject) => {
      let totalData = [], totalLabels = [];

      for (let k = 0; k < path.length; k++) {
        let data = await this.extractData(path[k]);
        let training_data = [];
        let training_labels = [];

        for (let i = 0; i < data.length - this.considered_intervals; i++) {
          training_data[i] = [];
          for (let j = 0; j < this.considered_intervals; j++) {
            training_data[i].push(
              data[i + j].open,
              data[i + j].high,
              data[i + j].low,
              data[i + j].close,
              data[i + j].vol,
              data[i + j].rsi,
              data[i + j].ema
            )
          }
          let next = data[i + this.considered_intervals];
          training_labels.push([ next.open, next.high, next.low, next.close ]);
        }

        totalData.push(...training_data);
        totalLabels.push(...training_labels);
      }

      return resolve({data: tf.tensor(totalData), labels: tf.tensor(totalLabels)});
    });
  }

  /**
   * 
   * @param {string} path Path of the stock data to get data from
   * @param {array[]} predicted An array of predicted stock data, stored as an array per day
   * @returns {object} { data, vol, rsi, ema } Training data, calculated vol/rsi/ema (if predicted was not empty)
   */
  async getPredictData(apiManager, path, predicted = []) {
    //TODO The whole function here is really scuffed with multiple data format conversions
    let data = await this.extractData(path, false);
    let training_data = [];

    let add = predicted.length == 0 ? 0 : predicted.length;
    let i = data.length - this.considered_intervals + add; 
    training_data[0] = [];
    for (let j = 0; j < this.considered_intervals - add; j++) {
      let temp = [...data[i + j]];
      temp.shift();
      training_data[0].push(...[
        data[i + j][1], // o
        data[i + j][2], // h
        data[i + j][3], // l
        data[i + j][4], // c
        data[i + j][5], // vol
        data[i + j][8], // rsi
        data[i + j][9]  // ema
      ]);
    }
    
    // TODO Confirm this is correct
    let rsi, ema, vol;
    if (predicted.length !== 0) {
      data.push(...predicted.map((x) => {
        return [
          Date.now(),
          ...x.slice(0,5),
          0,
          0,
          ...x.slice(-2)
        ]
      }));

      for (let i = 1; i <= Math.min(predicted.length, this.considered_intervals); i++) {
        training_data[0].push(...predicted[predicted.length - i]);
      } 

      //(predicted.length > this.considered_intervals) ? training_data[0].push(...predicted.slice(-this.considered_intervals)) : training_data[0].push(...predicted);
      let last = data[data.length - 2];
      
      let temp = apiManager._getRSI(data, apiManager._defaultFormatLong);
      ema = (training_data[0][3] - last[6]) * apiManager._emaSmoothing + last[6];
      vol = last[4];
      rsi = temp[temp.length - 1];

      training_data[0].push(vol, rsi, ema); //Vol, RSI, EMA
    }

    return { data: training_data, vol, rsi, ema };
  }

  async combinePredictedData(path) {

  }
}

module.exports = DataManager;