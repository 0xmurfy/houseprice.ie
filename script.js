document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#property-table tbody');
    const searchBar = document.getElementById('search-bar');
    const paginationControls = document.createElement('div');
    paginationControls.className = 'pagination-controls flex justify-center mt-4';
    document.querySelector('main').appendChild(paginationControls);

    let tableData = []; // Store the original data
    let currentPage = 1;
    const rowsPerPage = 50;

    // Function to load CSV from a local file and populate table
    function loadCSV(filePath) {
        fetch(filePath)
            .then(response => response.text())
            .then(csvText => {
                Papa.parse(csvText, {
                    header: true,
                    complete: function(results) {
                        tableData = results.data; // Store the data for filtering
                        console.log('Loaded data:', tableData); // Debug: Log loaded data
                        tableData.sort((a, b) => new Date(b['Date of Sale (dd/mm/yyyy)']) - new Date(a['Date of Sale (dd/mm/yyyy)'])); // Sort by date
                        displayPage(currentPage);
                    }
                });
            })
            .catch(error => console.error('Error fetching CSV:', error));
    }

    // Function to convert a string to title case
    function toTitleCase(str) {
        return str ? str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()) : '';
    }

    // Function to format date
    function formatDate(dateStr) {
        const [day, month, year] = dateStr.split('/');
        const date = new Date(`${year}-${month}-${day}`);
        return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    }

    // Function to populate table with data
    function populateTable(data) {
        tableBody.innerHTML = ''; // Clear existing data
        data.forEach(row => {
            // Ensure the column name matches exactly with the CSV header
            const price = row['Price (€)'] || row['Price (£)'] || row['Price ()']; // Adjust based on actual CSV header
            const formattedPrice = price ? `€${parseFloat(price.replace(/[^0-9.-]+/g, "")).toLocaleString()}` : 'N/A';

            // Shorten the description of property
            let description = row['Description of Property'];
            if (description === 'Second-Hand Dwelling house /Apartment') {
                description = 'Second Hand';
            } else if (description === 'New Dwelling house /Apartment') {
                description = 'New';
            }

            // Convert address to title case
            const address = toTitleCase(row['Address'] || '');
            const eircode = row['Eircode'] || 'N/A';

            // Skip rows with "N/A" in critical fields
            if (address === 'N/A' || formattedPrice === 'N/A' || row['Date of Sale (dd/mm/yyyy)'] === 'N/A' || description === 'N/A') {
                return;
            }

            // Determine badge color based on condition
            const badgeColor = description === 'New' ? 'bg-white text-black' : 'bg-gray-200 text-black';

            // Format the date
            const formattedDate = formatDate(row['Date of Sale (dd/mm/yyyy)']);

            const tr = document.createElement('tr');
            tr.classList.add('border-opacity-10'); // Add custom class for border opacity
            tr.innerHTML = `
                <td class="py-2 px-4 text-left">
                    ${address}<br>
                    <span class="text-sm text-gray-500">${eircode}</span>
                    <button class="ml-2 text-blue-500 hover:underline" onclick="copyToClipboard('${address}')">Copy</button>
                </td>
                <td class="py-2 px-4 text-right">${formattedDate}</td>
                <td class="py-2 px-4 text-right">
                    <span class="inline-block px-2 py-1 rounded ${badgeColor}">${description}</span>
                </td>
                <td class="py-2 px-4 text-right price">${formattedPrice}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Function to filter table data based on search input
    function filterTable(query) {
        const filteredData = tableData.filter(row => {
            const address = (row['Address'] || '').toLowerCase();
            const eircode = (row['Eircode'] || '').toLowerCase();
            return address.includes(query) || eircode.includes(query);
        });
        console.log('Filtered data:', filteredData); // Debug: Log filtered data
        displayPage(1, filteredData);
    }

    // Event listener for search bar input
    searchBar.addEventListener('input', (event) => {
        const query = event.target.value.toLowerCase();
        console.log('Search query:', query); // Debug: Log search query
        filterTable(query);
    });

    // Function to copy address to clipboard
    window.copyToClipboard = function(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Address copied to clipboard');
        }).catch(err => {
            console.error('Could not copy text: ', err);
        });
    };

    // Function to display a specific page of data
    function displayPage(page, data = tableData) {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedData = data.slice(start, end);
        populateTable(paginatedData);
        setupPaginationControls(data.length, page);
    }

    // Function to setup pagination controls
    function setupPaginationControls(totalRows, currentPage) {
        paginationControls.innerHTML = ''; // Clear existing controls
        const totalPages = Math.ceil(totalRows / rowsPerPage);

        for (let i = 1; i <= totalPages; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.className = `mx-1 px-3 py-1 ${i === currentPage ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`;
            button.addEventListener('click', () => displayPage(i));
            paginationControls.appendChild(button);
        }
    }

    // Load CSV file from the local path
    loadCSV('salesdata/PPR-2025-01-Dublin.csv');
}); 