import React, { useState, forwardRef, useImperativeHandle } from 'react';
import {
    Modal,
    Button,
    Group,
    Select,
    TextInput,
    Tooltip,
    ActionIcon,
    Divider,
    Stack,
} from '@mantine/core';
import { IconX, IconTrash, IconPlus } from '@tabler/icons-react';

const FilterModal = forwardRef(({ opened, onClose, data, onApplyFilters, setFilterApplied, statusColumns}, ref) => {
    const [filters, setFilters] = useState([]);
    useImperativeHandle(ref, () => ({
        clearFiltersExternally: () => {
            setFilters([]);
            onApplyFilters(data, '');
            setFilterApplied(false);
        }
    }));
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
                onApplyFilters(data, '');
            }

            return newFilters;
        });
    };

    const clearAllFilters = () => {
        setFilters([]);
        onApplyFilters(data, '');
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
        console.log(filters)
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

        onApplyFilters(rows, getFilterSummary(filters));
        setFilterApplied(true);
    };

    const isApplyDisabled = filters.some((filter, idx) => {
        // List of fields to validate
        const requiredFields = ['columns', 'operator', 'value', 'logic', 'Date', 'status'];

        // If first row, logic might not be required
        const skipLogic = idx === 0;

        return requiredFields.some((field) => {
            if (skipLogic && field === 'logic') return false; // skip first row logic
            return filter[field] === null || filter[field] === '';
        });
    });


    const getFilterSummary = (filters) => {
        if (!filters || filters.length === 0) return 'No filters applied.';
        return filters
            .map((filter, index) => {
                const { logic, column, operator, value, valueStart, valueEnd } = filter;

                let condition = '';
                switch (operator) {
                    case 'contains':
                        condition = `contains "${value}"`;
                        break;
                    case 'does not contain':
                        condition = `does not contain "${value}"`;
                        break;
                    case 'equals':
                        condition = `equals "${value}"`;
                        break;
                    case 'does not equal':
                        condition = `does not equal "${value}"`;
                        break;
                    case 'between':
                        condition = `between ${valueStart} and ${valueEnd}`;
                        break;
                    default:
                        condition = `${operator} "${value}"`;
                }

                // Include logic if not the first item
                const logicText = index > 0 ? `${logic} ` : '';

                return `${logicText}${column} ${condition}`;
            })
            .join('\n');
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
                if (val.includes(',')) {
                    const tokens = val.split(',').map((s) => s.trim());
                    return !tokens.some((token) => token.includes(filter));
                } else {
                    return !val.includes(filter);
                }
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
        'Date Reported',
        'Name of Incident Lead',
        'Lead Safety Group',
        'Location Type',
        'Name of Manager/PI',
        'Building'
    ];

    // Extract first elements from each status column entry passed from backend
    const dynamicStatusColumns = statusColumns?.map(([label]) => label) ?? [];
    const columnOptions = [...staticColumns, ...dynamicStatusColumns];

    const dynamicColumnKeyMap = statusColumns?.reduce((acc, [label]) => {
        acc[label] = `completed_statuses.${label}`;
        return acc;
    }, {}) ?? {};

    const columnKeyMap = {
        'Incident Number': 'record_id',
        'Incident Type': 'incident_type_concat',
        'Name of Person Involved': 'name_of_person_involved',
        'Date of Incident': 'date_of_incident',
        'Date Reported': 'date_reported',
        'Name of Incident Lead': 'tri_lead_name',
        'Lead Safety Group': 'tri_lead_safety_group',
        'Location Type': 'location_type',
        'Name of Manager/PI': 'employee_manager_name',
        'Building': 'building_location',
        ...dynamicColumnKeyMap
    };

    const operatorOptions = (column) => {

        const dynamicLabels = statusColumns?.map(([label]) => label) ?? [];
        if (column === 'Date of Incident' || column === 'Date Reported') {
            return ['equals', 'between'];
        } else if (column === 'Lead Safety Group') {
            return ['equals', 'does not equal'];
        } else if (dynamicLabels.includes(column)) {
            return ['equals', 'does not equal'];
        } else if (column === 'Location Type' || column === 'Incident Type'){
            return ['contains', 'does not contain'];
        } else {
            return ['contains', 'does not contain', 'equals', 'does not equal'];
        }

    };
    const logicOptions = ['AND', 'OR'];

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Filter Logic"
            size="80%"
            // centered
            yOffset="30vh"
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
                                updateFilter(index, 'value', '');

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
                        {['Date of Incident', 'Date Reported'].includes(filter.column) ? (
                            filter.operator === 'between' ? (
                                <>
                                    <TextInput
                                        type="date"
                                        max={filter.valueEnd} // can't go past End or today
                                        label="Start"
                                        value={filter.valueStart}
                                        onChange={(e) => updateFilter(index, 'valueStart', e.target.value)}
                                    />
                                    <TextInput
                                        type="date"
                                        min={filter.valueStart || undefined} // disallow dates before start
                                        label="End"
                                        value={filter.valueEnd}
                                        onChange={(e) => updateFilter(index, 'valueEnd', e.target.value)}
                                    />
                                </>
                            ) : (
                                <TextInput
                                    type="date"
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
                    <Tooltip position="bottom" label="At least one or more required fields is empty" withArrow disabled={!isApplyDisabled}>
                        <Button
                            disabled={isApplyDisabled}
                            variant="outline"
                            color="green"
                            onClick={() => applyFilters(data, filters)}
                        >
                            Apply
                        </Button>
                    </Tooltip>
                )}
            </Group>
        </Modal>
    );
});

export default FilterModal;
