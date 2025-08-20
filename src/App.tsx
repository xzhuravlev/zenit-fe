import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import './App.css';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Cockpits from './pages/Cockpits';
import CreateCockpit from './pages/CreateCockpit';
import WikiCockpit from './pages/WikiCockpit';
import EditCockpit from './pages/EditCockpit';
import Checklist from './pages/Checklist';

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Layout>
                    <Routes>
                        <Route path="/signin" element={<SignIn />} />
                        <Route path="/signup" element={<SignUp />} />
                        <Route path="/cockpits" element={<Cockpits />} />
                        <Route path="/create-cockpit" element={<CreateCockpit />} />
                        <Route path="/cockpits/:id/wiki" element={<WikiCockpit />} />
                        <Route path="/cockpits/:id/edit" element={<EditCockpit />} />
                        <Route path="/cockpits/:cockpitId/checklist/:checklistId" element={<Checklist />} />
                    </Routes>
                </Layout>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
