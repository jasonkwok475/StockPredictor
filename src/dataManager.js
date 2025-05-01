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
 */

class DataManager {

  considered_intervals = 3;

  constructor() {
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
    let filedata = fs.readFileSync(path, { encoding: 'utf8', flag: 'r' });
    let data = filedata.split("\n").map((row) => {
      let x = row.split(',');
      if (x.includes(undefined) || x.includes('')) return;
      return {
        date: new Date(x[2].substring(0,4), x[2].substring(4,6), x[2].substring(6,8), x[3].substring(0,2)),
        open: parseFloat(x[4]),
        high: parseFloat(x[5]),
        low: parseFloat(x[6]),
        close: parseFloat(x[7]),
        vol: parseFloat(x[8])
      }
    });
    data.shift(); //Remove the headings
    return data.filter(item => item); // Removes undefined elements
  }


  /**
   * 
   * @param {string} path 
   */
  compileTrainingData(path) {
    let data = this.extractData(path);
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
          data[i + j].vol
        )
      }
      training_labels.push(data[i + this.considered_intervals].close);
    }
    return {data: tf.tensor(training_data), labels: tf.tensor(training_labels)};
  }
}

module.exports = DataManager;