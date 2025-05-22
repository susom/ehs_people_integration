import React from 'react';
import { Table, ScrollArea, Box, Card } from '@mantine/core';

const data = [
    {
        number: 'INC-001',
        type: 'Chemical Spill',
        person: 'John Doe',
        date: '2025-01-10',
        lead: 'Jane Smith',
        group: 'Lab Safety',
        status: 'Resolved',
    },
    {
        number: 'INC-002',
        type: 'Fire Alarm',
        person: 'Alice Johnson',
        date: '2025-01-12',
        lead: 'Robert King',
        group: 'Fire Safety',
        status: 'Investigating',
    },
    {
        number: 'INC-003',
        type: 'Equipment Failure',
        person: 'David Brown',
        date: '2025-01-15',
        lead: 'Emily White',
        group: 'Mechanical Safety',
        status: 'Open',
    },
    {
        number: 'INC-004',
        type: 'Power Outage',
        person: 'Laura Wilson',
        date: '2025-01-18',
        lead: 'Michael Green',
        group: 'Facilities',
        status: 'Resolved',
    },
    {
        number: 'INC-005',
        type: 'Chemical Exposure',
        person: 'Chris Martin',
        date: '2025-01-20',
        lead: 'Nancy Drew',
        group: 'Lab Safety',
        status: 'Investigating',
    },
    {
        number: 'INC-006',
        type: 'Injury',
        person: 'Sophia Lee',
        date: '2025-01-22',
        lead: 'James Bond',
        group: 'Medical Response',
        status: 'Resolved',
    },
    {
        number: 'INC-007',
        type: 'Gas Leak',
        person: 'Tom Hardy',
        date: '2025-01-25',
        lead: 'Bruce Wayne',
        group: 'Environmental Safety',
        status: 'Open',
    },
    {
        number: 'INC-008',
        type: 'Slip and Fall',
        person: 'Emma Stone',
        date: '2025-01-27',
        lead: 'Clark Kent',
        group: 'Workplace Safety',
        status: 'Resolved',
    },
    {
        number: 'INC-009',
        type: 'Electrical Issue',
        person: 'Henry Cavill',
        date: '2025-01-28',
        lead: 'Diana Prince',
        group: 'Facilities',
        status: 'Open',
    },
    {
        number: 'INC-010',
        type: 'Biohazard Exposure',
        person: 'Bruce Banner',
        date: '2025-01-30',
        lead: 'Tony Stark',
        group: 'Lab Safety',
        status: 'Investigating',
    },
];

export default function IncidentTable() {
    return (
        <Box p={20}>
            <Card>
                <ScrollArea>
                    <Table striped highlightOnHover withTableBorder>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Incident Number</Table.Th>
                                <Table.Th>Incident Type</Table.Th>
                                <Table.Th>Name of Person Involved</Table.Th>
                                <Table.Th>Date of Incident</Table.Th>
                                <Table.Th>Name of Incident Lead</Table.Th>
                                <Table.Th>Lead Safety Group</Table.Th>
                                <Table.Th>Status of Incident</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {data.map((incident) => (
                                <Table.Tr key={incident.number}>
                                    <Table.Td>{incident.number}</Table.Td>
                                    <Table.Td>{incident.type}</Table.Td>
                                    <Table.Td>{incident.person}</Table.Td>
                                    <Table.Td>{incident.date}</Table.Td>
                                    <Table.Td>{incident.lead}</Table.Td>
                                    <Table.Td>{incident.group}</Table.Td>
                                    <Table.Td>{incident.status}</Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            </Card>
        </Box>
    );
}
