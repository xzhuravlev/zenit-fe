import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import './App.css';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Cockpits from './pages/Cockpits';
import CreateCockpit from './pages/CC';

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <Layout>
                <Routes>
					<Route path="/signin" element={<SignIn />} />
					<Route path="/signup" element={<SignUp />} />
					<Route path="/cockpits" element={<Cockpits />} />
					<Route path="/create-cockpit" element={<CreateCockpit />} />
                </Routes>
            </Layout>
        </BrowserRouter>
    );
}

export default App;
