var default_stock = "SPX";
var models;

$(document).ready(async function () {
  loadModels();
  loadStockChart();
});

async function loadModels() {
  var response = await fetch("http://localhost:3000/api/models", { method: "GET" });
  models = await response.json();

  for (var i = 0; i < models.length; i++) {
    var item = '<option value="'+models[i]+'">'+models[i]+'</option>';
    $('#models').append(item);
  }
}

function loadStockChart() {
  // load data
  anychart.data.loadCsvFile(
    'https://gist.githubusercontent.com/awanshrestha/6481638c175e82dc6a91a499a8730057/raw/1791ef1f55f0be268479286284a0452129371003/TSMC.csv',
        function (data) {
          // create a data table on the loaded data
          var dataTable = anychart.data.table();
          dataTable.addData(data);
          // map the loaded data for the candlestick series
          var mapping = dataTable.mapAs({
            open: 1,
            high: 2,
            low: 3,
            close: 4
          });
          // create a stock chart
          var chart = anychart.stock();
          // change the color theme
          anychart.theme('darkGlamour');
          // create the chart plot
          var plot = chart.plot(0);
          // set the grid settings
          plot
            .yGrid(true)
            .xGrid(true)
            .yMinorGrid(true)
            .xMinorGrid(true);
          // create the candlestick series
          var series = plot.candlestick(mapping);
          series.name('TSMC');
          series.legendItem().iconType('rising-falling');
          // create a range picker
          var rangePicker = anychart.ui.rangePicker();
          rangePicker.render(chart);
          // create a range selector
          var rangeSelector = anychart.ui.rangeSelector();
          rangeSelector.render(chart);
          // modify the color of the candlesticks 
          series.fallingFill("#FF0D0D");
          series.fallingStroke("#FF0D0D");
          series.risingFill("#43FF43");
          series.risingStroke("#43FF43");
     
          // add a second plot to show macd values
          var indicatorPlot = chart.plot(1);
          // map the macd values
          var macdIndicator = indicatorPlot.macd(mapping);
          // set the histogram series
          macdIndicator.histogramSeries('area');
          macdIndicator
            .histogramSeries().normal().fill('green .3').stroke('green');
          macdIndicator
            .histogramSeries().normal().negativeFill('red .3').negativeStroke('red');
          // set the second plot's height
          indicatorPlot.height('30%');
          // set the chart display for the selected date/time range
          chart.selectRange('2020-01-01', '2022-12-31');
          // set the title of the chart
          chart.title('TSMC Stock Chart');
          // set the container id for the chart
          chart.container('stockChart');
          // initiate the chart drawing
          chart.draw();
        }
      );
}


// function loadChart() {
//   const stockSymbol = document.getElementById('stockSymbol').value;
//   if (!stockSymbol) {
//     alert('Please enter a stock symbol.');
//     return;
//   }

//   // Example data for demonstration
//   const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
//   const data = [150, 160, 170, 165, 180, 190];

//   const ctx = document.getElementById('stockChart').getContext('2d');
//   new Chart(ctx, {
//     type: 'line',
//     data: {
//     labels: labels,
//     datasets: [{
//       label: `${stockSymbol} Stock Price`,
//       data: data,
//       borderColor: 'rgba(75, 192, 192, 1)',
//       backgroundColor: 'rgba(75, 192, 192, 0.2)',
//       borderWidth: 2
//     }]
//     },
//     options: {
//     responsive: true,
//     maintainAspectRatio: false,
//     scales: {
//       x: {
//       beginAtZero: true
//       },
//       y: {
//       beginAtZero: true
//       }
//     }
//     }
//   });
// }