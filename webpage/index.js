
function loadChart() {
  const stockSymbol = document.getElementById('stockSymbol').value;
  if (!stockSymbol) {
    alert('Please enter a stock symbol.');
    return;
  }

  // Example data for demonstration
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const data = [150, 160, 170, 165, 180, 190];

  const ctx = document.getElementById('stockChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
    labels: labels,
    datasets: [{
      label: `${stockSymbol} Stock Price`,
      data: data,
      borderColor: 'rgba(75, 192, 192, 1)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      borderWidth: 2
    }]
    },
    options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
      beginAtZero: true
      },
      y: {
      beginAtZero: true
      }
    }
    }
  });
}