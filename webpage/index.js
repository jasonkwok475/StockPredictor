var default_stock = "VOO";
var models;

$(document).ready(async function () {
  loadModels();
  loadStockChart(default_stock);

  $("#trainModel").hide();
  $("#stockChart").show();});

async function loadModels() {
  var response = await fetch("http://localhost:3000/api/models", { method: "GET" });
  models = await response.json();

  for (var i = 0; i < models.length; i++) {
    var item = '<option value="'+models[i]+'">'+models[i]+'</option>';
    $('#models').append(item);
    //TODO Show the model parameters on the sidebar
  }
}

async function loadStockChart(stock) {
  var response = await fetch("http://localhost:3000/api/data", { 
    method: "POST",
    body: JSON.stringify({ stock }),
    headers: {
      'Content-Type': 'application/json'
    } 
  });
  let { data, format } = await response.json();

  var dataTable = anychart.data.table(format.findIndex(x => x == "time"));
  dataTable.addData(data.reverse());

  var candlestickMapping = dataTable.mapAs({
    open: format.findIndex(x => x == "open"),
    high: format.findIndex(x => x == "high"),
    low: format.findIndex(x => x == "low"),
    close: format.findIndex(x => x == "close"),
    value: format.findIndex(x => x == "close")
  });
  
  var volumeMapping = dataTable.mapAs({
    x: format.findIndex(x => x == "time"),
    value: format.findIndex(x => x == "volume")
  });

  var rsiMapping = dataTable.mapAs({
    x: format.findIndex(x => x == "time"),
    value: format.findIndex(x => x == "rsi")
  });

  var chart = anychart.stock();
  anychart.theme('darkGlamour');

  var mainPlot = chart.plot(0);
  mainPlot
    .yGrid(true)
    .xGrid(true)
    .yMinorGrid(true)
    .xMinorGrid(true);

  var series = mainPlot.candlestick(candlestickMapping);
  series.name(stock.toUpperCase());
  series.legendItem().iconType('rising-falling');
  series.fallingFill("#FF0D0D");
  series.fallingStroke("#FF0D0D");
  series.risingFill("#43FF43");
  series.risingStroke("#43FF43");

  //TODO Add this later
  // chart.tooltip().titleFormat(function() {
  //   return anychart.format.dateTime(this.clientX, "HH:mm dd MMMM yyyy");
  // });

  var scrollerSeries = chart.scroller().line(candlestickMapping);
  //scrollerSeries.selected().fill("#90A4AE")

  mainPlot
    .ema(dataTable.mapAs({ value: 4 }))
    .series()
    .stroke('1.5 rgb(120, 195, 230)');

  var extraYAxis = mainPlot.yAxis(1);
  extraYAxis.orientation("right");
  extraYAxis.title("Volume");

  var volumeSeries = mainPlot.column(volumeMapping);
  volumeSeries.fill("LightSteelBlue", 0.3)
  volumeSeries.name("Volume");

  var extraYScale = anychart.scales.linear();
  var maxVolume = Math.max.apply(Math, data.map(v => v[format.findIndex(x => x == "volume")]));
  extraYScale.maximum(maxVolume * 4); 
  extraYAxis.scale(extraYScale);
  volumeSeries.yScale(extraYScale);

  mainPlot.legend().titleFormat(function() {
    return anychart.format.dateTime(this.value, "HH:mm dd MMMM yyyy");
  });
       
  var indicatorPlot = chart.plot(1);
  var rsiIndicator = indicatorPlot.rsi(candlestickMapping).series();
  rsiIndicator.stroke("#ECEFF1");

  indicatorPlot.height('20%');
  indicatorPlot.yScale().minimum(0);
  indicatorPlot.yScale().maximum(100);

  indicatorPlot.legend().titleFormat(function() {
    return anychart.format.dateTime(this.value, "HH:mm dd MMMM yyyy");
  });

  //chart.selectRange('2020-01-01', '2022-12-31');
  chart.title(`${stock.toUpperCase()} Stock Chart`);
  chart.container('stockChart');
  chart.draw();
}

function selectModel() {
  var model = $('#models').val();
  if (model == "Train") {
    $("#trainModel").show();
    $("#stockChart").hide();
  } else {
    $("#trainModel").hide();
    $("#stockChart").show();

  }
} 

async function train() {
  var response = await fetch("http://localhost:3000/api/train", { 
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    } 
  });
  let r = await response.json();
  console.log(r);
  let dataLoss = [];
  let dataMAE = [];
  for (let i = 0; i < r.epoch.length; i++) {
    dataLoss.push([r.epoch[i] + 1, r.history.loss[i]]);
    dataMAE.push([r.epoch[i] + 1, r.history.MAE[i]]);
  }

  var lossChart = anychart.line(dataLoss);
  lossChart.xScale(anychart.scales.log());
  lossChart.xScale().minimum(1);
  lossChart.xScale().maximum(r.epoch.length);
  lossChart.xAxis().title("Epochs");
  lossChart.yScale(anychart.scales.log());
  lossChart.title(`Model Loss`);
  lossChart.container('lossChart');
  lossChart.draw();
  
  var maeChart = anychart.line(dataMAE);
  maeChart.xScale(anychart.scales.log());
  maeChart.xScale().minimum(1);
  maeChart.xScale().maximum(r.epoch.length);
  maeChart.xAxis().title("Epochs");
  maeChart.yScale(anychart.scales.log());
  maeChart.title(`Model MAE`);
  maeChart.container('maeChart');
  maeChart.draw();

}