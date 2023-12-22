/**
 * @NApiVersion 2.1
 */
define([],

    () => {

        const PARAMETERS = {
            APP: {},
            SCRIPT_PARAMETERS: {}
        };

        // App
        PARAMETERS.APP.NAME = 'NetSuite European Central Bank FX Rates Import';
        PARAMETERS.APP.CSV_DELIMITER = ';'
        PARAMETERS.APP.CSV_HEADERS = [
            'Base Currency',
            'Currency',
            'Exchange Rate',
            'Effective Date'
        ];
        PARAMETERS.APP.CSV_DATE_FORMAT = 'MM/DD/YYYY';
        PARAMETERS.APP.ECB_DATE_FORMAT = 'YYYY-MM-DD';

        // Script Parameters
        PARAMETERS.SCRIPT_PARAMETERS.ECB_XML_URL =
            'custscript_ns_ecb_fx_rates_ss_ecb_url';

        PARAMETERS.SCRIPT_PARAMETERS.BASE_CURRENCY =
            'custscript_ns_ecb_fx_rates_ss_base_curr';

        PARAMETERS.SCRIPT_PARAMETERS.SAVED_CSV_IMPORT_ID =
            'custscript_ns_ecb_fx_rates_ss_svd_csv_im';

        return PARAMETERS;
    });
