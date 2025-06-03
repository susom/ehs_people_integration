import React from 'react';
import { Grid, Stack, Text, Center, Title } from '@mantine/core';

export default function IncidentSummary({ total }) {
    return (
        <Grid justify="center" align="flex-start" mb="lg">
            <Grid.Col span={4}>
                <Center>
                    <Stack gap="xs" align="center">
                        <Title order={1}>{total}</Title>
                        <Text> Total Incidents </Text>
                    </Stack>
                </Center>
            </Grid.Col>

            <Grid.Col span={4}>
                <Center>
                    <Stack gap="xs" align="center">
                        <Title order={1}>3</Title>
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
