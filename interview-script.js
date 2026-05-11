// State variables
let allQuestions = [];
let filteredQuestions = [];
let companies = new Set();
let currentPage = 1;
const itemsPerPage = 12;

// DOM Elements
const grid = document.getElementById('questions-grid');
const loadingState = document.getElementById('loading-state');
const noResults = document.getElementById('no-results');
const searchInput = document.getElementById('search-input');
const companyFilter = document.getElementById('company-filter');
const questionCount = document.getElementById('question-count');
const themeToggle = document.getElementById('theme-toggle');
const resetFiltersBtn = document.getElementById('reset-filters');
const paginationControls = document.getElementById('pagination-controls');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchData();
    setupEventListeners();
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    // Default to dark mode if not specified
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcon('dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        updateThemeIcon('light');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

// Fetch Data
async function fetchData() {
    try {
        const response = await fetch('data/questions.json');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        
        // Clean and process data
        allQuestions = data.map((item, index) => ({
            id: index,
            company: cleanCompanyName(item.company),
            content: formatContent(item.content)
        })).filter(item => item.content.length > 10 && !item.content.includes('@dropdown')); // filter out junk

        // Extract unique companies for filter
        allQuestions.forEach(item => {
            if (item.company && item.company !== 'General' && item.company !== '0' && item.company !== '-' && item.company !== 'o' && item.company !== '.') {
                companies.add(item.company);
            }
        });

        populateCompanyFilter();
        filteredQuestions = [...allQuestions];
        
        loadingState.classList.add('hidden');
        renderQuestions();
    } catch (error) {
        console.error('Error fetching data:', error);
        loadingState.innerHTML = '<i class="fas fa-exclamation-circle" style="font-size: 2rem; color: #ef4444; margin-bottom: 1rem;"></i><p>Failed to load questions. Please try again later.</p>';
    }
}

function cleanCompanyName(name) {
    if (!name) return 'General';
    // Remove dates, newlines, extra spaces
    let clean = name.replace(/\n/g, ' ')
                    .replace(/\([^)]*\)/g, '') // remove anything in parentheses
                    .trim();
    if (clean.length < 2 || clean === '-' || clean === '0') return 'General';
    // Capitalize first letter of words
    return clean.replace(/\b\w/g, l => l.toUpperCase());
}

function formatContent(content) {
    if (!content) return '';
    // Bold numbers (like "1. ", "2. ") for questions
    return content.replace(/(\d+\.)\s/g, '<strong>$1</strong> ');
}

function populateCompanyFilter() {
    const sortedCompanies = Array.from(companies).sort();
    
    sortedCompanies.forEach(company => {
        const option = document.createElement('option');
        option.value = company;
        option.textContent = company;
        companyFilter.appendChild(option);
    });
}

// Event Listeners
function setupEventListeners() {
    themeToggle.addEventListener('click', toggleTheme);
    
    searchInput.addEventListener('input', debounce(() => {
        currentPage = 1;
        applyFilters();
    }, 300));
    
    companyFilter.addEventListener('change', () => {
        currentPage = 1;
        applyFilters();
    });
    
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        companyFilter.value = 'all';
        currentPage = 1;
        applyFilters();
    });

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderQuestions();
            window.scrollTo({ top: 300, behavior: 'smooth' });
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderQuestions();
            window.scrollTo({ top: 300, behavior: 'smooth' });
        }
    });
}

// Filtering
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCompany = companyFilter.value;
    
    filteredQuestions = allQuestions.filter(item => {
        const matchesSearch = searchTerm === '' || 
                             item.content.toLowerCase().includes(searchTerm) || 
                             item.company.toLowerCase().includes(searchTerm);
                             
        const matchesCompany = selectedCompany === 'all' || 
                              item.company === selectedCompany;
                              
        return matchesSearch && matchesCompany;
    });
    
    renderQuestions();
}

// Rendering
function renderQuestions() {
    grid.innerHTML = '';
    questionCount.textContent = filteredQuestions.length;
    
    if (filteredQuestions.length === 0) {
        grid.classList.add('hidden');
        paginationControls.classList.add('hidden');
        noResults.classList.remove('hidden');
        return;
    }
    
    grid.classList.remove('hidden');
    noResults.classList.add('hidden');
    
    // Pagination logic
    const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredQuestions.length);
    
    const questionsToDisplay = filteredQuestions.slice(startIndex, endIndex);
    const searchTerm = searchInput.value.trim();
    
    questionsToDisplay.forEach(item => {
        const card = document.createElement('div');
        card.className = 'question-card';
        
        let displayContent = item.content;
        
        // Highlight search term
        if (searchTerm) {
            const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
            displayContent = displayContent.replace(regex, '<span class="highlight">$1</span>');
        }
        
        // Replace newlines with br tags
        displayContent = displayContent.replace(/\n/g, '<br>');
        
        card.innerHTML = `
            <div class="card-header">
                <span class="company-tag">
                    <i class="${getCompanyIcon(item.company)}"></i> ${item.company}
                </span>
            </div>
            <div class="card-content">
                <div class="card-text">${displayContent}</div>
            </div>
        `;
        grid.appendChild(card);
    });

    updatePagination(totalPages);
}

function updatePagination(totalPages) {
    if (totalPages <= 1) {
        paginationControls.classList.add('hidden');
        return;
    }

    paginationControls.classList.remove('hidden');
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
}

function getCompanyIcon(companyName) {
    const name = companyName.toLowerCase();
    if (name.includes('salesforce')) return 'fab fa-salesforce';
    if (name.includes('accenture')) return 'fas fa-angle-right';
    if (name.includes('deloitte')) return 'fas fa-dot-circle';
    if (name.includes('infosys')) return 'fas fa-globe';
    if (name.includes('tcs') || name.includes('tata')) return 'fas fa-cogs';
    if (name.includes('capgemini')) return 'fas fa-spade';
    if (name.includes('ey') || name.includes('ernst')) return 'fas fa-chart-line';
    return 'fas fa-building';
}

// Utilities
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
