import React, { useState } from 'react';
import {
    Table,
    ScrollArea,
    Box,
    Card,
    Grid,
    Group,
    Pagination,
    Select,
    TextInput, Center
} from '@mantine/core';
import SearchBar from "../components/searchBar.jsx";
import {IconSearch} from "@tabler/icons-react";
import IncidentSummary from "../components/IncidentSummary.jsx";
// Utility function to chunk array into pages
const chunk = (array, size) => {
    if (!array.length) return [];
    const head = array.slice(0, size);
    const tail = array.slice(size);
    return [head, ...chunk(tail, size)];
};

// Column to key map for sorting
const columnKeyMap = {
    0: 'number',
    1: 'type',
    2: 'person',
    3: 'date',
    4: 'lead',
    5: 'group',
    6: 'status',
};

export default function IncidentTable() {
    const [activePage, setActivePage] = useState(1);
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');
    const [displayCount, setDisplayCount] = useState(25);
    const [searchValue, setSearchValue] = useState('');

    const data = [
        { number: 'INC-001', type: 'Chemical Spill', person: 'John Doe', date: '2025-01-10', lead: 'Jane Smith', group: 'Lab Safety', status: 'Resolved' },
        { number: 'INC-002', type: 'Fire Alarm', person: 'Alice Johnson', date: '2025-01-12', lead: 'Robert King', group: 'Fire Safety', status: 'Investigating' },
        { number: 'INC-003', type: 'Equipment Failure', person: 'David Brown', date: '2025-01-15', lead: 'Emily White', group: 'Mechanical Safety', status: 'Open' },
        { number: 'INC-004', type: 'Power Outage', person: 'Laura Wilson', date: '2025-01-18', lead: 'Michael Green', group: 'Facilities', status: 'Resolved' },
        { number: 'INC-005', type: 'Chemical Exposure', person: 'Chris Martin', date: '2025-01-20', lead: 'Nancy Drew', group: 'Lab Safety', status: 'Investigating' },
        { number: 'INC-006', type: 'Injury', person: 'Sophia Lee', date: '2025-01-22', lead: 'James Bond', group: 'Medical Response', status: 'Resolved' },
        { number: 'INC-007', type: 'Gas Leak', person: 'Tom Hardy', date: '2025-01-25', lead: 'Bruce Wayne', group: 'Environmental Safety', status: 'Open' },
        { number: 'INC-008', type: 'Slip and Fall', person: 'Emma Stone', date: '2025-01-27', lead: 'Clark Kent', group: 'Workplace Safety', status: 'Resolved' },
        { number: 'INC-009', type: 'Electrical Issue', person: 'Henry Cavill', date: '2025-01-28', lead: 'Diana Prince', group: 'Facilities', status: 'Open' },
        { number: 'INC-010', type: 'Biohazard Exposure', person: 'Bruce Banner', date: '2025-01-30', lead: 'Tony Stark', group: 'Lab Safety', status: 'Investigating' },
    ];

    // Sort data before chunking
    const getSortedData = (sourceData) => {
        if (sortColumn === null) return [...sourceData];

        const key = columnKeyMap[sortColumn];
        return [...sourceData].sort((a, b) => {
            let aVal = a[key] ?? '';
            let bVal = b[key] ?? '';

            if (!isNaN(Date.parse(aVal)) && !isNaN(Date.parse(bVal))) {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }

            return sortDirection === 'asc'
                ? aVal.toString().localeCompare(bVal.toString())
                : bVal.toString().localeCompare(aVal.toString());
        });
    };
    const filteredData = data.filter((item) =>
        Object.values(item).some((value) =>
            String(value || '') // ensure it's a string
                .toLowerCase()
                .includes((searchValue || '').toLowerCase()) // handle undefined/null
        )
    );

    const sortedData = getSortedData(filteredData);
    const pagesActive = chunk(sortedData, displayCount);
    const currentPageData = pagesActive[activePage - 1] ?? [];

    const handleSort = (columnIndex) => {
        if (sortColumn === columnIndex) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(columnIndex);
            setSortDirection('asc');
        }
        setActivePage(1); // Reset to page 1 when sorting
    };

    const displayCountChange = (value) => {
        const count = parseInt(value.replace(/\D/g, '')); // Extract numeric value
        setDisplayCount(count);
        setActivePage(1); // Reset to first page
    };


    return (
        <Box p={20}>
           <IncidentSummary/>
            <Card>
                <Group
                    justify="space-between"
                >
                    <Select
                        w="150px"
                        mb="xs"
                        defaultValue="Show 25 rows"
                        data={['Show 25 rows', 'Show 50 rows', 'Show 75 rows']}
                        onChange={displayCountChange}
                    />
                    <SearchBar
                        value={searchValue}
                        onDebouncedChange={(val) => {
                            setSearchValue(val);
                            setActivePage(1);
                        }}
                        delay={300} // optional: adjust debounce time
                    />
                </Group>
                <ScrollArea>
                    <Table striped highlightOnHover withTableBorder>
                        <Table.Thead>
                            <Table.Tr>
                                {['Incident Number', 'Incident Type', 'Name of Person Involved', 'Date of Incident', 'Name of Incident Lead', 'Lead Safety Group', 'Status of Incident'].map((label, index) => (
                                    <Table.Th key={index} onClick={() => handleSort(index)} style={{ cursor: 'pointer' }}>
                                        {label} {sortColumn === index ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                                    </Table.Th>
                                ))}
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {currentPageData.map((incident) => (
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
                    <Group justify="flex-end">
                        <Pagination
                            m="lg"
                            total={pagesActive.length}
                            value={activePage}
                            onChange={setActivePage}
                        />
                    </Group>
                </ScrollArea>
            </Card>
        </Box>
    );
}
