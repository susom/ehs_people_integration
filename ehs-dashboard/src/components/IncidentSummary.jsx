import React, { useState } from 'react';
import { Grid, Stack, Text, Center, Title, Select, Tooltip } from '@mantine/core';
import { IconAdjustments } from '@tabler/icons-react';

export default function IncidentSummary({ data }) {
    const [durationOption, setDurationOption] = useState('14');

    const calculateOpenIncidents = (duration) => {
        let count = 0;
        const now = Date.now();

        for (const row of data) {
            const openFormVar = row['open-form'];
            let timestampStr = row['non_timestamp'] || row['emp_timestamp'];

            if (!timestampStr || row[openFormVar] === "2") continue;

            timestampStr = timestampStr.replace(' ', 'T');
            const timestamp = Date.parse(timestampStr);
            if (isNaN(timestamp)) continue;

            if (duration === 'all') {
                count += 1;
            } else {
                const thresholdMs = parseInt(duration, 10) * 24 * 60 * 60 * 1000;
                const age = now - timestamp;
                if (age > thresholdMs) {
                    count += 1;
                }
            }
        }

        return count;
    };

    const durationLabelMap = {
        all: '(All open)',
        '14': '(> 14 days old)',
        '30': '(> 30 days old)',
    };

    return (
        <Grid justify="center" align="flex-start" mb="lg">
            <Grid.Col span={6}>
                <Center>
                    <Stack gap="xs" align="center">
                        <Title order={1}>{data?.length}</Title>
                        <Tooltip position="bottom" label={'Total count of incidents in table (including filters)'} withArrow>
                            <Text>Total Incidents</Text>
                        </Tooltip>
                    </Stack>
                </Center>
            </Grid.Col>

            <Grid.Col span={6}>
                <Center>
                    <Stack gap="xs" align="center">
                        <Title order={1}>{calculateOpenIncidents(durationOption)}</Title>
                        <Tooltip multiline w={400} position="bottom" label={'Total count of open incidents in table (including filters). ' +
                            'Open incidents are those with a `Date Reported` value without a completed `incident lead followup` survey'} withArrow>
                            <Text align="center">
                                Open Incidents <br />
                            </Text>
                        </Tooltip>
                        <Select
                            value={durationOption}
                            onChange={(val) => setDurationOption(val)}
                            data={[
                                { value: 'all', label: 'All open' },
                                { value: '14', label: '> 14 days old' },
                                { value: '30', label: '> 30 days old' },
                            ]}
                            w={160}
                            allowDeselect={false}
                            clearable={false}
                            size="xs"
                        />
                    </Stack>
                </Center>
            </Grid.Col>
        </Grid>
    );
}
