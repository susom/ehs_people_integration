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

export default function FilterModal({ opened, onClose }) {
    const [filters, setFilters] = useState([]);

    const addFilter = () => {
        setFilters((prev) => [
            ...prev,
            { logic: 'AND', column: null, operator: null, value: '' },
        ]);
    };

    const updateFilter = (index, key, newValue) => {
        setFilters((prev) =>
            prev.map((f, i) => (i === index ? { ...f, [key]: newValue } : f))
        );
    };

    const removeFilter = (index) => {
        setFilters((prev) => prev.filter((_, i) => i !== index));
    };

    const clearAllFilters = () => {
        setFilters([]);
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
                <Button leftSection={<IconPlus size={16}/>} variant="outline" onClick={addFilter}>
                    Add Filter
                </Button>
                {filters.length > 0 && (
                    <Button leftSection={<IconTrash size={16}/>} variant="outline" color="red" onClick={clearAllFilters}>
                        Clear All
                    </Button>
                )}
            </Group>
        </Modal>
    );
}
