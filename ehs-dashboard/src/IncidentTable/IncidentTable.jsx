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
    1: 'incident_type_concat',
    2: 'name_of_person_involved',
    3: 'date_of_incident',
    4: 'date_reported',
    5: 'tri_lead_name',
    6: 'tri_lead_safety_group',
    7: 'location_type',
    8: 'employee_manager_name',
    9: 'building_location'
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

        const getTimestamp = (val) => {
            console.log('value', val)
            //TODO: Fix for sorting
            if (!val || typeof val !== 'string') return NaN;

            val = val.trim();

            // Try to normalize MM-DD-YYYY to ISO format
            const mmddyyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
            const match = val.match(mmddyyyy);
            if (match) {
                const [_, mm, dd, yyyy] = match;
                return new Date(`${yyyy}-${mm}-${dd}T00:00:00`).getTime();
            }

            // Fallback: try native parsing (supports ISO, YYYY-MM-DD, YYYY-MM-DD HH:mm, etc.)
            const parsed = Date.parse(val);
            return isNaN(parsed) ? NaN : parsed;
        };

        return [...sourceData].sort((a, b) => {
            const aVal = a[key] ?? '';
            const bVal = b[key] ?? '';

            const aTs = getTimestamp(aVal);
            const bTs = getTimestamp(bVal);
            console.log('compare', aTs, bTs)

            if (!isNaN(aTs) && !isNaN(bTs)) {
                return sortDirection === 'asc' ? aTs - bTs : bTs - aTs;
            }

            // fallback string comparison
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

    const buildRedirectUrl = (record, formName = null) => {
        if (!record) return;

        const urlObj = new URL(window.location.href);
        const pid = urlObj.searchParams.get('pid');
        const cleanedPath = urlObj.pathname.replace(/\/ExternalModules\/.*/, '/');
        const baseUrl = urlObj.origin + cleanedPath;

        if (formName) {
            // Redirect to specific form
            return `${baseUrl}DataEntry/index.php?pid=${pid}&page=${formName}&id=${record}`;
        } else {
            // Redirect to record home
            return `${baseUrl}DataEntry/record_home.php?pid=${pid}&id=${record}`;
        }
    };


    return (
        <Box p={20}>
           <IncidentSummary data={sortedData}/>
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
                                    'Date Reported',
                                    'Name of Incident Lead',
                                    'Lead Safety Group',
                                    'Location Type',
                                    'Name of Manager/PI',
                                    'Building',
                                    ...statusColumns.map(([label]) => label), // ✅ Only show display labels
                                ].map((label, index) => (
                                    <Table.Th
                                        key={index}
                                        onClick={() => handleSort(index)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {label} {sortColumn === index ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                                    </Table.Th>
                                ))}
                            </Table.Tr>
                        </Table.Thead>

                        <Table.Tbody>
                            {currentPageData.map((incident) => {
                                const fullText = incident?.incident_type_concat || '';
                                const truncated = fullText.length > 50
                                    ? fullText.slice(0, 50) + '...'
                                    : fullText;

                                return (
                                    <Table.Tr key={incident?.record_id}>
                                        <Table.Td>
                                            <a href={buildRedirectUrl(incident?.record_id)}>
                                                {incident?.record_id}
                                            </a>
                                        </Table.Td>

                                        <Table.Td>
                                            {fullText.length > 50 ? (
                                                <Tooltip label={fullText} multiline w={300} withArrow>
                                                    <Text size="sm" truncate>{truncated}</Text>
                                                </Tooltip>
                                            ) : (
                                                <Text size="sm">{fullText}</Text>
                                            )}
                                        </Table.Td>

                                        <Table.Td>
                                            {incident?.name_of_person_involved}
                                        </Table.Td>
                                        <Table.Td>{incident?.date_of_incident}</Table.Td>
                                        <Table.Td>{incident?.date_reported}</Table.Td>
                                        <Table.Td>{incident?.tri_lead_name}</Table.Td>
                                        <Table.Td>{incident?.tri_lead_safety_group}</Table.Td>
                                        <Table.Td>{incident?.location_type}</Table.Td>
                                        <Table.Td>{incident?.employee_manager_name}</Table.Td>
                                        <Table.Td>{incident?.building_location}</Table.Td>
                                        {/* Dynamically render status columns */}
                                        {statusColumns.map(([label, fieldName], i) => {
                                            const value = incident?.completed_statuses?.[label] ?? '';
                                            const statusMap = {
                                                '2': { color: 'rgba(0, 128, 0, 0.7)', label: 'Complete' },
                                                '1': { color: 'rgba(255, 215, 0, 0.7)', label: 'Unverified' },
                                                '0': { color: 'rgba(128, 128, 128, 0.8)', label: 'Incomplete' },
                                            };

                                            const status = statusMap[value] ?? { color: 'rgba(128, 128, 128, 0.6)', label: 'Not started' };

                                            return (
                                                <Table.Td key={`status-${i}`}>
                                                    <Tooltip label={status.label} withArrow>
                                                        <span
                                                            onClick={() => { window.location.href = buildRedirectUrl(incident?.record_id, fieldName);}}
                                                            style={{
                                                                display: 'inline-block',
                                                                cursor: 'pointer',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.textDecoration = 'underline';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.textDecoration = 'none';
                                                            }}
                                                        >
                                                            <ColorSwatch
                                                                style={{
                                                                    border: '1px solid gray',
                                                                    boxShadow: '0 0 4px white',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: 'transparent',
                                                                    backgroundImage: `radial-gradient(circle, ${status.color} 70%, transparent 100%)`,
                                                                    backgroundClip: 'content-box',
                                                                    padding: 0,
                                                                }}
                                                                color={status.color}
                                                                size={18}
                                                            />
                                                          </span>
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
            <FilterModal
                opened={opened}
                onClose={close}
                data={data}
                onApplyFilters={(e) => handleApplyFilters(e)}
                setFilterApplied={setFilterApplied}
                statusColumns={statusColumns}
            />
        </Box>
    );
}
