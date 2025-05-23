const { EventEmitter } = require("stream");
const tf = require("@tensorflow/tfjs");
require('@tensorflow/tfjs-node');
const DataManager = require('./dataManager.js');
const fs = require('fs');

const SAMPLE_DATA = './data/voo.json';
const DATA_FOLDER = './data'; //! Put these into a config file?

/**
 * @typedef {Object} InputObject
 * @prop {float[]} Open An array of the opening prices
 * @prop {float[]} Close An array of the closing prices
 * @prop {float[]} High An array of the maximum prices
 * @prop {float[]} Low An array of the lowest prices
 * @prop {float[]} Volume  An array of the volumes
 */

/**
 * 
 */
class StockPredictor extends EventEmitter {

  considered_intervals = 3;
  defaultTrainParameters = {
    epochs: 100,
    batchSize: 32,
    validationSplit: 0.2
  };

  constructor(apiManager) {
    super();
    this.dataManager = new DataManager(this.considered_intervals);
    this.apiManager = apiManager;
    this.sample_data = null;

    this.model = this.buildModel();
    this.model.summary();
  }

  buildModel() {
    let model = tf.sequential({ layers: [
      tf.layers.layerNormalization({ inputShape: [21, ], axis: -1 }),
      tf.layers.dropout({ rate: 0.2 }), //Helps to prevent overfitting
      tf.layers.dense({ units: 64, activation: "relu" }),
      tf.layers.dropout({ rate: 0.1 }),
      tf.layers.dense({ units: 64, activation: "relu" }),
      tf.layers.dense({ units: 4 })
    ]});

    model.compile({
      loss: "meanSquaredError",
      optimizer: 'adam',
      metrics: ['MAE']
    });

    return model;
  }

  /**
   * 
   * @param {*} data 
   */
  async trainModel(data, parameters = {}) {
    let { epochs, batchSize, validationSplit } = { ...this.defaultTrainParameters, ...parameters };
    return new Promise((resolve, reject) => {
      try {
        this.model.fit(
          data.data,
          data.labels,
          {
            epochs,
            batchSize,
            verbose: 0, // Suppress Logging
            validationSplit, //Validation results on 20% of data
            callbacks: [{
              onEpochEnd: (epoch, logs) => this.emit("epochEnd", epoch, logs),
              onTrainEnd: (logs) =>  this.emit("trainEnd", logs)
            }]
          }
        ).then((history) => resolve(history));
      } catch (e) {
        console.log(e);
        reject();
      }
    });
  }

  async predict(symbol) {
    return new Promise(async (resolve, reject) => {
      try {
        let results = [], previous = [];

        for (let i = 0; i < 5; i++) { //TODO Change this, currently a defualt 5 predictions
          let data = await this.getPredictData(symbol, previous);
          let r = await this.model.predict(tf.tensor(data.data), { verbose: 0 });
          let d = Array.from(r.dataSync());

          results.push(d);

          if (previous.length > 0) {
            previous[previous.length - 1].push(data.vol, data.rsi, data.ema)
          }
          previous.push(d);
        }

        return resolve(results);
      } catch (e) {
        console.log(e);
        reject();
      }
    });
  }

  async getTrainingData() {
    return new Promise(async (resolve, reject) => {
      fs.readdir(DATA_FOLDER, async (err, x) => {
        if (err) return console.log(err);
        let files = x.map((y) => `./data/${y.toLowerCase()}`);

        let data = await this.dataManager.compileTrainingData(files);
        return resolve(data);
      });
    })
  }

  //TODO Remove this, its just for testing purposes
  // async getSampleData() {
  //   if (this.sample_data) return this.sample_data;
  //   this.sample_data = await this.dataManager.compileTrainingData([SAMPLE_DATA]);
  //   return this.sample_data
  // }

  async getPredictData(symbol, predicted) {
    return await this.dataManager.getPredictData(this.apiManager, `./data/${symbol.toLowerCase()}.json`, predicted);
  }

  async saveModel(name) {
    await this.model.save(`file://./model/${name}`);
  }

  async loadModel(name) {
    this.model = name == "Train" ? this.buildModel() : await tf.loadLayersModel(`file://./model/${name}/model.json`);
    //this.model.summary();
  }
}

module.exports = StockPredictor;