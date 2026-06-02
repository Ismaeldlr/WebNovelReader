import { useEffect, useState } from 'react';
import { getHealth } from '../api/health';

function Home() {
  const [status, setStatus] = useState('checking...');

  useEffect(() => {
    getHealth()
      .then((res) => setStatus(res.data.status))
      .catch(() => setStatus('unreachable'));
  }, []);

  return (
    <div>
      <h1>Webnovel Hub</h1>
      <p>API status: <strong>{status}</strong></p>
    </div>
  );
}

export default Home;