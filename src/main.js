const { EventEmitter } = require("stream");
const tf = require("@tensorflow/tfjs");
require('@tensorflow/tfjs-node');
const DataManager = require('./dataManager.js');

const SAMPLE_DATA = './data/voo.json';

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

  constructor() {
    super();
    this.dataManager = new DataManager(this.considered_intervals);
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

  async predict(inputs) {
    return new Promise(async (resolve, reject) => {
      try {
        let r = await this.model.predict(inputs, { verbose: 0 });
        return resolve(Array.from(r.dataSync()));
      } catch (e) {
        console.log(e);
        reject();
      }
    });
  }

  //TODO Remove this, its just for testing purposes
  async getSampleData() {
    if (this.sample_data) return this.sample_data;
    this.sample_data = await this.dataManager.compileTrainingData([SAMPLE_DATA]);
    return this.sample_data
  }

  async getPredictData(symbol) {
    return await this.dataManager.getPredictData(`./data/${symbol.toLowerCase()}.json`);
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