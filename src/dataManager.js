const fs = require("fs");
const tf = require("@tensorflow/tfjs");

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
  extractData(path) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, (err, data) => {
        if (err) return reject(err); //! Change later
        let filedata = JSON.parse(data);
        let format = filedata.format;
  
        let result = filedata.data.map((row) => {
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
        });
        return resolve(result.filter(item => item)); // Removes undefined elements
      });
    });
  }


  /**
   * 
   * @param {string} path 
   */
  async compileTrainingData(path) {
    let data = await this.extractData(path);
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
      training_labels.push(data[i + this.considered_intervals].close);
    }
    return {data: tf.tensor(training_data), labels: tf.tensor(training_labels)};
  }

  async getPredictData(path) {
    let data = await this.extractData(path);
    let training_data = [];

    for (let i = 0; i < 1; i++) {
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
    }
    return tf.tensor(training_data);
  }
}

module.exports = DataManager;