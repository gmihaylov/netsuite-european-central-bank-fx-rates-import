# NetSuite European Central Bank FX Rates Import
Scheduled script that import FX Rates from https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml into NetSuite

## Script flow
- XML data is taken from https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml through N/https.get
- XML data is parsed and converted to JS object
- The JS object is converted to CSV and saved in Import.csv file
- The Import.csv file is then imported through custom CSV Import into List > Accounting > Currency Exchange Rates

## Options / Features
- CSV headers can be changed from the configuration file
- NetSuite/CSV Date format can be changed from the configuration file
- ECB Date format can be changed from the configuration file
- Moment.js library is used for correct parsing / converting of the date formats

## What's included in the project
- Example Import.csv file
- custimport_ecb_fx_rates_csv_import (Custom Saved CSV Import)


## Screenshots

![App Screenshot](src/FileCabinet/SuiteScripts/NetSuite%20European%20Central%20Bank%20FX%20Rates/screenshots/screenshot1.png)
![App Screenshot](src/FileCabinet/SuiteScripts/NetSuite%20European%20Central%20Bank%20FX%20Rates/screenshots/screenshot2.png)
