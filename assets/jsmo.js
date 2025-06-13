// This file extends the default JSMO object with methods for this EM
;
{
    // Define the jsmo in IIFE so we can reference object in our new function methods
    const module = ExternalModules.Stanford.EHSPeopleIntegration;

    Object.assign(module, {
        getRecords: function (callback, errorCallback) {
            module.ajax('getRecords')
                .then(function (response) {
                    if (response?.success) {
                        if (typeof callback === 'function') {
                            callback(response);
                        }
                    } else {
                        if (typeof errorCallback === 'function') {
                            errorCallback(new Error('Request failed'));
                        }
                    }
                })
                .catch(function (err) {
                    if (typeof errorCallback === 'function') {
                        errorCallback(err);
                    } else {
                        console.error("Error", err);
                    }
                });
        },
    });
}
