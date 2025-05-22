// This file extends the default JSMO object with methods for this EM
;
{
    // Define the jsmo in IIFE so we can reference object in our new function methods
    const module = ExternalModules.Stanford.EHSPeopleIntegration;

    // Extend the official JSMO with new methods
    Object.assign(module, {

        ExampleFunction: function () {
            console.log("Example Function showing module's data:", module.data);
        },

        // Ajax function calling 'TestAction'
        InitFunction: function () {
            console.log("Example Init Function");

            // Note use of jsmo to call methods
            module.ajax('TestAction', module.data).then(function (response) {
                // Process response
                console.log("Ajax Result: ", response);
            }).catch(function (err) {
                // Handle error
                console.log(err);
            });
        },
        getRecords: function () {
            module.ajax('getRecords').then(function (response) {
                console.log("RESPONSE", response);
                // TODO
            }).catch(function (err) {
                console.log("Error", err);
            })
        },
    });
}
