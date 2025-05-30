import IncidentTable from './IncidentTable/IncidentTable.jsx';
import { Title, AppShell, Group } from '@mantine/core';
import "./App.css";
import {IconChartBarPopular} from '@tabler/icons-react';
function App() {

  return (
    <>
        <AppShell
            header={{ height: 60 }}
        >
            <AppShell.Header>
                <Group h="100%" px="md">
                    <Title order={2}>EHS Dashboard</Title>
                    <IconChartBarPopular size={24}/>
                </Group>
            </AppShell.Header>
            <AppShell.Main>
                <IncidentTable/>
            </AppShell.Main>

        </AppShell>

    </>
  )
}

export default App
