import React, { useState } from 'react';
import {
    Button,
    Container,
    Stack,
    Title,
    Alert,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';

const ReportDownloader = () => {
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleDownload = async () => {
        setSuccessMsg('');
        setErrorMsg('');

        if (!startDate || !endDate) {
            setErrorMsg('Please select both start and end dates.');
            return;
        }

        setLoading(true);
        try {
            let jsmoModule;

            if (import.meta?.env?.MODE !== 'development') {
                jsmoModule = ExternalModules.Stanford.EHSPeopleIntegration;
            }

            jsmoModule
                .ajax('generateExcelFile', {
                    start: startDate,
                    end: endDate,
                })
                .then((response) => {
                    console.log(response);
                    if (response.success && response.url) {
                        const link = document.createElement('a');
                        link.href = response.url;
                        link.download = ''; // optional: override filename
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        setSuccessMsg('Report downloaded as "OSHA_Form_300_Filled.xlsx"');
                    } else {
                        setErrorMsg(response.message);
                    }
                })
                .catch((err) => {
                    console.error('Error', err);
                    setErrorMsg('An error occurred while generating the report.');
                })
                .finally(() => {
                    setLoading(false);
                });
        } catch (err) {
            console.error(err);
            setErrorMsg('Unexpected error. Failed to download report.');
            setLoading(false);
        }
    };

    return (
        <Container size="sm" mt="xl">
            <Title order={2} mb="md">
                Download Report
            </Title>

            <Stack spacing="md">
                {successMsg && (
                    <Alert icon={<IconCheck size={16} />} color="green" title="Success">
                        {successMsg}
                    </Alert>
                )}
                {errorMsg && (
                    <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
                        {errorMsg}
                    </Alert>
                )}

                <DatePickerInput
                    label="Start Date"
                    placeholder="Pick start date"
                    value={startDate}
                    onChange={setStartDate}
                />
                <DatePickerInput
                    label="End Date"
                    placeholder="Pick end date"
                    value={endDate}
                    onChange={setEndDate}
                />

                <Button onClick={handleDownload} loading={loading}>
                    Download Excel
                </Button>
            </Stack>
        </Container>
    );
};

export default ReportDownloader;
