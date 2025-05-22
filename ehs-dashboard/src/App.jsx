import { useState } from 'react'
import IncidentTable from './IncidentTable/IncidentTable.jsx';
import { Center, Title } from '@mantine/core';

function App() {

  return (
    <>
        <Center>
            <Title order={2}>EHS Dashboard</Title>
        </Center>
        <IncidentTable/>
    </>
  )
}

export default App
