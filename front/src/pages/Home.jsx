import useAuth from '../hooks/useAuth';

const Home = () => {
    const { logout, getRoles } = useAuth();

    return (
        <div>
            <h1>Welcome to the Home Page</h1>
            <p>This is the home page of the application.</p>
            {getRoles().map((role, index) => (
  <div key={role.role_id || index}>
    <p style={{color: "green"}}>Role: {role.name || role }</p>
  </div>
))}
            <button onClick={logout}>Logout</button>
        </div>
    );
};

export default Home;