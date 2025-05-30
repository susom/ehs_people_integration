// components/SearchBar.jsx
import React, { useEffect, useState } from 'react';
import { TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';

export default function SearchBar({ value, onDebouncedChange, delay = 300 }) {
    const [inputValue, setInputValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            onDebouncedChange(inputValue);
        }, delay);

        return () => clearTimeout(handler); // Cleanup timeout on change
    }, [inputValue, onDebouncedChange, delay]);

    useEffect(() => {
        setInputValue(value); // Sync if parent manually updates value
    }, [value]);

    return (
        <TextInput
            mb="xs"
            w="250px"
            leftSection={<IconSearch size={16} />}
            placeholder="Search ..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
        />
    );
}
