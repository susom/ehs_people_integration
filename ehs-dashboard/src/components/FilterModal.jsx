import React, { useState } from 'react';
import {
    Modal,
    Button,
    Box,
    Group,
    Select,
    TextInput,
    ActionIcon,
    Divider,
    Stack,
} from '@mantine/core';
import { IconX, IconTrash, IconPlus} from '@tabler/icons-react';

export default function FilterModal({ opened, onClose, data, onApplyFilters, setFilterApplied}) {
    const [filters, setFilters] = useState([]);

    const addFilter = () => {
        setFilters((prev) => [
            ...prev,
            { logic: '', column: null, operator: null, value: '' },
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

            // If all filters are removed, reset the state
            if (newFilters.length === 0) {
                setFilterApplied(false);
                onApplyFilters(data); // Reset to original data
            }

            return newFilters;
        });
    };

    const clearAllFilters = () => {
        setFilters([]);

        // Reset tableData to original full dataset
        onApplyFilters(data);
        setFilterApplied(false);
    };

    const applyFilters = (tableData, filters) => {
        if (filters.length === 0) return tableData;

        let rows = tableData.filter((row) => {
            // Start by evaluating the first filter
            let result = evaluate(
                row[columnKeyMap[filters[0].column]],
                filters[0].operator,
                filters[0].value
            );

            // Apply the rest using AND/OR logic
            for (let i = 1; i < filters.length; i++) {
                const { logic, column, operator, value } = filters[i];
                const condition = evaluate(row[columnKeyMap[column]], operator, value);

                if (logic === 'AND') {
                    result = result && condition;
                } else if (logic === 'OR') {
                    result = result || condition;
                }
            }

            return result;
        });

        // Update tableData in parent using callback
        onApplyFilters(rows);
        setFilterApplied(true);
    };

    const columnOptions = [
        'Incident Number',
        'Incident Type',
        'Name of Person Involved',
        'Date of Incident',
        'Name of Incident Lead',
        'Lead Safety Group',
        'Status of Incident',
    ];

    const operatorOptions = [
        'contains',
        'does not contain',
        'equals',
        'does not equal',
    ];

    const logicOptions = ['AND', 'OR'];

    const columnKeyMap = {
        'Incident Number': 'number',
        'Incident Type': 'type',
        'Name of Person Involved': 'person',
        'Date of Incident': 'date',
        'Name of Incident Lead': 'lead',
        'Lead Safety Group': 'group',
        'Status of Incident': 'status',
    };

    const evaluate = (itemValue, operator, filterValue) => {
        const value = itemValue?.toString().toLowerCase() ?? '';
        const filter = filterValue?.toString().toLowerCase() ?? '';

        switch (operator) {
            case 'contains':
                return value.includes(filter);
            case 'does not contain':
                return !value.includes(filter);
            case 'equals':
                return value === filter;
            case 'does not equal':
                return value !== filter;
            default:
                return true;
        }
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
                            onChange={(value) => updateFilter(index, 'column', value)}
                            flex={1}
                        />
                        <Select
                            label="Operator"
                            placeholder="Select operator"
                            data={operatorOptions}
                            value={filter.operator}
                            onChange={(value) => updateFilter(index, 'operator', value)}
                            flex={1}
                        />
                        <TextInput
                            label="Value"
                            placeholder="Filter value"
                            value={filter.value}
                            onChange={(e) => updateFilter(index, 'value', e.target.value)}
                            flex={1}
                        />
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
