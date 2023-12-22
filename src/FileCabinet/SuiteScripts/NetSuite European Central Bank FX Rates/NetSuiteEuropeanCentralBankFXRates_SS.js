/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define([
    './NetSuiteEuropeanCentralBankFXRates_SS_Config',
    './lib/moment',
    'N/log',
    'N/runtime',
    'N/https',
    'N/error',
    'N/xml',
    'N/file',
    'N/query',
    'N/task'
    ],
    
    (
        CONFIG,
        moment,
        log,
        runtime,
        https,
        error,
        xml,
        file,
        query,
        task
    ) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        const execute = (scriptContext) => {
            const parameters = getScriptParameters();
            const xmlEcbRates = getECBXmlFxRates(parameters);
            const ecbRates = parseEcbRates(xmlEcbRates);
            const csvFileId = createCSV(ecbRates, parameters);
            const csvImportTaskId = createCSVImportTask(csvFileId, parameters);

            log.debug({
                title: CONFIG.APP.NAME,
                details: 'CSV Import Task ID: ' + csvImportTaskId
            });
        }

        const createCSVImportTask = (csvFileId, parameters) => {
            const csvImportTask = task.create({
                taskType: task.TaskType.CSV_IMPORT,
                mappingId: parameters[CONFIG.SCRIPT_PARAMETERS.SAVED_CSV_IMPORT_ID],
                importFile: file.load({
                    id: csvFileId
                }),
                name: CONFIG.APP.NAME
            });

            return csvImportTask.submit();
        }

        const createCSV = (ecbRates, parameters) => {
            let csvFile = file.load('./Import.csv');
            const name = csvFile.name;
            const fileType = csvFile.fileType;
            const folderId = csvFile.folder;
            csvFile = null;

            const baseCurrency = parameters[CONFIG.SCRIPT_PARAMETERS.BASE_CURRENCY];

           const fileObj = file.create(
                {
                    name: name,
                    contents: getCSVcontent(ecbRates, baseCurrency),
                    fileType: fileType,
                    folder: folderId,
                    isOnline: false
                }
            );

           return fileObj.save();
        }

        const getCSVcontent = (ecbRates, baseCurrency) => {
            let csvData = '';
            csvData += CONFIG.APP.CSV_HEADERS.join(CONFIG.APP.CSV_DELIMITER) + '\n';

            const ecbTime = convertEcbTime(ecbRates.time);
            const currencies = getCurrencies();

            const currenciesById = currencies.reduce(function (accumulator, currency) {
                accumulator[currency.id] = currency;
                return accumulator;
            }, {});

            const currenciesBySymbol = currencies.reduce(function (accumulator, currency) {
                accumulator[currency.symbol] = currency;
                return accumulator;
            }, {})

            const baseCurrencyName = currenciesById[baseCurrency].name;

            ecbRates.rates.forEach(function (rate) {
                let currencyName;

                if(currenciesBySymbol.hasOwnProperty(rate.currencyCode)) {
                    currencyName = currenciesBySymbol[rate.currencyCode].name;
                } else {
                    log.debug({
                        title: CONFIG.APP.NAME,
                        details: `Currency ISO code ${rate.currencyCode} 
                        will be skipped because it doesn't exists in NetSuite.`
                    });

                    return;
                }

                const line = [baseCurrencyName, currencyName, rate.rate, ecbTime];
                csvData += line.join(CONFIG.APP.CSV_DELIMITER) + '\n';
            });

            return csvData;
        }

        const convertEcbTime = (ecbTime) => {
            return moment(ecbTime, CONFIG.APP.ECB_DATE_FORMAT).format(CONFIG.APP.CSV_DATE_FORMAT);
        }

        const getCurrencies = () => {
                try {
                    const suiteQuery = "SELECT id,symbol,name FROM currency";

                    return query.runSuiteQL(
                        {
                            query: suiteQuery,
                        }
                    ).asMappedResults();
                } catch (e) {
                    throw new error.create({
                        name: 'UNABLE_TO_PARSE_NS_CURRENCIES',
                        message: 'Unable to parse NetSuite currencies: ' + e.message,
                        notifyOff: true
                    });
                }
        }

        const isEmpty = (f) => {
            return (f==null||f=='');
        }

        const getScriptParameters = () => {
            let parameters = {};
            const script = runtime.getCurrentScript();

            parameters[CONFIG.SCRIPT_PARAMETERS.ECB_XML_URL] =
                script.getParameter({name: CONFIG.SCRIPT_PARAMETERS.ECB_XML_URL});

            if(isEmpty(parameters[CONFIG.SCRIPT_PARAMETERS.ECB_XML_URL])) {
                throw new error.create({
                    name: 'INVALID_PARAMETER',
                    message: 'The ' +
                        CONFIG.SCRIPT_PARAMETERS.ECB_XML_URL +
                        ' script parameter is not in a valid format.',
                    notifyOff: true
                });
            }

            parameters[CONFIG.SCRIPT_PARAMETERS.FOLDER_ID_REF_FILES] =
                script.getParameter({name: CONFIG.SCRIPT_PARAMETERS.FOLDER_ID_REF_FILES});

            parameters[CONFIG.SCRIPT_PARAMETERS.FOLDER_ID_REF_FILES] =
                parseInt(parameters[CONFIG.SCRIPT_PARAMETERS.FOLDER_ID_REF_FILES], 10);

            if(isNaN(parameters[CONFIG.SCRIPT_PARAMETERS.FOLDER_ID_REF_FILES])) {
                throw new error.create({
                    name: 'INVALID_PARAMETER',
                    message: 'The ' +
                        CONFIG.SCRIPT_PARAMETERS.FOLDER_ID_REF_FILES +
                        ' script parameter is not in a valid format.',
                    notifyOff: true
                });
            }

            parameters[CONFIG.SCRIPT_PARAMETERS.BASE_CURRENCY] =
                script.getParameter({name: CONFIG.SCRIPT_PARAMETERS.BASE_CURRENCY});

            if(isEmpty(parameters[CONFIG.SCRIPT_PARAMETERS.BASE_CURRENCY])) {
                throw new error.create({
                    name: 'INVALID_PARAMETER',
                    message: 'The ' +
                        CONFIG.SCRIPT_PARAMETERS.BASE_CURRENCY +
                        ' script parameter is not in a valid format.',
                    notifyOff: true
                });
            }

            parameters[CONFIG.SCRIPT_PARAMETERS.SAVED_CSV_IMPORT_ID] =
                script.getParameter({name: CONFIG.SCRIPT_PARAMETERS.SAVED_CSV_IMPORT_ID});

            if(isEmpty(parameters[CONFIG.SCRIPT_PARAMETERS.SAVED_CSV_IMPORT_ID])) {
                throw new error.create({
                    name: 'INVALID_PARAMETER',
                    message: 'The ' +
                        CONFIG.SCRIPT_PARAMETERS.SAVED_CSV_IMPORT_ID +
                        ' script parameter is not in a valid format.',
                    notifyOff: true
                });
            }

            log.debug({
                title: CONFIG.APP.NAME,
                details: 'Script Parameters: ' + JSON.stringify(parameters)
            });

            return parameters;
        }

        const getECBXmlFxRates = (parameters) => {
            try {
                const response = https.get({
                    url: parameters[CONFIG.SCRIPT_PARAMETERS.ECB_XML_URL]
                });

                if(response.code === 200) {
                    return response.body;
                } else {
                    log.debug({
                        title: CONFIG.APP.NAME,
                        details: `Response code != 200 Code ${response.code}`
                    });

                    throw new error.create({
                        name: 'RESPONSE_CODE_NE_200',
                        message: 'Response code != 200',
                        notifyOff: true
                    });
                }

            } catch (e) {
                log.debug({
                    title: CONFIG.APP.NAME,
                    details: `Unable to get response body. Error: ${e.message}`
                });

                throw new error.create({
                    name: 'UNABLE_TO_GET_FX_RATES',
                    message: 'Unable to get FX Rates: ' + e.message,
                    notifyOff: true
                });
            }
        }

        const parseEcbRates = (xmlContent) => {
            const result = {
                time: null,
                rates: []
            };

            try {
                const xmlDocument = xml.Parser.fromString({text: xmlContent});

                result.time = xml.XPath.select({
                    node: xmlDocument,
                    xpath: '/*[local-name()="Envelope"]/*[local-name()="Cube"]/*[local-name()="Cube"]'
                })[0].getAttribute({
                    name: 'time'
                });


                const cubes = xml.XPath.select({
                    node: xmlDocument,
                    xpath: '/*[local-name()="Envelope"]/*[local-name()="Cube"]/*[local-name()="Cube"]/*[local-name()="Cube"]'
                });

                log.debug({
                    title: CONFIG.APP.NAME,
                    details: cubes.length
                })

                cubes.forEach(function (cube) {
                    const currencyCode = cube.getAttribute({
                        name: 'currency'
                    });

                    const rate = parseFloat(cube.getAttribute({
                        name: 'rate'
                    }));

                    result.rates.push({
                        currencyCode: currencyCode,
                        rate: rate
                    })
                });
            } catch (e) {
                throw new error.create({
                    name: 'UNABLE_TO_PARSE_ECB_RATES',
                    message: 'Unable to parse ECB Rates: ' + e.message,
                    notifyOff: true
                });
            }

            return result
        }

        return {execute}

    });
