import React, { useState, useEffect } from 'react';
import Spinner from './Spinner';

function DataLoader() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchData();
        setData(result);
      } catch (err) {
        setError(err.message); // Capture error message
      } finally {
        setLoading(false); // Always disable loading
      }
    };
    loadData();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <div>Error: {error}</div>; // Show error message
  return /* your data display */;
}

export default DataLoader; 