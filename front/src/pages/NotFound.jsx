import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div style={styles.container}>
            <h1 style={styles.header}>404 - Page Not Found</h1>
            <p style={styles.text}>Sorry, the page you are looking for does not exist.</p>
            <Link to="/home" style={styles.link}>Go to Home</Link>
        </div>
    );
};

const styles = {
    container: {
        textAlign: 'center',
        marginTop: '50px',
    },
    header: {
        fontSize: '48px',
        marginBottom: '20px',
    },
    text: {
        fontSize: '24px',
        marginBottom: '20px',
    },
    link: {
        fontSize: '20px',
        color: '#007bff',
        textDecoration: 'none',
    },
};

export default NotFound;