import React, {useState} from 'react';
import { Grid, Stack, Text, Center, Title } from '@mantine/core';

export default function IncidentSummary({ data }) {
    console.log(data)
    const [twoWeeks, setTwoWeeks] = useState(0)
    const [month, setMonth] = useState(0)
    const calculateOpenIncidents = (duration) => {
        let count = 0;
        const now = Date.now();
        const thresholdMs = duration * 24 * 60 * 60 * 1000; // convert days to ms

        for (let row in data) {
            const openFormVar = data[row]['open-form'];
            let timestampStr = data[row]['non_timestamp'] || data[row]['emp_timestamp'];

            if (!timestampStr) continue;

            // Normalize date string: "YYYY-MM-DD HH:mm" → "YYYY-MM-DDTHH:mm"
            timestampStr = timestampStr.replace(' ', 'T');

            const timestamp = Date.parse(timestampStr);
            if (data[row][openFormVar] !== "2" && !isNaN(timestamp)) {
                const age = now - timestamp;
                if (age > thresholdMs) {
                    count += 1;
                }
            }
        }

        return count;
    };

    return (
        <Grid justify="center" align="flex-start" mb="lg">
            <Grid.Col span={4}>
                <Center>
                    <Stack gap="xs" align="center">
                        <Title order={1}>{data?.length}</Title>
                        <Text> Total Incidents </Text>
                    </Stack>
                </Center>
            </Grid.Col>

            <Grid.Col span={4}>
                <Center>
                    <Stack gap="xs" align="center">
                        <Title order={1}>{calculateOpenIncidents(14)}</Title>
                        <Text align="center">
                            Open Incidents <br />
                            <Text span c="dimmed" size="sm">{`(> 14 days old)`}</Text>
                        </Text>
                    </Stack>
                </Center>
            </Grid.Col>

            <Grid.Col span={4}>
                <Center>
                    <Stack gap="xs" align="center">
                        <Title order={1}>4</Title>
                        <Text> Avg Time to Close (days) </Text>
                    </Stack>
                </Center>
            </Grid.Col>
        </Grid>
    );
}
