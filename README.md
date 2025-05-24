[![Contributors][contributors-shield]][contributors-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![LinkedIn][linkedin-shield]][linkedin-url]

# StockPredictor

DNN linear regression model using tensorflow.js to predict short term stock behaviour

- [Installation](#installation)
- [Common Errors](#common-errors-and-fixes)

<br>

## Dependencies
- [Node.js >= 22](https://nodejs.org/en/download)
<br>

## Features
- Stock visualization with indicators (RSI, EMA)
- Customizable DNN model training for stock prediction
- Existing DNN models that can be imported and used
<br>

## Installation

### Environment
1. Ensure you have [Node.js](https://nodejs.org/en/download) and npm installed. Verify you have installed these correctly using 
```
node -v
npm -v
```

2. Install the required packages using
```npm install```

3. Create a `.env` file in the main directory and add your keys. A personal API key can be obtained from [Polygon](https://polygon.io/).

```
POLYGON_KEY = "<Add your key here>"
```
<br>


### Running the code
Start the express server using the following command:
```
node .
```
The webpage can now be accessed at `localhost:3000`.
<br><br>

<br>

## Common Errors and Fixes

### `Error: The specified module could not be found.`

```
  return process.dlopen(module, path.toNamespacedPath(filename));
                 ^

Error: The specified module could not be found.
```
**Fix:**
Copy the file `tensorflow.dll` from `\node_modules\@tensorflow\tfjs-node\deps\lib\` to `\node_modules\@tensorflow\tfjs-node\lib\napi-v8\`.


<br><br>



[contributors-shield]: https://img.shields.io/github/contributors/jasonkwok475/StockPredictor.svg?style=for-the-badge
[contributors-url]: https://github.com/jasonkwok475/StockPredictor/graphs/contributors
[stars-shield]: https://img.shields.io/github/stars/jasonkwok475/StockPredictor.svg?style=for-the-badge
[stars-url]: https://github.com/jasonkwok475/StockPredictor/stargazers
[issues-shield]: https://img.shields.io/github/issues/jasonkwok475/StockPredictor.svg?style=for-the-badge
[issues-url]: https://github.com/jasonkwok475/StockPredictor/issues
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/jasonkwok475
