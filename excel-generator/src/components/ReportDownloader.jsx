// src/components/ReportDownloader.jsx
import React, { useState } from 'react';
import { Button, Container, Stack, Title, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import dayjs from 'dayjs';
import axios from 'axios';
import { saveAs } from 'file-saver';

const ReportDownloader = () => {
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        if (!startDate || !endDate) {
            alert('Please select both dates.');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.get('http://localhost:5000/api/report', {
                params: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                },
                responseType: 'blob',
            });

            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });

            saveAs(
                blob,
                `report_${dayjs(startDate).format('YYYY-MM-DD')}_to_${dayjs(endDate).format('YYYY-MM-DD')}.xlsx`
            );
        } catch (err) {
            console.error(err);
            alert('Failed to download report.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container size="sm" mt="xl">
            <Title order={2} mb="md">
                Download Report
            </Title>
            <Stack spacing="md">
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
