export const fetchData = async () => {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`); // Handle HTTP errors
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error; // Rethrow to handle in component
  }
}; 