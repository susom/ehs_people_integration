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

export default function FilterModal({ opened, onClose, data, onApplyFilters, setFilterApplied }) {
    const [filters, setFilters] = useState([]);

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

    const applyFilters = (tableData, filters) => {
        if (filters.length === 0) return tableData;

        let rows = tableData.filter((row) => {
            let result = evaluate(
                row[columnKeyMap[filters[0].column]],
                filters[0].operator,
                filters[0].value,
                filters[0].valueStart,
                filters[0].valueEnd
            );

            for (let i = 1; i < filters.length; i++) {
                const { logic, column, operator, value, valueStart, valueEnd } = filters[i];
                const condition = evaluate(
                    row[columnKeyMap[column]],
                    operator,
                    value,
                    valueStart,
                    valueEnd
                );

                if (logic === 'AND') {
                    result = result && condition;
                } else if (logic === 'OR') {
                    result = result || condition;
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
            case 'contains':
                return val.includes(filter);
            case 'does not contain':
                return !val.includes(filter);
            case 'equals':
                return val === filter;
            case 'does not equal':
                return val !== filter;
            case 'between':
                const itemDate = new Date(itemValue);
                const start = new Date(valueStart);
                const end = new Date(valueEnd);
                return itemDate >= start && itemDate <= end;
            default:
                return true;
        }
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

    const operatorOptions = (column) => {
        return column === 'Date of Incident'
            ? ['equals', 'between']
            : ['contains', 'does not contain', 'equals', 'does not equal'];
    };

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
                                        label="Start"
                                        value={filter.valueStart}
                                        onChange={(e) => updateFilter(index, 'valueStart', e.target.value)}
                                    />
                                    <TextInput
                                        type="date"
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
