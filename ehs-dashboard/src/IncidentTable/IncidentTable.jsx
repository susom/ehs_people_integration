import React, {useEffect, useState} from 'react';
import {
    Table,
    ScrollArea,
    Box,
    Card,
    ActionIcon,
    Group,
    Pagination,
    Select,
    Indicator,
    Tooltip,
    Text,
    ColorSwatch
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import SearchBar from "../components/searchBar.jsx";
import {IconFilter2Plus} from "@tabler/icons-react";
import IncidentSummary from "../components/IncidentSummary.jsx";
import FilterModal from "../components/FilterModal.jsx";
// Utility function to chunk array into pages
const chunk = (array, size) => {
    if (!array.length) return [];
    const head = array.slice(0, size);
    const tail = array.slice(size);
    return [head, ...chunk(tail, size)];
};

// Column to key map for sorting
const columnKeyMap = {
    0: 'record_id',
    1: 'non_type_concat',
    2: 'non_name',
    3: 'non_date',
    4: 'tri_lead_name',
    5: 'tri_lead_safety_group',
};

export default function IncidentTable() {
    const [activePage, setActivePage] = useState(1);
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');
    const [displayCount, setDisplayCount] = useState(25);
    const [searchValue, setSearchValue] = useState('');
    const [opened, { open, close }] = useDisclosure(false);
    const [filterApplied, setFilterApplied] = useState(false);
    const [data, setData] = useState([]);
    const [statusColumns, setStatusColumns] = useState([]);
    // const [data, setData] = useState([
    //     { number: 'INC-001', type: 'Chemical Spill', person: 'John Doe', date: '2025-01-10', lead: 'Jane Smith', group: 'Lab Safety', status: 'Resolved' },
    //     { number: 'INC-002', type: 'Fire Alarm', person: 'Alice Johnson', date: '2025-01-12', lead: 'Robert King', group: 'Fire Safety', status: 'Investigating' },
    //     { number: 'INC-003', type: 'Equipment Failure', person: 'David Brown', date: '2025-01-15', lead: 'Emily White', group: 'Mechanical Safety', status: 'Open' },
    //     { number: 'INC-004', type: 'Power Outage', person: 'Laura Wilson', date: '2025-01-18', lead: 'Michael Green', group: 'Facilities', status: 'Resolved' },
    //     { number: 'INC-005', type: 'Chemical Exposure', person: 'Chris Martin', date: '2025-01-20', lead: 'Nancy Drew', group: 'Lab Safety', status: 'Investigating' },
    //     { number: 'INC-006', type: 'Injury', person: 'Sophia Lee', date: '2025-01-22', lead: 'James Bond', group: 'Medical Response', status: 'Resolved' },
    //     { number: 'INC-007', type: 'Gas Leak', person: 'Tom Hardy', date: '2025-01-25', lead: 'Bruce Wayne', group: 'Environmental Safety', status: 'Open' },
    //     { number: 'INC-008', type: 'Slip and Fall', person: 'Emma Stone', date: '2025-01-27', lead: 'Clark Kent', group: 'Workplace Safety', status: 'Resolved' },
    //     { number: 'INC-009', type: 'Electrical Issue', person: 'Henry Cavill', date: '2025-01-28', lead: 'Diana Prince', group: 'Facilities', status: 'Open' },
    //     { number: 'INC-010', type: 'Biohazard Exposure', person: 'Bruce Banner', date: '2025-01-30', lead: 'Tony Stark', group: 'Lab Safety', status: 'Investigating' },
    // ]);
    const [filteredData, setFilteredData] = useState([])

    useEffect(() => {
        let jsmoModule;

        if (import.meta?.env?.MODE !== 'development')
            jsmoModule = ExternalModules.Stanford.EHSPeopleIntegration;
        jsmoModule.getRecords(
            (res) => {
                console.log("Success:", res);
                setData(res?.data)
                setFilteredData(res?.data)
                setStatusColumns(res?.columns)
                // setState(data) or do something useful
            },
            (err) => {
                console.error("Failed to load records:", err);
            }
        );
    }, []);


    const handleApplyFilters = (filtered) => {
        setFilteredData(filtered);
    };
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

    const searchedData = filteredData.filter((item) =>
        Object.values(item).some((value) =>
            String(value || '') // ensure it's a string
                .toLowerCase()
                .includes((searchValue || '').toLowerCase()) // handle undefined/null
        )
    );

    const sortedData = getSortedData(searchedData);
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

    const recordRedirectUrl = (record) => {
        if(record) {
            const urlObj = new URL(window.location.href);

            // Extract `pid` from query parameters
            const pid = urlObj.searchParams.get('pid');
            const cleanedPath = urlObj.pathname.replace(/\/ExternalModules\/.*/, '/');

            const baseUrl = urlObj.origin + cleanedPath;
            return `${baseUrl}DataEntry/record_home.php?pid=${pid}&id=${record}`
        }
    }

    return (
        <Box p={20}>
           <IncidentSummary total={filteredData.length}/>
            <Card shadow="sm" withBorder>
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
                    <Group gap="xs" align="center">
                        <Indicator position="top-start" disabled={!filterApplied} color="green" size={12} processing>
                            <ActionIcon
                                h={36} // Match TextInput height (default size)
                                w={36}
                                mb="xs"
                                variant="default"
                                color="rgba(0, 0, 0, 1)"
                                aria-label="Settings"
                                onClick={open}

                            >
                                <IconFilter2Plus stroke={1.5} size={20} />
                            </ActionIcon>
                        </Indicator>

                        <SearchBar
                            value={searchValue}
                            onDebouncedChange={(val) => {
                                setSearchValue(val);
                                setActivePage(1);
                            }}
                            delay={300} // optional: adjust debounce time
                        />
                    </Group>
                </Group>
                <ScrollArea>
                    <Table striped highlightOnHover withTableBorder>
                        <Table.Thead>
                            <Table.Tr>
                                {[
                                    'Incident Number',
                                    'Incident Type',
                                    'Name of Person Involved',
                                    'Date of Incident',
                                    'Name of Incident Lead',
                                    'Lead Safety Group',
                                    ...statusColumns,
                                ].map((label, index) => (
                                    <Table.Th
                                        key={index}
                                        onClick={() => handleSort(index)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {label}{' '}
                                        {sortColumn === index ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                                    </Table.Th>
                                ))}
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {currentPageData.map((incident) => {
                                const fullText = incident?.non_type_concat || '';
                                const truncated = fullText.length > 75
                                    ? fullText.slice(0, 75) + '...'
                                    : fullText;

                                return (
                                    <Table.Tr key={incident?.record_id}>
                                        <Table.Td><a href={recordRedirectUrl(incident?.record_id)}>{incident?.record_id}</a></Table.Td>

                                        <Table.Td>
                                            {fullText.length > 75 ? (
                                                <Tooltip label={fullText} multiline w={300} withArrow>
                                                    <Text size="sm" truncate>{truncated}</Text>
                                                </Tooltip>
                                            ) : (
                                                <Text size="sm">{fullText}</Text>
                                            )}
                                        </Table.Td>

                                        <Table.Td>{incident?.non_name}</Table.Td>
                                        <Table.Td>{incident?.non_date}</Table.Td>
                                        <Table.Td>{incident?.tri_lead_name}</Table.Td>
                                        <Table.Td>{incident?.tri_lead_safety_group}</Table.Td>

                                        {/* Dynamically render status columns */}
                                        {statusColumns.map((colName, i) => {
                                            const value = incident?.completed_statuses?.[colName] ?? '';
                                            const statusMap = {
                                                '2': { color: 'green', label: 'Complete' },
                                                '1': { color: 'yellow', label: 'Unverified' },
                                                '0': { color: 'red', label: 'Incomplete' },
                                            };

                                            const status = statusMap[value] ?? { color: 'gray', label: 'Unknown' };

                                            return (
                                                <Table.Td key={`status-${i}`}>
                                                    <Tooltip label={status.label} withArrow>
                                                        <ColorSwatch color={status.color} size={18} />
                                                    </Tooltip>
                                                </Table.Td>
                                            );
                                        })}
                                    </Table.Tr>
                                );
                            })}
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
            <FilterModal opened={opened} onClose={close} data={data} onApplyFilters={(e) => handleApplyFilters(e)} setFilterApplied={setFilterApplied} />
        </Box>
    );
}
