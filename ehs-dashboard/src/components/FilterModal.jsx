import React, { useState } from 'react';
import {
    Modal,
    Button,
    Group,
    Select,
    TextInput,
    ActionIcon,
    Divider,
    Stack,
} from '@mantine/core';
import { IconX, IconTrash, IconPlus } from '@tabler/icons-react';

export default function FilterModal({ opened, onClose, data, onApplyFilters, setFilterApplied, statusColumns}) {
    const [filters, setFilters] = useState([]);

    // Generate list of unique safety groups for dropdown filter
    const uniqueGroups = Array.from(new Set(data.map(row => row.tri_lead_safety_group))).filter(Boolean);
    const addFilter = () => {
        setFilters((prev) => [
            ...prev,
            { logic: '', column: null, operator: null, value: '', valueStart: '', valueEnd: '' },
        ]);
    };

    const updateFilter = (index, key, newValue) => {
        setFilters((prev) =>
            prev.map((f, i) => (i === index ? { ...f, [key]: newValue } : f))
        );
    };

    const removeFilter = (index) => {
        setFilters((prev) => {
            const newFilters = prev.filter((_, i) => i !== index);

            if (newFilters.length === 0) {
                setFilterApplied(false);
                onApplyFilters(data);
            }

            return newFilters;
        });
    };

    const clearAllFilters = () => {
        setFilters([]);
        onApplyFilters(data);
        setFilterApplied(false);
    };

    /**
     * Safely retrieves the value from a nested object using a dot-separated path string.
     *
     * @param {Object} obj - The object to retrieve the value from.
     * @param {string} path - A string representing the path to the value, using dot notation (e.g., "completed_statuses.Su17 Employee Form").
     * @returns {*} - The value at the specified path, or undefined if any part of the path is missing.
     */
    const getNestedValue = (obj, path) => {
        if (!obj || typeof path !== 'string') return undefined;

        // If there's no dot, return the direct property
        if (!path.includes('.')) return obj[path];

        // Traverse the path
        return path
            .split('.')
            .reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
    };

    /**
     * Applies an array of filter objects to a dataset.
     *
     * @param {Array<Object>} tableData - The dataset to be filtered.
     * @param {Array<Object>} filters - An array of filter objects containing column, operator, values, and logic.
     * @returns {void} - Calls onApplyFilters with the filtered dataset and sets the filterApplied state.
     */
    const applyFilters = (tableData, filters) => {
        if (filters.length === 0) return tableData;
        const rows = tableData.filter((row) => {
            let result = null;

            for (let i = 0 ; i < filters.length; i++) {
                const { logic, column, operator, value, valueStart, valueEnd } = filters[i];

                // Get the field key to use in the row (may be nested like 'completed_statuses.Su17 Employee Form')
                const key = columnKeyMap[column];

                // Safely access nested value if needed (e.g., row['completed_statuses']['Su17 Employee Form'])
                const rowValue = getNestedValue(row, key);

                // Evaluate this filter condition against the current row's value
                const currentEval = evaluate(rowValue, operator, value, valueStart, valueEnd);

                if (i === 0) {
                    result = currentEval;
                } else if (logic === 'AND') {
                    result = result && currentEval;
                } else if (logic === 'OR') {
                    result = result || currentEval;
                }
            }
            return result;
        });

        onApplyFilters(rows);
        setFilterApplied(true);
    };

    const evaluate = (itemValue, operator, value, valueStart, valueEnd) => {
        const val = itemValue?.toString().toLowerCase() ?? '';
        const filter = value?.toString().toLowerCase() ?? '';
        switch (operator) {
            case 'contains': {
                if (val.includes(',')) {
                    const tokens = val.split(',').map((s) => s.trim());
                    return tokens.some((token) => token.includes(filter));
                } else {
                    return val.includes(filter);
                }
            }
            case 'does not contain': {
                const tokens = val.split(',').map((s) => s.trim());
                return !tokens.some((token) => token === filter);
            }
            case 'equals': {
                const mmddyyyyRegex = /^\d{2}-\d{2}-\d{4}$/;
                const isDateFormat = mmddyyyyRegex.test(val)

                if (isDateFormat) {
                    const toISODate = (str) => {
                        // Convert MM-DD-YYYY to ISO string
                        const [mm, dd, yyyy] = str.split('-');
                        return new Date(`${yyyy}-${mm}-${dd}`);
                    };

                    const dateVal = toISODate(val); //Date will be in MM-DD-YYYY from REDCap UI
                    const dateFilter = new Date(filter); //Date will be in YYYY-MM-DD from backend
                    if (!isNaN(dateVal) && !isNaN(dateFilter)) {
                        return (
                            dateVal.getFullYear() === dateFilter.getFullYear() &&
                            dateVal.getMonth() === dateFilter.getMonth() &&
                            dateVal.getDate() === dateFilter.getDate()
                        );
                    }
                    return false;
                }

                return val === filter;
            }
            case 'does not equal':
                return val !== filter;
            case 'between':
                const parseDateToUTC = (str) => {
                    if (!str) return NaN;
                    const [mm, dd, yyyy] = str.match(/^\d{2}-\d{2}-\d{4}$/) ? str.split('-') : [];
                    return mm ? Date.UTC(yyyy, mm - 1, dd) : new Date(str).getTime();
                };

                const item = parseDateToUTC(itemValue);
                const start = parseDateToUTC(valueStart);
                const end = parseDateToUTC(valueEnd);

                return !isNaN(item) && !isNaN(start) && !isNaN(end) && item >= start && item <= end;
            default:
                return true;
        }
    };

    const staticColumns = [
        'Incident Number',
        'Incident Type',
        'Name of Person Involved',
        'Date of Incident',
        'Name of Incident Lead',
        'Lead Safety Group',
    ];

    // Extract first elements from each status column entry passed from backend
    const dynamicStatusColumns = statusColumns?.map(([label]) => label) ?? [];
    const columnOptions = [...staticColumns, ...dynamicStatusColumns];

    const operatorOptions = (column) => {
        const dynamicLabels = statusColumns?.map(([label]) => label) ?? [];

        if (column === 'Date of Incident') {
            return ['equals', 'between'];
        } else if (column === 'Lead Safety Group') {
            return ['equals', 'does not equal'];
        } else if (dynamicLabels.includes(column)) {
            return ['equals', 'does not equal'];
        } else {
            return ['contains', 'does not contain', 'equals', 'does not equal'];
        }
    };

    const logicOptions = ['AND', 'OR'];
    const dynamicColumnKeyMap = statusColumns?.reduce((acc, [label]) => {
        acc[label] = `completed_statuses.${label}`;
        return acc;
    }, {}) ?? {};

    const columnKeyMap = {
        'Incident Number': 'record_id',
        'Incident Type': 'non_type_concat',
        'Name of Person Involved': 'non_name',
        'Date of Incident': 'non_date',
        'Name of Incident Lead': 'tri_lead_name',
        'Lead Safety Group': 'tri_lead_safety_group',
        'Status of Incident': 'status',
        ...dynamicColumnKeyMap
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Filter Logic"
            size="xl"
            centered
        >
            <Stack spacing="sm">
                {filters.map((filter, index) => (
                    <Group key={index} align="flex-end">
                        <ActionIcon
                            onClick={() => removeFilter(index)}
                            variant="subtle"
                            color="red"
                            gap="xs"
                            mt="md"
                        >
                            <IconX size={18} />
                        </ActionIcon>

                        {index > 0 && (
                            <Select
                                label="Logic"
                                data={logicOptions}
                                value={filter.logic}
                                onChange={(value) => updateFilter(index, 'logic', value)}
                                w={90}
                            />
                        )}

                        <Select
                            label="Columns"
                            placeholder="Select column"
                            data={columnOptions}
                            value={filter.column}
                            onChange={(value) => {
                                updateFilter(index, 'column', value);
                                updateFilter(index, 'operator', null);
                            }}
                            flex={1}
                        />

                        <Select
                            label="Operator"
                            placeholder="Select operator"
                            data={operatorOptions(filter.column)}
                            value={filter.operator}
                            onChange={(value) => updateFilter(index, 'operator', value)}
                            flex={1}
                        />

                        {/* Value Input Section */}
                        {filter.column === 'Date of Incident' ? (
                            filter.operator === 'between' ? (
                                <>
                                    <TextInput
                                        type="date"
                                        max={filter.valueEnd || new Date().toISOString().split('T')[0]} // can't go past End or today
                                        label="Start"
                                        value={filter.valueStart}
                                        onChange={(e) => updateFilter(index, 'valueStart', e.target.value)}
                                    />
                                    <TextInput
                                        type="date"
                                        min={filter.valueStart || undefined} // disallow dates before start
                                        max={new Date().toISOString().split('T')[0]} // disallow future dates
                                        label="End"
                                        value={filter.valueEnd}
                                        onChange={(e) => updateFilter(index, 'valueEnd', e.target.value)}
                                    />
                                </>
                            ) : (
                                <TextInput
                                    type="date"
                                    max={new Date().toISOString().split('T')[0]} // disallow future dates
                                    label="Date"
                                    value={filter.value}
                                    onChange={(e) => updateFilter(index, 'value', e.target.value)}
                                />
                            )
                        ) : filter.column === 'Lead Safety Group' ? (
                            <Select
                                label="Value"
                                placeholder="Select group"
                                data={uniqueGroups}
                                value={filter.value}
                                onChange={(value) => updateFilter(index, 'value', value)}
                            />
                        ) : statusColumns.map(([label]) => label).includes(filter.column) ? (
                            <Select
                                label="Status"
                                placeholder="Select status"
                                data={[
                                    { label: 'Complete', value: '2' },
                                    { label: 'Unverified', value: '1' },
                                    { label: 'Incomplete', value: '0' },
                                    { label: 'Empty', value: '' },
                                ]}
                                value={filter.value}
                                onChange={(value) => updateFilter(index, 'value', value)}
                            />
                        ) : (
                            <TextInput
                                label="Value"
                                placeholder="Filter value"
                                value={filter.value}
                                onChange={(e) => updateFilter(index, 'value', e.target.value)}
                                flex={1}
                            />
                        )}
                    </Group>
                ))}
            </Stack>
            <Divider my="md" />
            <Group justify="space-between" mt="md">
                <Group>
                    <Button leftSection={<IconPlus size={16} />} variant="outline" onClick={addFilter}>
                        Add Filter
                    </Button>
                    {filters.length > 0 && (
                        <Button
                            leftSection={<IconTrash size={16} />}
                            variant="outline"
                            color="red"
                            onClick={clearAllFilters}
                        >
                            Clear All
                        </Button>
                    )}
                </Group>

                {filters.length > 0 && (
                    <Button variant="outline" color="green" onClick={() => applyFilters(data, filters)}>
                        Apply
                    </Button>
                )}
            </Group>
        </Modal>
    );
}
