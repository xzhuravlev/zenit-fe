import React from 'react';
import Header from './Header';
import styles from './Layout.module.css';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div>
            <Header />
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
};

export default Layout;
